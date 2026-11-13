// Derived values for the Trending tab (Creator Market Trends). All inputs are the hard-coded sample records in src/data/feed/trends.
import { CREATORS, PARTNERSHIPS } from "@/data/feed";
import type { FeedCreator, FeedPartnership } from "@/data/feed";
import { BRAND_CATEGORY_TRENDS, CONTENT_TRENDS } from "@/data/feed/trends";
import { creatorById } from "@/lib/feedData";

export type Period = "7" | "30" | "90";
// Growth in the data is for 30 days. Other periods scale growth and volumes by fixed factors.
export const PERIODS: { id: Period; label: string; growth: number; volume: number }[] = [
  { id: "7", label: "Last 7 days", growth: 0.4, volume: 0.3 },
  { id: "30", label: "Last 30 days", growth: 1, volume: 1 },
  { id: "90", label: "Last 90 days", growth: 1.9, volume: 2.8 },
];
export interface TrendFilters { period: Period; niche: string; platform: string; country: string }   // "" = all
export const DEFAULT_TREND_FILTERS: TrendFilters = { period: "30", niche: "Music", platform: "", country: "" };

const PLATFORM_CODE: Record<string, string> = { Instagram: "I", TikTok: "T", YouTube: "Y" };
const COUNTRY_CODE: Record<string, string> = { "United States": "U", Canada: "C", "United Kingdom": "K", Australia: "A" };
const periodOf = (f: TrendFilters) => PERIODS.find((p) => p.id === f.period)!;

export interface Scoped<T> { item: T; share: number }
/** Keeps items that match the niche, platform and country filters. `share` shrinks volumes when a filter narrows the trend to one platform/country. */
export function scope<T extends { niche: string; p: string; c: string }>(items: T[], f: TrendFilters): Scoped<T>[] {
  const out: Scoped<T>[] = [];
  for (const item of items) {
    if (f.niche && item.niche !== f.niche) continue;
    if (f.platform && !item.p.includes(PLATFORM_CODE[f.platform])) continue;
    if (f.country && !item.c.includes(COUNTRY_CODE[f.country])) continue;
    const share = (f.platform ? 1 / item.p.length : 1) * (f.country ? 1 / item.c.length : 1);
    out.push({ item, share: Math.max(0.2, share) });
  }
  return out;
}
export const scaleCount = (n: number, f: TrendFilters, share: number) => Math.max(1, Math.round(n * periodOf(f).volume * share));
export const scaleGrowth = (g: number, f: TrendFilters) => Math.round(g * periodOf(f).growth);
export const signed = (g: number) => `${g > 0 ? "+" : g < 0 ? "−" : ""}${Math.abs(g)}%`;
export const periodLabel = (f: TrendFilters) => periodOf(f).label.toLowerCase();

export function hashOf(text: string): number { let h = 0; for (const ch of text) h = (Math.imul(h, 31) + ch.charCodeAt(0)) | 0; return Math.abs(h); }

// ── Growth over time ─────────────────────────────────────────────────────────
export interface SeriesPoint { label: string; value: number }
/** Index starting at 100 and ending at 100 + growth. Same inputs always give the same line. */
export function growthSeries(id: string, growth: number, f: TrendFilters): SeriesPoint[] {
  const days = Number(f.period);
  const n = f.period === "7" ? 7 : f.period === "30" ? 5 : 7;
  const seed = hashOf(id);
  return Array.from({ length: n }, (_, i) => {
    const t = i / (n - 1);
    const eased = growth >= 0 ? t ** 1.5 : t ** 0.8;
    const noise = i === 0 || i === n - 1 ? 0 : Math.sin(seed * (i + 1)) * Math.min(4, Math.abs(growth) * 0.1 + 1);
    const ago = Math.round(days * (1 - t));
    return { label: ago === 0 ? "Today" : `${ago}d ago`, value: Math.round((100 + growth * eased + noise) * 10) / 10 };
  });
}

// ── Overview ─────────────────────────────────────────────────────────────────
export interface Overview { rising: number; tracked: number; growingBrands: number; fastest: { name: string; growth: number } | null; busiest: { name: string; partnerships: number } | null }
export function overview(f: TrendFilters): Overview {
  const content = scope(CONTENT_TRENDS, f);
  const byCategory = new Map<string, number>();
  for (const { item } of content) byCategory.set(item.category, Math.max(byCategory.get(item.category) ?? -Infinity, scaleGrowth(item.g, f)));
  const fastest = [...byCategory.entries()].sort((a, b) => b[1] - a[1])[0];
  const brandCats = scope(BRAND_CATEGORY_TRENDS, f).map(({ item, share }) => ({ name: item.name, partnerships: scaleCount(item.partnerships, f, share) })).sort((a, b) => b.partnerships - a.partnerships);
  return {
    rising: content.filter(({ item }) => item.g > 0).length, tracked: content.length,
    growingBrands: scope(BRAND_CATEGORY_TRENDS, f).filter(({ item }) => item.g > 0).length,
    fastest: fastest ? { name: fastest[0], growth: fastest[1] } : null,
    busiest: brandCats[0] ?? null,
  };
}

// ── Example material for the modals ─────────────────────────────────────────
export function examplePosts(niche: string, seedText: string, count = 3): FeedPartnership[] {
  const pool = PARTNERSHIPS.filter((p) => creatorById.get(p.creatorId)?.niche === niche).sort((a, b) => b.views - a.views);
  if (pool.length === 0) return [];
  const start = hashOf(seedText) % pool.length;
  return Array.from({ length: Math.min(count, pool.length) }, (_, i) => pool[(start + i) % pool.length]);
}
export function exampleCreators(ids: string[], niche: string, seedText: string, count = 4): FeedCreator[] {
  const named = ids.map((id) => creatorById.get(id)).filter((c): c is FeedCreator => !!c);
  if (named.length >= count) return named.slice(0, count);
  const rest = CREATORS.filter((c) => c.niche === niche && !ids.includes(c.id));
  const start = rest.length ? hashOf(seedText) % rest.length : 0;
  return [...named, ...rest.slice(start), ...rest.slice(0, start)].slice(0, count);
}
export function ideasForTrend(name: string, seedText: string, count = 4): string[] {
  const all = [`${name}: a beginner's guide in 60 seconds`, `I tried ${name} for a week. Here's what happened.`, `3 mistakes people make with ${name}`,
    `${name} on a budget`, `Myth vs reality: ${name}`];
  const start = hashOf(seedText) % all.length;
  return Array.from({ length: count }, (_, i) => all[(start + i) % all.length]);
}
