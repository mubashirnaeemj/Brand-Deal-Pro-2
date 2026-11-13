// Pure helpers for the Feed prototype: filters, formatting and the derived "intelligence". No network, no storage.
import { BRANDS, CREATORS, ME, PARTNERSHIPS } from "@/data/feed";
import type { FeedBrand, FeedCreator, FeedPartnership } from "@/data/feed";

export const NICHES = ["Music", "Beauty", "Fitness", "Health & Wellness"];
export const PLATFORMS = ["Instagram", "TikTok", "YouTube"];
export const COUNTRIES = ["United States", "Canada", "United Kingdom", "Australia"];
export const FOLLOWER_RANGES = [
  { id: "1K–10K", min: 1_000, max: 10_000 },
  { id: "10K–50K", min: 10_000, max: 50_000 },
  { id: "50K–100K", min: 50_000, max: 100_000 },
  { id: "100K–500K", min: 100_000, max: 500_000 },
  { id: "500K+", min: 500_000, max: Infinity },
];
export const ENGAGEMENT_RANGES = [
  { id: "Under 4%", min: 0, max: 4 },
  { id: "4–6%", min: 4, max: 6 },
  { id: "6–8%", min: 6, max: 8 },
  { id: "8%+", min: 8, max: Infinity },
];
export const DATE_RANGES = [
  { id: "30", label: "Last 30 days", days: 30 },
  { id: "90", label: "Last 90 days", days: 90 },
  { id: "180", label: "Last 6 months", days: 180 },
  { id: "365", label: "Last 12 months", days: 365 },
];
const unique = (values: string[]) => [...new Set(values)].sort();
export const CONTENT_CATEGORIES = unique(PARTNERSHIPS.map((p) => p.category));
export const BRAND_CATEGORIES = unique(BRANDS.map((b) => b.category));

export interface FeedFilters {
  niche: string[]; platform: string[]; country: string[]; followers: string[]; engagement: string[];
  contentCategory: string[]; brandCategory: string[]; date: string;
}
export const EMPTY_FILTERS: FeedFilters = {
  niche: [], platform: [], country: [], followers: [], engagement: [], contentCategory: [], brandCategory: [], date: "",
};
export const activeFilterCount = (f: FeedFilters) =>
  (Object.keys(f) as (keyof FeedFilters)[]).reduce((n, key) => n + (key === "date" ? (f.date ? 1 : 0) : (f[key] as string[]).length), 0);

export const creatorById = new Map(CREATORS.map((c) => [c.id, c]));
export const brandById = new Map(BRANDS.map((b) => [b.id, b]));

