import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { ExternalLink } from "lucide-react";
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
  if (!value) return "Date unknown";
  const date = new Date(`${value}T00:00:00Z`);
  return Number.isNaN(date.getTime()) ? "Date unknown" :
    date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" });
}

export default function BrandPartnershipPosts({ brandId, brandName }: { brandId: number; brandName: string }) {
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
        <ul className="space-y-4">
          {data.posts.map((post, index) => {
            const url = postUrl(post.post_url);
            const creators = post.creators.map((creator) => `@${creator.replace(/^@/, "")}`);
            return (
              <li key={`${post.post_url}-${index}`} className="space-y-1.5 border-t border-border pt-3 first:border-t-0 first:pt-0">
                <p className="text-sm leading-relaxed text-muted-foreground">
                  <span className="font-semibold text-white">{data.brand_name || brandName}</span>
                  {" collab with "}
                  {creators.length ? (
                    <>{creators.length > 1 ? "creators " : "a creator "}<span className="font-semibold text-white">{creators.join(", ")}</span></>
                  ) : "a creator (name not provided)"}
                </p>
                {url ? (
                  <a href={url} target="_blank" rel="noopener noreferrer"
                    className="flex items-start gap-1.5 text-xs text-primary hover:underline">
                    <span className="min-w-0 break-all">{post.post_url}</span>
                    <ExternalLink size={12} className="mt-0.5 shrink-0" />
                  </a>
                ) : <p className="text-xs text-muted-foreground">Post link unavailable</p>}
                <p className="text-xs text-muted-foreground">{postDate(post.post_date)}</p>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}