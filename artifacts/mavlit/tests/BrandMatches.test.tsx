import { cleanup, fireEvent, screen } from "@testing-library/react";
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
    fireEvent.change(screen.getByRole("textbox", { name: "Brand preferences" }), {
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
    const reads = fixture.calls("GET").length;
    await tick(30_000);
    expect(fixture.calls("GET")).toHaveLength(reads);
    expect(fixture.calls("POST")).toHaveLength(0);
    expect(screen.getAllByRole("article")).toHaveLength(3);
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
