import { ExternalLink, Eye, Heart, MessageCircle } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { avatarHue, brandColor, formatPostDate } from "@/lib/similarCreators";
import type { SimilarCreator } from "@/lib/similarCreators";
import { fmtCount, fmtPercent } from "@/lib/feedData";
import PostThumbnail from "@/components/PostThumbnail";
import { BrandMark, Chip, CreatorAvatar, Metric } from "./FeedVisuals";

const count = (value: number | null) => (value === null ? "—" : fmtCount(value));

/**
 * A real creator's partnership history, like the prototype's: the creator's numbers, then one card per partnership post with its picture
 * (the same PostThumbnail as "Your recent Instagram posts" on the profile page), brand, type, date, engagement and numbers, and a link to the original post.
 */
export default function SimilarCreatorDialog({ creator, onClose }: { creator: SimilarCreator | null; onClose: () => void }) {
  return (
    <Dialog open={!!creator} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto border-border bg-card p-0 sm:rounded-2xl">
        {creator && (
          <div className="flex flex-col gap-5 p-6">
            <DialogHeader className="space-y-3 text-left">
              <div className="flex items-center gap-4">
                <CreatorAvatar creator={{ name: creator.full_name?.trim() || creator.username, hue: avatarHue(creator.username) }} size={64} />
                <div className="min-w-0">
                  <DialogTitle className="text-xl font-extrabold text-white">@{creator.username}</DialogTitle>
                  <DialogDescription className="text-sm text-muted-foreground">{creator.description ?? "No description yet."}</DialogDescription>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    <Chip tone="primary">{creator.similarity}% match</Chip>
                    {creator.niche && <Chip>{creator.niche}</Chip>}
                  </div>
                </div>
              </div>
            </DialogHeader>
            <dl className="grid grid-cols-3 gap-3" aria-label="Creator numbers">
              {[["Followers", count(creator.followers)], ["Engagement", creator.engagement_rate === null ? "—" : fmtPercent(creator.engagement_rate)],
                ["Partnerships", String(creator.partnership_count)]].map(([label, value]) => (
                <div key={label} className="rounded-xl border border-border bg-secondary/40 p-3">
                  <dt className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</dt>
                  <dd className="mt-1 text-lg font-extrabold text-white">{value}</dd>
                </div>
              ))}
            </dl>
            <section aria-label="Partnership history" className="flex flex-col gap-3">
              <h3 className="text-sm font-bold text-white">Partnership history</h3>
              {creator.partnerships.length === 0 && <p className="text-sm text-muted-foreground">No partnership posts to show.</p>}
              {creator.partnerships.map((p, index) => {
                const brand = { name: p.brand ?? "Unknown brand", color: brandColor(p.brand ?? "") };
                const details = [formatPostDate(p.date) || "Date unknown", p.category, p.engagement === null ? null : `${fmtPercent(p.engagement)} engagement`].filter(Boolean);
                return (
                  <article key={`${p.post_url ?? index}`} className="flex gap-4 rounded-xl border border-border bg-background/40 p-3" data-testid={`history-${index}`}>
                    <PostThumbnail url={p.thumbnail_url} size={112} />
                    <div className="flex min-w-0 flex-1 flex-col gap-2">
                      <div className="flex items-center gap-2">
                        <BrandMark brand={brand} size={28} />
                        <span className="truncate text-sm font-bold text-white">{brand.name}</span>
                        <Chip>{p.type}</Chip>
                      </div>
                      <p className="text-xs text-muted-foreground">{details.join(" · ")}</p>
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
                        <Metric icon={<Eye size={14} />} value={count(p.views)} label="views" />
                        <Metric icon={<Heart size={14} />} value={count(p.likes)} label="likes" />
                        <Metric icon={<MessageCircle size={14} />} value={count(p.comments)} label="comments" />
                      </div>
                      {p.post_url && (
                        <a href={p.post_url} target="_blank" rel="noopener noreferrer" className="mt-auto inline-flex items-center gap-1 self-start text-xs font-semibold text-primary hover:underline">
                          View original post <ExternalLink size={11} aria-hidden="true" />
                        </a>
                      )}
                    </div>
                  </article>
                );
              })}
              {creator.partnership_count > creator.partnerships.length && (
                <p className="text-xs text-muted-foreground">Showing the {creator.partnerships.length} most recent of {creator.partnership_count}.</p>
              )}
            </section>
            <a href={creator.profile_url} target="_blank" rel="noopener noreferrer" className="self-start text-xs font-semibold text-primary hover:underline">Open @{creator.username} on Instagram</a>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
