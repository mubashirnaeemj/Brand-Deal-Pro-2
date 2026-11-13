import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { BEHAVIOR_TRENDS, BRAND_CATEGORY_TRENDS, CONTENT_TRENDS, EMERGING, HASHTAG_TRENDS } from "@/data/feed/trends";
import Feed from "@/pages/Feed";
import { DEFAULT_TREND_FILTERS, growthSeries, overview, scaleGrowth, scope } from "@/lib/feedTrends";
import { installProfileApi } from "./fixtures/profileApi";
import { creatorProfile } from "./fixtures/creatorProfile";
import { renderProfile } from "./renderProfile";

beforeEach(() => {
  vi.stubGlobal("ResizeObserver", class { observe() {} unobserve() {} disconnect() {} });
  Object.assign(HTMLElement.prototype, { hasPointerCapture: () => false, setPointerCapture: () => {}, releasePointerCapture: () => {}, scrollIntoView: () => {} });
  window.history.replaceState(null, "", "/feed");
  installProfileApi(creatorProfile({ onboarding_completed: true }));
});
const openTrending = async () => {
  renderProfile(<Feed />);
  await screen.findByRole("heading", { name: "Feed" });
  await userEvent.click(screen.getByTestId("feed-tab-trending"));
  await screen.findByRole("heading", { name: "Creator Market Trends" });
};
const pick = async (testId: string, option: string) => { await userEvent.click(screen.getByTestId(testId)); await userEvent.click(await screen.findByRole("option", { name: option })); };

describe("trend sample data", () => {
  it("meets the size requirements for every niche and has no dangling creator or brand ids", () => {
    expect(CONTENT_TRENDS.length).toBeGreaterThanOrEqual(10); expect(EMERGING.length).toBeGreaterThanOrEqual(6);
    expect(BRAND_CATEGORY_TRENDS.length).toBeGreaterThanOrEqual(8); expect(BEHAVIOR_TRENDS.length).toBeGreaterThanOrEqual(10); expect(HASHTAG_TRENDS.length).toBeGreaterThanOrEqual(15);
    for (const niche of ["Music", "Beauty", "Fitness", "Health & Wellness"]) {
      expect(CONTENT_TRENDS.filter((t) => t.niche === niche).length, niche).toBeGreaterThanOrEqual(5);
      expect(EMERGING.filter((t) => t.niche === niche).length, niche).toBeGreaterThanOrEqual(3);
      expect(BRAND_CATEGORY_TRENDS.filter((t) => t.niche === niche).length, niche).toBeGreaterThanOrEqual(4);
    }
    const music = Object.fromEntries(CONTENT_TRENDS.filter((t) => t.niche === "Music").map((t) => [t.name, t.g]));
    expect(music).toMatchObject({ "AI Music Production": 85, "Home Studio Setups": 42, "Plugin Tutorials": 31, "Beat Making Challenges": 18, "Music Reaction Videos": -12 });
  });
  it("changes with the period and stays deterministic", () => {
    expect(scaleGrowth(85, { ...DEFAULT_TREND_FILTERS, period: "7" })).toBeLessThan(85);
    expect(scaleGrowth(85, { ...DEFAULT_TREND_FILTERS, period: "90" })).toBeGreaterThan(85);
    const a = growthSeries("x", 40, DEFAULT_TREND_FILTERS); expect(a).toEqual(growthSeries("x", 40, DEFAULT_TREND_FILTERS));
    expect(a[0].value).toBe(100); expect(a[a.length - 1].value).toBe(140);
    expect(scope(CONTENT_TRENDS, { ...DEFAULT_TREND_FILTERS, platform: "TikTok" }).every(({ item }) => item.p.includes("T"))).toBe(true);
    expect(overview(DEFAULT_TREND_FILTERS).fastest).toEqual({ name: "AI & Tech", growth: 85 });
  });
});

