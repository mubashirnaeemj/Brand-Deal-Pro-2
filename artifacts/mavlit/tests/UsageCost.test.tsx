import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import UsageCost, { ChartTip } from "@/pages/UsageCost";
import { money } from "@/lib/usage";
import { installProfileApi } from "./fixtures/profileApi";
import { creatorProfile } from "./fixtures/creatorProfile";
import { renderProfile } from "./renderProfile";

vi.mock("@/components/Navbar", () => ({ default: () => null }));
vi.mock("@/components/Footer", () => ({ default: () => null }));

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

const summary = (extra: Record<string, unknown> = {}) => ({
  days: 30, choices: [7, 30, 90],
  cards: { today: 0.5, prev7_avg: 0.1, d7: 1.2, d30: 3.4, month: 2.5, projected: 6.1, spike: true },
  daily: [{ day: "Nov 10", llm: 0.2, apify: 0.1 }, { day: "Nov 11", llm: 0.4, apify: 0.1 }],
  active_users: [{ day: "Nov 10", users: 1, actions: 3 }, { day: "Nov 11", users: 5, actions: 12 }],
  window_total: 0.8,
  split: { scripts: 0.3, users: 0.5, scripts_pct: 37.5, users_pct: 62.5 },
  features: [{ name: "Pitches", cost: 0.4, pct: 100, calls: 4, avg: 0.1 }],
  steps: [{ name: "demographics", llm: 0.2, apify: 0.1, cost: 0.3, calls: 3, avg: 0.1, pct: 100 }],
  users: [{ id: 7, name: "member@example.test", cost: 0.5, pct: 100, calls: 5, split: [["Pitches", 0.4]] }],
  models: [{ name: "gpt-x", cost: 0.8, pct: 100, calls: 9, prompt: 1000, cached: 500, cached_pct: 50 }],
  expensive: [{ created_at: "Nov 11 10:00", model: "gpt-x", context: "pitch for creator", cost: 0.2, duration_ms: 1500 }], slow: [],
  apify: [{ name: "nike", cost: 0.09, pct: 100, runs: 1, asked: 40, got: 40 }],
  near_cap: [{ id: 7, name: "member@example.test", feature: "pitches", uses: 29, cap: 30, pct: 97 }],
  reveals: [], health: { stuck: [], failed: { ranking_v3: 2 }, failed_total: 2 },
  failed_signins: [{ name: "10.0.0.1", n: 6, emails: 2, last: "Nov 11 09:00" }],
  funnel: [{ name: "Early-access sign-ups", n: 10, pct: 100 }, { name: "Invitations sent", n: 6, pct: 60 }, { name: "Created an account from an invitation", n: 3, pct: 30 }],
  funnel_extra: { accounts: 8, signups_window: 4 }, user: null, ...extra,
});

let requested: string[];
function install(role: "admin" | "user", usage: () => Response) {
  installProfileApi(creatorProfile({ role }));
  const base = globalThis.fetch;
  vi.stubGlobal("fetch", vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = new URL(String(input), window.location.origin);
    if (url.pathname === "/api/mavlit/usage/summary") { requested.push(url.search); return usage(); }
    return base(input, init);
  }));
}

beforeEach(() => {
  requested = [];
  vi.stubGlobal("ResizeObserver", class { observe() {} unobserve() {} disconnect() {} });
});

describe("Usage & Cost page", () => {
  it("shows the cards, the spike alert and the tables to an admin, with no budget anywhere", async () => {
    install("admin", () => json(summary()));
    renderProfile(<UsageCost />);
    expect(await screen.findByRole("heading", { name: /Usage & Cost/ })).toBeInTheDocument();
    expect(await screen.findByTestId("stat-today")).toHaveTextContent("$0.500");
    expect(screen.getByTestId("stat-today").parentElement).toHaveTextContent("projected $6.10");
    expect(screen.queryByText(/budget/i)).toBeNull();
    expect(screen.queryByTestId("stat-budget")).toBeNull();
    expect(screen.getByRole("alert")).toHaveTextContent("over 3×");
    expect(screen.queryByText("Enrichment scripts by step")).toBeNull();   // the section is gone
    expect(screen.queryByTestId("steps-table")).toBeNull();
    expect(screen.getByTestId("chart-active-users")).toBeInTheDocument();
    expect(screen.getByText("Active users per day")).toBeInTheDocument();
    expect(screen.getByTestId("chart-features")).toBeInTheDocument();
    expect(screen.getByText("29 / 30")).toBeInTheDocument();
    expect(screen.getByTestId("health-jobs")).toHaveTextContent("2 failed");
    for (const removed of ["Enrichment scripts vs users", "Most expensive calls", "Slowest calls", "Failed sign-ins by address"]) {
      expect(screen.queryByText(removed)).toBeNull();   // these sections are gone
    }
    expect(screen.queryByText("10.0.0.1")).toBeNull();
    expect(screen.getByText("Sign-up funnel")).toBeInTheDocument();
    expect(requested[0]).toBe("?days=30");
  });

  it("changes the window and opens one user", async () => {
    install("admin", () => json(summary()));
    renderProfile(<UsageCost />);
    await screen.findByTestId("stat-today");
    fireEvent.click(screen.getByRole("button", { name: "7 days" }));
    await waitFor(() => expect(requested).toContain("?days=7"));
    fireEvent.click((await screen.findAllByRole("button", { name: "member@example.test" }))[0]);
    await waitFor(() => expect(requested).toContain("?days=7&user=7"));
  });

  it("never asks the server for the numbers when the account is not an admin", async () => {
    install("user", () => json(summary()));
    renderProfile(<UsageCost />);
    await waitFor(() => expect(window.location.pathname).toBe("/dashboard"));
    expect(screen.queryByRole("heading", { name: /Usage & Cost/ })).toBeNull();
    expect(requested).toEqual([]);
  });

  it("says so when the server refuses (403) and when it fails", async () => {
    install("admin", () => json({ detail: "Admin access required" }, 403));
    const first = renderProfile(<UsageCost />);
    expect(await screen.findByRole("alert")).toHaveTextContent("don't have access");
    first.unmount();
    install("admin", () => json({ detail: "boom" }, 500));
    renderProfile(<UsageCost />);
    expect(await screen.findByRole("alert")).toHaveTextContent("Could not load");
  });
});

describe("usage helpers", () => {
  it("draws the chart tooltip with a light name and the amount in its own colour on the dark box", () => {
    const { container } = render(<ChartTip active label="Profile generation" payload={[{ name: "Cost", value: 0.5, color: "#7c3aed" }]} amount={(v) => money(v)} />);
    const box = container.firstElementChild as HTMLElement;
    expect(box.style.background).not.toBe("");
    expect(screen.getByText("Profile generation")).toHaveStyle({ color: "#f4f4f5" });   // the name: light on the dark box
    const amount = screen.getByText("$0.500");
    expect(amount).toHaveStyle({ color: "#fbbf24" });                                  // the price: its own colour
    expect(amount.style.color).not.toBe(box.style.color);
  });

  it("formats money", () => {
    expect(money(0.092)).toBe("$0.092");
    expect(money(12.345)).toBe("$12.35");
  });
});
