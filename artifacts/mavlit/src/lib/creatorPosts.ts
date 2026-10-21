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
  total: number;
  min_keep: number;
  can_delete: boolean;
  posts: CreatorPost[];
}

const BASE = "/creator-profile/me/posts";

export const isPostsList = (value: unknown): value is CreatorPostsList =>
  !!value && typeof value === "object" && Array.isArray((value as CreatorPostsList).posts) &&
  typeof (value as CreatorPostsList).total === "number";

export const listCreatorPosts = () => api.get<CreatorPostsList>(BASE);
export const setPostPartnership = (id: CreatorPost["id"], isPartnership: boolean) =>
  api.patch<CreatorPost>(`${BASE}/${encodeURIComponent(String(id))}`, { is_partnership_post: isPartnership });
export const deleteCreatorPost = (id: CreatorPost["id"]) =>
  api.delete<CreatorPostsList>(`${BASE}/${encodeURIComponent(String(id))}`);
export const addCreatorPost = (postUrl: string) => api.post<CreatorPost>(BASE, { post_url: postUrl });
