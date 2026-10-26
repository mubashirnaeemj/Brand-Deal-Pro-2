import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api, ApiRequestError, type BrandPartnershipPosts } from "@/lib/api";

function postUrl(value: string): string | null {
  try {
    const url = new URL(value);
    return ["https:", "http:"].includes(url.protocol) ? url.href : null;
  } catch {
    return null;
  }
}

function postDate(value: string | null): string {
  if (!value) return "Unknown date";
  const date = new Date(`${value}T00:00:00Z`);
  return Number.isNaN(date.getTime()) ? "Unknown date" :
    date.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" });
}

// Posts shown before "View more": few enough to fit the panel without scrolling it.
const PREVIEW_POSTS = 2;

export default function BrandPartnershipPosts({ brandId, brandName }: { brandId: number; brandName: string }) {
  const [expanded, setExpanded] = useState(false);
  const { data, isLoading, error, refetch, isFetching } = useQuery({
    queryKey: ["brand-partnership-posts", brandId],
    queryFn: async () => {
      const result = await api.get<BrandPartnershipPosts>(`/matches/me/brands/${brandId}/posts`);
      if (result.brand_raw_id !== brandId || !Array.isArray(result.posts) ||
          result.posts.some((post) => typeof post.post_url !== "string" ||
            (post.post_date !== null && typeof post.post_date !== "string") ||
            !Array.isArray(post.creators) || post.creators.some((creator) => typeof creator !== "string"))) {
        throw new Error("The API returned unexpected partnership post data.");
      }
      return result;
    },
    staleTime: 60_000,
    retry: (count, cause) => !(cause instanceof ApiRequestError && [401, 403, 404].includes(cause.status)) && count < 1,
  });

  useEffect(() => {
    if (error instanceof ApiRequestError && error.status === 403) {
      window.dispatchEvent(new Event("mavlit:profile-incomplete"));
    }
  }, [error]);

  return (
    <section className="rounded-xl border border-border bg-white/[0.03] p-4">
      <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Creator partnership posts</h3>
      {isLoading ? (
        <p role="status" className="text-sm text-muted-foreground">Loading partnership posts…</p>
      ) : error ? (
        <div role="alert" className="space-y-2">
          <p className="text-sm text-red-400">
            {error instanceof ApiRequestError && error.status === 404
              ? "This brand could not be found."
              : "Could not load this brand's partnership posts."}
          </p>
          <button type="button" onClick={() => void refetch()} disabled={isFetching}
            className="text-xs font-semibold text-primary hover:underline disabled:opacity-50">
            {isFetching ? "Retrying…" : "Try again"}
          </button>
        </div>
      ) : !data?.posts.length ? (
        <p className="text-sm text-muted-foreground">No confirmed creator partnership posts for this brand yet.</p>
      ) : (
        <>
        <ul data-testid="list-partnership-posts" className={`space-y-3 ${expanded ? "max-h-72 overflow-y-auto pr-1" : ""}`}>
          {(expanded ? data.posts : data.posts.slice(0, PREVIEW_POSTS)).map((post, index) => {
            const url = postUrl(post.post_url);
            const creators = post.creators.map((creator) => creator.trim().replace(/^@/, "")).filter(Boolean);
            const others = Math.max(0, creators.length - 2);
            return (
              <li key={`${post.post_url}-${index}`} className="border-t border-border pt-3 text-sm leading-relaxed text-muted-foreground first:border-t-0 first:pt-0">
                <p className="overflow-x-auto whitespace-nowrap">
                  <span className="font-semibold text-white">{data.brand_name || brandName}</span>
                  {" partnered with "}
                  {creators.length ? creators.slice(0, 2).map((creator, creatorIndex) => (
                    <span key={`${creator}-${creatorIndex}`}>
                      {creatorIndex > 0 && (creators.length === 2 ? " and " : ", ")}
                      <a href={`https://www.instagram.com/${encodeURIComponent(creator)}/`}
                        target="_blank" rel="noopener noreferrer"
                        className="font-semibold text-primary hover:underline">
                        @{creator}
                      </a>
                    </span>
                  )) : "a creator (name not provided)"}
                  {others > 0 && ` and ${others} ${others === 1 ? "other" : "others"}`}
                </p>
                <p className="mt-1 whitespace-nowrap text-xs">
                  {postDate(post.post_date)}{" · "}
                  {url ? (
                    <a href={url} target="_blank" rel="noopener noreferrer"
                      className="text-primary hover:underline">
                      View post ↗
                    </a>
                  ) : <span>Post link unavailable</span>}
                </p>
              </li>
            );
          })}
        </ul>
        {data.posts.length > PREVIEW_POSTS && (
          <button type="button" onClick={() => setExpanded(open => !open)} aria-expanded={expanded}
            data-testid="button-view-more-posts" className="mt-3 text-xs font-semibold text-primary hover:underline">
            {expanded ? "Show fewer posts" : `View more (${data.posts.length})`}
          </button>
        )}
        </>
      )}
    </section>
  );
}