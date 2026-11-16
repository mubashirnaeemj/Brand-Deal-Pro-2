import { api } from "@/lib/api";
import { fmtCount, fmtPercent } from "@/lib/feedData";
import type { YouStats } from "@/lib/similarCreators";

export const MARKET_INSIGHTS_PATH = "/feed/market-insights";

export interface MarketPeers {
  count: number;                                                  // up to 5: the most similar creators with the same audience size as you
  avg_followers: number | null; avg_engagement: number | null; avg_reel_views: number | null; avg_posts_per_week: number | null; avg_partnerships: number | null;
  content_mix: Record<string, number>;                            // their average content mix in percent per category; empty until a content mix was estimated for them
  mix_count: number;                                              // how many of them have one
  creators: { username: string; similarity: number; followers: number | null }[];
}
export interface MissedBrand { brand_raw_id: number; brand_name: string; niche: string | null; website: string | null; rank: number; confidence: number; partnerships: number }
export interface MarketInsightsResponse {
  ready: boolean; threshold: number; audience_range: { min: number; max: number } | null;
  you: YouStats; peers: MarketPeers; missed_brands: MissedBrand[];
}

export const fetchMarketInsights = () => api.get<MarketInsightsResponse>(MARKET_INSIGHTS_PATH);

export interface Metric { key: "views" | "eng" | "freq" | "deals"; label: string; me: number | null; peer: number | null; show: (n: number) => string }

const perWeek = (n: number) => n.toFixed(1);
const count = (n: number) => n.toFixed(n % 1 ? 1 : 0);

/** The four numbers you are compared on. No view counts for you is 0; for anything else with no number, `me` is null and the card shows a dash. */
export function marketMetrics(you: YouStats, peers: MarketPeers): Metric[] {
  return [
    { key: "views", label: "Avg Reel views", me: you.avg_reel_views ?? 0, peer: peers.avg_reel_views, show: fmtCount },
    { key: "eng", label: "Engagement rate", me: you.engagement_rate, peer: peers.avg_engagement, show: fmtPercent },
    { key: "freq", label: "Posts per week", me: you.posts_per_week, peer: peers.avg_posts_per_week, show: perWeek },
    { key: "deals", label: "Brand partnerships", me: you.brand_partnerships, peer: peers.avg_partnerships, show: count },
  ];
}

/** Both numbers known and the peers' above zero: the only case a percentage against the peers means something. */
export const comparable = (m: Metric): m is Metric & { me: number; peer: number } => m.me !== null && m.peer !== null && m.peer > 0;

/** Where you lead and where you trail the peers by 10% or more, from the real numbers. */
export function strengthsAndGaps(metrics: Metric[]): { strengths: string[]; weaknesses: string[] } {
  const strengths: string[] = []; const weaknesses: string[] = [];
  for (const m of metrics.filter(comparable)) {
    const ratio = m.me / m.peer; const pct = Math.abs(Math.round((ratio - 1) * 100));
    if (ratio >= 1.1) strengths.push(`${m.label}: ${m.show(m.me)} vs ${m.show(m.peer)} for similar creators (+${pct}%).`);
    else if (ratio <= 0.9) weaknesses.push(`${m.label}: ${m.show(m.me)} vs ${m.show(m.peer)} for similar creators (−${pct}%).`);
  }
  return { strengths, weaknesses };
}

const CATEGORY_LEAD = 5;   // percentage points you must be ahead of the peers in a category to call it a strength
const CATEGORY_GAP = 4;    // and behind them to call it a gap

/**
 * Where your content mix differs from the peers': from the mix MAVLIT estimated for you and the average mix of the peers who have one. Nothing when
 * either is missing, so a category is never talked about from a guess.
 */
export function categoryLines(you: YouStats, peers: MarketPeers): { strengths: string[]; weaknesses: string[] } {
  const leads: { gap: number; line: string }[] = []; const gaps: { gap: number; line: string }[] = [];
  if (!you.content_categories?.length || peers.mix_count === 0) return { strengths: [], weaknesses: [] };
  const mine = Object.fromEntries(you.content_categories.map((c) => [c.name, c.pct]));
  const names = [...new Set([...Object.keys(mine), ...Object.entries(peers.content_mix).sort((a, b) => b[1] - a[1]).slice(0, 4).map(([name]) => name)])];
  for (const name of names) {
    const yours = mine[name] ?? 0; const theirs = Math.round(peers.content_mix[name] ?? 0);
    if (yours - theirs >= CATEGORY_LEAD) leads.push({ gap: yours - theirs, line: `${name}: ${yours}% of your content vs ${theirs}% for peers. You lean into it.` });
    if (theirs - yours >= CATEGORY_GAP) gaps.push({ gap: theirs - yours, line: `${name}: ${yours}% of your content vs ${theirs}% for peers. Brands in this lane may overlook you.` });
  }
  const biggestFirst = (a: { gap: number }, b: { gap: number }) => b.gap - a.gap;
  return { strengths: leads.sort(biggestFirst).map((l) => l.line), weaknesses: gaps.sort(biggestFirst).map((l) => l.line) };
}