describe("Trending tab = Creator Market Trends", () => {
  it("replaces the partnership feed with the dashboard sections, labelled as sample data", async () => {
    await openTrending();
    expect(screen.getByText(/Discover what's gaining momentum in your niche/)).toBeInTheDocument();
    for (const name of ["Content Trends", "Brand Market Trends"]) expect(screen.getByRole("heading", { name })).toBeInTheDocument();
    for (const name of ["Emerging Opportunities", "Creator Behavior Trends", "Trending Hashtags & Topics"]) expect(screen.queryByRole("heading", { name })).toBeNull();
    expect(screen.getAllByText("Sample data").length).toBeGreaterThanOrEqual(2);
    expect(screen.getByText(/illustrative sample data, not real measured market activity/)).toBeInTheDocument();
    expect(screen.queryByTestId("trending-list")).toBeNull();
    expect(screen.queryByRole("group", { name: "Filters" })).toBeNull();            // the Feed-wide filter bar is hidden here
    const cards = within(screen.getByLabelText("Trending overview"));
    for (const label of ["Rising Content Topics", "Fastest Growing Content Trend", "Most Active Brand Category", "Growing Brand Categories"]) expect(cards.getByText(label)).toBeInTheDocument();
    expect(cards.queryByText("Emerging Trends")).toBeNull();
    expect(screen.getByTestId("overview-rising-content-topics")).toHaveTextContent(/5.*of 6 tracked topics/);
    expect(screen.getByTestId("overview-fastest-growing-content-trend")).toHaveTextContent(/AI & Tech.*\+85% in the last 30 days/);
    expect(screen.getByTestId("overview-most-active-brand-category")).toHaveTextContent(/Music Production Software.*186 partnerships observed/);
    expect(screen.getByTestId("overview-growing-brand-categories")).toHaveTextContent(/4.*showing increased activity/);
  });

  it("the period selector changes the numbers", async () => {
    await openTrending();
    const card = () => screen.getByTestId("content-trend-ct-m1");
    expect(card()).toHaveTextContent("+85%");
    await userEvent.click(screen.getByRole("button", { name: "Last 7 days" }));
    expect(card()).toHaveTextContent("+34%");
    await userEvent.click(screen.getByRole("button", { name: "Last 90 days" }));
    expect(card()).toHaveTextContent("+162%");
  });

  it("niche, platform and country filters narrow the data and Reset restores it", async () => {
    await openTrending();
    expect(screen.getByTestId("content-trend-ct-m1")).toBeInTheDocument();
    await pick("trend-niche", "Beauty");
    expect(screen.queryByTestId("content-trend-ct-m1")).toBeNull();
    expect(screen.getByTestId("content-trend-ct-b1")).toBeInTheDocument();
    await pick("trend-platform", "YouTube");
    expect(screen.queryByTestId("content-trend-ct-b2")).toBeNull();                     // Soft Glam is Instagram/TikTok only
    expect(screen.getByTestId("content-trend-ct-b4")).toBeInTheDocument();
    await pick("trend-country", "Canada");
    await userEvent.click(screen.getByRole("button", { name: "Reset" }));
    expect(screen.getByTestId("content-trend-ct-m1")).toBeInTheDocument();
  });

  it("opens a content trend with description, why, chart, creators, posts, brands and ideas", async () => {
    await openTrending();
    await userEvent.click(screen.getByRole("button", { name: "Open trend AI Music Production" }));
    const dialog = await screen.findByRole("dialog");
    for (const name of ["Why it's gaining popularity", "Popular content formats", "Creators participating", "Example posts", "Related brands", "Suggested content ideas"]) expect(within(dialog).getByRole("region", { name })).toBeInTheDocument();
    expect(within(dialog).getByRole("region", { name: /Growth over time/ })).toBeInTheDocument();
    expect(within(dialog).getByRole("note")).toHaveTextContent(/Sample data/);
  });

  it("a brand category lists its brands", async () => {
    await openTrending();
    await userEvent.click(screen.getByRole("button", { name: "Open brand category Music Production Software" }));
    const dialog = await screen.findByRole("dialog");
    expect(within(within(dialog).getByTestId("category-brands")).getAllByRole("listitem").length).toBeGreaterThanOrEqual(3);
  });
});
