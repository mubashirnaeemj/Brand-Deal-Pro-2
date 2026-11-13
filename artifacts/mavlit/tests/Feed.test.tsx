import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { Toaster } from "@/components/ui/toaster";
import { BRANDS, CREATORS, PARTNERSHIPS } from "@/data/feed";
import Feed from "@/pages/Feed";
import { EMPTY_FILTERS, filterBrands, filterCreators, filterPartnerships, whyYoureSeeingThis } from "@/lib/feedData";
import { installProfileApi } from "./fixtures/profileApi";
import { creatorProfile } from "./fixtures/creatorProfile";
import { renderProfile } from "./renderProfile";

beforeEach(() => {
  // jsdom lacks what Radix Select and Recharts rely on.
  vi.stubGlobal("ResizeObserver", class { observe() {} unobserve() {} disconnect() {} });
  Object.assign(HTMLElement.prototype, { hasPointerCapture: () => false, setPointerCapture: () => {}, releasePointerCapture: () => {}, scrollIntoView: () => {} });
  window.history.replaceState(null, "", "/feed"); installProfileApi(creatorProfile({ onboarding_completed: true })); });

const open = async () => { renderProfile(<><Feed /><Toaster /></>); await screen.findByRole("heading", { name: "Feed" }); };
const tab = async (id: string) => { await userEvent.click(screen.getByTestId(`feed-tab-${id}`)); };

describe("mock data", () => {
  it("meets the size requirements and never points at a missing record", () => {
    expect(CREATORS.length).toBeGreaterThanOrEqual(12);
    expect(BRANDS.length).toBeGreaterThanOrEqual(10);
    expect(PARTNERSHIPS.length).toBeGreaterThanOrEqual(25);
    const creators = new Set(CREATORS.map((c) => c.id)); const brands = new Set(BRANDS.map((b) => b.id));
    expect(PARTNERSHIPS.every((p) => creators.has(p.creatorId) && brands.has(p.brandId))).toBe(true);
    expect(CREATORS.every((c) => Object.values(c.mix).reduce((a, b) => a + b, 0) === 100)).toBe(true);
  });
  it("filters the records", () => {
    expect(filterPartnerships(EMPTY_FILTERS)).toHaveLength(PARTNERSHIPS.length);
    const beauty = filterPartnerships({ ...EMPTY_FILTERS, niche: ["Beauty"] });
    expect(beauty.length).toBeGreaterThan(0);
    expect(beauty.every((p) => CREATORS.find((c) => c.id === p.creatorId)!.niche === "Beauty")).toBe(true);
    expect(filterCreators({ ...EMPTY_FILTERS, country: ["Canada"], followers: ["10K–50K"] }).every((c) => c.country === "Canada")).toBe(true);
    expect(filterBrands({ ...EMPTY_FILTERS, brandCategory: ["Wearables"] }).map((b) => b.name).sort()).toEqual(["Oura", "WHOOP"]);
    expect(filterPartnerships({ ...EMPTY_FILTERS, date: "30" }).every((p) => p.daysAgo <= 30)).toBe(true);
    expect(filterPartnerships({ ...EMPTY_FILTERS, niche: ["Music"], country: ["Australia"], brandCategory: ["Cosmetics"] })).toEqual([]);
  });
  it("explains every post", () => { for (const p of PARTNERSHIPS) expect(whyYoureSeeingThis(p).reasons.length).toBeGreaterThan(0); });
});

