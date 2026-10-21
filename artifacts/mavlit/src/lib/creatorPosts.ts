import { api } from "./api";

export interface CreatorPost {
  id: string | number;
  post_url: string;
  caption_preview: string | null;
  post_type: string | null;
  timestamp: string | null;
  likes_count: number | null;
  comments_count: number | null;
  views_count: number | null;
  is_partnership_post: boolean;
}

export interface CreatorPostsList {
  /** All of the creator's posts, not only the ones matching a search. */
  total: number;
  /** Posts in `posts` right now. */
  shown?: number;
  min_keep: number;
  can_delete: boolean;
  posts: CreatorPost[];
}

const BASE = "/creator-profile/me/posts";

export const isPostsList = (value: unknown): value is CreatorPostsList =>
  !!value && typeof value === "object" && Array.isArray((value as CreatorPostsList).posts) &&
  typeof (value as CreatorPostsList).total === "number";

/** `query` is matched by the server against each post's whole caption. */
export const listCreatorPosts = (query = "", partnershipOnly = false) => {
  const params = [partnershipOnly && "partnership_only=true", query && `q=${encodeURIComponent(query)}`].filter(Boolean);
  return api.get<CreatorPostsList>(params.length ? `${BASE}?${params.join("&")}` : BASE);
};
export const setPostPartnership = (id: CreatorPost["id"], isPartnership: boolean) =>
  api.patch<CreatorPost>(`${BASE}/${encodeURIComponent(String(id))}`, { is_partnership_post: isPartnership });
export const deleteCreatorPost = (id: CreatorPost["id"]) =>
  api.delete<CreatorPostsList>(`${BASE}/${encodeURIComponent(String(id))}`);
/** `isPartnership` is only sent when given; the server keeps its own default otherwise. */
export const addCreatorPost = (postUrl: string, isPartnership?: boolean) =>
  api.post<CreatorPost>(BASE, isPartnership === undefined ? { post_url: postUrl } : { post_url: postUrl, is_partnership_post: isPartnership });

/** "Posted Oct 20, 2026, 3:04 PM" in the viewer's time zone and locale; "Posted –" when the date is missing or unreadable. */
export function postedAtLabel(timestamp: string | null | undefined): string {
  const date = timestamp ? new Date(timestamp) : null;
  return date && !Number.isNaN(date.getTime())
    ? `Posted ${date.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })}`
    : "Posted –";
}

export const formatCount = (value: number | null) => value == null ? "–" : value.toLocaleString("en-US");
