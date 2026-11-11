import { api } from "@/lib/api";

/** One row of a ranked list: `pct` is its share of the biggest row (for the bar). */
export interface UsageRow { name: string; cost: number; pct: number; calls?: number; id?: number }
export interface UsageUserRow extends UsageRow { split: [string, number][] }
export interface UsageModelRow extends UsageRow { prompt: number; cached: number; cached_pct: number }
export interface UsageCall { created_at: string; model: string; context: string; cost: number; duration_ms: number | null }

export interface UsageSummary {
  days: number;
  choices: number[];
  cards: { today: number; prev7_avg: number; d7: number; d30: number; month: number; projected: number; spike: boolean };
  daily: { day: string; llm: number; apify: number }[];
  active_users: { day: string; users: number; actions: number }[];   // distinct users who did anything that day, and how many actions
  window_total: number;
  features: (UsageRow & { calls: number; avg: number })[];
  users: UsageUserRow[];
  models: UsageModelRow[];
  expensive: UsageCall[];
  slow: UsageCall[];
  apify: (UsageRow & { runs: number; asked: number; got: number })[];
  near_cap: { id: number; name: string; feature: string; uses: number; cap: number; pct: number }[];
  reveals: (UsageRow & { brands: number })[];
  activity_users: { id: number; name: string; count: number; pct: number; split: [string, number][] }[];   // top 10 users by how much they did
  health: { stuck: { name: string; feature: string; since: string }[]; failed: Record<string, number>; failed_total: number };
  failed_signins: { name: string; n: number; emails: number; last: string }[];
  funnel: { name: string; n: number; pct: number }[];
  funnel_extra: { accounts: number; signups_window: number };
  user: null | {
    id: number; email: string;
    features: UsageRow[]; recent: UsageCall[];                           // the money view (Cost tab)
    activity: UserActivity[];                                            // the activity view (User activity tab): newest first, no money
    activity_mix: { name: string; count: number; pct: number }[];        // times used per feature in the window, most used first
  };
}

export interface UserActivity { at: string; what: string; group: string }

export const USAGE_DAY_CHOICES = [7, 30, 90] as const;

export const getUsageSummary = (days: number, user: number | null) =>
  api.get<UsageSummary>(`/usage/summary?days=${days}${user ? `&user=${user}` : ""}`);

export const money = (v: number) => `$${v >= 1 ? v.toFixed(2) : v.toFixed(3)}`;
