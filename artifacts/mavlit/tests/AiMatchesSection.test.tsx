import type { ComponentProps, ReactNode } from "react";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import AiMatchesSection from "@/components/AiMatchesSection";
import { rankedBrands, ranking } from "./fixtures/aiMatchesApi";

// The cards' Save buttons read the saved-brands list; here it is simply empty.
beforeEach(() => {
  vi.stubGlobal("fetch", vi.fn(async () => new Response("[]", { status: 200, headers: { "Content-Type": "application/json" } })));
});
afterEach(() => { vi.unstubAllGlobals(); });

function mount(overrides: Partial<ComponentProps<typeof AiMatchesSection>> = {}) {
  const props: ComponentProps<typeof AiMatchesSection> = {
    version: "v3", data: ranking("completed"), loading: false, error: null,
    refreshing: false, onRefresh: vi.fn(), onCheckStatus: vi.fn(), onOpen: vi.fn(),
    progressMessage: "Reading brand evidence…", expandedByBrand: {},
    onToggleReasons: vi.fn(), search: "", preferences: "Avoid Unwanted Amplifiers",
    ...overrides,
  };
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const wrapper = ({ children }: { children: ReactNode }) => <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  return { ...render(<AiMatchesSection {...props} />, { wrapper }), props };
}

describe("V3 ranking presentation", () => {
  it("shows only the progress line, with no list, when a first ranking runs and there are no previous brands", () => {
    mount({ data: ranking("running", { matches: [], total: 0 }) });
    expect(screen.getByTestId("status-v3-updating")).toHaveTextContent("Reading brand evidence…");
    expect(screen.queryByTestId("matches-list")).not.toBeInTheDocument();
    expect(screen.queryAllByRole("article", { hidden: true })).toHaveLength(0);
  });

  it.each(["queued", "running"] as const)("marks previous results as pending when %s", (status) => {
    mount({ data: ranking(status) });
    const notice = screen.getByTestId("status-v3-updating");
    expect(notice).toHaveAttribute("role", "status");
    expect(notice).toHaveAttribute("aria-live", "polite");
    expect(notice).toHaveTextContent("Updating your matches…");
    expect(notice).not.toHaveTextContent("Previous results below are not final.");
    const cards = screen.getAllByRole("article", { hidden: true });
    expect(cards).toHaveLength(3);
    expect(cards[0].parentElement).toHaveAttribute("aria-busy", "true");
    // The previous brands are completely blurred and out of reach; the progress line is in the middle of the screen.
    const list = screen.getByTestId("matches-list");
    expect(list).toHaveClass("blur-xl");
    expect(list).toHaveAttribute("aria-hidden", "true");
    expect(list).toHaveClass("pointer-events-none");
    expect(list.inert).toBe(true);
    expect(within(notice).getByTestId("text-ranking-message")).toHaveTextContent("Reading brand evidence…");
    expect(screen.getByRole("button", { name: "Ranking…" })).toBeDisabled();
  });

  it("stops the page from scrolling while 'Updating your matches…' shows, and restores it after", () => {
    const view = mount({ data: ranking("running") });
    expect(document.documentElement.style.overflow).toBe("hidden");
    expect(document.body.style.overflow).toBe("hidden");
    view.rerender(<AiMatchesSection {...view.props} data={ranking("completed")} />);
    expect(document.documentElement.style.overflow).toBe("");
    expect(document.body.style.overflow).toBe("");
  });

  it("keeps the 'Updating your matches…' card fixed in the window so it is in view wherever the page is scrolled", () => {
    mount({ data: ranking("running") });
    const overlay = screen.getByTestId("status-v3-updating").parentElement!.parentElement!;   // the card sits in a fixed, centered layer
    expect(overlay).toHaveClass("fixed", "inset-0", "items-center", "justify-center");
    expect(overlay.className).not.toMatch(/\bsticky\b/);
    expect(screen.getByTestId("status-v3-updating").parentElement).not.toHaveClass("sticky");
    expect(screen.getByTestId("matches-list")).not.toContainElement(screen.getByTestId("status-v3-updating"));
  });

  it("hides the niche filter while the ranking runs and shows it again after", () => {
    const view = mount({ data: ranking("running"), onNichesChange: () => {} });
    expect(screen.queryByTestId("match-niches")).not.toBeInTheDocument();
    view.rerender(<AiMatchesSection {...view.props} data={ranking("completed")} />);
    expect(screen.getByTestId("match-niches")).toBeInTheDocument();
  });

  it("does not lock scrolling once the automatic checks have paused", () => {
    mount({ data: ranking("running"), timedOut: true });
    expect(document.body.style.overflow).toBe("");
  });

  it("shows the paused-check message without implying the backend job stopped", () => {
    mount({ data: ranking("running"), timedOut: true });
    expect(screen.getByTestId("status-v3-updating")).toHaveTextContent("Still working — check back shortly");
    expect(screen.getByTestId("status-v3-updating")).toHaveTextContent(
      "Automatic checks have paused. Your ranking continues in the background.",
    );
    expect(screen.getAllByRole("article", { hidden: true })[0].parentElement).toHaveAttribute("aria-busy", "true");
  });

  it("renders backend array order unchanged and never hides unwanted preferences", () => {
    mount();
    expect(screen.getAllByRole("article", { hidden: true }).map((card) => card.getAttribute("data-testid")))
      .toEqual(rankedBrands.map((brand) => `card-ai-brand-${brand.brand_raw_id}`));
    expect(screen.getByTestId("card-brand-preferences")).toHaveTextContent("Avoid Unwanted Amplifiers");
    expect(screen.getByTestId("card-ai-brand-20")).toHaveTextContent("Unwanted Amplifiers");
    expect(screen.queryByTestId("status-v3-updating")).not.toBeInTheDocument();
    expect(screen.getAllByRole("article", { hidden: true })[0].parentElement).toHaveAttribute("aria-busy", "false");
    expect(screen.getByTestId("matches-list")).not.toHaveClass("blur-xl");
    expect(screen.getByTestId("matches-list").inert).toBe(false);
  });

  it("searches without reordering the remaining brands or applying preferences as a filter", () => {
    const view = mount({ search: "Audio" });
    expect(screen.getAllByRole("article", { hidden: true })).toHaveLength(1);
    expect(screen.getByRole("article")).toHaveTextContent("Alpha Audio");
    view.rerender(<AiMatchesSection {...view.props} search="" />);
    expect(screen.getAllByRole("article", { hidden: true }).map((card) => card.getAttribute("data-testid")))
      .toEqual(rankedBrands.map((brand) => `card-ai-brand-${brand.brand_raw_id}`));
  });

  it("offers failure retry and completed manual refresh callbacks", () => {
    const view = mount({ data: ranking("failed") });
    const failure = screen.getByTestId("text-ai-failed");
    expect(failure).toHaveTextContent("Fixture ranking failed");
    fireEvent.click(within(failure).getByRole("button", { name: "Try again" }));
    expect(view.props.onRefresh).toHaveBeenCalledTimes(1);
    view.rerender(<AiMatchesSection {...view.props} data={ranking("completed")} />);
    expect(screen.queryByTestId("text-ai-failed")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Refresh matches" }));
    expect(view.props.onRefresh).toHaveBeenCalledTimes(2);
  });

  it("disables manual refresh while its POST is in flight", () => {
    const { props } = mount({ refreshing: true });
    fireEvent.click(screen.getByTestId("button-ai-rerank"));
    expect(props.onRefresh).not.toHaveBeenCalled();
    expect(screen.getByTestId("status-v3-updating")).not.toHaveTextContent("Previous results below are not final.");
  });

  it("distinguishes loading and completed empty states from a pending job", () => {
    const view = mount({ data: undefined, loading: true });
    expect(screen.getByRole("status")).toHaveTextContent("Loading AI matches");
    expect(screen.getByTestId("button-ai-rerank")).toBeDisabled();
    view.rerender(<AiMatchesSection {...view.props} loading={false} data={ranking("completed", { total: 0, matches: [] })} />);
    expect(screen.getByText(/No matches yet — complete your profile/)).toBeInTheDocument();
    expect(screen.queryByTestId("status-v3-updating")).not.toBeInTheDocument();
  });
});

describe("V2 presentation remains separate", () => {
  it("uses its legacy pending message, rerank label and no V3 preferences card", () => {
    mount({ version: "v2", data: ranking("running") });
    expect(screen.getByTestId("status-ai-pending")).toHaveTextContent("your previous ranking is shown below");
    expect(screen.queryByTestId("status-v3-updating")).not.toBeInTheDocument();
    expect(screen.queryByTestId("card-brand-preferences")).not.toBeInTheDocument();
    expect(screen.getAllByRole("article", { hidden: true })[0].parentElement).toHaveAttribute("aria-busy", "false");
  });

  it("retains the V2 failure instructions rather than a V3 retry button", () => {
    mount({ version: "v2", data: ranking("failed") });
    expect(screen.getByTestId("text-ai-failed")).toHaveTextContent('Try "Re-rank with AI".');
    expect(screen.queryByRole("button", { name: "Try again" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Re-rank with AI" })).toBeEnabled();
  });
});

describe("a failed ranking shows the server's message", () => {
  it.each([
    ["The server restarted, please try again", "AI ranking failed: The server restarted, please try again."],
    ["This took too long and was stopped. Please try again.", "AI ranking failed: This took too long and was stopped. Please try again."],
    ["The server is busy, refresh your matches in a moment", "AI ranking failed: The server is busy, refresh your matches in a moment."],
  ])("%s", (message, shown) => {
    mount({ data: ranking("failed", { error: message }) });
    expect(screen.getByTestId("text-ai-failed")).toHaveTextContent(shown);
    expect(screen.getByTestId("text-ai-failed").textContent).not.toContain("..");
  });
});
