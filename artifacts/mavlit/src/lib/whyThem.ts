// "Why Them, Not Me?": your numbers against one similar creator's, all from the API (no mock data, no LLM). Pure functions.
import { fmtCount, fmtPercent } from "@/lib/feedData";
import type { Comparable } from "@/lib/feedCompare";
import type { SimilarCreator, YouStats } from "@/lib/similarCreators";

export interface WhyRow { key: string; label: string; me: number; them: number; show: (n: number) => string }

/** A content mix: the share of product-focused posts and the percentage of posts per content category. */
export interface Mix { product: number; categories: Record<string, number> }
const SAMPLE_CATEGORIES = [["tutorial", "Tutorial"], ["productReview", "Product review"], ["lifestyle", "Lifestyle"], ["educational", "Educational"], ["entertainment", "Entertainment"]] as const;

/** The prototype's sample mix of a mock creator (the similar creators' mix is not measured yet). */
export function sampleMix(sample: Comparable): Mix {
  return { product: sample.strategy.productFocused, categories: Object.fromEntries(SAMPLE_CATEGORIES.map(([key, name]) => [name, sample.strategy[key]])) };
}

/** Your mix: the one MAVLIT estimated when it generated your profile (`real: true`), else the sample one. */
export function yourMix(you: YouStats, sample: Comparable): Mix & { real: boolean } {
  if (you.product_focused_pct !== null && you.product_focused_pct !== undefined && you.content_categories?.length) {
    return { product: you.product_focused_pct, categories: Object.fromEntries(you.content_categories.map((c) => [c.name, c.pct])), real: true };
  }
  return { ...sampleMix(sample), real: false };
}

/** A similar creator's mix: the one estimated from their captions (`real: true`), else the sample one. */
export function theirMix(them: SimilarCreator, sample: Comparable): Mix & { real: boolean } {
  if (them.product_focused_pct !== null && them.product_focused_pct !== undefined && them.content_categories?.length) {
    return { product: them.product_focused_pct, categories: Object.fromEntries(them.content_categories.map((c) => [c.name, c.pct])), real: true };
  }
  return { ...sampleMix(sample), real: false };
}

const MIX_ROWS_SHOWN = 5;
const pct = (n: number) => `${Math.round(n)}%`;

const perWeek = (n: number) => n.toFixed(1);
const whole = (n: number) => String(Math.round(n));

/** Hardcoded sample numbers that stand in when a side has none: its average Reel views and its brand partnerships. */
export interface SampleNumbers { avgReelViews: number; partnerships: number }
export interface Samples { you: SampleNumbers; them: SampleNumbers }

/**
 * The metrics both sides have a value for, in a fixed order. Followers, engagement rate and posts per week left out when either side lacks them, rather
 * than compared with a guess. The average Reel views and the brand partnerships (when `samples` is given) and the content mix (when `mixes` is given) use
 * the hardcoded sample numbers for a side that has none, so those rows always show.
 */
export function whyRows(you: YouStats, them: SimilarCreator, mixes?: { you: Mix; them: Mix }, samples?: Samples): WhyRow[] {
  const pairs: [WhyRow["key"], string, number | null, number | null, (n: number) => string][] = [
    ["followers", "Followers", you.followers, them.followers, fmtCount],
    ["views", "Avg Reel views", you.avg_reel_views ?? samples?.you.avgReelViews ?? null, them.avg_reel_views ?? samples?.them.avgReelViews ?? null, fmtCount],
    ["engagement", "Engagement rate", you.engagement_rate, them.engagement_rate, fmtPercent],
    ["frequency", "Posts per week", you.posts_per_week, them.posts_per_week, perWeek],
    ["deals", "Brand partnerships", you.brand_partnerships ?? samples?.you.partnerships ?? null, them.partnership_count ?? samples?.them.partnerships ?? null, whole],
  ];
  const rows: WhyRow[] = pairs.flatMap(([key, label, me, theirs, show]) => me === null || me === undefined || theirs === null || theirs === undefined ? [] : [{ key, label, me, them: theirs, show }]);
  if (mixes) {
    rows.push({ key: "product", label: "Product-focused content", me: mixes.you.product, them: mixes.them.product, show: pct });
    // the content categories either of you leans on most: the five with the biggest combined share
    const names = [...new Set([...Object.keys(mixes.you.categories), ...Object.keys(mixes.them.categories)])]
      .sort((a, b) => (mixes.you.categories[b] ?? 0) + (mixes.them.categories[b] ?? 0) - (mixes.you.categories[a] ?? 0) - (mixes.them.categories[a] ?? 0) || a.localeCompare(b))
      .slice(0, MIX_ROWS_SHOWN);
    for (const name of names) rows.push({ key: `category:${name}`, label: `${name} content`, me: mixes.you.categories[name] ?? 0, them: mixes.them.categories[name] ?? 0, show: pct });
  }
  return rows;
}

