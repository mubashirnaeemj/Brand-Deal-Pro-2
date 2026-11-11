import { cloneElement, type ReactElement } from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

// jsdom has no layout, so recharts draws nothing; give every chart a fixed size so its lines can be counted.
vi.mock("recharts", async (importOriginal) => {
  const original = await importOriginal<typeof import("recharts")>();
  return { ...original, ResponsiveContainer: ({ children }: { children: ReactElement<{ width?: number; height?: number }> }) => cloneElement(children, { width: 800, height: 300 }) };
});
import UsageCost, { ChartTip, FEATURE_LINES } from "@/pages/UsageCost";
import { money } from "@/lib/usage";
import { installProfileApi } from "./fixtures/profileApi";
import { creatorProfile } from "./fixtures/creatorProfile";
import { renderProfile } from "./renderProfile";

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

const summary = (extra: Record<string, unknown> = {}) => ({
  days: 30, choices: [7, 30, 90],
  cards: { today: 0.5, prev7_avg: 0.1, d7: 1.2, d30: 3.4, month: 2.5, projected: 6.1, spike: true },
  daily: [{ day: "Nov 10", llm: 0.2, apify: 0.1 }, { day: "Nov 11", llm: 0.4, apify: 0.1 }],
  active_users: [{ day: "Nov 10", users: 1, actions: 3 }, { day: "Nov 11", users: 5, actions: 12 }],
  window_total: 0.8,
  feature_lines: ["matches", "rate", "pitch", "description", "post_added", "post_removed", "own_brand", "contacts", "saved"],
  feature_daily: [
    { day: "Nov 10", users: { matches: 1, rate: 0, pitch: 1, description: 0, post_added: 0, post_removed: 0, own_brand: 0, contacts: 1, saved: 0 },
      uses: { matches: 2, rate: 0, pitch: 3, description: 0, post_added: 0, post_removed: 0, own_brand: 0, contacts: 4, saved: 0 } },
    { day: "Nov 11", users: { matches: 2, rate: 1, pitch: 2, description: 1, post_added: 1, post_removed: 1, own_brand: 1, contacts: 2, saved: 1 },
      uses: { matches: 6, rate: 2, pitch: 5, description: 1, post_added: 3, post_removed: 1, own_brand: 1, contacts: 9, saved: 2 } },
  ],
  features: [{ name: "Pitches", cost: 0.4, pct: 100, calls: 4, avg: 0.1 }],
  users: [{ id: 7, name: "member@example.test", cost: 0.5, pct: 100, calls: 5, split: [["Pitches", 0.4]] }],
  models: [{ name: "gpt-x", cost: 0.8, pct: 100, calls: 9, prompt: 1000, cached: 500, cached_pct: 50 }],
  expensive: [{ created_at: "Nov 11 10:00", model: "gpt-x", context: "pitch for creator", cost: 0.2, duration_ms: 1500 }], slow: [],
  apify: [{ name: "nike", cost: 0.09, pct: 100, runs: 1, asked: 40, got: 40 }],
  near_cap: [{ id: 7, name: "member@example.test", feature: "pitches", uses: 29, cap: 30, pct: 97 }],
  reveals: [{ name: "contacts-user@example.test", cost: 4, pct: 100, brands: 2 }],
  activity_users: [{ id: 7, name: "member@example.test", count: 13, pct: 100, split: [["Pitches", 9], ["Matching", 4]] }], health: { stuck: [], failed: { ranking_v3: 2 }, failed_total: 2 },
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
    expect(screen.getByText(/Enrichment scripts and test accounts are not counted/)).toBeInTheDocument();
    for (const removed of ["Enrichment scripts by step", "Users near a daily limit (today)", "Jobs", "Health", "Enrichment scripts vs users", "Most expensive calls", "Slowest calls",
                           "Failed sign-ins by address"]) {
      expect(screen.queryByText(removed)).toBeNull();   // sections that were removed
    }
    expect(screen.queryByTestId("health-jobs")).toBeNull();
    expect(screen.queryByText("29 / 30")).toBeNull();
    expect(screen.queryByText("10.0.0.1")).toBeNull();
    expect(requested[0]).toBe("?days=30");
  });

  it("draws a multi-line 'Feature use per day' chart with a by-user / by-uses toggle and tick boxes for the lines", async () => {
    install("admin", () => json(summary()));
    renderProfile(<UsageCost />);
    await screen.findByTestId("stat-today");
    fireEvent.click(screen.getByRole("tab", { name: "User activity" }));
    expect(await screen.findByText("Feature use per day")).toBeInTheDocument();

    const picker = screen.getByTestId("feature-line-picker");
    const boxes = Array.from(picker.querySelectorAll<HTMLInputElement>("input[type=checkbox]"));
    expect(boxes.map((b) => b.parentElement?.textContent?.trim())).toEqual([
      "Matches", "Rate intelligence", "Pitch", "Description made by MAVLIT", "Add post", "Delete post", "Add own brand", "View brands (contacts)", "Saved brands"]);
    expect(boxes.every((b) => b.checked)).toBe(true);                       // every line is drawn to start with
    const chart = () => screen.getByTestId("chart-feature-use");
    // layout: the By user / By feature uses toggle stays in the panel header (above the chart); the line picker is UNDER the chart
    const toggleButton = screen.getByRole("button", { name: "By user" });
    expect(toggleButton.compareDocumentPosition(chart()) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();   // chart comes after the toggle
    expect(chart().compareDocumentPosition(picker) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();         // picker comes after the chart
    expect(toggleButton.compareDocumentPosition(picker) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    const drawn = () => chart().querySelectorAll(".recharts-line").length;
    expect(drawn()).toBe(9);

    // the admin picks the lines
    fireEvent.click(screen.getByLabelText("Matches"));
    expect(drawn()).toBe(8);
    fireEvent.click(screen.getByRole("button", { name: "None" }));
    expect(screen.queryByTestId("chart-feature-use")).toBeNull();
    expect(screen.getByText("Tick at least one line to draw it.")).toBeInTheDocument();
    fireEvent.click(screen.getByLabelText("Pitch"));
    fireEvent.click(screen.getByLabelText("Add post"));
    expect(drawn()).toBe(2);

    // by user (default): how many different users; by feature uses: how many times
    const byUser = screen.getByRole("button", { name: "By user" });
    const byUses = screen.getByRole("button", { name: "By feature uses" });
    expect(byUser).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByText(/how many different users used each feature/)).toBeInTheDocument();
    const yMax = () => Math.max(...Array.from(chart().querySelectorAll(".recharts-yAxis .recharts-cartesian-axis-tick-value")).map((t) => Number(t.textContent)));
    expect(yMax()).toBeLessThanOrEqual(2);                                              // different users per day: at most 2 for pitch / add post in the fixture
    fireEvent.click(byUses);
    expect(byUses).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByText(/how many times each feature was used/)).toBeInTheDocument();
    expect(yMax()).toBeGreaterThanOrEqual(5);                                           // uses per day: the axis now reaches the 5 pitch uses
    expect(drawn()).toBe(2);

    // the choice is kept when the admin goes to the Cost tab and back
    fireEvent.click(screen.getByRole("tab", { name: "Cost" }));
    fireEvent.click(screen.getByRole("tab", { name: "User activity" }));
    expect(screen.getByRole("button", { name: "By feature uses" })).toHaveAttribute("aria-pressed", "true");
    expect(chart().querySelectorAll(".recharts-line").length).toBe(2);

    fireEvent.click(screen.getByRole("button", { name: "All" }));
    expect(drawn()).toBe(9);
  });

  it("gives each of the nine lines its own colour, all different", () => {
    const colors = FEATURE_LINES.map((l) => l.color.toLowerCase());
    expect(colors).toHaveLength(9);
    expect(new Set(colors).size).toBe(9);
    for (const c of colors) expect(c).toMatch(/^#[0-9a-f]{6}$/);
    // no two lines share a hue family: compare hues of the colours
    const hue = (hex: string) => {
      const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
      const max = Math.max(r, g, b), min = Math.min(r, g, b), d = max - min;
      const h = d === 0 ? 0 : max === r ? ((g - b) / d) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
      return (h * 60 + 360) % 360;
    };
    const chromatic = FEATURE_LINES.filter((l) => l.key !== "own_brand").map((l) => hue(l.color));   // Add own brand is the one neutral (near-white): it has no hue
    const hues = chromatic.sort((a, b) => a - b);
    const gaps = hues.map((h, i) => (i === hues.length - 1 ? hues[0] + 360 - h : hues[i + 1] - h));
    expect(Math.min(...gaps)).toBeGreaterThanOrEqual(20);   // every hue at least 20 degrees from its nearest neighbour
    const byKey = Object.fromEntries(FEATURE_LINES.map((l) => [l.key, l.color]));
    expect(byKey.pitch).not.toBe(byKey.saved);
    expect(byKey.own_brand).toBe("#f1f5f9");                                                        // Pitch (green) and Add own brand (white) are nothing alike
    expect(byKey.pitch).toBe("#22c55e");
  });

  it("splits the page into a Cost tab and a User activity tab, Cost first", async () => {
    install("admin", () => json(summary()));
    renderProfile(<UsageCost />);
    await screen.findByTestId("stat-today");
    const [costTab, activityTab] = screen.getAllByRole("tab");
    expect([costTab.textContent, activityTab.textContent]).toEqual(["Cost", "User activity"]);
    expect(costTab).toHaveAttribute("aria-selected", "true");

    // Cost tab: the money, nothing about people's activity
    expect(screen.getByTestId("chart-daily")).toBeInTheDocument();
    expect(screen.getByTestId("chart-features")).toBeInTheDocument();
    for (const title of ["Top 10 users by cost", "Model mix and cached tokens", "Apify: dearest accounts"]) expect(screen.getByText(title)).toBeInTheDocument();
    for (const other of ["Active users per day", "Top 10 users by activity", "Brand contacts opened per user", "Sign-up funnel"]) expect(screen.queryByText(other)).toBeNull();

    // User activity tab: the people, none of the money panels
    fireEvent.click(activityTab);
    expect(activityTab).toHaveAttribute("aria-selected", "true");
    expect(await screen.findByTestId("stat-active-today")).toHaveTextContent("5");   // the last day of the fixture: 5 users
    expect(screen.getByTestId("chart-active-users")).toBeInTheDocument();
    for (const title of ["Active users per day", "Top 10 users by activity", "Brand contacts opened per user", "Sign-up funnel"]) expect(screen.getByText(title)).toBeInTheDocument();
    expect(screen.getByText("13 actions")).toBeInTheDocument();                         // the new ranking shows how much each user did
    expect(screen.getByText(/Most used: Pitches · Pitches 9 · Matching 4/)).toBeInTheDocument();
    expect(screen.getByText("contacts-user@example.test")).toBeInTheDocument();         // "Brand contacts opened per user" is a plain list, as it was:
    expect(screen.queryByRole("button", { name: "contacts-user@example.test" })).toBeNull();   // its names are not clickable
    expect(screen.queryByTestId("chart-daily")).toBeNull();
    expect(screen.queryByTestId("stat-today")).toBeNull();
    expect(screen.queryByRole("alert")).toBeNull();                                  // the spend alert belongs to the Cost tab

    // the chosen tab is kept when the time window changes
    fireEvent.click(screen.getByRole("button", { name: "7 days" }));
    await waitFor(() => expect(requested).toContain("?days=7"));
    expect(screen.getByRole("tab", { name: "User activity" })).toHaveAttribute("aria-selected", "true");

    fireEvent.click(screen.getByRole("tab", { name: "Cost" }));
    expect(await screen.findByTestId("chart-daily")).toBeInTheDocument();
  });

  it("is separate from the creator app: none of the app's navigation buttons, only a label and Sign out", async () => {
    install("admin", () => json(summary()));
    renderProfile(<UsageCost />);   // the real page, with no Navbar or Footer mocked
    await screen.findByTestId("stat-today");
    for (const label of ["Dashboard", "Matches", "Pitch", "Pipeline", "Profile"]) {
      expect(screen.queryByRole("link", { name: label })).toBeNull();
    }
    expect(screen.queryByTestId("nav-link-dashboard")).toBeNull();
    expect(screen.queryAllByRole("link")).toHaveLength(0);   // no link at all leads back into the app
    const header = screen.getByTestId("admin-header");
    expect(header).toHaveTextContent("Admin");
    expect(screen.getByRole("button", { name: /Sign out/ })).toBeInTheDocument();
  });

  it("opens a user from 'Top 10 users by activity' and shows what they did, when, and what they use most, with no money", async () => {
    const withUser = () => summary({
      user: {
        id: 7, email: "member@example.test",
        features: [{ name: "pitch", cost: 0.4, pct: 100, calls: 4 }], recent: [{ created_at: "Nov 11 10:00", model: "gpt-x", context: "pitch call", cost: 0.2, duration_ms: 900 }],
        activity: [
          { at: "2026-11-11T10:05:00Z", what: "Created a pitch for Nike", group: "Pitches" },
          { at: "2026-11-11T10:01:00Z", what: "Opened the contacts of Nike", group: "Brand contacts" },
          { at: "2026-11-11T09:58:00Z", what: "Ran AI brand matching", group: "Matching" },
        ],
        activity_mix: [{ name: "Pitches", count: 9, pct: 100 }, { name: "Matching", count: 4, pct: 44.4 }],
      },
    });
    install("admin", () => json(requested[requested.length - 1].includes("user=7") ? withUser() : summary()));
    renderProfile(<UsageCost />);
    await screen.findByTestId("stat-today");
    fireEvent.click(screen.getByRole("tab", { name: "User activity" }));
    fireEvent.click(await screen.findByRole("button", { name: "member@example.test" }));   // the name in the activity ranking is clickable
    await waitFor(() => expect(requested).toContain("?days=30&user=7"));

    const view = await screen.findByTestId("user-activity");
    expect(screen.getByTestId("stat-most-used")).toHaveTextContent("Pitches");
    expect(screen.getByTestId("stat-most-used")).toHaveTextContent("9 times");
    const items = Array.from(screen.getByTestId("activity-timeline").querySelectorAll("li")).map((li) => li.textContent ?? "");
    expect(items).toHaveLength(3);
    expect(items[0]).toContain("Created a pitch for Nike");   // newest first, in the order the server sent them
    expect(items[2]).toContain("Ran AI brand matching");
    expect(items[0]).toMatch(/\d{1,2}:\d{2}/);                // each entry shows its time
    expect(view.textContent).not.toContain("$");              // no money in this view
    expect(screen.queryByText("Cost by feature (30 days)")).toBeNull();
    expect(screen.queryByText("Latest 20 calls")).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: /Back to user activity/ }));
    expect(await screen.findByTestId("stat-active-today")).toBeInTheDocument();           // back on the User activity tab
  });

  it("opening a user from the Cost tab still shows the money view", async () => {
    install("admin", () => json(requested[requested.length - 1].includes("user=7") ? summary({
      user: { id: 7, email: "member@example.test", features: [{ name: "pitch", cost: 0.4, pct: 100, calls: 4 }], recent: [], activity: [], activity_mix: [] },
    }) : summary()));
    renderProfile(<UsageCost />);
    await screen.findByTestId("stat-today");
    fireEvent.click((await screen.findAllByRole("button", { name: "member@example.test" }))[0]);
    expect(await screen.findByText("Cost by feature (30 days)")).toBeInTheDocument();
    expect(screen.getByText("$0.400")).toBeInTheDocument();
    expect(screen.queryByTestId("user-activity")).toBeNull();
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
