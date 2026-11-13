import { act, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { Toaster } from "@/components/ui/toaster";
import { CREATORS, IDEAS, ME_PARTNERSHIPS, PARTNERSHIPS, STRATEGY } from "@/data/feed";
import Feed from "@/pages/Feed";
import { comparableFor, contentIdeas, whyThemNotMe } from "@/lib/feedCompare";
import { installProfileApi } from "./fixtures/profileApi";
import { creatorProfile } from "./fixtures/creatorProfile";
import { renderProfile } from "./renderProfile";

beforeEach(() => {
  vi.stubGlobal("ResizeObserver", class { observe() {} unobserve() {} disconnect() {} });
  Object.assign(HTMLElement.prototype, { hasPointerCapture: () => false, setPointerCapture: () => {}, releasePointerCapture: () => {}, scrollIntoView: () => {} });
  window.history.replaceState(null, "", "/feed");
  installProfileApi(creatorProfile({ onboarding_completed: true }));
});
const INSPO = /^inspiration-p\d+$/;
const open = async () => { renderProfile(<><Feed /><Toaster /></>); await screen.findByRole("heading", { name: "Feed" }); };

describe("mock data for the intelligence features", () => {
  it("is consistent: strategy rows sum to 100 and every creator has one", () => {
    for (const id of ["me", ...CREATORS.map((c) => c.id)]) {
      const s = STRATEGY[id]; expect(s, id).toBeDefined();
      expect(s.tutorial + s.productReview + s.lifestyle + s.educational + s.entertainment).toBe(100);
    }
    expect(PARTNERSHIPS.length + ME_PARTNERSHIPS.length).toBeGreaterThanOrEqual(20);
  });
  it("has five ideas for every content category in use, and fills the brand name in", () => {
    for (const p of PARTNERSHIPS) expect(IDEAS[p.category]?.length, p.category).toBe(5);
    const ideas = contentIdeas(PARTNERSHIPS[0]);
    expect(ideas).toHaveLength(4);
    expect(JSON.stringify(ideas)).not.toContain("{brand}");
    expect(contentIdeas(PARTNERSHIPS[0], 1)[0].title).not.toBe(ideas[0].title);
  });
  it("derives likes and comments from the same engagement figure shown elsewhere", () => {
    const me = comparableFor("me");
    expect(me.avgLikes + me.avgComments).toBe(Math.round((me.followers * me.engagement) / 100));
    expect(me.partnerships).toHaveLength(1);
  });
  it("gives every competitor advice on both sides plus 3 to 5 improvements", () => {
    for (const c of CREATORS) {
      const advice = whyThemNotMe(comparableFor(c.id));
      expect(advice.theirAdvantages.length + advice.yourAdvantages.length).toBeGreaterThan(0);
      expect(advice.improvements.length).toBeGreaterThanOrEqual(3);
      expect(advice.improvements.length).toBeLessThanOrEqual(5);
    }
  });
});

describe("Partnerships Picked for You (For You)", () => {
  it("shows cards with every requested field and the three actions", async () => {
    await open();
    const section = screen.getByRole("region", { name: "Partnerships Picked for You" });
    const card = within(section).getAllByTestId(INSPO)[0];
    for (const text of [/Why it's performing/, /Why it's relevant to you/, /^\d+(\.\d)?% engagement$/]) expect(within(card).getByText(text)).toBeInTheDocument();
    for (const name of ["View Post", "Save", "Get Content Ideas Like This"]) expect(within(card).getByRole("button", { name })).toBeInTheDocument();
  });

  it("sorts, filters, shows more and resets", async () => {
    await open();
    const section = screen.getByRole("region", { name: "Partnerships Picked for You" });
    const first = () => within(section).getAllByTestId(INSPO)[0].getAttribute("data-testid");
    const mostViewed = PARTNERSHIPS.reduce((a, b) => (b.views > a.views ? b : a));
    expect(first()).toBe(`inspiration-${mostViewed.id}`);                        // default sort is most viewed
    await userEvent.click(within(section).getByRole("button", { name: "Most recent" }));
    const newest = PARTNERSHIPS.reduce((a, b) => (b.daysAgo < a.daysAgo ? b : a));
    expect(first()).toBe(`inspiration-${newest.id}`);
    expect(within(section).getAllByTestId(INSPO)).toHaveLength(20);

    await userEvent.click(screen.getByTestId("inspo-content-format"));
    await userEvent.click(await screen.findByRole("option", { name: "Story" }));
    await waitFor(() => expect(within(section).getAllByTestId(INSPO).every((c) => within(c).queryAllByText("Story").length > 0)).toBe(true));
    expect(within(section).getAllByTestId(INSPO).length).toBe(PARTNERSHIPS.filter((p) => p.type === "Story").length > 20 ? 20 : PARTNERSHIPS.filter((p) => p.type === "Story").length);
    await userEvent.click(within(section).getByRole("button", { name: "Reset" }));
    expect(within(section).getAllByTestId(INSPO)).toHaveLength(20);
  });

  it("shows 20 posts, then fakes a 2-3 second load at the end of the list and adds the rest", async () => {
    let reachEnd: () => void = () => {};
    vi.stubGlobal("IntersectionObserver", class { constructor(cb: (e: { isIntersecting: boolean }[]) => void) { reachEnd = () => cb([{ isIntersecting: true }]); } observe() {} unobserve() {} disconnect() {} });
    await open();
    const section = screen.getByRole("region", { name: "Partnerships Picked for You" });
    expect(PARTNERSHIPS.length).toBeGreaterThan(20);
    expect(within(section).getAllByTestId(INSPO)).toHaveLength(20);
    expect(within(section).queryByRole("button", { name: /Show more/ })).toBeNull();
    vi.useFakeTimers();
    try {
      act(() => reachEnd());
      expect(within(section).getByRole("status")).toHaveTextContent("Loading more partnerships");
      act(() => { vi.advanceTimersByTime(1900); });
      expect(within(section).getAllByTestId(INSPO)).toHaveLength(20);          // still loading before 2 seconds
      act(() => { vi.advanceTimersByTime(1200); });                              // past the 3 second maximum
    } finally { vi.useRealTimers(); }
    expect(within(section).getAllByTestId(INSPO)).toHaveLength(Math.min(40, PARTNERSHIPS.length));
    expect(within(section).queryByRole("status")).toBeNull();
  });

  it("saves inspiration and lists it under saved", async () => {
    await open();
    const section = screen.getByRole("region", { name: "Partnerships Picked for You" });
    const card = within(section).getAllByTestId(INSPO)[0];
    const id = card.getAttribute("data-testid");
    await userEvent.click(within(card).getByRole("button", { name: "Save" }));
    expect(within(card).getByRole("button", { name: "Saved" })).toHaveAttribute("aria-pressed", "true");
    await userEvent.click(within(section).getByRole("button", { name: /Saved \(1\)/ }));
    expect(within(section).getAllByTestId(INSPO).map((c) => c.getAttribute("data-testid"))).toEqual([id]);
  });

  it("opens a modal with ideas and can show different ones", async () => {
    await open();
    const section = screen.getByRole("region", { name: "Partnerships Picked for You" });
    await userEvent.click(within(section).getAllByRole("button", { name: "Get Content Ideas Like This" })[0]);
    const dialog = await screen.findByRole("dialog");
    const titles = () => within(within(dialog).getByTestId("content-ideas")).getAllByRole("listitem").map((li) => li.querySelector("p")!.textContent);
    const before = titles();
    expect(before.length).toBeGreaterThanOrEqual(3); expect(before.length).toBeLessThanOrEqual(5);
    await userEvent.click(within(dialog).getByRole("button", { name: "Show different ideas" }));
    await waitFor(() => expect(within(dialog).getByTestId("content-ideas")).toBeInTheDocument());
    expect(titles()).not.toEqual(before);
  });
});

describe("Why Them, Not Me? (Similar Creators)", () => {
  it("opens a comparison with advantages, improvements and the disclaimer", async () => {
    await open();
    await userEvent.click(screen.getByTestId("feed-tab-similar"));
    await userEvent.click(await screen.findByRole("button", { name: "Why them, not me? @kai.beatlab" }));
    const dialog = await screen.findByRole("dialog");
    expect(within(dialog).getByRole("heading", { name: "Why Them, Not Me?" })).toBeInTheDocument();
    for (const name of ["Their Advantages", "Your Advantages", "Opportunities to Improve"]) expect(within(dialog).getByRole("region", { name })).toBeInTheDocument();
    expect(within(dialog).getByTestId("why-row-views")).toHaveTextContent("31.2K");
    expect(within(dialog).getByRole("note")).toHaveTextContent(/estimated competitive insights based on available public data, not confirmed reasons/);
    expect(within(within(dialog).getByRole("region", { name: "Their Advantages" })).getByText(/46% more average Reel views/)).toBeInTheDocument();
  });
});

describe("Compare Creators (Similar Creators)", () => {
  const toCompare = async () => { await open(); await userEvent.click(screen.getByTestId("feed-tab-similar")); await userEvent.click(await screen.findByRole("button", { name: "Compare Creators" })); };

  it("limits the selection to three and lets you remove one", async () => {
    await toCompare();
    for (const h of ["kai.beatlab", "lenaloops", "oakley.synth"]) await userEvent.click(screen.getByRole("button", { name: `Add @${h} to comparison` }));
    expect(screen.getByRole("button", { name: "Compare (3/3)" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Add @mia.mixdown to comparison" })).toBeDisabled();
    await userEvent.click(within(screen.getByRole("list", { name: "Selected creators" })).getByRole("button", { name: "Remove @lenaloops from comparison" }));
    expect(screen.getByRole("button", { name: "Compare (2/3)" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Add @mia.mixdown to comparison" })).toBeEnabled();
  });

  it("shows the dashboard with highlights, tables, and supports remove and replace", async () => {
    await toCompare();
    await userEvent.click(screen.getByRole("button", { name: "Add @kai.beatlab to comparison" }));
    await userEvent.click(screen.getByRole("button", { name: "Add @dre.drumkit to comparison" }));
    await userEvent.click(screen.getByRole("button", { name: "Compare (2/3)" }));
    const dialog = await screen.findByRole("dialog");
    for (const t of ["Profile metrics", "Content strategy", "Partnership performance"]) expect(within(dialog).getByText(t)).toBeInTheDocument();
    expect(within(dialog).getByTestId("highlight-highest-engagement-rate")).toHaveTextContent("You");        // 6.3% beats Kai's 5.8%
    expect(within(dialog).getByTestId("highlight-highest-average-views")).toHaveTextContent("@dre.drumkit");  // 46.7K
    expect(within(dialog).getByTestId("highlight-most-partnerships")).toHaveTextContent("@kai.beatlab");     // ties go to the first of the two with 2
    expect(within(dialog).getByTestId("cmp-followers")).toHaveTextContent("88.4K");

    await userEvent.click(within(dialog).getByRole("combobox", { name: "Replace @kai.beatlab" }));
    await userEvent.click(await screen.findByRole("option", { name: "@lenaloops" }));
    expect(within(dialog).queryByTestId("cmp-col-c1")).toBeNull();
    expect(within(dialog).getByTestId("cmp-col-c2")).toBeInTheDocument();
    await userEvent.click(within(dialog).getByRole("button", { name: "Remove @dre.drumkit" }));
    expect(within(dialog).queryByTestId("cmp-col-c6")).toBeNull();
    expect(within(dialog).getByRole("combobox", { name: "Add a creator" })).toBeInTheDocument();
  });
});
