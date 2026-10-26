import { cleanup, fireEvent, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import Pipeline from "@/pages/Pipeline";
import { installProfileApi } from "./fixtures/profileApi";
import { creatorProfile } from "./fixtures/creatorProfile";
import { renderProfile } from "./renderProfile";

vi.mock("@/components/Navbar", () => ({ default: () => null }));
vi.mock("@/components/Footer", () => ({ default: () => null }));

const pitch = (id: number, brand: string) => ({
  id, brand_id: id, brand_name: brand, is_custom: false, story: "", product_reference: null, past_brand_partnership: null,
  content_link: null, contact_name: null, contact_email: null, pitch_text: `Hi ${brand}`, status: "generated", source: "generated",
  is_manual: false, sent_at: null, agreed_rate: null, created_at: "2026-10-20T10:00:00Z",
});

let pitches: ReturnType<typeof pitch>[];
let rateRequests: Record<string, unknown>[];
let deleteCalls: string[];
let deleteStatus: number;
let profileApi: ReturnType<typeof installProfileApi>;

beforeEach(() => {
  pitches = [pitch(1, "Alpha Audio"), pitch(2, "Zeta Guitars")];
  deleteCalls = [];
  rateRequests = [];
  deleteStatus = 200;
  profileApi = installProfileApi(creatorProfile());
  const base = globalThis.fetch;
  const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
  vi.stubGlobal("fetch", vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = new URL(String(input), window.location.origin);
    if (url.pathname === "/api/mavlit/pitches/me") return json({ pitches, total: pitches.length });
    if (url.pathname === "/api/mavlit/rate-intelligence" && init?.method === "POST") {
      rateRequests.push(JSON.parse(String(init.body)));
      return json({
        id: 1, brand_name: "Alpha Audio", rate_min: 250, rate_typical: 420, rate_max: 700, currency: "USD", confidence: "medium",
        reasoning: "Anchored on the median of creators your size.", basis: "Beauty, 50k-100k, Reel",
        adjustments: [{ factor: "usage", effect: "Adds about 35% for paid usage." }],
        details: { creator_niche: "Beauty", follower_bucket: "50k-100k", data_row: { creators: 29, points: 34, median: 442 }, brand_followers: "1,631,664", partner_creators: [{ username: "a" }, { username: "b" }] },
        created_at: "2026-10-26T00:00:00Z",
      });
    }
    const target = /^\/api\/mavlit\/pitches\/(\d+)$/.exec(url.pathname);
    if (target && init?.method === "DELETE") {
      deleteCalls.push(target[1]);
      if (deleteStatus !== 200) return json({ detail: "Pitch not found" }, deleteStatus);
      pitches = pitches.filter((p) => String(p.id) !== target[1]);
      return json({ id: Number(target[1]), deleted: true });
    }
    return base(input, init);
  }));
});
afterEach(cleanup);

describe("deleting a saved pitch from the Pipeline", () => {
  it("asks for confirmation, keeps the pitch on Cancel, and removes it on Delete", async () => {
    renderProfile(<Pipeline />);
    expect(await screen.findByText("Alpha Audio")).toBeInTheDocument();

    fireEvent.click(screen.getByTestId("button-delete-pitch-1"));
    expect(screen.getByRole("alertdialog")).toHaveTextContent("Are you sure you want to delete your pitch to Alpha Audio?");
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
    expect(deleteCalls).toEqual([]);
    expect(screen.getByText("Alpha Audio")).toBeInTheDocument();

    fireEvent.click(screen.getByTestId("button-delete-pitch-1"));
    fireEvent.click(screen.getByTestId("button-confirm-delete-pitch"));
    await waitFor(() => expect(screen.queryByText("Alpha Audio")).not.toBeInTheDocument());
    expect(deleteCalls).toEqual(["1"]);
    expect(screen.getByText("Zeta Guitars")).toBeInTheDocument();
    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
  });

  it("keeps the pitch and shows the error when the server refuses", async () => {
    deleteStatus = 404;
    renderProfile(<Pipeline />);
    await screen.findByText("Alpha Audio");
    fireEvent.click(screen.getByTestId("button-delete-pitch-1"));
    fireEvent.click(screen.getByTestId("button-confirm-delete-pitch"));
    expect(await screen.findByRole("alert")).toHaveTextContent("Pitch not found");
    expect(screen.getByRole("alertdialog")).toBeInTheDocument();
    expect(screen.getByText("Alpha Audio")).toBeInTheDocument();
  });
});

