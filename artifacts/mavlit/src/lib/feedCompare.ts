// Derived logic for Content Inspiration, "Why Them, Not Me?" and Compare Creators. Pure functions over the local mock data.
import { CREATORS, IDEAS, ME, ME_PARTNERSHIPS, STRATEGY } from "@/data/feed";
import type { ContentStrategy, FeedPartnership } from "@/data/feed";
import { brandById, creatorById, fmtCount, fmtPercent, partnershipsOfCreator, postEngagement, whyYoureSeeingThis } from "@/lib/feedData";

// ── Content Inspiration ──────────────────────────────────────────────────────
export function whyPerforming(p: FeedPartnership): string {
  const creator = creatorById.get(p.creatorId)!;
  const parts: string[] = [];
  const reach = p.views / creator.avgReelViews;
  if (reach >= 1.3) parts.push(`reached ${reach.toFixed(1)}× @${creator.handle}'s usual views`);
  const eng = postEngagement(p);
  const typical = (creator.engagementRate * creator.followers) / creator.avgReelViews;   // interactions per view on a normal post
  if (eng >= typical * 1.05) parts.push(`earned ${fmtPercent(eng)} engagement, above their norm`);
  if (p.comments / p.likes >= 0.06) parts.push("sparked conversation in the comments");
  if (p.type === "Reel" || p.type === "Video") parts.push("uses a short-form video hook");
  if (p.type === "Carousel") parts.push("gives people a reason to swipe and save");
  if (parts.length === 0) parts.push(`delivers steady ${p.category.toLowerCase()} content that fits ${brandById.get(p.brandId)!.name}`);
  const sentence = parts.slice(0, 3).join(", ");
  return `${sentence.charAt(0).toUpperCase()}${sentence.slice(1)}.`;
}

export function whyRelevantToMe(p: FeedPartnership): string {
  const mine = ME.mix[p.category];
  const reasons = whyYoureSeeingThis(p).reasons;
  const lead = mine ? `${p.category} is already ${mine}% of your content.` : `${p.category} would be a new lane for you.`;
  return reasons[0] ? `${lead} ${reasons[0]}.` : lead;
}

export interface ContentIdea { title: string; hook: string; format: string }
/** Always returns 4 ideas; `round` rotates through the five stored for the category. */
export function contentIdeas(p: FeedPartnership, round = 0): ContentIdea[] {
  const rows = IDEAS[p.category] ?? IDEAS.Tutorials;
  const brand = brandById.get(p.brandId)!.name;
  const start = round % rows.length;
  return Array.from({ length: 4 }, (_, i) => rows[(start + i) % rows.length])
    .map(([title, hook, format]) => ({ title: title.replaceAll("{brand}", brand), hook: hook.replaceAll("{brand}", brand), format }));
}

// ── One shape for "you" and every competitor ─────────────────────────────────
export interface Comparable {
  id: string; handle: string; hue: number; name: string; isMe: boolean;
  followers: number; engagement: number; avgReelViews: number; avgLikes: number; avgComments: number; postsPerWeek: number;
  strategy: ContentStrategy; mix: Record<string, number>;
  partnerships: FeedPartnership[]; uniqueBrands: number;
  topBrandCategories: string[]; topFormats: string[]; strongestCategory: { name: string; pct: number };
}

const top = (items: string[], n = 2) => {
  const counts = new Map<string, number>();
  for (const i of items) counts.set(i, (counts.get(i) ?? 0) + 1);
  return [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).slice(0, n).map(([k]) => k);
};
const STRATEGY_LABELS: [keyof ContentStrategy, string][] = [
  ["tutorial", "Tutorial"], ["productReview", "Product review"], ["lifestyle", "Lifestyle"], ["educational", "Educational"], ["entertainment", "Entertainment"],
];
export const STRATEGY_ROWS = STRATEGY_LABELS;

export function comparableFor(id: string): Comparable {
  const isMe = id === "me";
  const base = isMe ? { ...ME, id: "me", engagement: ME.engagementRate } : (() => { const c = creatorById.get(id)!; return { ...c, engagement: c.engagementRate }; })();
  const posts = isMe ? ME_PARTNERSHIPS : partnershipsOfCreator(id);
  const strategy = STRATEGY[id];
  const interactions = (base.followers * base.engagement) / 100;
  const best = STRATEGY_LABELS.map(([k, label]) => ({ name: label, pct: strategy[k] })).sort((a, b) => b.pct - a.pct)[0];
  return {
    id, isMe, handle: base.handle, name: base.name, hue: base.hue,
    followers: base.followers, engagement: base.engagement, avgReelViews: base.avgReelViews, postsPerWeek: base.postsPerWeek,
    avgLikes: Math.round(interactions * 0.93), avgComments: Math.round(interactions * 0.07),
    strategy, mix: base.mix, partnerships: posts, uniqueBrands: new Set(posts.map((p) => p.brandId)).size,
    topBrandCategories: top(posts.map((p) => brandById.get(p.brandId)!.category)),
    topFormats: top(posts.map((p) => p.type)),
    strongestCategory: best,
  };
}
export const SIMILAR_IDS = CREATORS.map((c) => c.id);
export const educational = (c: Comparable) => c.strategy.tutorial + c.strategy.educational;

