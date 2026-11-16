// Derived logic for Content Inspiration, "Why Them, Not Me?" and Compare Creators. Pure functions over the local mock data.
import { CREATORS, IDEAS, ME, ME_PARTNERSHIPS, STRATEGY } from "@/data/feed";
import type { ContentStrategy, FeedPartnership } from "@/data/feed";
import { avatarHue } from "@/lib/similarCreators";
import type { SimilarCreator, YouStats } from "@/lib/similarCreators";
import { competitorKey } from "@/lib/competitors";
import type { Competitor } from "@/lib/competitors";
import type { FeedCreator } from "@/data/feed";
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
  /** How many brand partnerships: the real count for you and for the creators of the Feed (`partnerships` is only the mock list behind the old prototype). */
  partnershipCount: number;
  /** What in this column is hardcoded sample data, by the name the page uses; empty when everything is real. */
  sampleFields: string[];
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

// ── Real creators (Similar Creators tab) ────────────────────────────────────
// Everything the API has is real: the creator's handle, name, followers, engagement rate, likes and comments, posts per week, average Reel views,
// partnership count and a summary of their partnership posts, and for you the same from your profile and saved posts. What it does not have yet
// (the content mix until it was estimated, and the partnership summary of your own) comes from a mock creator picked by the username; the column
// lists those fields in `sampleFields`, and the dialog says so.
const REAL_PREFIX = "real:";
const realCreators = new Map<string, { creator: FeedCreator; comparable: Comparable }>();
let realMe: Comparable | null = null;
export const isSampleData = (id: string) => id.startsWith(REAL_PREFIX);
const sampleFor = (username: string) => CREATORS[avatarHue(username) % CREATORS.length];

/** The strategy table of a real content mix (percent per category name); a category the table has no row for is only in `mix` and `strongest`. */
function strategyFromMix(product: number, categories: { name: string; pct: number }[]): { strategy: ContentStrategy; mix: Record<string, number>; strongest: { name: string; pct: number } } {
  const pct = (name: string) => categories.find((c) => c.name === name)?.pct ?? 0;
  const biggest = [...categories].sort((a, b) => b.pct - a.pct || a.name.localeCompare(b.name))[0];
  return {
    strategy: { tutorial: pct("Tutorial"), productReview: pct("Product review"), lifestyle: pct("Lifestyle"), educational: pct("Educational"), entertainment: pct("Entertainment"), productFocused: product },
    mix: Object.fromEntries(categories.map((c) => [c.name, c.pct])),
    strongest: { name: biggest.name, pct: biggest.pct },
  };
}
const hasMix = (product: number | null | undefined, categories: { name: string; pct: number }[] | null | undefined): categories is { name: string; pct: number }[] =>
  product !== null && product !== undefined && !!categories?.length;

const USE_REAL_CONTENT_MIX = false;

/** One column of the comparison from real numbers, with the sample ones filling what is missing. */
function build(base: Comparable, real: {
  id: string; handle: string; name: string; isMe: boolean; followers: number | null; engagement: number | null; avgLikes: number | null; avgComments: number | null;
  avgReelViews: number | null; postsPerWeek: number | null; partnershipCount: number | null;
  summary: { uniqueBrands: number; topBrandCategories: string[]; topFormats: string[] } | null;
  product: number | null; categories: { name: string; pct: number }[] | null;
  /** Show the content mix the LLM estimated (else the prototype's sample mix). Competitors added by a user always do. */
  realMix?: boolean;
}): Comparable {
  const sample: string[] = [];
  const pick = <T,>(value: T | null, fallback: T, label: string): T => { if (value === null || value === undefined) { sample.push(label); return fallback; } return value; };
  const followers = pick(real.followers, base.followers, "Followers");
  const engagement = pick(real.engagement, base.engagement, "Engagement rate");
  const interactions = (followers * engagement) / 100;
  // The content strategy stays the prototype's sample data for now (flip USE_REAL_CONTENT_MIX to show the estimated mix once it exists for everyone).
  const mix = (real.realMix ?? USE_REAL_CONTENT_MIX) && hasMix(real.product, real.categories) ? strategyFromMix(real.product as number, real.categories) : null;
  if (!mix) sample.push("Content strategy");
  const summary = real.summary;
  return {
    ...base, id: real.id, handle: real.handle, name: real.name, hue: avatarHue(real.handle), isMe: real.isMe,
    followers, engagement,
    avgLikes: pick(real.avgLikes, Math.round(interactions * 0.93), "Average likes"),
    avgComments: pick(real.avgComments, Math.round(interactions * 0.07), "Average comments"),
    avgReelViews: real.avgReelViews ?? 0,   // no view counts in the database: 0, never a made-up number
    postsPerWeek: pick(real.postsPerWeek, base.postsPerWeek, "Posts per week"),
    partnershipCount: pick(real.partnershipCount, base.partnerships.length, "Brand partnerships"),
    uniqueBrands: summary ? summary.uniqueBrands : base.uniqueBrands,
    topBrandCategories: summary ? summary.topBrandCategories : base.topBrandCategories,
    topFormats: summary ? summary.topFormats : base.topFormats,
    strategy: mix ? mix.strategy : base.strategy, mix: mix ? mix.mix : base.mix, strongestCategory: mix ? mix.strongest : base.strongestCategory,
    sampleFields: sample,
  };
}