describe("Feed page", () => {
  it("shows the header, five tabs and opens on For You with the full card anatomy", async () => {
    await open();
    expect(screen.getByText(/Discover creator partnerships, explore brands/)).toBeInTheDocument();
    expect(screen.getAllByRole("tab").map((t) => t.textContent)).toEqual(["For You", "Similar Creators", "Brand Intelligence", "Market Insights", "Trending"]);
    expect(screen.getByTestId("feed-tab-for-you")).toHaveAttribute("aria-selected", "true");
    const first = screen.getAllByTestId(/^feed-post-/)[0];
    for (const name of ["View Creator", "View Brand", "View Original Post"]) expect(within(first).getByRole("button", { name })).toBeInTheDocument();
    expect(within(first).getByRole("button", { name: /^Save/ })).toBeInTheDocument();
    expect(within(first).getByText(/Why you're seeing this/)).toBeInTheDocument();
  });

  it("switches between all five tabs without leaving the page", async () => {
    await open();
    await tab("similar"); expect(await screen.findByText("Similar creators")).toBeInTheDocument();
    await tab("brands"); expect(await screen.findAllByRole("button", { name: /View insights for/ })).not.toHaveLength(0);
    await tab("insights"); expect(await screen.findByRole("region", { name: "Your Competitive Position" })).toBeInTheDocument();
    await tab("trending"); expect(await screen.findByTestId("trending-list")).toBeInTheDocument();
    await tab("for-you"); expect(await screen.findAllByTestId(/^feed-post-/)).not.toHaveLength(0);
    expect(window.location.pathname).toBe("/feed");
  });

  it("filters, shows chips, an empty state and Clear all", async () => {
    await open();
    const total = screen.getAllByTestId(/^feed-post-/).length;
    await userEvent.click(screen.getByTestId("filter-niche"));
    await userEvent.click(await screen.findByRole("option", { name: "Beauty" }));
    await waitFor(() => expect(screen.getAllByTestId(/^feed-post-/).length).toBeLessThan(total));
    expect(screen.getByRole("button", { name: "Remove Niche filter Beauty" })).toBeInTheDocument();
    await userEvent.click(screen.getByTestId("filter-country"));
    await userEvent.click(await screen.findByRole("option", { name: "Canada" }));
    expect(await screen.findByText("No partnerships match these filters")).toBeInTheDocument();
    await userEvent.click(screen.getByTestId("filters-clear-all"));
    await waitFor(() => expect(screen.getAllByTestId(/^feed-post-/)).toHaveLength(total));
  });

  it("saves a post and lists it under Saved", async () => {
    await open();
    const first = screen.getAllByTestId(/^feed-post-/)[0];
    const id = first.getAttribute("data-testid")!;
    await userEvent.click(within(first).getByRole("button", { name: /^Save/ }));
    expect(within(first).getByRole("button", { name: /^Unsave/ })).toHaveAttribute("aria-pressed", "true");
    await userEvent.click(screen.getByRole("button", { name: /^Saved \(1\)/ }));
    expect(screen.getAllByTestId(/^feed-post-/).map((n) => n.getAttribute("data-testid"))).toEqual([id]);
  });

  it("opens a creator's partnership history from Similar Creators", async () => {
    await open(); await tab("similar");
    const stat = await screen.findByTestId("similar-stat-similar-creators");
    expect(stat).toHaveTextContent(String(CREATORS.length));
    await userEvent.click((await screen.findAllByRole("button", { name: /View partnerships for/ }))[0]);
    const dialog = await screen.findByRole("dialog");
    expect(within(dialog).getByRole("heading", { name: "@kai.beatlab" })).toBeInTheDocument();
    expect(within(dialog).getAllByTestId(/^history-/)).toHaveLength(PARTNERSHIPS.filter((p) => p.creatorId === "c1").length);
    await userEvent.click(within(dialog).getAllByRole("button", { name: /View original post/ })[0]);
    expect(await screen.findByText("Original post (prototype)")).toBeInTheDocument();
  });

  it("opens brand intelligence with creators and fit insights", async () => {
    await open(); await tab("brands");
    await userEvent.click(await screen.findByRole("button", { name: "View insights for Native Instruments" }));
    const dialog = await screen.findByRole("dialog");
    expect(within(dialog).getByRole("region", { name: "Creators This Brand Works With" })).toBeInTheDocument();
    expect(within(dialog).getByRole("region", { name: "Why This Brand Could Be a Good Fit" })).toBeInTheDocument();
    expect(within(dialog).getByRole("link", { name: /Create pitch email/ })).toHaveAttribute("href", "/pitch?brand=Native%20Instruments");
  });

  it("market insights lists strengths, gaps, missed brands and recommendations", async () => {
    await open(); await tab("insights");
    for (const name of ["Your Strengths", "Areas to Improve", "Missed Brand Opportunities", "AI Recommendations"]) expect(await screen.findByRole("region", { name })).toBeInTheDocument();
    const missed = screen.getByRole("region", { name: "Missed Brand Opportunities" });
    expect(within(missed).queryByText("Splice")).toBeNull();      // already partnered
    expect(within(missed).getByText("Native Instruments")).toBeInTheDocument();
    expect(within(screen.getByRole("region", { name: "AI Recommendations" })).getAllByRole("listitem").length).toBeGreaterThanOrEqual(3);
  });

  it("trending sorts by views", async () => {
    await open(); await tab("trending");
    const items = await screen.findAllByTestId("trending-item");
    expect(items).toHaveLength(PARTNERSHIPS.length);
    await userEvent.click(screen.getByTestId("trending-sort"));
    await userEvent.click(await screen.findByRole("option", { name: "Most Views" }));
    const top = PARTNERSHIPS.reduce((a, b) => (b.views > a.views ? b : a));
    const handle = CREATORS.find((c) => c.id === top.creatorId)!.handle;
    await waitFor(() => expect(screen.getAllByTestId("trending-item")[0]).toHaveTextContent(`@${handle}`));
  });
});
