import { expect, vi } from "vitest";
import type { CreatorProfile } from "@/contexts/AuthContext";

type ProfileRecord = CreatorProfile & Record<string, unknown>;
/** `full_caption` is what the server searches; clients only ever receive `caption_preview`. */
export type FixturePost = {
  full_caption?: string;
  id: number; post_url: string; thumbnail_url?: string | null; caption_preview: string | null; post_type: string | null; timestamp: string | null;
  likes_count: number | null; comments_count: number | null; views_count: number | null; is_partnership_post: boolean;
};
const MIN_KEEP = 10;
export const fixturePost = (id: number, extra: Partial<FixturePost> = {}): FixturePost => ({
  id, post_url: `https://www.instagram.com/p/POST${id}/`, thumbnail_url: `/creator-profile/me/posts/${id}/thumbnail`, caption_preview: `Caption ${id}`, post_type: "Reel",
  timestamp: "2026-10-01T10:00:00Z", likes_count: 1234, comments_count: 56, views_count: 78000, is_partnership_post: false, ...extra,
});

type RequestRecord = { path: string; search: string; method: string; body: unknown; credentials?: RequestCredentials };

/** Intercepts the real api.ts fetch boundary; there is no network fallback. */
export function installProfileApi(initial: CreatorProfile) {
  let persisted: ProfileRecord = structuredClone(initial) as ProfileRecord;
  let getFailure: string | null = null;
  let putFailure: string | null = null;
  let generationEnabled = false;
  let posts: FixturePost[] = [];
  let nextPostId = 1000;
  const publicPost = ({ full_caption: _caption, ...post }: FixturePost) => post;
  const postsList = (q = "") => {
    const needle = q.toLowerCase();
    const shown = posts.filter((post) => !needle || (post.full_caption ?? post.caption_preview ?? "").toLowerCase().includes(needle));
    return { total: posts.length, shown: shown.length, min_keep: MIN_KEEP, can_delete: posts.length > MIN_KEEP, posts: shown.map(publicPost) };
  };
  const requests: RequestRecord[] = [];
  const unexpected: string[] = [];
  const reply = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

  vi.stubGlobal("fetch", vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = new URL(String(input), window.location.origin);
    const method = init?.method ?? "GET";
    const body: unknown = init?.body ? JSON.parse(String(init.body)) : undefined;
    requests.push({ path: url.pathname, search: url.search, method, body, credentials: init?.credentials });
    if (generationEnabled && url.origin === window.location.origin &&
        url.pathname === "/api/mavlit/creator-profile/me/generate-description" && method === "POST") {
      const { platform } = body as { platform: "instagram" | "youtube" };
      persisted = {
        ...persisted,
        [`${platform}_description_status`]: "queued",
        [`${platform}_description_job_id`]: `fixture-${platform}-audience-job`,
        [`${platform}_description_error`]: null,
      };
      // The real endpoint need not echo platform or return a description yet.
      return reply({ status: "queued", job_id: `fixture-${platform}-audience-job` });
    }
    const postRoute = url.pathname.match(/^\/api\/mavlit\/creator-profile\/me\/posts(?:\/(\d+))?$/);
    if (postRoute && url.origin === window.location.origin) {
      const id = postRoute[1] ? Number(postRoute[1]) : null;
      if (method === "GET" && id === null) return reply(postsList(url.searchParams.get("q") ?? ""));
      if (method === "POST" && id === null) {
        const { post_url } = body as { post_url: string };
        if (!/^https:\/\/(www\.)?instagram\.com\/(p|reel)\/[\w-]+\/?$/.test(post_url)) return reply({ detail: "That is not an Instagram post link." }, 400);
        const existing = posts.find((post) => post.post_url === post_url);
        if (existing) return reply(publicPost(existing));
        const added = fixturePost(nextPostId++, { post_url });
        posts = [added, ...posts];
        return reply(publicPost(added));
      }
      const target = posts.find((post) => post.id === id);
      if (!target) return reply({ detail: "Post not found." }, 404);
      if (method === "PATCH") {
        Object.assign(target, { is_partnership_post: (body as { is_partnership_post: boolean }).is_partnership_post });
        return reply(publicPost(target));
      }
      if (method === "DELETE") {
        if (posts.length <= MIN_KEEP) return reply({ detail: `At least ${MIN_KEEP} posts have to stay.` }, 400);
        posts = posts.filter((post) => post.id !== id);
        return reply(postsList());
      }
    }
    if (url.origin === window.location.origin && url.pathname === "/api/mavlit/creator-profile/me") {
      if (method === "GET") {
        return getFailure ? reply({ detail: getFailure }, 503) : reply(persisted);
      }
      if (method === "PUT") {
        if (putFailure) return reply({ detail: putFailure }, 503);
        // Match full replacement, NOT a permissive merge that could hide omitted fields.
        persisted = structuredClone(body) as ProfileRecord;
        return reply(persisted);
      }
    }
    if (url.origin === window.location.origin && method === "GET" &&
        url.pathname === "/api/mavlit/brand-category-tags") {
      return reply({ tags_by_niche: Object.fromEntries(
        url.searchParams.getAll("niche").map((niche) => [niche, ["Fixture brand tag"]]),
      ) });
    }
    unexpected.push(`${method} ${url}`);
    throw new Error(`Unexpected fixture request: ${method} ${url}`);
  }));

  return {
    requests,
    get writes() { return requests.filter((request) => request.method === "PUT"); },
    get persisted() { return structuredClone(persisted); },
    replaceOnServer(profile: CreatorProfile) { persisted = structuredClone(profile) as ProfileRecord; },
    setPosts(next: FixturePost[]) { posts = structuredClone(next); },
    get posts() { return structuredClone(posts); },
    failGet(message: string | null) { getFailure = message; },
    failPut(message: string | null) { putFailure = message; },
    allowGeneration() { generationEnabled = true; },
    assertIsolated() {
      expect(unexpected, "Unlisted requests, including AI jobs, are forbidden").toEqual([]);
      expect(requests.every((request) => request.credentials === "include")).toBe(true);
    },
  };
}