/** The prototype's hardcoded numbers of the mock creator behind a similar creator's sample column: what stands in for a missing average Reel views and brand partnerships. */
export function sampleCreatorNumbers(username: string): { avgReelViews: number; partnerships: number } {
  const sample = sampleFor(username);
  return { avgReelViews: sample.avgReelViews, partnerships: partnershipsOfCreator(sample.id).length };
}
/** The same for you (the prototype's mock profile). */
export const sampleMeNumbers = (): { avgReelViews: number; partnerships: number } => ({ avgReelViews: ME.avgReelViews, partnerships: ME_PARTNERSHIPS.length });

/**
 * Make the creators of the tab, and you, known to Compare. Returns each creator's id (the same id comparableFor() understands).
 * `you` gives the "You" column your real name, handle and numbers; without it that column is the prototype's sample profile.
 */
export function registerRealCreators(list: SimilarCreator[], you?: YouStats | null): Map<string, string> {
  realCreators.clear();
  realMe = null;
  if (you) {
    const handle = (you.handle ?? "").replace(/^@/, "").trim() || "you";
    realMe = build(comparableFor("me"), {
      id: "me", handle, name: you.name?.trim() || handle, isMe: true, followers: you.followers, engagement: you.engagement_rate, avgLikes: you.avg_likes, avgComments: you.avg_comments,
      avgReelViews: you.avg_reel_views, postsPerWeek: you.posts_per_week, partnershipCount: you.brand_partnerships,
      summary: null,   // nothing in the data says which brands, categories and formats your own partnerships were
      product: you.product_focused_pct, categories: you.content_categories,
    });
  }
  const ids = new Map<string, string>();
  for (const real of list) {
    const id = `${REAL_PREFIX}${real.username}`;
    const sample = sampleFor(real.username);
    const name = real.full_name?.trim() || real.username;
    const creator: FeedCreator = { ...sample, id, handle: real.username, name, hue: avatarHue(real.username), followers: real.followers ?? sample.followers, similarity: real.similarity, engagementRate: real.engagement_rate ?? sample.engagementRate };
    realCreators.set(id, { creator, comparable: build(comparableFor(sample.id), {
      id, handle: real.username, name, isMe: false, followers: real.followers, engagement: real.engagement_rate, avgLikes: real.avg_likes, avgComments: real.avg_comments,
      avgReelViews: real.avg_reel_views, postsPerWeek: real.posts_per_week, partnershipCount: real.partnership_count,
      summary: { uniqueBrands: real.unique_brands, topBrandCategories: real.top_brand_categories, topFormats: real.top_formats },
      product: real.product_focused_pct, categories: real.content_categories,
    }) });
    ids.set(real.username, id);
  }
  return ids;
}
export const realCreatorFor = (id: string): FeedCreator | undefined => realCreators.get(id)?.creator;

// ── Competitors the user added (Similar Creators > Compare > Add a competitor) ────────────────────────────────────────────────────────────────────
// Their numbers are real (read from MAVLIT's creators or from their latest 20 posts), including the content mix the LLM estimated for them.
const competitors = new Map<string, { handle: string; comparable: Comparable }>();

/** Make the user's ready competitors known to Compare (a competitor that is still being looked up, or failed, is left out). */
export function registerCompetitors(list: Competitor[]): void {
  competitors.clear();
  for (const c of list) {
    if (c.status !== "ready") continue;
    const id = competitorKey(c.id);
    const sample = sampleFor(c.handle);
    competitors.set(id, { handle: c.handle, comparable: build(comparableFor(sample.id), {
      id, handle: c.handle, name: c.full_name?.trim() || c.handle, isMe: false, followers: c.followers, engagement: c.engagement_rate, avgLikes: c.avg_likes, avgComments: c.avg_comments,
      avgReelViews: c.avg_reel_views, postsPerWeek: c.posts_per_week, partnershipCount: c.partnership_count,
      summary: null, product: c.product_focused_pct, categories: c.content_categories, realMix: true,
    }) });
  }
}
/** The handle of a creator in the comparison, whether a similar creator or a competitor. */
export const compareHandle = (id: string): string | undefined => realCreators.get(id)?.creator.handle ?? competitors.get(id)?.handle;

/** The creators that can be added to a comparison: the tab's real creators (or the mock ones when there are none), then the user's competitors. */
export const compareCandidates = (): { id: string; handle: string; similarity: number | null }[] => [
  ...(realCreators.size ? [...realCreators.values()].map(({ creator }) => ({ id: creator.id, handle: creator.handle, similarity: creator.similarity as number | null }))
    : CREATORS.map((c) => ({ id: c.id, handle: c.handle, similarity: c.similarity as number | null }))),
  ...[...competitors.entries()].map(([id, { handle }]) => ({ id, handle, similarity: null as number | null })),
];

export function comparableFor(id: string): Comparable {
  const real = realCreators.get(id);
  if (real) return real.comparable;
  const competitor = competitors.get(id);
  if (competitor) return competitor.comparable;
  if (id === "me" && realMe) return realMe;
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
    strongestCategory: best, partnershipCount: posts.length, sampleFields: [],
  };
}
export const SIMILAR_IDS = CREATORS.map((c) => c.id);

// ── Compare Creators ─────────────────────────────────────────────────────────
/** Everyone who has the best value, not just the first: two creators on the same number share the card. */
export function leadersOf<T extends { id: string }>(items: T[], pick: (item: T) => number): T[] {
  const best = Math.max(...items.map(pick));
  return items.filter((item) => pick(item) === best);
}
export const MAX_COMPARE = 3;
