import { cleanup, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import Feed from "@/pages/Feed";
import { categoryLines, comparable, marketMetrics, strengthsAndGaps } from "@/lib/marketInsights";
import type { MarketInsightsResponse, MarketPeers } from "@/lib/marketInsights";
import type { YouStats } from "@/lib/similarCreators";
import { installProfileApi } from "./fixtures/profileApi";
import { creatorProfile } from "./fixtures/creatorProfile";
import { renderProfile } from "./renderProfile";

const YOU: YouStats = { name: "Nova H", avg_likes: 400, avg_comments: 40, handle: "me", followers: 10_000, engagement_rate: 6, avg_reel_views: 40_000, posts_per_week: 2, brand_partnerships: 1, product_focused_pct: null, content_categories: null };
const PEERS: MarketPeers = {
  count: 5, avg_followers: 9_000, avg_engagement: 4, avg_reel_views: 20_000, avg_posts_per_week: 3, avg_partnerships: 4, content_mix: {}, mix_count: 0,
  creators: ["a", "b", "c", "d", "e"].map((u, i) => ({ username: `peer_${u}`, similarity: 90 - i, followers: 8_000 + i * 500 })),
};
const RESPONSE: MarketInsightsResponse = {
  ready: true, threshold: 70, audience_range: { min: 3_334, max: 20_000 }, you: YOU, peers: PEERS,
  missed_brands: [
    { brand_raw_id: 21, brand_name: "Native Gear", niche: "Music", website: null, rank: 2, confidence: 88, partnerships: 5 },
    { brand_raw_id: 22, brand_name: "Splice", niche: null, website: null, rank: 3, confidence: 80, partnerships: 1 },
  ],
};

let api: ReturnType<typeof installProfileApi>;
beforeEach(() => {
  vi.stubGlobal("ResizeObserver", class { observe() {} unobserve() {} disconnect() {} });
  Object.assign(HTMLElement.prototype, { hasPointerCapture: () => false, setPointerCapture: () => {}, releasePointerCapture: () => {}, scrollIntoView: () => {} });
  window.history.replaceState(null, "", "/feed");
  api = installProfileApi(creatorProfile({ onboarding_completed: true }));
});
afterEach(cleanup);

const openInsights = async () => {
  renderProfile(<Feed />);
  await screen.findByRole("heading", { name: "Feed" });
  await userEvent.click(screen.getByTestId("feed-tab-insights"));
};

describe("Market Insights (real numbers)", () => {
  it("compares you with your five most similar creators of the same audience size", async () => {
    api.setMarketInsights(RESPONSE);
    await openInsights();
    expect(await screen.findByTestId("peers-line")).toHaveTextContent("@me against 5 similar creators with a similar audience size (9K followers on average).");
    expect(screen.getByTestId("peers-list")).toHaveTextContent("@peer_a, @peer_b, @peer_c, @peer_d, @peer_e");
    expect(screen.getByTestId("metric-views")).toHaveTextContent("40K");
    expect(screen.getByTestId("metric-views")).toHaveTextContent("vs 20K avg");
    expect(screen.getByTestId("metric-eng")).toHaveTextContent("6%");
    expect(screen.getByTestId("metric-eng")).toHaveTextContent("vs 4% avg");
    expect(screen.getByTestId("metric-freq")).toHaveTextContent("2.0");
    expect(screen.getByTestId("metric-freq")).toHaveTextContent("vs 3.0 avg");
    expect(screen.getByTestId("metric-deals")).toHaveTextContent("1");
    expect(screen.getByTestId("metric-deals")).toHaveTextContent("vs 4 avg");
    expect(api.requests.some((r) => r.path === "/api/mavlit/feed/market-insights")).toBe(true);
  });

  it("writes strengths and gaps from the real numbers", async () => {
    api.setMarketInsights(RESPONSE);
    await openInsights();
    const strengths = within(await screen.findByRole("region", { name: "Your Strengths" }));
    expect(strengths.getByText(/Avg Reel views: 40K vs 20K for similar creators \(\+100%\)\./)).toBeInTheDocument();
    expect(strengths.getByText(/Engagement rate: 6% vs 4% for similar creators \(\+50%\)\./)).toBeInTheDocument();
    const gaps = within(screen.getByRole("region", { name: "Areas to Improve" }));
    expect(gaps.getByText(/Posts per week: 2.0 vs 3.0 for similar creators \(−33%\)\./)).toBeInTheDocument();
    expect(gaps.getByText(/Brand partnerships: 1 vs 4 for similar creators \(−75%\)\./)).toBeInTheDocument();
  });

  it("adds the content category lines from the estimated mixes, yours and the peers'", async () => {
    const you = { ...YOU, product_focused_pct: 30, content_categories: [{ name: "Tutorial", pct: 50 }, { name: "Lifestyle", pct: 10 }, { name: "Promotional", pct: 40 }] };
    const peers = { ...PEERS, mix_count: 3, content_mix: { Tutorial: 25, Lifestyle: 20, Promotional: 40, Entertainment: 15 } };
    api.setMarketInsights({ ...RESPONSE, you, peers });
    await openInsights();
    const strengths = within(await screen.findByRole("region", { name: "Your Strengths" }));
    expect(strengths.getByText(/Tutorial: 50% of your content vs 25% for peers\. You lean into it\./)).toBeInTheDocument();
    const gaps = within(screen.getByRole("region", { name: "Areas to Improve" }));
    expect(gaps.getByText(/Lifestyle: 10% of your content vs 20% for peers\. Brands in this lane may overlook you\./)).toBeInTheDocument();
    expect(gaps.getByText(/Entertainment: 0% of your content vs 15% for peers\. Brands in this lane may overlook you\./)).toBeInTheDocument();
    expect(strengths.queryByText(/Promotional/)).toBeNull();      // level with the peers: no line
  });

  it("has no content category lines while you or the peers have no estimated mix (and never sample ones)", async () => {
    api.setMarketInsights(RESPONSE);
    await openInsights();
    await screen.findByRole("region", { name: "Your Strengths" });
    expect(screen.queryByText(/of your content vs/)).toBeNull();
  });

  it("lists the best matched brands you have not made a pitch for", async () => {
    api.setMarketInsights(RESPONSE);
    await openInsights();
    const missed = within(await screen.findByRole("region", { name: "Missed Brand Opportunities" }));
    const first = missed.getByTestId("missed-21");
    expect(first).toHaveTextContent("Native Gear");
    expect(first).toHaveTextContent("88% fit · 5 creator partnerships");
    expect(within(first).getByRole("link", { name: "Pitch →" })).toHaveAttribute("href", "/pitch?brand=Native%20Gear");
    expect(missed.getByTestId("missed-22")).toHaveTextContent("80% fit · 1 creator partnership");   // singular
    expect(missed.getAllByRole("listitem")).toHaveLength(2);
  });

  it("keeps the content category chart and the AI recommendations as hardcoded sample data", async () => {
    api.setMarketInsights(RESPONSE);
    await openInsights();
    expect(await screen.findByRole("heading", { name: "Content category distribution" })).toBeInTheDocument();
    expect(within(screen.getByRole("region", { name: "AI Recommendations" })).getAllByRole("listitem").length).toBeGreaterThanOrEqual(3);
  });

  it("shows a dash for your numbers you do not have, and 0 for your Reel views", async () => {
    api.setMarketInsights({ ...RESPONSE, you: { ...YOU, avg_reel_views: null, engagement_rate: null, posts_per_week: null, brand_partnerships: null } });
    await openInsights();
    expect(await screen.findByTestId("metric-views")).toHaveTextContent("0");                      // no view counts: 0, like in Compare
    expect(screen.getByTestId("metric-deals")).toHaveTextContent("0");                              // no post marked as a partnership: 0 brand partnerships
    for (const key of ["eng", "freq"]) expect(screen.getByTestId(`metric-${key}`)).toHaveTextContent("—");
    expect(screen.getByTestId("radar-empty")).toBeInTheDocument();                                   // fewer than three numbers both of you have: no radar
  });

  it("still lists the missed brands when no creator has a similar audience size", async () => {
    api.setMarketInsights({ ...RESPONSE, peers: { ...PEERS, count: 0, creators: [], avg_followers: null } });
    await openInsights();
    expect(await screen.findByText("No creators with a similar audience size yet")).toBeInTheDocument();
    expect(screen.getByText(/between 3.3K and 20K followers/)).toBeInTheDocument();
    expect(screen.queryByRole("region", { name: "Your Strengths" })).toBeNull();
    expect(screen.getByTestId("missed-21")).toBeInTheDocument();
  });

  it("asks for a finished profile, says when nothing is missed, and offers a retry on an error", async () => {
    api.setMarketInsights({ ...RESPONSE, ready: false });
    await openInsights();
    expect(await screen.findByText("Finish your profile to see market insights")).toBeInTheDocument();
    cleanup();
    api.setMarketInsights({ ...RESPONSE, missed_brands: [] });
    await openInsights();
    expect(await screen.findByText(/Nothing missing/)).toBeInTheDocument();
    cleanup();
    api.failMarketInsights();
    await openInsights();
    expect(await screen.findByText("Could not load market insights")).toBeInTheDocument();
    api.failMarketInsights(false); api.setMarketInsights(RESPONSE);
    await userEvent.click(screen.getByRole("button", { name: "Try again" }));
    expect(await screen.findByTestId("metric-views")).toBeInTheDocument();
  });
});

describe("categoryLines", () => {
  const peers = { ...PEERS, mix_count: 2, content_mix: { Tutorial: 30, Lifestyle: 30, Entertainment: 20, Promotional: 10, Storytelling: 10 } };
  it("compares your categories and the peers' four biggest, with a 5 point lead and a 4 point gap", () => {
    const you = { ...YOU, content_categories: [{ name: "Tutorial", pct: 35 }, { name: "Lifestyle", pct: 26 }, { name: "Storytelling", pct: 39 }] };
    const lines = categoryLines(you, peers);
    expect(lines.strengths).toEqual(["Storytelling: 39% of your content vs 10% for peers. You lean into it.", "Tutorial: 35% of your content vs 30% for peers. You lean into it."]);
    // the biggest gap first: Entertainment (20 points), Promotional (10), then Lifestyle (4)
    expect(lines.weaknesses).toEqual([
      "Entertainment: 0% of your content vs 20% for peers. Brands in this lane may overlook you.",
      "Promotional: 0% of your content vs 10% for peers. Brands in this lane may overlook you.",
      "Lifestyle: 26% of your content vs 30% for peers. Brands in this lane may overlook you.",
    ]);
  });
  it("says nothing without your mix or without any peer mix", () => {
    expect(categoryLines({ ...YOU, content_categories: null }, peers)).toEqual({ strengths: [], weaknesses: [] });
    expect(categoryLines({ ...YOU, content_categories: [{ name: "Tutorial", pct: 100 }] }, { ...peers, mix_count: 0, content_mix: {} })).toEqual({ strengths: [], weaknesses: [] });
  });
});

describe("the numbers behind it", () => {
  it("only compares what both sides have, and the peers' average must be above zero", () => {
    const metrics = marketMetrics({ ...YOU, engagement_rate: null }, { ...PEERS, avg_posts_per_week: 0 });
    expect(metrics.map((m) => comparable(m))).toEqual([true, false, false, true]);   // engagement: you have none; posts per week: the peers' average is 0
    expect(strengthsAndGaps(metrics).weaknesses.join(" ")).not.toMatch(/Posts per week|Engagement/);
  });
  it("ignores a lead of less than 10%", () => {
    const level = marketMetrics({ ...YOU, avg_reel_views: 21_000, engagement_rate: 4.2, posts_per_week: 3, brand_partnerships: 4 }, PEERS);
    expect(strengthsAndGaps(level)).toEqual({ strengths: [], weaknesses: [] });
  });
});
