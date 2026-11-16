import { api } from "@/lib/api";

export const SIMILAR_CREATORS_PATH = "/feed/similar-creators";

export interface SimilarPartnership {
  brand: string | null; category: string | null; post_url: string | null; date: string | null; confidence: number | null;
  type: string;                                                     // Reel, Video, Carousel, Photo or Post
  likes: number | null; comments: number | null; views: number | null;
  engagement: number | null;                                        // this post's (likes + comments) / the creator's followers * 100
  thumbnail_url: string | null;                                     // "/feed/post-thumbnail?code=…": the picture, fetched with the sign-in cookie
}

const BRAND_COLORS = ["#a78bfa", "#38bdf8", "#34d399", "#fbbf24", "#f472b6", "#fb7185", "#22d3ee", "#a3e635"];
/** A stable colour for a brand's mark and post art, taken from its name. */
export function brandColor(name: string): string {
  let hash = 0;
  for (const ch of name) hash = (hash * 31 + ch.charCodeAt(0)) % 1009;
  return BRAND_COLORS[hash % BRAND_COLORS.length];
}
export interface SimilarCreator {
  username: string; full_name: string | null; profile_url: string; niche: string | null; description: string | null; tags: string[];
  country: string | null; followers: number | null;
  avg_likes: number | null; avg_comments: number | null;
  engagement_rate: number | null;   // (average likes + average comments) / followers * 100, one decimal
  product_focused_pct: number | null;                         // the content mix an LLM estimated from the creator's captions (percent); null until it ran
  content_categories: { name: string; pct: number }[] | null;  // their five biggest content categories
  unique_brands: number; top_brand_categories: string[]; top_formats: string[];   // a summary of all their partnership posts
  avg_reel_views: number | null;     // the average of the view counts of the creator's posts we hold
  posts_per_week: number | null;     // posts in the 14 days before their newest post, / 2
  similarity: number; partnership_count: number; partnerships: SimilarPartnership[];
}
/** The signed-in user's own numbers, for "Why Them, Not Me?": from their saved posts and their profile. */
export interface YouStats {
  name: string | null; avg_likes: number | null; avg_comments: number | null;
  handle: string | null; followers: number | null; engagement_rate: number | null; avg_reel_views: number | null;
  posts_per_week: number | null; brand_partnerships: number | null;   // brand_partnerships is typed on the profile page
  product_focused_pct: number | null;                                 // the content mix MAVLIT estimated when it generated your profile (percent)
  content_categories: { name: string; pct: number }[] | null;         // your five biggest content categories, e.g. Tutorial 32%
}

export interface SimilarCreatorsResponse {
  ready: boolean; threshold: number; min_partnership_score: number; creators: SimilarCreator[];
  your_followers: number | null;                         // the user's own follower count
  you: YouStats;
  audience_range: { min: number; max: number } | null;   // a third to twice that: what the "same audience size" filter keeps
}

/** `sameAudience`: a hard filter on the follower count (a third of mine up to twice as many), applied by the server. */
export const fetchSimilarCreators = (sameAudience = false) =>
  api.get<SimilarCreatorsResponse>(sameAudience ? `${SIMILAR_CREATORS_PATH}?same_audience=true` : SIMILAR_CREATORS_PATH);

/** A stable colour for a creator's avatar, taken from the username. */
export function avatarHue(username: string): number {
  let hash = 0;
  for (const ch of username) hash = (hash * 31 + ch.charCodeAt(0)) % 360;
  return hash;
}

/** "May 1, 2026" for a stored post date; "" when it is missing or unreadable. */
export function formatPostDate(value: string | null): string {
  if (!value) return "";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "" : date.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
}
