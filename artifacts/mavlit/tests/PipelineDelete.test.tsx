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
let deleteCalls: string[];
let deleteStatus: number;
let profileApi: ReturnType<typeof installProfileApi>;

beforeEach(() => {
  pitches = [pitch(1, "Alpha Audio"), pitch(2, "Zeta Guitars")];
  deleteCalls = [];
  deleteStatus = 200;
  profileApi = installProfileApi(creatorProfile());
  const base = globalThis.fetch;
  const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
  vi.stubGlobal("fetch", vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = new URL(String(input), window.location.origin);
    if (url.pathname === "/api/mavlit/pitches/me") return json({ pitches, total: pitches.length });
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

  it("Rate Intelligence uses Instagram, and says so when there is no benchmark for Instagram Live", async () => {
    await openDealTools();
    fireEvent.click(screen.getByText("Rate Intelligence"));
    expect(screen.getByText(/Set a/)).toHaveTextContent("Set a Deliverable type in the Deal context above");
    fireEvent.click(screen.getByRole("button", { name: "Instagram Live" }));
    expect(screen.getAllByText("Instagram").length).toBeGreaterThan(0);                       // the context chip
    expect(screen.getByText(/No benchmark data yet for this combination/)).toBeInTheDocument();
  });
});
