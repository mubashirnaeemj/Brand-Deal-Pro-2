import { api } from "@/lib/api";

export const COMPETITORS_PATH = "/feed/competitors";

export interface Competitor {
  id: number; handle: string; status: "queued" | "running" | "ready" | "failed"; stage: string | null; error: string | null;
  source: "instagram_users" | "apify" | null;               // where its numbers came from: a creator MAVLIT already had, or its latest 20 posts read with Apify
  full_name: string | null; followers: number | null; posts_analyzed: number | null;
  avg_likes: number | null; avg_comments: number | null; engagement_rate: number | null; avg_reel_views: number | null; posts_per_week: number | null;
  product_focused_pct: number | null; content_categories: { name: string; pct: number }[] | null;
  partnership_count: number; partnership_brands: { brand_raw_id: number; handle: string | null; name: string | null; posts: number }[];
}

export const fetchCompetitors = () => api.get<{ competitors: Competitor[] }>(COMPETITORS_PATH).then((r) => r.competitors);
export const addCompetitor = (instagram: string) => api.post<Competitor>(COMPETITORS_PATH, { instagram });
export const removeCompetitor = (id: number) => api.delete<{ removed: number }>(`${COMPETITORS_PATH}/${id}`);

export const isPending = (c: Competitor) => c.status === "queued" || c.status === "running";
/** The id a competitor has in the comparison (similar creators are "real:<handle>"). */
export const competitorKey = (id: number) => `competitor:${id}`;

/** The handles that were waiting for a lookup in `before` and are gone from `after`: MAVLIT found no posts for them (no such account, or it is private). */
export function vanished(before: Competitor[], after: Competitor[]): string[] {
  const now = new Set(after.map((c) => c.id));
  return before.filter((c) => isPending(c) && !now.has(c.id)).map((c) => c.handle);
}
