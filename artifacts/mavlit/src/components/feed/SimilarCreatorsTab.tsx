import { useMemo } from "react";
import type { FeedCreator } from "@/data/feed";
import { activeFilterCount, filterCreators, fmtCount, fmtPercent, partnershipsOfCreator } from "@/lib/feedData";
import type { FeedFilters } from "@/lib/feedData";
import { Chip, CreatorAvatar, EmptyState } from "./FeedVisuals";

export default function SimilarCreatorsTab({ filters, onClear, onViewCreator }: { filters: FeedFilters; onClear: () => void; onViewCreator: (c: FeedCreator) => void }) {
  const creators = useMemo(() => filterCreators(filters).sort((a, b) => b.similarity - a.similarity), [filters]);
  const avg = (pick: (c: FeedCreator) => number) => (creators.length ? creators.reduce((s, c) => s + pick(c), 0) / creators.length : 0);
  const total = creators.reduce((s, c) => s + partnershipsOfCreator(c.id).length, 0);
  const stats = [
    ["Similar creators", String(creators.length)], ["Avg followers", fmtCount(avg((c) => c.followers))],
    ["Avg engagement", fmtPercent(avg((c) => c.engagementRate))], ["Detected partnerships", String(total)],
  ];
  return (
    <div className="flex flex-col gap-5">
      <dl className="grid grid-cols-2 gap-3 lg:grid-cols-4" aria-label="Similar creators summary">
        {stats.map(([label, value]) => (
          <div key={label} className="rounded-2xl border border-border bg-card p-4">
            <dt className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</dt>
            <dd className="mt-1 text-2xl font-extrabold text-white" data-testid={`similar-stat-${label.toLowerCase().replace(/\s+/g, "-")}`}>{value}</dd>
          </div>
        ))}
      </dl>
      {creators.length === 0
        ? <EmptyState title="No similar creators found" hint="No creator matches every filter you've chosen." onClear={activeFilterCount(filters) ? onClear : undefined} />
        : <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {creators.map((c) => {
            const count = partnershipsOfCreator(c.id).length;
            return (
              <article key={c.id} data-testid={`creator-card-${c.id}`} className="flex flex-col gap-4 rounded-2xl border border-border bg-card p-5 transition-colors hover:border-primary/40">
                <header className="flex items-center gap-3">
                  <CreatorAvatar creator={c} size={52} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-bold text-white">@{c.handle}</p>
                    <p className="truncate text-xs text-muted-foreground">{c.niche} · {c.country}</p>
                  </div>
                  <Chip tone={c.similarity >= 80 ? "good" : c.similarity >= 60 ? "primary" : "neutral"}>{c.similarity}% match</Chip>
                </header>
                <dl className="grid grid-cols-3 gap-2 text-center">
                  {[["Followers", fmtCount(c.followers)], ["Engagement", fmtPercent(c.engagementRate)], ["Reel views", fmtCount(c.avgReelViews)]].map(([l, v]) => (
                    <div key={l} className="rounded-lg bg-secondary/50 py-2"><dd className="text-sm font-extrabold text-white">{v}</dd><dt className="text-[10px] text-muted-foreground">{l}</dt></div>
                  ))}
                </dl>
                <div className="mt-auto flex items-center justify-between gap-3">
                  <span className="text-xs text-muted-foreground">{count} brand partnership{count === 1 ? "" : "s"}</span>
                  <button type="button" onClick={() => onViewCreator(c)} aria-label={`View partnerships for @${c.handle}`}
                    className="rounded-lg bg-primary px-3.5 py-1.5 text-xs font-semibold text-primary-foreground hover:bg-primary/90">View Partnerships</button>
                </div>
              </article>
            );
          })}
        </div>}
    </div>
  );
}