// ── Why Them, Not Me? ────────────────────────────────────────────────────────
export interface MetricRow { key: string; label: string; me: number; them: number; show: (n: number) => string; higherIsBetter: boolean }
export function metricRows(me: Comparable, them: Comparable): MetricRow[] {
  const n = (x: number) => String(Math.round(x));
  return [
    { key: "followers", label: "Followers", me: me.followers, them: them.followers, show: fmtCount, higherIsBetter: true },
    { key: "views", label: "Avg Reel views", me: me.avgReelViews, them: them.avgReelViews, show: fmtCount, higherIsBetter: true },
    { key: "engagement", label: "Engagement rate", me: me.engagement, them: them.engagement, show: fmtPercent, higherIsBetter: true },
    { key: "frequency", label: "Posts per week", me: me.postsPerWeek, them: them.postsPerWeek, show: (x) => x.toFixed(1), higherIsBetter: true },
    { key: "deals", label: "Brand partnerships", me: me.partnerships.length, them: them.partnerships.length, show: n, higherIsBetter: true },
    { key: "product", label: "Product-focused content", me: me.strategy.productFocused, them: them.strategy.productFocused, show: (x) => `${Math.round(x)}%`, higherIsBetter: true },
    { key: "educational", label: "Tutorial / educational", me: educational(me), them: educational(them), show: (x) => `${Math.round(x)}%`, higherIsBetter: true },
  ];
}

export interface Advice { theirAdvantages: string[]; yourAdvantages: string[]; improvements: string[] }
export function whyThemNotMe(them: Comparable): Advice {
  const me = comparableFor("me");
  const rows = metricRows(me, them);
  const lines = {
    followers: (p: number, who: "them" | "you") => who === "them" ? `${p}% larger audience (${fmtCount(them.followers)} vs ${fmtCount(me.followers)}).` : `${p}% larger audience than @${them.handle}.`,
    views: (p: number, who: "them" | "you") => who === "them" ? `${p}% more average Reel views.` : `${p}% more average Reel views than @${them.handle}.`,
    engagement: (_: number, who: "them" | "you") => who === "them" ? `Higher engagement rate (${fmtPercent(them.engagement)} vs ${fmtPercent(me.engagement)}).` : `Higher engagement rate (${fmtPercent(me.engagement)} vs ${fmtPercent(them.engagement)}).`,
    frequency: (_: number, who: "them" | "you") => who === "them" ? `Posts more often (${them.postsPerWeek.toFixed(1)} vs ${me.postsPerWeek.toFixed(1)} a week).` : `More consistent posting (${me.postsPerWeek.toFixed(1)} vs ${them.postsPerWeek.toFixed(1)} a week).`,
    deals: (_: number, who: "them" | "you") => who === "them" ? `Has more previous brand partnerships (${them.partnerships.length} vs ${me.partnerships.length}).` : `More previous brand partnerships (${me.partnerships.length} vs ${them.partnerships.length}).`,
    product: (_: number, who: "them" | "you") => who === "them" ? "Publishes more product demonstration content." : "Publishes more product-focused content.",
    educational: (_: number, who: "them" | "you") => who === "them" ? "Publishes more tutorial and educational content." : "Stronger tutorial and educational focus.",
  } as const;
  const theirAdvantages: string[] = []; const yourAdvantages: string[] = [];
  for (const r of rows) {
    const ratio = r.them / (r.me || 1);
    if (ratio >= 1.08) theirAdvantages.push(lines[r.key as keyof typeof lines](Math.round((ratio - 1) * 100), "them"));
    else if (ratio <= 0.92) yourAdvantages.push(lines[r.key as keyof typeof lines](Math.round((1 / ratio - 1) * 100), "you"));
  }
  const missed = them.partnerships.map((p) => brandById.get(p.brandId)!).find((b) => !ME.partnerBrandIds.includes(b.id));
  const improvements: string[] = [];
  const gap = (key: string) => rows.find((r) => r.key === key)!.them / rows.find((r) => r.key === key)!.me >= 1.08;
  if (gap("views")) improvements.push(`Improve average Reel views (${fmtCount(me.avgReelViews)} now, ${fmtCount(them.avgReelViews)} for @${them.handle}). Test stronger first-second hooks.`);
  if (gap("product")) improvements.push(`Increase product demonstration content: ${me.strategy.productFocused}% of your posts vs ${them.strategy.productFocused}%.`);
  if (gap("educational")) improvements.push(`Experiment with more educational Reels: ${educational(me)}% of your content vs ${educational(them)}%.`);
  if (gap("frequency")) improvements.push(`Raise your posting rhythm toward ${them.postsPerWeek.toFixed(1)} posts a week.`);
  if (gap("deals") && missed) improvements.push(`Create more content around brands in your niche, starting with ${missed.name}, which already works with @${them.handle}.`);
  const fillers = ["Add a partnerships email and media-kit link to your bio.", "Turn your best tutorial into a numbered series brands can sponsor.", "Pin a Reel that shows your results with a product, for brands that visit your profile."];
  for (const filler of fillers) if (improvements.length < 3) improvements.push(filler);
  if (yourAdvantages.length === 0) yourAdvantages.push("No clear metric lead over this creator right now. Your edge is a more niche-specific voice.");
  if (theirAdvantages.length === 0) theirAdvantages.push("No clear metric lead over you. Their edge, if any, is positioning.");
  return { theirAdvantages, yourAdvantages, improvements: improvements.slice(0, 5) };
}

// ── Compare Creators ─────────────────────────────────────────────────────────
export function bestOf<T extends { id: string }>(items: T[], pick: (item: T) => number): string {
  return items.reduce((a, b) => (pick(b) > pick(a) ? b : a)).id;
}
export const MAX_COMPARE = 3;
