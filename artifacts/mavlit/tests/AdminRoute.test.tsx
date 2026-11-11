import { cloneElement, type ReactElement } from "react";
import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import App from "@/App";
import { installProfileApi } from "./fixtures/profileApi";
import { creatorProfile } from "./fixtures/creatorProfile";

vi.mock("recharts", async (importOriginal) => {
  const original = await importOriginal<typeof import("recharts")>();
  return { ...original, ResponsiveContainer: ({ children }: { children: ReactElement<{ width?: number; height?: number }> }) => cloneElement(children, { width: 800, height: 300 }) };
});

const json = (body: unknown) => new Response(JSON.stringify(body), { status: 200, headers: { "Content-Type": "application/json" } });
const emptySummary = () => ({
  days: 30, choices: [7, 30, 90],
  cards: { today: 0, prev7_avg: 0, d7: 0, d30: 0, month: 0, projected: 0, spike: false },
  daily: [{ day: "Nov 11", llm: 0, apify: 0 }], window_total: 0, active_users: [{ day: "Nov 11", users: 0, actions: 0 }],
  feature_lines: [], feature_daily: [], features: [], users: [], models: [], expensive: [], slow: [], apify: [], near_cap: [], reveals: [], activity_users: [],
  health: { stuck: [], failed: {}, failed_total: 0 }, failed_signins: [], funnel: [], funnel_extra: { accounts: 0, signups_window: 0 }, user: null,
});

let usageCalls: string[];
function open(path: string, role: "admin" | "user") {
  installProfileApi(creatorProfile({ role, onboarding_completed: true }));
  const base = globalThis.fetch;
  vi.stubGlobal("fetch", vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = new URL(String(input), window.location.origin);
    if (url.pathname === "/api/mavlit/usage/summary") { usageCalls.push(url.search); return json(emptySummary()); }
    return base(input, init);
  }));
  window.history.replaceState(null, "", path);
  return render(<App />);
}

beforeEach(() => {
  usageCalls = [];
  vi.stubGlobal("ResizeObserver", class { observe() {} unobserve() {} disconnect() {} });
});

describe("the admin page is at /admin", () => {
  it("opens for an admin", async () => {
    open("/admin", "admin");
    expect(await screen.findByRole("heading", { name: /Usage & Cost/ })).toBeInTheDocument();
    expect(usageCalls.length).toBeGreaterThan(0);
  });

  it("is the 404 page for a normal user, who never reaches the usage numbers", async () => {
    open("/admin", "user");
    expect(await screen.findByRole("heading", { name: "Page not found" })).toBeInTheDocument();
    expect(usageCalls).toEqual([]);
  });

  it("the old address /usage-cost no longer exists, even for an admin", async () => {
    open("/usage-cost", "admin");
    expect(await screen.findByRole("heading", { name: "Page not found" })).toBeInTheDocument();
    expect(usageCalls).toEqual([]);
  });
});