// ── Formatting ───────────────────────────────────────────────────────────────
export function fmtCount(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(n >= 10_000_000 ? 0 : 1).replace(/\.0$/, "")}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(n >= 100_000 ? 0 : 1).replace(/\.0$/, "")}K`;
  return String(n);
}
export const fmtPercent = (n: number) => `${n.toFixed(1).replace(/\.0$/, "")}%`;
export function partnershipDate(daysAgo: number): string {
  const d = new Date(); d.setDate(d.getDate() - daysAgo);
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}
export function ago(daysAgo: number): string {
  if (daysAgo <= 0) return "today";
  if (daysAgo === 1) return "yesterday";
  if (daysAgo < 14) return `${daysAgo} days ago`;
  if (daysAgo < 60) return `${Math.round(daysAgo / 7)} weeks ago`;
  return `${Math.round(daysAgo / 30)} months ago`;
}
export const postEngagement = (p: FeedPartnership) => ((p.likes + p.comments) / p.views) * 100;
const average = (values: number[]) => (values.length ? values.reduce((a, b) => a + b, 0) / values.length : 0);

// ── Filtering ────────────────────────────────────────────────────────────────
const inRange = (value: number, ids: string[], ranges: { id: string; min: number; max: number }[]) =>
  ids.length === 0 || ranges.some((r) => ids.includes(r.id) && value >= r.min && value < r.max);

function creatorMatches(c: FeedCreator, f: FeedFilters, platform: string): boolean {
  return (f.niche.length === 0 || f.niche.includes(c.niche))
    && (f.platform.length === 0 || f.platform.includes(platform))
    && (f.country.length === 0 || f.country.includes(c.country))
    && inRange(c.followers, f.followers, FOLLOWER_RANGES)
    && inRange(c.engagementRate, f.engagement, ENGAGEMENT_RANGES);
}
function postMatches(p: FeedPartnership, f: FeedFilters): boolean {
  const brand = brandById.get(p.brandId);
  const range = DATE_RANGES.find((r) => r.id === f.date);
  return (f.contentCategory.length === 0 || f.contentCategory.includes(p.category))
    && (f.brandCategory.length === 0 || (!!brand && f.brandCategory.includes(brand.category)))
    && (!range || p.daysAgo <= range.days);
}
const postFiltersActive = (f: FeedFilters) => f.contentCategory.length + f.brandCategory.length > 0 || !!f.date;

export function filterPartnerships(f: FeedFilters): FeedPartnership[] {
  return PARTNERSHIPS.filter((p) => {
    const creator = creatorById.get(p.creatorId);
    return !!creator && creatorMatches(creator, f, p.platform) && postMatches(p, f);
  });
}
export function filterCreators(f: FeedFilters): FeedCreator[] {
  return CREATORS.filter((c) => creatorMatches(c, f, c.platform)
    && (!postFiltersActive(f) || PARTNERSHIPS.some((p) => p.creatorId === c.id && postMatches(p, f))));
}
export function filterBrands(f: FeedFilters): FeedBrand[] {
  const visible = new Set(filterPartnerships(f).map((p) => p.brandId));
  return BRANDS.filter((b) => visible.has(b.id));
}

// ── Creator + brand intelligence ─────────────────────────────────────────────
export const partnershipsOfCreator = (creatorId: string) =>
  PARTNERSHIPS.filter((p) => p.creatorId === creatorId).sort((a, b) => a.daysAgo - b.daysAgo);
export const partnershipsOfBrand = (brandId: string) =>
  PARTNERSHIPS.filter((p) => p.brandId === brandId).sort((a, b) => a.daysAgo - b.daysAgo);

export function whyYoureSeeingThis(p: FeedPartnership): { headline: string; reasons: string[]; score: number } {
  const creator = creatorById.get(p.creatorId)!; const brand = brandById.get(p.brandId)!;
  const reasons: string[] = [];
  if (creator.niche === ME.niche) reasons.push(`Both of you create ${creator.niche} content`);
  const ratio = creator.followers / ME.followers;
  if (ratio >= 0.6 && ratio <= 1.8) reasons.push(`Similar audience size: ${fmtCount(creator.followers)} followers vs your ${fmtCount(ME.followers)}`);
  if (Math.abs(creator.engagementRate - ME.engagementRate) <= 1.2) reasons.push(`Comparable engagement: ${fmtPercent(creator.engagementRate)} vs your ${fmtPercent(ME.engagementRate)}`);
  if (creator.country === ME.country) reasons.push(`Based in the same market (${creator.country})`);
  const mineInCategory = ME.partnerBrandIds.map((id) => brandById.get(id)).find((b) => b && b.category === brand.category);
  if (mineInCategory) reasons.push(`${brand.name} is in the same category as ${mineInCategory.name}, a brand you've worked with`);
  else if (brand.niche === ME.niche && !ME.partnerBrandIds.includes(brand.id)) reasons.push(`${brand.name} is a ${brand.niche} brand you haven't partnered with yet`);
  if (p.type === "Reel") reasons.push("Reels are your strongest format");
  const cross = reasons.length === 0;
  return {
    headline: cross ? "Inspiration from a neighbouring niche" : `${creator.similarity}% match with your profile`,
    reasons: cross ? [`Different niche, but ${brand.name} ran a ${p.type.toLowerCase()} campaign you could adapt`] : reasons.slice(0, 3),
    score: creator.similarity + reasons.length * 8 - p.daysAgo * 0.2,
  };
}

const countBy = <T,>(items: T[], key: (item: T) => string) => {
  const map = new Map<string, number>();
  for (const item of items) map.set(key(item), (map.get(key(item)) ?? 0) + 1);
  return [...map.entries()].sort((a, b) => b[1] - a[1]);
};

