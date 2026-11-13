import { useMemo, useState } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { FeedBrand, FeedCreator } from "@/data/feed";
import { activeFilterCount, ago, brandById, creatorById, filterPartnerships, fmtPercent, partnershipDate, postEngagement } from "@/lib/feedData";
import type { FeedFilters } from "@/lib/feedData";
import { BrandMark, Chip, CreatorAvatar, EmptyState, PostArt, PostMetrics } from "./FeedVisuals";

type Sort = "recent" | "views" | "engagement";

export default function TrendingTab({ filters, onClear, onViewCreator, onViewBrand }: {
  filters: FeedFilters; onClear: () => void; onViewCreator: (c: FeedCreator) => void; onViewBrand: (b: FeedBrand) => void;
}) {
  const [sort, setSort] = useState<Sort>("recent");
  const posts = useMemo(() => filterPartnerships(filters).sort((a, b) =>
    sort === "views" ? b.views - a.views : sort === "engagement" ? postEngagement(b) - postEngagement(a) : a.daysAgo - b.daysAgo), [filters, sort]);
  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground" aria-live="polite">{posts.length} recently detected partnership{posts.length === 1 ? "" : "s"}</p>
        <Select value={sort} onValueChange={(v) => setSort(v as Sort)}>
          <SelectTrigger aria-label="Sort trending" data-testid="trending-sort" className="h-9 w-48 bg-card"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="recent">Most Recent</SelectItem><SelectItem value="views">Most Views</SelectItem><SelectItem value="engagement">Highest Engagement</SelectItem>
          </SelectContent>
        </Select>
      </div>
      {posts.length === 0
        ? <EmptyState title="Nothing trending for these filters" hint="Broaden the date range or remove a filter." onClear={activeFilterCount(filters) ? onClear : undefined} />
        : <ol className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3" data-testid="trending-list">
          {posts.map((post) => {
            const creator = creatorById.get(post.creatorId)!; const brand = brandById.get(post.brandId)!;
            return (
              <li key={post.id} data-testid="trending-item" className="flex flex-col overflow-hidden rounded-2xl border border-border bg-card transition-colors hover:border-primary/40">
                <PostArt post={post} brand={brand} className="aspect-[16/10]" />
                <div className="flex flex-1 flex-col gap-3 p-4">
                  <div className="flex items-center gap-2.5">
                    <CreatorAvatar creator={creator} size={32} />
                    <button type="button" onClick={() => onViewCreator(creator)} className="min-w-0 flex-1 truncate text-left text-sm font-bold text-white hover:underline">@{creator.handle}</button>
                    <span className="text-[11px] text-muted-foreground">{ago(post.daysAgo)}</span>
                  </div>
                  <button type="button" onClick={() => onViewBrand(brand)} className="flex items-center gap-2 text-left text-xs text-muted-foreground hover:text-white">
                    <BrandMark brand={brand} size={22} />partnered with <span className="font-semibold text-white">{brand.name}</span>
                  </button>
                  <PostMetrics post={post} />
                  <div className="mt-auto flex flex-wrap items-center gap-1.5">
                    <Chip tone="primary">{post.type}</Chip><Chip tone="good">{fmtPercent(postEngagement(post))} eng.</Chip>
                    <Chip>{creator.niche}</Chip><Chip>{creator.country}</Chip>
                  </div>
                  <p className="text-[11px] text-muted-foreground">Detected {partnershipDate(post.daysAgo)}</p>
                </div>
              </li>
            );
          })}
        </ol>}
    </div>
  );
}
