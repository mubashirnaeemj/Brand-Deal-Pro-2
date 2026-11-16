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
  let similar: unknown = { ready: true, threshold: 70, min_partnership_score: 90, creators: [] };
  let similarSameAudience: unknown | null = null;   // the answer to ?same_audience=true; the unfiltered one when not set
  let similarFailure = false;
  let brandIntel: unknown = { status: "completed", total: 0, brands: [] };
  let brandIntelFailure = false;
  let brandCreators: Record<string, unknown> = {};
  let market: unknown = { ready: true, threshold: 70, audience_range: null, you: { name: null, avg_likes: null, avg_comments: null, handle: "me", followers: null, engagement_rate: null, avg_reel_views: null, posts_per_week: null, brand_partnerships: null, product_focused_pct: null, content_categories: null }, peers: { count: 0, avg_followers: null, avg_engagement: null, avg_reel_views: null, avg_posts_per_week: null, avg_partnerships: null, content_mix: {}, mix_count: 0, creators: [] }, missed_brands: [] };
  let marketFailure = false;
  let competitorList: Record<string, unknown>[] = [];
  let competitorAddFailure: { status: number; detail: string } | null = null;
  let nextCompetitorId = 500;
  let posts: FixturePost[] = [];
  let nextPostId = 1000;
  const missingPictures = new Set<number>();
  const publicPost = ({ full_caption: _caption, ...post }: FixturePost) => post;
  // The username the saved posts were read from: fixed when they first appear, so changing the profile's username later leaves it behind.
  let postsHandle: string | null = null;
  const postsList = (q = "") => {
    if (!posts.length) postsHandle = null;
    else if (postsHandle === null) postsHandle = persisted.instagram_handle as string | null;
    const needle = q.toLowerCase();
    const shown = posts.filter((post) => !needle || (post.full_caption ?? post.caption_preview ?? "").toLowerCase().includes(needle));
    return { total: posts.length, shown: shown.length, min_keep: MIN_KEEP, can_delete: posts.length > MIN_KEEP, instagram_handle: postsHandle, posts: shown.map(publicPost) };
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
      // Like the real job, a first generation saves the username's latest posts for the creator.
      if (platform === "instagram" && !posts.length) posts = Array.from({ length: 20 }, (_, index) => fixturePost(20 - index));
      // The real endpoint need not echo platform or return a description yet.
      return reply({ status: "queued", job_id: `fixture-${platform}-audience-job` });
    }
    const thumbnail = url.pathname.match(/^\/api\/mavlit\/creator-profile\/me\/posts\/(\d+)\/thumbnail$/);
    if (thumbnail && method === "GET") {
      const post = posts.find((candidate) => candidate.id === Number(thumbnail[1]));
      return !post || missingPictures.has(post.id)
        ? reply({ detail: "No picture" }, 404)
        : new Response(new Blob(["jpeg"], { type: "image/jpeg" }), { status: 200, headers: { "Content-Type": "image/jpeg" } });
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
    if (url.origin === window.location.origin && method === "GET" && url.pathname === "/api/mavlit/feed/post-thumbnail") {
      return url.searchParams.get("code") === "MISSING1" ? reply({ detail: "No picture for this post" }, 404)
        : new Response(new Blob(["jpeg"], { type: "image/jpeg" }), { status: 200, headers: { "Content-Type": "image/jpeg" } });
    }
    const brandCreatorsRoute = url.pathname.match(/^\/api\/mavlit\/feed\/brand-intelligence\/(\d+)\/creators$/);
    if (brandCreatorsRoute && url.origin === window.location.origin && method === "GET") {
      return brandCreators[brandCreatorsRoute[1]] ? reply(brandCreators[brandCreatorsRoute[1]]) : reply({ detail: "Brand not found" }, 404);
    }
    const competitorRoute = url.pathname.match(/^\/api\/mavlit\/feed\/competitors(?:\/(\d+))?$/);
    if (competitorRoute && url.origin === window.location.origin) {
      const id = competitorRoute[1] ? Number(competitorRoute[1]) : null;
      if (method === "GET" && id === null) return reply({ competitors: competitorList });
      if (method === "POST" && id === null) {
        if (competitorAddFailure) return reply({ detail: competitorAddFailure.detail }, competitorAddFailure.status);
        const handle = String((body as { instagram: string }).instagram).replace(/^.*instagram\.com\//, "").replace(/^@/, "").replace(/\/$/, "").toLowerCase();
        const added = { id: nextCompetitorId++, handle, status: "queued", stage: "Checking what we know about the creator", error: null, source: null, full_name: null, followers: null, posts_analyzed: null,
          avg_likes: null, avg_comments: null, engagement_rate: null, avg_reel_views: null, posts_per_week: null, product_focused_pct: null, content_categories: null, partnership_count: 0, partnership_brands: [] };
        competitorList = [added, ...competitorList];
        return reply(added);
      }
      if (method === "DELETE" && id !== null) {
        competitorList = competitorList.filter((c) => c.id !== id);
        return reply({ removed: id });
      }
    }
    if (url.origin === window.location.origin && method === "GET" && url.pathname === "/api/mavlit/feed/market-insights") {
      return marketFailure ? reply({ detail: "down" }, 500) : reply(market);
    }
    if (url.origin === window.location.origin && method === "GET" && url.pathname === "/api/mavlit/feed/brand-intelligence") {
      return brandIntelFailure ? reply({ detail: "down" }, 500) : reply(brandIntel);
    }
    if (url.origin === window.location.origin && method === "GET" && url.pathname === "/api/mavlit/feed/similar-creators") {
      return similarFailure ? reply({ detail: "down" }, 500) : reply(url.searchParams.get("same_audience") === "true" && similarSameAudience ? similarSameAudience : similar);
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
    failPicture(id: number) { missingPictures.add(id); },
    setPosts(next: FixturePost[]) { posts = structuredClone(next); },
    get posts() { return structuredClone(posts); },
    failGet(message: string | null) { getFailure = message; },
    failPut(message: string | null) { putFailure = message; },
    allowGeneration() { generationEnabled = true; },
    setSimilarCreators(next: unknown, sameAudience: unknown | null = null) { similar = structuredClone(next); similarSameAudience = sameAudience === null ? null : structuredClone(sameAudience); },
    failSimilarCreators(failed = true) { similarFailure = failed; },
    setBrandIntelligence(next: unknown) { brandIntel = structuredClone(next); },
    failBrandIntelligence(failed = true) { brandIntelFailure = failed; },
    setMarketInsights(next: unknown) { market = structuredClone(next); },
    setCompetitors(next: unknown[]) { competitorList = structuredClone(next) as Record<string, unknown>[]; },
    failCompetitorAdd(failure: { status: number; detail: string } | null) { competitorAddFailure = failure; },
    get competitorsOnServer() { return structuredClone(competitorList); },
    failMarketInsights(failed = true) { marketFailure = failed; },
    setBrandCreators(brandId: number, next: unknown) { brandCreators[String(brandId)] = structuredClone(next); },
    assertIsolated() {
      expect(unexpected, "Unlisted requests, including AI jobs, are forbidden").toEqual([]);
      expect(requests.every((request) => request.credentials === "include")).toBe(true);
    },
  };
}