export interface BrandIntel {
  brand: FeedBrand; posts: FeedPartnership[]; creators: FeedCreator[];
  minFollowers: number; maxFollowers: number; formats: { name: string; pct: number }[];
  countries: string[]; categories: string[]; avgEngagement: number; fit: number; insights: string[];
}
export function brandIntel(brand: FeedBrand): BrandIntel {
  const posts = partnershipsOfBrand(brand.id);
  const creators = [...new Map(posts.map((p) => [p.creatorId, creatorById.get(p.creatorId)!])).values()];
  const followers = creators.map((c) => c.followers);
  const minFollowers = Math.min(...followers); const maxFollowers = Math.max(...followers);
  const formats = countBy(posts, (p) => p.type).map(([name, n]) => ({ name, pct: Math.round((n / posts.length) * 100) }));
  const countries = unique(creators.map((c) => c.country));
  const categories = countBy(posts, (p) => p.category).map(([name]) => name);
  const overlap = categories.reduce((sum, c) => sum + (ME.mix[c] ?? 0), 0);
  const inRangeNow = ME.followers >= minFollowers * 0.8 && ME.followers <= maxFollowers * 1.2;
  const sameNiche = brand.niche === ME.niche;
  const topFormat = formats[0];
  const insights: string[] = [];
  if (sameNiche) insights.push(`${brand.name} partners with ${ME.niche} creators, the same niche as ${"@" + ME.handle}.`);
  else insights.push(`${brand.name} sits in ${brand.niche}, outside your usual niche. Treat it as a stretch opportunity.`);
  insights.push(inRangeNow
    ? `Their creators range from ${fmtCount(minFollowers)} to ${fmtCount(maxFollowers)} followers, and your ${fmtCount(ME.followers)} sits inside that range.`
    : `Their creators range from ${fmtCount(minFollowers)} to ${fmtCount(maxFollowers)} followers, so your ${fmtCount(ME.followers)} is ${ME.followers < minFollowers ? "below" : "above"} their usual range.`);
  insights.push(`${topFormat.pct}% of their detected partnerships are ${topFormat.name}s${topFormat.name === "Reel" ? `, and Reels average ${fmtCount(ME.avgReelViews)} views for you` : ""}.`);
  if (countries.includes(ME.country)) insights.push(`They actively work with creators in ${ME.country}.`);
  if (overlap > 0) insights.push(`Their top content (${categories.slice(0, 2).join(", ")}) overlaps with ${overlap}% of what you publish.`);
  if (ME.partnerBrandIds.includes(brand.id)) insights.unshift(`You've already partnered with ${brand.name}, so this is a strong renewal conversation.`);
  const fit = Math.min(99, Math.round((sameNiche ? 40 : 8) + (inRangeNow ? 25 : 10) + (countries.includes(ME.country) ? 15 : 5) + overlap * 0.2));
  return { brand, posts, creators, minFollowers, maxFollowers, formats, countries, categories, avgEngagement: average(creators.map((c) => c.engagementRate)), fit, insights };
}

// ── Market insights ──────────────────────────────────────────────────────────
export interface PeerStats {
  count: number; avgFollowers: number; avgEngagement: number; avgReelViews: number; postsPerWeek: number;
  partnerships: number; mix: Record<string, number>;
}
export function peerStats(peers: FeedCreator[]): PeerStats {
  const mix: Record<string, number> = {};
  for (const c of peers) for (const [k, v] of Object.entries(c.mix)) mix[k] = (mix[k] ?? 0) + v / peers.length;
  return {
    count: peers.length,
    avgFollowers: average(peers.map((c) => c.followers)),
    avgEngagement: average(peers.map((c) => c.engagementRate)),
    avgReelViews: average(peers.map((c) => c.avgReelViews)),
    postsPerWeek: average(peers.map((c) => c.postsPerWeek)),
    partnerships: average(peers.map((c) => partnershipsOfCreator(c.id).length)),
    mix,
  };
}
export const myPartnershipCount = ME.partnerBrandIds.length;

export function missedOpportunities(peers: FeedCreator[]) {
  const ids = new Set(peers.map((c) => c.id));
  const byBrand = new Map<string, Set<string>>();
  for (const p of PARTNERSHIPS) {
    if (!ids.has(p.creatorId) || ME.partnerBrandIds.includes(p.brandId)) continue;
    byBrand.set(p.brandId, (byBrand.get(p.brandId) ?? new Set()).add(p.creatorId));
  }
  return [...byBrand.entries()]
    .map(([brandId, creatorIds]) => ({ brand: brandById.get(brandId)!, creators: [...creatorIds].map((id) => creatorById.get(id)!) }))
    .sort((a, b) => b.creators.length - a.creators.length);
}

export const SIMILAR_PEER_THRESHOLD = 70;
