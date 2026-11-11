import { api } from "@/lib/api";

/** One row of a ranked list: `pct` is its share of the biggest row (for the bar). */
export interface UsageRow { name: string; cost: number; pct: number; calls?: number; id?: number }
export interface UsageUserRow extends UsageRow { split: [string, number][] }
export interface UsageModelRow extends UsageRow { prompt: number; cached: number; cached_pct: number }
export interface UsageStepRow { name: string; llm: number; apify: number; cost: number; calls: number; avg: number; pct: number }
export interface UsageCall { created_at: string; model: string; context: string; cost: number; duration_ms: number | null }

export interface UsageSummary {
  days: number;
  choices: number[];
  cards: { today: number; prev7_avg: number; d7: number; d30: number; month: number; projected: number; budget: number; budget_pct: number; projected_pct: number; spike: boolean };
  daily: { day: string; llm: number; apify: number }[];
  daily_budget: number;
  window_total: number;
  split: { scripts: number; users: number; scripts_pct: number; users_pct: number };
  features: (UsageRow & { calls: number; avg: number })[];
  steps: UsageStepRow[];
  users: UsageUserRow[];
  models: UsageModelRow[];
  expensive: UsageCall[];
  slow: UsageCall[];
  apify: (UsageRow & { runs: number; asked: number; got: number })[];
  near_cap: { id: number; name: string; feature: string; uses: number; cap: number; pct: number }[];
  reveals: (UsageRow & { brands: number })[];
  health: { stuck: { name: string; feature: string; since: string }[]; failed: Record<string, number>; failed_total: number };
  failed_signins: { name: string; n: number; emails: number; last: string }[];
  funnel: { name: string; n: number; pct: number }[];
  funnel_extra: { accounts: number; signups_window: number };
  user: null | { id: number; email: string; features: UsageRow[]; recent: UsageCall[] };
}

export const USAGE_DAY_CHOICES = [7, 30, 90] as const;

export const getUsageSummary = (days: number, user: number | null) =>
  api.get<UsageSummary>(`/usage/summary?days=${days}${user ? `&user=${user}` : ""}`);

export const money = (v: number) => `$${v >= 1 ? v.toFixed(2) : v.toFixed(3)}`;

/** The per-step table as CSV text (the page downloads this). */
export function stepsCsv(steps: UsageStepRow[]): string {
  const cell = (v: string | number) => (/[",\n]/.test(String(v)) ? `"${String(v).replace(/"/g, '""')}"` : String(v));
  const rows = [["step", "openai_usd", "apify_usd", "total_usd", "calls", "avg_usd_per_call"], ...steps.map((r) => [r.name, r.llm, r.apify, r.cost, r.calls, r.avg])];
  return rows.map((row) => row.map(cell).join(",")).join("\n");
}