describe("Deal Tools", () => {
  const openDealTools = async () => {
    renderProfile(<Pipeline />);
    await screen.findByText("Alpha Audio");
    fireEvent.click(screen.getByRole("button", { name: "Deal Tools" }));
    return screen.findByTestId("input-deal-brand");
  };

  it("searches your pitched brands instead of using a dropdown", async () => {
    const input = await openDealTools();
    expect(document.querySelector("select")).toBeNull();
    fireEvent.focus(input);
    expect(within(screen.getByTestId("list-deal-brands")).getAllByRole("option").map((o) => o.textContent)).toEqual(["Alpha Audio", "Zeta Guitars"]);

    fireEvent.change(input, { target: { value: "zet" } });
    expect(within(screen.getByTestId("list-deal-brands")).getAllByRole("option")).toHaveLength(2);   // Zeta Guitars + "use what I typed"
    fireEvent.mouseDown(within(screen.getByTestId("list-deal-brands")).getByRole("option", { name: "Zeta Guitars" }));   // options pick on mouse down so the blur does not close the list first
    expect(input).toHaveValue("Zeta Guitars");

    // Editing a chosen brand starts a new search; a name that matches nothing can be used as a brand you found yourself.
    fireEvent.change(input, { target: { value: "Rode Microphones" } });
    const options = within(screen.getByTestId("list-deal-brands")).getAllByRole("option");
    expect(options).toHaveLength(1);
    expect(options[0]).toHaveTextContent("Use “Rode Microphones” — a brand I found myself");
    fireEvent.keyDown(input, { key: "Enter" });
    expect(input).toHaveValue("Rode Microphones");
    expect(screen.queryByTestId("list-deal-brands")).not.toBeInTheDocument();

    fireEvent.click(screen.getByTestId("button-clear-deal-brand"));
    expect(input).toHaveValue("");
  });

  it("has no platform choice, and Instagram deliverables only (Reel, Story, Static post, Instagram Live)", async () => {
    await openDealTools();
    expect(screen.queryByText("Platform")).not.toBeInTheDocument();
    const deliverables = screen.getByText("Deliverable type").parentElement!;
    expect(within(deliverables).getAllByRole("button").map((b) => b.textContent)).toEqual(["Reel", "Story", "Static post", "Instagram Live"]);
    for (const gone of ["TikTok", "YouTube", "TikTok video", "YouTube integration"]) expect(screen.queryByRole("button", { name: gone })).not.toBeInTheDocument();
  });

  it("Rate Intelligence asks for a brand and a deliverable, then shows the estimate it gets for the pitched brand", async () => {
    const input = await openDealTools();
    fireEvent.click(screen.getByText("Rate Intelligence"));
    expect(screen.getByText(/Choose the/)).toHaveTextContent("Choose the brand you are working on above");
    fireEvent.change(input, { target: { value: "Alpha" } });
    fireEvent.mouseDown(within(screen.getByTestId("list-deal-brands")).getByRole("option", { name: "Alpha Audio" }));
    expect(screen.getByText(/Set a/)).toHaveTextContent("Set a Deliverable type in the Deal context above");

    fireEvent.click(screen.getByRole("button", { name: "Reel" }));
    fireEvent.click(screen.getByRole("button", { name: /Broad/ }));
    fireEvent.change(screen.getByPlaceholderText("Duration (months)"), { target: { value: "6" } });
    fireEvent.click(screen.getByRole("button", { name: "Includes paid usage or whitelisting" }));
    expect(rateRequests).toHaveLength(0);                                   // nothing is asked until the button is pressed
    fireEvent.click(screen.getByTestId("button-estimate-rate"));
    expect(await screen.findByTestId("rate-estimate")).toBeInTheDocument();
    expect(rateRequests).toEqual([{
      brand_id: 1, brand_name: "Alpha Audio", platform: "Instagram", deliverable_type: "Reel",
      exclusivity: "Broad", usage: "Includes paid usage or whitelisting", duration_months: 6,
    }]);
    expect(screen.getByTestId("rate-low")).toHaveTextContent("$250");
    expect(screen.getByTestId("rate-typical")).toHaveTextContent("$420");
    expect(screen.getByTestId("rate-high")).toHaveTextContent("$700");
    expect(screen.getByTestId("rate-confidence")).toHaveTextContent("Medium confidence");
    expect(screen.getByText("Anchored on the median of creators your size.")).toBeInTheDocument();
    expect(screen.getByText(/Adds about 35% for paid usage/)).toBeInTheDocument();
    expect(screen.getByTestId("rate-data-used")).toHaveTextContent("Beauty creators with 50k-100k followers · 29 creators, 34 prices, median $442 · brand: 1,631,664 Instagram followers · 2 creators the brand has paid");

    // Changing a deal term makes the shown estimate stale.
    fireEvent.click(screen.getByRole("button", { name: "Story" }));
    expect(screen.queryByTestId("rate-estimate")).not.toBeInTheDocument();
    expect(screen.getByTestId("button-estimate-rate")).toBeInTheDocument();
  });

  it("sends the exclusivity months only for Narrow or Broad, as a whole number", async () => {
    const input = await openDealTools();
    fireEvent.click(screen.getByText("Rate Intelligence"));
    fireEvent.change(input, { target: { value: "Alpha" } });
    fireEvent.mouseDown(within(screen.getByTestId("list-deal-brands")).getByRole("option", { name: "Alpha Audio" }));
    fireEvent.click(screen.getByRole("button", { name: "Reel" }));
    fireEvent.click(screen.getByRole("button", { name: /Narrow/ }));
    fireEvent.change(screen.getByPlaceholderText("Duration (months)"), { target: { value: "2.5" } });
    fireEvent.click(screen.getByTestId("button-estimate-rate"));
    await screen.findByTestId("rate-estimate");
    expect(rateRequests[0]).toMatchObject({ exclusivity: "Narrow", duration_months: 3 });

    // Switching to None hides the months box and the months are no longer sent, even though 2.5 is still typed.
    fireEvent.click(screen.getByRole("button", { name: "None" }));
    fireEvent.click(screen.getByTestId("button-estimate-rate"));
    await waitFor(() => expect(rateRequests).toHaveLength(2));
    expect(rateRequests[1]).toMatchObject({ exclusivity: "None" });
    expect(rateRequests[1]).not.toHaveProperty("duration_months");
  });

  it("sends only the brand name for a brand that was not pitched, and Instagram Live as the deliverable", async () => {
    const input = await openDealTools();
    fireEvent.click(screen.getByText("Rate Intelligence"));
    fireEvent.change(input, { target: { value: "Rode Microphones" } });
    fireEvent.keyDown(input, { key: "Enter" });
    fireEvent.click(screen.getByRole("button", { name: "Instagram Live" }));
    fireEvent.click(screen.getByTestId("button-estimate-rate"));
    await screen.findByTestId("rate-estimate");
    expect(rateRequests).toEqual([{ brand_name: "Rode Microphones", platform: "Instagram", deliverable_type: "Instagram Live" }]);
  });
});
