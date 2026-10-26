import { act, cleanup, fireEvent, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Route, Switch } from "wouter";
import BrandMatches from "@/pages/BrandMatches";
import ProfileSettings from "@/pages/ProfileSettings";
import { installAiMatchesApi, rankedBrands, ranking } from "./fixtures/aiMatchesApi";
import { renderProfile } from "./renderProfile";
import { settle, startMatchesClock, stopMatchesClock, tick } from "./aiMatchesTestUtils";

// Only page chrome is omitted: the auth provider, router, hooks, query cache,
// API serialization, matches section and brand cards are real.
vi.mock("@/components/Navbar", () => ({ default: () => null }));
vi.mock("@/components/Footer", () => ({ default: () => null }));

let fixture: ReturnType<typeof installAiMatchesApi>;
beforeEach(() => {
  startMatchesClock();
  fixture = installAiMatchesApi();
});
afterEach(() => {
  cleanup();
  fixture.assertIsolated();
  stopMatchesClock();
});

function mountMatches(path = "/brand-matches?version=v3") {
  window.history.replaceState(null, "", path);
  return renderProfile(<BrandMatches />);
}

// Exercise HTTP/transport/schema failures independently of job status "failed".
describe("Matches page request errors and expired sessions", () => {
  const cardOrder = () => screen.getAllByRole("article").map((card) => card.getAttribute("data-testid"));
  const previousCards = ["card-ai-brand-30", "card-ai-brand-10", "card-ai-brand-20"];

  it("recovers from a transient GET failure without showing a terminal error or starting a ranking", async () => {
    let attempts = 0;
    fixture.handle("GET", () => ++attempts === 1
      ? { body: { detail: "Matches temporarily unavailable" }, status: 503 }
      : { body: ranking("completed") });
    mountMatches();
    await settle();
    expect(screen.getByRole("status")).toHaveTextContent("Loading AI matches");
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(screen.getByTestId("button-ai-rerank")).toBeDisabled();
    await tick(999);
    expect(fixture.calls("GET")).toHaveLength(1);
    await tick(1);
    expect(cardOrder()).toEqual(previousCards);
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Refresh matches" })).toBeEnabled();
    await tick(180_000);
    expect(fixture.calls("GET")).toHaveLength(2);
    expect(fixture.calls("POST")).toHaveLength(0);
  });

  it.each([
    { name: "network failure", fail: () => { throw new TypeError("Failed to fetch"); }, message: "Failed to fetch" },
    { name: "HTTP 503", fail: () => ({ body: { detail: "Matches temporarily unavailable" }, status: 503 }), message: "Matches temporarily unavailable" },
    { name: "invalid ranking", fail: () => ({ body: { status: "completed", matches: null } }), message: "Invalid AI ranking response" },
  ])("shows a readable $name error after the bounded GET retry, not a spinner or backend-job failure", async ({ fail, message }) => {
    fixture.handle("GET", fail);
    mountMatches();
    await settle();
    await tick(1_000);
    expect(screen.getByRole("alert")).toHaveTextContent(message);
    expect(screen.queryByText("Loading AI matches…")).not.toBeInTheDocument();
    expect(screen.queryByTestId("status-v3-updating")).not.toBeInTheDocument();
    expect(screen.queryByTestId("text-ai-failed")).not.toBeInTheDocument();
    expect(screen.queryByRole("article")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Refresh matches" })).toBeEnabled();
    await tick(180_000);
    expect(fixture.calls("GET")).toHaveLength(2);
    expect(fixture.calls("POST")).toHaveLength(0);
  });

  it.each([
    { name: "HTTP 503", body: { detail: "Cannot check matches right now" }, status: 503, message: "Cannot check matches right now" },
    { name: "invalid ranking", body: ranking("completed", { matches: null as never }), status: 200, message: "Invalid AI ranking response" },
  ])("keeps prior cards and their order after a $name GET refetch failure", async ({ body, status, message }) => {
    const page = mountMatches();
    await settle();
    fixture.respond("GET", body, "v3", status);
    act(() => { void page.queryClient.refetchQueries({ queryKey: ["ai-brand-matches", "v3"] }); });
    await settle();
    await tick(1_000);
    expect(screen.getByRole("alert")).toHaveTextContent(message);
    expect(cardOrder()).toEqual(previousCards);
    expect(screen.getByTestId("text-ai-meta")).toHaveTextContent("3 brands");
    expect(screen.getByRole("button", { name: "Refresh matches" })).toBeEnabled();
    await tick(180_000);
    expect(fixture.calls("GET")).toHaveLength(3);
    expect(fixture.calls("POST")).toHaveLength(0);
  });

  it.each([
    { name: "network failure", fail: () => { throw new TypeError("Failed to fetch"); }, message: "Failed to fetch" },
    { name: "HTTP 503", fail: () => ({ body: { detail: "Unable to refresh matches right now" }, status: 503 }), message: "Unable to refresh matches right now" },
    { name: "invalid ranking", fail: () => ({ body: { status: "queued", matches: "not-an-array" } }), message: "Invalid AI ranking response" },
  ])("retains cards after a refresh POST $name and recovers on the next explicit refresh", async ({ fail, message }) => {
    mountMatches();
    await settle();
    fixture.handle("POST", fail);
    fireEvent.click(screen.getByRole("button", { name: "Refresh matches" }));
    await settle();
    expect(screen.getByRole("alert")).toHaveTextContent(message);
    expect(cardOrder()).toEqual(previousCards);
    expect(screen.queryByTestId("text-ai-failed")).not.toBeInTheDocument();
    expect(screen.queryByTestId("status-v3-updating")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Refresh matches" })).toBeEnabled();
    await tick(180_000);
    expect(fixture.calls("POST")).toHaveLength(1);

    fixture.respond("POST", ranking("queued"));
    fixture.respond("GET", ranking("queued"));
    fireEvent.click(screen.getByRole("button", { name: "Refresh matches" }));
    await settle();
    expect(fixture.calls("POST")).toHaveLength(2);
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(cardOrder()).toEqual(previousCards);
    expect(screen.getByTestId("button-ai-rerank")).toBeDisabled();
    expect(screen.getByTestId("status-v3-updating")).toHaveTextContent("Previous results below are not final.");
    fixture.respond("GET", ranking("completed", { matches: rankedBrands.slice(1), total: 2 }));
    await tick(3_000);
    expect(cardOrder()).toEqual(previousCards.slice(1));
    expect(screen.getByTestId("text-ai-meta")).toHaveTextContent("2 brands");
    expect(screen.queryByTestId("status-v3-updating")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Refresh matches" })).toBeEnabled();
    const reads = fixture.calls("GET").length;
    await tick(180_000);
    expect(fixture.calls("POST")).toHaveLength(2);
    expect(fixture.calls("GET")).toHaveLength(reads);
  });

  it.each([
    { method: "GET", status: 401 },
    { method: "GET", status: 403 },
    { method: "POST", status: 401 },
    { method: "POST", status: 403 },
  ] as const)("$method $status redirects through the real auth listener without retrying or leaving stale matches", async ({ method, status }) => {
    const dispatch = vi.spyOn(window, "dispatchEvent");
    const body = status === 401
      ? { detail: "Your session has expired. Please sign in again." }
      : { detail: { error: "profile_incomplete" }, message: "Complete your creator profile." };
    if (method === "GET") fixture.respond("GET", body, "v3", status);
    window.history.replaceState(null, "", "/brand-matches?version=v3");
    const page = renderProfile(
      <Switch>
        <Route path="/brand-matches"><BrandMatches /></Route>
        <Route path="/signin"><h1>Sign in to continue</h1></Route>
        <Route path="/creator-profile"><h1>Complete your creator profile</h1></Route>
      </Switch>,
    );
    await settle();
    if (method === "POST") {
      expect(cardOrder()).toEqual(previousCards);
      fixture.respond("POST", body, "v3", status);
      fireEvent.click(screen.getByRole("button", { name: "Refresh matches" }));
      await settle();
    }
    expect(dispatch).toHaveBeenCalledWith(expect.objectContaining({
      type: status === 401 ? "mavlit:unauthorized" : "mavlit:profile-incomplete",
    }));
    expect(dispatch).not.toHaveBeenCalledWith(expect.objectContaining({
      type: status === 401 ? "mavlit:profile-incomplete" : "mavlit:unauthorized",
    }));
    expect(window.location.pathname).toBe(status === 401 ? "/signin" : "/creator-profile");
    expect(screen.getByRole("heading", {
      name: status === 401 ? "Sign in to continue" : "Complete your creator profile",
    })).toBeInTheDocument();
    expect(screen.queryByRole("article")).not.toBeInTheDocument();
    expect(screen.queryByTestId("section-matches-v3")).not.toBeInTheDocument();
    if (status === 401) {
      expect(window.location.search).toBe("?return_to=/matches");
      expect(page.queryClient.getQueryData(["ai-brand-matches", "v3"])).toBeUndefined();
    }
    await tick(180_000);
    expect(fixture.calls("GET")).toHaveLength(1);
    expect(fixture.calls("POST")).toHaveLength(method === "POST" ? 1 : 0);
  });
});

describe("Matches page V3 integration", () => {
  it("a successful profile save opens V3 despite stored V1 and polls without an extra ranking POST", async () => {
    localStorage.setItem("mavlit_matches_version", "v1");
    fixture.respond("GET", ranking("queued"));
    window.history.replaceState(null, "", "/profile");
    renderProfile(
      <Switch>
        <Route path="/profile"><ProfileSettings /></Route>
        <Route path="/brand-matches"><BrandMatches /></Route>
      </Switch>,
    );
    await settle();
    fireEvent.click(screen.getByRole("button", { name: "Continue" }));
    fireEvent.click(screen.getByRole("button", { name: "Continue" }));
    fireEvent.change(screen.getByTestId("input-brand-preferences"), {
      target: { value: "Avoid Unwanted Amplifiers" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save Profile" }));
    await settle();
    expect(fixture.profile.writes).toHaveLength(1);
    expect(window.location.pathname + window.location.search).toBe("/brand-matches?version=v3");
    expect(localStorage.getItem("mavlit_matches_version")).toBe("v3");
    expect(screen.getByTestId("section-matches-v3")).toBeInTheDocument();
    expect(screen.queryByTestId("section-matches-v2")).not.toBeInTheDocument();
    expect(screen.queryByRole("tab")).not.toBeInTheDocument();
    expect(fixture.calls("GET")).toHaveLength(1);
    expect(fixture.calls("POST")).toHaveLength(0);
    expect(screen.getByTestId("status-v3-updating")).toHaveTextContent("Previous results below are not final.");
    fixture.respond("GET", ranking("completed"));
    await tick(3_000);
    expect(fixture.calls("GET")).toHaveLength(2);
    expect(screen.queryByTestId("status-v3-updating")).not.toBeInTheDocument();
    expect(fixture.calls("POST")).toHaveLength(0);
    expect(fixture.requests.every(({ version }) => version === "v3")).toBe(true);
  });

  it.each(["v1", "v2"])("redirects a legacy %s link to V3 without fetching the legacy version", async (version) => {
    localStorage.setItem("mavlit_matches_version", version);
    mountMatches(`/brand-matches?version=${version}`);
    await settle();
    expect(window.location.search).toBe("?version=v3");
    expect(localStorage.getItem("mavlit_matches_version")).toBe("v3");
    expect(fixture.requests.map(({ method, version }) => `${method} ${version}`)).toEqual(["GET v3"]);
    expect(screen.getByTestId("section-matches-v3")).toBeInTheDocument();
  });

  it("defaults a plain Matches visit to V3 regardless of old saved selection", async () => {
    localStorage.setItem("mavlit_matches_version", "v2");
    mountMatches("/brand-matches");
    await settle();
    expect(screen.getByTestId("section-matches-v3")).toBeInTheDocument();
    expect(fixture.requests.map(({ version }) => version)).toEqual(["v3"]);
  });

  it("shows the three-minute pause while retaining non-final previous cards, with no more polling", async () => {
    fixture.respond("GET", ranking("queued"));
    mountMatches();
    await settle();
    expect(screen.getAllByRole("article")[0].parentElement).toHaveAttribute("aria-busy", "true");
    await tick(179_999);
    expect(screen.getByTestId("status-v3-updating")).toHaveTextContent("Updating your matches");
    await tick(1);
    expect(screen.getByTestId("status-v3-updating")).toHaveTextContent("Still working — check back shortly");
    expect(screen.getByTestId("status-v3-updating")).toHaveTextContent("Automatic checks have paused.");
    expect(screen.getByTestId("status-v3-updating")).toHaveTextContent("Previous results below are not final.");
    expect(screen.getByRole("button", { name: "Check status" })).toBeEnabled();
    expect(screen.getByTestId("button-ai-rerank")).toBeDisabled();
    const reads = fixture.calls("GET").length;
    await tick(30_000);
    expect(fixture.calls("GET")).toHaveLength(reads);
    expect(fixture.calls("POST")).toHaveLength(0);
    expect(screen.getAllByRole("article")).toHaveLength(3);
  });

  it.each(["completed", "failed"] as const)("checks a paused job without POSTing and handles %s", async (status) => {
    fixture.respond("GET", ranking("queued"));
    mountMatches();
    await settle();
    await tick(180_000);
    const reads = fixture.calls("GET").length;
    fixture.respond("GET", ranking("running"));
    fireEvent.click(screen.getByRole("button", { name: "Check status" }));
    await settle();
    expect(fixture.calls("GET")).toHaveLength(reads + 1);
    expect(fixture.calls("POST")).toHaveLength(0);
    expect(screen.queryByRole("button", { name: "Check status" })).not.toBeInTheDocument();
    expect(screen.getByTestId("status-v3-updating")).toHaveTextContent("Updating your matches");
    expect(screen.getByTestId("status-v3-updating")).toHaveTextContent("Previous results below are not final.");
    expect(screen.getAllByRole("article")[0].parentElement).toHaveAttribute("aria-busy", "true");
    expect(screen.getByTestId("button-ai-rerank")).toBeDisabled();

    fixture.respond("GET", ranking(status, {
      matches: rankedBrands.slice(1), total: 2,
    }));
    await tick(3_000);
    expect(screen.queryByTestId("status-v3-updating")).not.toBeInTheDocument();
    expect(screen.getAllByRole("article")[0].parentElement).toHaveAttribute("aria-busy", "false");
    expect(screen.getByRole("button", { name: "Refresh matches" })).toBeEnabled();
    expect(screen.getAllByRole("article")).toHaveLength(2);
    if (status === "failed") {
      expect(screen.getByTestId("text-ai-failed")).toHaveTextContent("Fixture ranking failed");
      expect(screen.getByRole("button", { name: "Try again" })).toBeEnabled();
    } else {
      expect(screen.queryByTestId("text-ai-failed")).not.toBeInTheDocument();
    }
    await tick(180_000);
    expect(fixture.calls("GET")).toHaveLength(reads + 2);
    expect(fixture.calls("POST")).toHaveLength(0);
  });

  it("offers Check status again after another bounded window, including an empty previous ranking", async () => {
    fixture.respond("GET", ranking("running", { total: 0, matches: [] }));
    mountMatches();
    await settle();
    await tick(180_000);
    fireEvent.click(screen.getByRole("button", { name: "Check status" }));
    await settle();
    expect(screen.queryByRole("button", { name: "Check status" })).not.toBeInTheDocument();
    expect(screen.queryByRole("article")).not.toBeInTheDocument();
    await tick(180_000);
    expect(screen.getByRole("button", { name: "Check status" })).toBeEnabled();
    expect(screen.getByTestId("button-ai-rerank")).toBeDisabled();
    expect(fixture.calls("POST")).toHaveLength(0);
  });

  it.each(["retry", "manual refresh"] as const)("%s sends one POST and resumes polling through completion", async (action) => {
    fixture.respond("GET", ranking(action === "retry" ? "failed" : "completed"));
    mountMatches();
    await settle();
    expect(fixture.calls("POST")).toHaveLength(0);
    await tick(6_000);
    expect(fixture.calls("GET")).toHaveLength(1);
    fixture.respond("GET", ranking("queued"));
    fireEvent.click(screen.getByRole("button", { name: action === "retry" ? "Try again" : "Refresh matches" }));
    await settle();
    expect(fixture.calls("POST")).toHaveLength(1);
    expect(screen.getByTestId("button-ai-rerank")).toBeDisabled();
    expect(screen.getByTestId("status-v3-updating")).toHaveTextContent("Previous results below are not final.");
    fireEvent.click(screen.getByTestId("button-ai-rerank"));
    await settle();
    expect(fixture.calls("POST")).toHaveLength(1);
    const reads = fixture.calls("GET").length;
    fixture.respond("GET", ranking("running"));
    await tick(2_999);
    expect(fixture.calls("GET")).toHaveLength(reads);
    await tick(1);
    expect(fixture.calls("GET")).toHaveLength(reads + 1);
    fixture.respond("GET", ranking("completed", {
      matches: rankedBrands.slice(1), total: 2, ranked_at: "2026-10-16T12:00:00Z",
    }));
    await tick(3_000);
    expect(screen.queryByTestId("status-v3-updating")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Refresh matches" })).toBeEnabled();
    expect(screen.getAllByRole("article").map((card) => card.getAttribute("data-testid")))
      .toEqual(["card-ai-brand-10", "card-ai-brand-20"]);
    await tick(12_000);
    expect(fixture.calls("GET")).toHaveLength(reads + 2);
    expect(fixture.calls("POST")).toHaveLength(1);
  });

  it.each([
    ["neither Apollo nor Hunter", false, false],
    ["Apollo only", true, false],
    ["Hunter only", false, true],
  ])("Contact Intel says MAVLIT could not verify a main email verified by %s", async (_label, apollo, hunter) => {
    const aiFetch = globalThis.fetch;
    vi.stubGlobal("fetch", vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const path = new URL(String(input), window.location.origin).pathname;
      if (path === "/api/mavlit/brands/10") {
        return new Response(JSON.stringify({ brand_id: 10, name: "Alpha Audio", other_contacts: [],
          top_contact: { name: "Only Person", email: "only@alpha.com", title: "Partnerships", apollo_verified: apollo, hunter_verified: hunter, still_at_brand: null } }),
          { status: 200, headers: { "Content-Type": "application/json" } });
      }
      if (path === "/api/mavlit/matches/me/brands/10/posts") {
        return new Response(JSON.stringify({ brand_raw_id: 10, brand_name: "Alpha Audio", posts: [] }), { status: 200, headers: { "Content-Type": "application/json" } });
      }
      return aiFetch(input, init);
    }));
    mountMatches();
    await settle();
    fireEvent.click(screen.getByTestId("button-ai-brand-10"));
    await settle();
    expect(screen.getByText("only@alpha.com")).toBeInTheDocument();
    expect(screen.getByTestId("note-unverified-email")).toHaveTextContent("MAVLIT could not verify this email");
    expect(screen.queryByTestId("badge-verified-email")).not.toBeInTheDocument();   // never both messages
    expect(screen.queryByTestId("button-view-more-contacts")).not.toBeInTheDocument();
  });

  it("Contact Intel shows the best contact and lists the other contacts under View more", async () => {
    const aiFetch = globalThis.fetch;
    const contact = (name: string, email: string, extra = {}) => ({ name, email, title: "Partnerships", apollo_verified: false, hunter_verified: false, still_at_brand: null, ...extra });
    vi.stubGlobal("fetch", vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      if (new URL(String(input), window.location.origin).pathname === "/api/mavlit/brands/10") {
        return new Response(JSON.stringify({
          brand_id: 10, name: "Alpha Audio", top_contact: contact("Top Person", "top@alpha.com", { apollo_verified: true, hunter_verified: true, still_at_brand: true }),
          other_contacts: [contact("Second Person", "second@alpha.com", { apollo_verified: true }), contact("Third Person", "third@alpha.com"),
            contact("Fourth Person", "fourth@alpha.com", { apollo_verified: true, hunter_verified: true }),
            ...Array.from({ length: 8 }, (_, i) => contact(`Extra ${i + 1}`, `extra${i + 1}@alpha.com`, { hunter_verified: true }))],
        }), { status: 200, headers: { "Content-Type": "application/json" } });
      }
      if (new URL(String(input), window.location.origin).pathname === "/api/mavlit/matches/me/brands/10/posts") {
        return new Response(JSON.stringify({ brand_raw_id: 10, brand_name: "Alpha Audio", posts: [] }), { status: 200, headers: { "Content-Type": "application/json" } });
      }
      return aiFetch(input, init);
    }));
    mountMatches();
    await settle();
    fireEvent.click(screen.getByTestId("button-ai-brand-10"));
    await settle();
    expect(screen.getByText("Top Person")).toBeInTheDocument();
    expect(screen.queryByTestId("note-unverified-email")).not.toBeInTheDocument();   // the top contact is verified
    expect(screen.getByTestId("badge-verified-email")).toHaveTextContent("Email verified by MAVLIT");
    expect(screen.queryByText("Second Person")).not.toBeInTheDocument();
    fireEvent.click(screen.getByTestId("button-view-more-contacts"));
    const others = screen.getByTestId("list-other-contacts");
    expect(others).toHaveTextContent("Second Person");
    expect(others).toHaveTextContent("second@alpha.com");
    expect(others).toHaveTextContent("Third Person");
    // Anything short of "verified by both providers" gets the warning: Second (Apollo only), Third (neither)
    // and the eight Extra contacts (Hunter only). No provider name is shown to the user.
    expect(screen.getAllByTestId("note-unverified-email")).toHaveLength(10);
    expect(screen.getAllByTestId("badge-verified-email")).toHaveLength(2);        // the main contact and Fourth Person
    expect(others).not.toHaveTextContent(/Apollo|Hunter/);
    expect(others).toHaveTextContent("MAVLIT could not verify this email");
    // The list scrolls inside a fixed height instead of growing with every contact.
    expect(others.className).toContain("max-h-64");
    expect(others.className).toContain("overflow-y-auto");
    expect(others.querySelectorAll("li")).toHaveLength(11);
    // Emails verified by MAVLIT (both providers) are listed first, although Fourth Person comes after
    // Second and Third in the API's order. The rest keep the API order.
    const names = [...others.querySelectorAll("li > p:first-child")].map((node) => node.textContent);
    expect(names[0]).toBe("Fourth Person");
    expect(names.slice(1, 3)).toEqual(["Second Person", "Third Person"]);
    expect(within(others.querySelectorAll("li")[0] as HTMLElement).getByTestId("badge-verified-email")).toBeInTheDocument();
    fireEvent.click(screen.getByTestId("button-view-more-contacts"));
    expect(screen.queryByTestId("list-other-contacts")).not.toBeInTheDocument();
  });

  const stubBrandDetail = () => {
    const aiFetch = globalThis.fetch;
    vi.stubGlobal("fetch", vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const path = new URL(String(input), window.location.origin).pathname;
      const json = (body: unknown) => new Response(JSON.stringify(body), { status: 200, headers: { "Content-Type": "application/json" } });
      if (path === "/api/mavlit/brands/10") return json({ brand_id: 10, name: "Alpha Audio", top_contact: null, other_contacts: [] });
      if (path === "/api/mavlit/matches/me/brands/10/posts") return json({ brand_raw_id: 10, brand_name: "Alpha Audio", posts: [] });
      return aiFetch(input, init);
    }));
  };

  it("Contact Intel always shows a contact's LinkedIn, with an Open LinkedIn button", async () => {
    const aiFetch = globalThis.fetch;
    const contact = (name: string, extra = {}) => ({ name, email: `${name.split(" ")[0].toLowerCase()}@alpha.com`, title: "Partnerships", apollo_verified: true, hunter_verified: true, still_at_brand: true, linkedin_url: null, ...extra });
    vi.stubGlobal("fetch", vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const path = new URL(String(input), window.location.origin).pathname;
      const json = (body: unknown) => new Response(JSON.stringify(body), { status: 200, headers: { "Content-Type": "application/json" } });
      if (path === "/api/mavlit/brands/10") {
        return json({ brand_id: 10, name: "Alpha Audio",
          top_contact: contact("Top Person", { linkedin_url: "http://www.linkedin.com/in/top-person" }),
          other_contacts: [contact("Second Person"), contact("Third Person", { linkedin_url: "javascript:alert(1)" }),
            contact("Fourth Person", { linkedin_url: "https://www.linkedin.com/in/fourth" })] });
      }
      if (path === "/api/mavlit/matches/me/brands/10/posts") return json({ brand_raw_id: 10, brand_name: "Alpha Audio", posts: [] });
      return aiFetch(input, init);
    }));
    mountMatches();
    await settle();
    fireEvent.click(screen.getByTestId("button-ai-brand-10"));
    await settle();

    // Main contact: the URL is on screen without any click, and the button opens it in a new tab.
    expect(screen.queryByRole("button", { name: /Show LinkedIn|Hide LinkedIn|Copy link/ })).not.toBeInTheDocument();
    expect(screen.getByText("http://www.linkedin.com/in/top-person")).toBeInTheDocument();
    const open = screen.getByRole("link", { name: "Open LinkedIn for Top Person" });
    expect(open).toHaveTextContent("Open LinkedIn");
    expect(open).toHaveAttribute("href", "http://www.linkedin.com/in/top-person");
    expect(open).toHaveAttribute("target", "_blank");
    expect(open).toHaveAttribute("rel", expect.stringContaining("noopener"));

    // View more: a contact without LinkedIn has no row; a non-http value is shown as text with no button.
    fireEvent.click(screen.getByTestId("button-view-more-contacts"));
    const others = screen.getByTestId("list-other-contacts");
    expect(within(others).getAllByTestId("linkedin-row")).toHaveLength(2);
    expect(within(others).getByText("javascript:alert(1)")).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Open LinkedIn for Third Person" })).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Open LinkedIn for Fourth Person" })).toHaveAttribute("href", "https://www.linkedin.com/in/fourth");
  });

  it("filters the matches by one or several niche chips, none chosen meaning all", async () => {
    fixture.respond("GET", ranking("completed", { matches: [
      { brand_raw_id: 10, brand_name: "Alpha Audio", niche: "Music", rank: 1, confidence: 96, reason: "x" },
      { brand_raw_id: 20, brand_name: "Beta Gadgets", niche: "Tech", rank: 2, confidence: 90, reason: "x" },
      { brand_raw_id: 30, brand_name: "Gamma Strings", niche: "Music", rank: 3, confidence: 80, reason: "x" },
      { brand_raw_id: 40, brand_name: "Delta Glow", niche: "Beauty", rank: 4, confidence: 70, reason: "x" },
    ], total: 4 }));
    mountMatches();
    await settle();
    const names = () => screen.getAllByRole("article").map((card) => card.getAttribute("data-testid"));
    const chip = (niche: string) => within(screen.getByTestId("match-niches")).getByRole("button", { name: new RegExp(`^${niche}`) });
    const chips = () => within(screen.getByTestId("match-niches")).getAllByTestId("chip-niche").map((c) => c.textContent);
    // Most brands first, then A to Z; each with its brand count. Three niches: no "View more" needed.
    expect(chips()).toEqual(["Music2", "Beauty1", "Tech1"]);
    expect(screen.queryByTestId("button-niches-more")).not.toBeInTheDocument();
    expect(names()).toHaveLength(4);

    fireEvent.click(chip("Music"));
    expect(chip("Music")).toHaveAttribute("aria-pressed", "true");
    expect(names()).toEqual(["card-ai-brand-10", "card-ai-brand-30"]);
    expect(screen.getByText("Showing 2 of 4 brands in Music")).toBeInTheDocument();

    fireEvent.click(chip("Tech"));   // a second niche widens the list
    expect(names()).toEqual(["card-ai-brand-10", "card-ai-brand-20", "card-ai-brand-30"]);
    expect(screen.getByText("Showing 3 of 4 brands in Music, Tech")).toBeInTheDocument();

    fireEvent.click(chip("Tech"));   // choosing it again removes it
    fireEvent.click(chip("Music"));
    expect(names()).toHaveLength(4);
    expect(screen.queryByTestId("button-clear-niches")).not.toBeInTheDocument();

    // Together with search, and the Clear button.
    fireEvent.click(chip("Music"));
    fireEvent.change(screen.getByRole("searchbox", { name: "Search brand matches" }), { target: { value: "beta" } });
    expect(screen.getByText(/No brands match “beta” in Music/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Clear brand search" }));
    fireEvent.click(screen.getByTestId("button-clear-niches"));
    expect(chip("Music")).toHaveAttribute("aria-pressed", "false");
    expect(names()).toHaveLength(4);
    expect(fixture.calls("GET")).toHaveLength(1);   // filtering is local; no new request
  });

  it("shows every niche as a chip in the default colour, most brands first, with no View more", async () => {
    const niches = ["Music", "Music", "Music", "Tech", "Tech", "Beauty", "Beauty", "Fitness", "Travel", "Finance"];
    fixture.respond("GET", ranking("completed", { matches: niches.map((niche, index) => (
      { brand_raw_id: 100 + index, brand_name: `Brand ${index}`, niche, rank: index + 1, confidence: 90 - index, reason: "x" }
    )), total: niches.length }));
    mountMatches();
    await settle();
    const group = within(screen.getByTestId("match-niches"));
    expect(group.getAllByTestId("chip-niche").map((c) => c.textContent))
      .toEqual(["Music3", "Beauty2", "Tech2", "Finance1", "Fitness1", "Travel1"]);   // ties: A to Z
    expect(screen.queryByTestId("button-niches-more")).not.toBeInTheDocument();
    expect(screen.queryByText("View more")).not.toBeInTheDocument();
    // Placed below the intro text.
    const intro = screen.getByText(/MAVLIT AI ranking using your profile/);
    expect(intro.compareDocumentPosition(screen.getByTestId("match-niches")) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    // The chips use the default text colour; only the brand cards keep the niche colours.
    for (const chip of group.getAllByTestId("chip-niche")) {
      expect(chip.innerHTML).not.toMatch(/text-(violet|sky|pink|orange|emerald|fuchsia|amber|lime|yellow|red|cyan|teal|green|slate|indigo|blue|purple|rose)-/);
      expect(chip).toHaveClass("text-white");
    }
    expect(screen.getByTestId("text-ai-niche-100").className).toContain("text-violet-400");
    fireEvent.click(group.getByRole("button", { name: /^Travel/ }));
    expect(group.getByRole("button", { name: /^Travel/ })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getAllByRole("article")).toHaveLength(1);
  });

  it("lets the creator save and unsave a brand from its card and from the details panel", async () => {
    const aiFetch = globalThis.fetch;
    vi.stubGlobal("fetch", vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const path = new URL(String(input), window.location.origin).pathname;
      const json = (body: unknown) => new Response(JSON.stringify(body), { status: 200, headers: { "Content-Type": "application/json" } });
      if (path === "/api/mavlit/brands/10") return json({ brand_id: 10, name: "Alpha Audio", top_contact: null, other_contacts: [] });
      if (path === "/api/mavlit/matches/me/brands/10/posts") return json({ brand_raw_id: 10, brand_name: "Alpha Audio", posts: [] });
      return aiFetch(input, init);
    }));
    mountMatches();
    await settle();
    const cardButton = () => within(screen.getByTestId("card-ai-brand-10")).getByTestId("button-save-brand-10");
    expect(cardButton()).toHaveTextContent(/^$/);                                        // the bookmark icon only, no text
    expect(cardButton()).toHaveAccessibleName("Save Alpha Audio");
    expect(cardButton()).toHaveAttribute("aria-pressed", "false");

    fireEvent.click(cardButton());
    await settle();
    expect(cardButton()).toHaveTextContent(/^$/);
    expect(cardButton()).toHaveAccessibleName("Remove Alpha Audio from saved brands");
    expect(cardButton()).toHaveAttribute("aria-pressed", "true");
    expect(fixture.savedBrands.map((brand) => brand.brand_id)).toEqual([10]);           // POST /saved-brands reached the server
    expect(screen.queryByText("Contact Intel", { selector: "p" })).not.toBeInTheDocument();                // clicking Save does not open the details

    // The details panel shows the same state and can unsave.
    fireEvent.click(screen.getByTestId("card-ai-brand-10"));
    await settle();
    const panelButton = () => screen.getAllByTestId("button-save-brand-10").find((button) => !screen.getByTestId("card-ai-brand-10").contains(button))!;
    expect(panelButton()).toHaveAttribute("aria-pressed", "true");
    fireEvent.click(panelButton());
    await settle();
    expect(fixture.savedBrands).toEqual([]);                                             // DELETE /saved-brands/10
    expect(cardButton()).toHaveAttribute("aria-pressed", "false");
    expect(fixture.savedCalls).toEqual(["GET me", "POST", "DELETE 10"]);                 // one list request, shared by every button
  });

  it("shows the fit as a circle around the percentage, not a bar", async () => {
    mountMatches();
    await settle();
    const card = within(screen.getByTestId("card-ai-brand-10"));
    const ring = card.getByTestId("ring-fit");
    expect(ring).toHaveAttribute("role", "progressbar");
    expect(ring).toHaveAttribute("aria-valuenow", "96");
    expect(ring).toHaveTextContent("96%");
    expect(ring).toHaveTextContent("fit");
    const arc = ring.querySelectorAll("circle")[1];
    const [filled, total] = arc.getAttribute("stroke-dasharray")!.split(" ").map(Number);
    expect(filled / total).toBeCloseTo(0.96, 2);                       // 96% of the circle is drawn
    expect(card.queryByText("96% fit")).not.toBeInTheDocument();       // the old text badge is gone
    expect(card.getAllByRole("progressbar")).toHaveLength(1);          // and so is the straight bar
  });

  it("has a Contact Intel button that opens the details, then a Create pitch email button last on the card", async () => {
    stubBrandDetail();
    mountMatches();
    await settle();
    const card = screen.getByTestId("card-ai-brand-10");
    const intel = within(card).getByTestId("button-contact-intel-10");
    const pitch = within(card).getByTestId("button-pitch-10");
    expect(intel).toHaveTextContent("Contact Intel");
    expect(intel).toHaveTextContent("Open match for available details");
    expect(pitch).toHaveTextContent("Create pitch email →");
    expect(intel.compareDocumentPosition(pitch) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(card.lastElementChild).toContainElement(pitch);              // the last thing in the card
    fireEvent.click(intel);
    await settle();
    expect(screen.getByText("Contact Intel", { selector: "p" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Close" }));
    await settle();
    fireEvent.click(pitch);
    expect(window.location.pathname + window.location.search).toBe("/pitch?brand=Alpha%20Audio");
  });

  it("labels brands with a fit above 80% as the most relevant brand", async () => {
    fixture.respond("GET", ranking("completed", { matches: [
      { brand_raw_id: 10, brand_name: "Alpha Audio", niche: "Music", rank: 1, confidence: 96, reason: "x" },
      { brand_raw_id: 20, brand_name: "Beta Gadgets", niche: "Tech", rank: 2, confidence: 81, reason: "x" },
      { brand_raw_id: 30, brand_name: "Gamma Strings", niche: "Music", rank: 3, confidence: 80, reason: "x" },
      { brand_raw_id: 40, brand_name: "Delta Glow", niche: "Beauty", rank: 4, confidence: 60, reason: "x" },
    ], total: 4 }));
    mountMatches();
    await settle();
    expect(screen.getByTestId("badge-most-relevant-10")).toHaveTextContent("Most relevant brand");
    expect(screen.getByTestId("badge-most-relevant-20")).toBeInTheDocument();                 // 81%
    expect(screen.queryByTestId("badge-most-relevant-30")).not.toBeInTheDocument();           // exactly 80% is not "more than 80"
    expect(screen.queryByTestId("badge-most-relevant-40")).not.toBeInTheDocument();
  });

  it("colours only the niche text of each card by niche", async () => {
    fixture.respond("GET", ranking("completed", { matches: [
      { brand_raw_id: 10, brand_name: "Alpha Audio", niche: "Music", rank: 1, confidence: 96, reason: "x" },
      { brand_raw_id: 20, brand_name: "Beta Gadgets", niche: "Tech", rank: 2, confidence: 90, reason: "x" },
      { brand_raw_id: 30, brand_name: "Gamma Strings", niche: "music", rank: 3, confidence: 80, reason: "x" },
    ], total: 3 }));
    mountMatches();
    await settle();
    const music = screen.getByTestId("text-ai-niche-10");
    const tech = screen.getByTestId("text-ai-niche-20");
    expect(music.className).toContain("text-violet-400");
    expect(tech.className).toContain("text-sky-400");
    expect(screen.getByTestId("text-ai-niche-30").className).toContain("text-violet-400");   // same niche, same colour
    // Only the niche label is coloured; the brand name keeps its colour.
    expect(screen.getByTestId("button-ai-brand-10").className).toContain("text-white");
  });

  it("clicking anywhere on a brand card (text or empty space) opens its details", async () => {
    stubBrandDetail();
    mountMatches();
    await settle();
    expect(screen.getByTestId("card-ai-brand-10").className).toContain("cursor-pointer");
    expect(screen.queryByText("Contact Intel", { selector: "p" })).not.toBeInTheDocument();
    fireEvent.click(screen.getByTestId("text-ai-reason-10"));   // plain text inside the card
    await settle();
    expect(screen.getByText("Contact Intel", { selector: "p" })).toBeInTheDocument();
  });

  it("links and buttons inside a card keep their own action and do not open the details", async () => {
    stubBrandDetail();
    const reasons = ["One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight"];
    fixture.respond("GET", ranking("completed", { matches: [
      { brand_raw_id: 10, brand_name: "Alpha Audio", niche: "Music", rank: 1, confidence: 96, reason: "Audio content.", reasons, website: "https://alpha.example" },
    ], total: 1 }));
    mountMatches();
    await settle();
    fireEvent.click(screen.getByTestId("button-ai-brand-10"));          // the brand name is a link to its website
    fireEvent.click(screen.getByTestId("button-ai-reasons-10"));        // "Show all reasons"
    await settle();
    expect(screen.queryByText("Contact Intel", { selector: "p" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "View brand details" })).not.toBeInTheDocument();   // Contact Intel is the way in now
    fireEvent.click(screen.getByTestId("button-contact-intel-10"));
    await settle();
    expect(screen.getByText("Contact Intel", { selector: "p" })).toBeInTheDocument();
    expect(within(screen.getByTestId("card-ai-brand-10")).getByText("Why it's a match")).toHaveClass("font-bold", "text-white");
  });

  it("renders backend order including unwanted brands and restores it after search", async () => {
    mountMatches();
    await settle();
    const order = () => screen.getAllByRole("article").map((card) => card.getAttribute("data-testid"));
    expect(order()).toEqual(["card-ai-brand-30", "card-ai-brand-10", "card-ai-brand-20"]);
    expect(screen.getByTestId("card-brand-preferences")).toHaveTextContent("Avoid Unwanted Amplifiers");
    fireEvent.change(screen.getByRole("searchbox", { name: "Search brand matches" }), { target: { value: "Unwanted" } });
    expect(order()).toEqual(["card-ai-brand-20"]);
    fireEvent.click(screen.getByRole("button", { name: "Clear brand search" }));
    expect(order()).toEqual(["card-ai-brand-30", "card-ai-brand-10", "card-ai-brand-20"]);
    expect(fixture.calls("GET")).toHaveLength(1);
    expect(fixture.calls("POST")).toHaveLength(0);
  });
});
