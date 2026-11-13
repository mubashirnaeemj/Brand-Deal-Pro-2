import { useMemo, useState } from "react";
import { Bookmark, Sparkles } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import type { FeedBrand, FeedCreator, FeedPartnership } from "@/data/feed";
import { ago, brandById, creatorById, filterPartnerships, fmtCount, partnershipDate, whyYoureSeeingThis, activeFilterCount } from "@/lib/feedData";
import type { FeedFilters } from "@/lib/feedData";
import { cn } from "@/lib/utils";
import { BrandMark, Chip, CreatorAvatar, EmptyState, PostArt, PostMetrics, SaveToggle } from "./FeedVisuals";
import { useOpenOriginalPost } from "./useFeedActions";

interface Props {
  filters: FeedFilters; onClear: () => void; saved: Set<string>; onToggleSave: (id: string) => void;
  onViewCreator: (c: FeedCreator) => void; onViewBrand: (b: FeedBrand) => void;
}

function PostCard({ post, saved, onToggleSave, onViewCreator, onViewBrand }: { post: FeedPartnership } & Omit<Props, "filters" | "onClear" | "saved"> & { saved: boolean }) {
  const creator = creatorById.get(post.creatorId)!; const brand = brandById.get(post.brandId)!;
  const why = whyYoureSeeingThis(post);
  const openPost = useOpenOriginalPost();
  const actionClass = "rounded-lg border border-border px-3 py-1.5 text-xs font-semibold text-muted-foreground transition-colors hover:border-primary/40 hover:text-white";
  return (
    <article data-testid={`feed-post-${post.id}`} className="grid overflow-hidden rounded-2xl border border-border bg-card shadow-lg shadow-black/20 transition-colors hover:border-primary/30 md:grid-cols-[260px_1fr]">
      <PostArt post={post} brand={brand} className="aspect-[4/3] md:aspect-auto md:min-h-[320px]" />
      <div className="flex flex-col gap-4 p-5">
        <header className="flex items-center gap-3">
          <CreatorAvatar creator={creator} size={44} />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-bold text-white">@{creator.handle}</p>
            <p className="truncate text-xs text-muted-foreground">{fmtCount(creator.followers)} followers · {creator.niche} · {creator.country}</p>
          </div>
          <div className="flex items-center gap-2 rounded-xl border border-border bg-secondary/40 py-1 pl-1 pr-3">
            <BrandMark brand={brand} size={28} /><span className="text-xs font-bold text-white">{brand.name}</span>
          </div>
        </header>
        <p className="text-sm leading-relaxed text-white/90">{post.description}</p>
        <div className="flex flex-wrap items-center gap-2">
          <Chip tone="primary">{post.type}</Chip><Chip>{post.category}</Chip><Chip>{post.platform}</Chip>
          <span className="text-xs text-muted-foreground">{partnershipDate(post.daysAgo)} · {ago(post.daysAgo)}</span>
        </div>
        <PostMetrics post={post} />
        <section aria-label="Why you're seeing this" className="rounded-xl border border-primary/25 bg-primary/5 p-3.5">
          <p className="flex items-center gap-1.5 text-xs font-bold text-primary"><Sparkles size={12} aria-hidden="true" />Why you're seeing this · {why.headline}</p>
          <ul className="mt-2 flex list-disc flex-col gap-1 pl-4 text-xs text-muted-foreground marker:text-primary">
            {why.reasons.map((r) => <li key={r}>{r}</li>)}
          </ul>
        </section>
        <div className="mt-auto flex flex-wrap items-center gap-2">
          <button type="button" className={actionClass} onClick={() => onViewCreator(creator)}>View Creator</button>
          <button type="button" className={actionClass} onClick={() => onViewBrand(brand)}>View Brand</button>
          <button type="button" className={actionClass} onClick={() => openPost(creator.handle, brand.name)}>View Original Post</button>
          <span className="ml-auto"><SaveToggle saved={saved} label={`${creator.handle} × ${brand.name}`} onToggle={() => {
            onToggleSave(post.id);
            toast({ title: saved ? "Removed from saved" : "Saved to your feed", description: `${creator.handle} × ${brand.name}` });
          }} /></span>
        </div>
      </div>
    </article>
  );
}

export default function ForYouTab({ filters, onClear, saved, onToggleSave, onViewCreator, onViewBrand }: Props) {
  const [savedOnly, setSavedOnly] = useState(false);
  const posts = useMemo(() => filterPartnerships(filters)
    .sort((a, b) => whyYoureSeeingThis(b).score - whyYoureSeeingThis(a).score), [filters]);
  const shown = savedOnly ? posts.filter((p) => saved.has(p.id)) : posts;
  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground" aria-live="polite">{shown.length} partnership{shown.length === 1 ? "" : "s"} picked for you, best match first</p>
        <button type="button" aria-pressed={savedOnly} onClick={() => setSavedOnly((v) => !v)}
          className={cn("inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold", savedOnly ? "border-primary/40 bg-primary/15 text-primary" : "border-border text-muted-foreground hover:text-white")}>
          <Bookmark size={13} aria-hidden="true" />Saved ({saved.size})
        </button>
      </div>
      {shown.length === 0
        ? (savedOnly && posts.length > 0
          ? <EmptyState title="Nothing saved yet" hint="Use Save on a partnership and it will show up here." />
          : <EmptyState title="No partnerships match these filters" hint="Try removing a filter or widening the follower range." onClear={activeFilterCount(filters) ? onClear : undefined} />)
        : shown.map((post) => (
          <PostCard key={post.id} post={post} saved={saved.has(post.id)} onToggleSave={onToggleSave} onViewCreator={onViewCreator} onViewBrand={onViewBrand} />
        ))}
    </div>
  );
}