export interface Advice { theirAdvantages: string[]; yourAdvantages: string[]; improvements: string[] }

/** A lead of less than 8% either way is not worth a sentence. */
const LEAD = 1.08;

export function whyAdvice(you: YouStats, them: SimilarCreator, mixes?: { you: Mix; them: Mix }, samples?: Samples): Advice {
  const rows = whyRows(you, them, mixes, samples);
  const handle = `@${them.username}`;
  const lines = {
    followers: (p: number, who: "them" | "you", r: WhyRow) => who === "them" ? `${p}% larger audience (${r.show(r.them)} vs ${r.show(r.me)}).` : `${p}% larger audience than ${handle}.`,
    views: (p: number, who: "them" | "you") => who === "them" ? `${p}% more average Reel views.` : `${p}% more average Reel views than ${handle}.`,
    engagement: (_: number, who: "them" | "you", r: WhyRow) => who === "them" ? `Higher engagement rate (${r.show(r.them)} vs ${r.show(r.me)}).` : `Higher engagement rate (${r.show(r.me)} vs ${r.show(r.them)}).`,
    frequency: (_: number, who: "them" | "you", r: WhyRow) => who === "them" ? `Posts more often (${r.show(r.them)} vs ${r.show(r.me)} a week).` : `Posts more often (${r.show(r.me)} vs ${r.show(r.them)} a week).`,
    product: (_: number, who: "them" | "you", r: WhyRow) => who === "them" ? `Publishes more product-focused content (${r.show(r.them)} vs ${r.show(r.me)}).` : `Publishes more product-focused content (${r.show(r.me)} vs ${r.show(r.them)}).`,
    deals: (_: number, who: "them" | "you", r: WhyRow) => who === "them" ? `Has more previous brand partnerships (${r.show(r.them)} vs ${r.show(r.me)}).` : `Has more previous brand partnerships (${r.show(r.me)} vs ${r.show(r.them)}).`,
  } as const;
  const theirAdvantages: string[] = []; const yourAdvantages: string[] = [];
  const behind = new Set<string>();
  for (const r of rows) {
    if (!(r.key in lines)) continue;   // the content category rows are shown in the numbers, not turned into sentences
    const line = lines[r.key as keyof typeof lines];
    if (r.me === 0 ? r.them > 0 : r.them / r.me >= LEAD) {
      theirAdvantages.push(line(r.me === 0 ? 100 : Math.round((r.them / r.me - 1) * 100), "them", r)); behind.add(r.key);
    } else if (r.them === 0 ? r.me > 0 : r.me / r.them >= LEAD) {
      yourAdvantages.push(line(r.them === 0 ? 100 : Math.round((r.me / r.them - 1) * 100), "you", r));
    }
  }
  const row = (key: string) => rows.find((r) => r.key === key);
  const improvements: string[] = [];
  const views = row("views"); const eng = row("engagement"); const freq = row("frequency"); const deals = row("deals");
  if (views && behind.has("views")) improvements.push(`Improve average Reel views (${views.show(views.me)} now, ${views.show(views.them)} for ${handle}). Test stronger first-second hooks.`);
  if (eng && behind.has("engagement")) improvements.push(`Lift your engagement rate (${eng.show(eng.me)} now, ${eng.show(eng.them)} for ${handle}): ask a question in your captions and reply to comments.`);
  if (freq && behind.has("frequency")) improvements.push(`Raise your posting rhythm toward ${freq.show(freq.them)} posts a week.`);
  if (deals && behind.has("deals")) improvements.push(`Pitch more brands in your niche: ${handle} has had ${deals.show(deals.them)} brand partnerships to your ${deals.show(deals.me)}.`);
  const fillers = ["Add a partnerships email and media-kit link to your bio.", "Turn your best tutorial into a numbered series brands can sponsor.", "Pin a Reel that shows your results with a product, for brands that visit your profile."];
  for (const filler of fillers) if (improvements.length < 3) improvements.push(filler);
  if (yourAdvantages.length === 0) yourAdvantages.push("No clear metric lead over this creator right now.");
  if (theirAdvantages.length === 0) theirAdvantages.push("No clear metric lead over you.");
  return { theirAdvantages, yourAdvantages, improvements: improvements.slice(0, 5) };
}
