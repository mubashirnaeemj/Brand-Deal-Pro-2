import { ExternalLink } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { FeedCreator } from "@/data/feed";
import { brandById, fmtCount, fmtPercent, partnershipDate, partnershipsOfCreator, postEngagement } from "@/lib/feedData";
import { BrandMark, Chip, CreatorAvatar, PostArt, PostMetrics } from "./FeedVisuals";
import { useOpenOriginalPost } from "./useFeedActions";

export default function CreatorDialog({ creator, onClose }: { creator: FeedCreator | null; onClose: () => void }) {
  const openPost = useOpenOriginalPost();
  const posts = creator ? partnershipsOfCreator(creator.id) : [];
  return (
    <Dialog open={!!creator} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto border-border bg-card p-0 sm:rounded-2xl">
        {creator && (
          <div className="flex flex-col gap-5 p-6">
            <DialogHeader className="space-y-3 text-left">
              <div className="flex items-center gap-4">
                <CreatorAvatar creator={creator} size={64} />
                <div className="min-w-0">
                  <DialogTitle className="text-xl font-extrabold text-white">@{creator.handle}</DialogTitle>
                  <DialogDescription className="text-sm text-muted-foreground">{creator.bio}</DialogDescription>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    <Chip tone="primary">{creator.similarity}% match</Chip><Chip>{creator.niche}</Chip><Chip>{creator.country}</Chip><Chip>{creator.platform}</Chip>
                  </div>
                </div>
              </div>
            </DialogHeader>
            <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {[["Followers", fmtCount(creator.followers)], ["Engagement", fmtPercent(creator.engagementRate)],
                ["Avg Reel views", fmtCount(creator.avgReelViews)], ["Partnerships", String(posts.length)]].map(([label, value]) => (
                <div key={label} className="rounded-xl border border-border bg-secondary/40 p-3">
                  <dt className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</dt>
                  <dd className="mt-1 text-lg font-extrabold text-white">{value}</dd>
                </div>
              ))}
            </dl>
            <section aria-label="Partnership history" className="flex flex-col gap-3">
              <h3 className="text-sm font-bold text-white">Partnership history</h3>
              {posts.map((post) => {
                const brand = brandById.get(post.brandId)!;
                return (
                  <article key={post.id} className="flex gap-4 rounded-xl border border-border bg-background/40 p-3" data-testid={`history-${post.id}`}>
                    <PostArt post={post} brand={brand} compact className="h-28 w-24 shrink-0 rounded-lg" />
                    <div className="flex min-w-0 flex-1 flex-col gap-2">
                      <div className="flex items-center gap-2">
                        <BrandMark brand={brand} size={28} />
                        <span className="truncate text-sm font-bold text-white">{brand.name}</span>
                        <Chip>{post.type}</Chip>
                      </div>
                      <p className="text-xs text-muted-foreground">{partnershipDate(post.daysAgo)} · {post.category} · {fmtPercent(postEngagement(post))} engagement</p>
                      <PostMetrics post={post} />
                      <button type="button" onClick={() => openPost(creator.handle, brand.name)}
                        className="mt-auto inline-flex items-center gap-1 self-start text-xs font-semibold text-primary hover:underline">
                        View original post <ExternalLink size={11} aria-hidden="true" />
                      </button>
                    </div>
                  </article>
                );
              })}
            </section>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
