import { useMemo } from "react";
import type { FeedBrand } from "@/data/feed";
import { activeFilterCount, brandIntel, filterBrands, fmtCount, fmtPercent } from "@/lib/feedData";
import type { FeedFilters } from "@/lib/feedData";
import { BrandMark, Chip, EmptyState } from "./FeedVisuals";

export default function BrandIntelligenceTab({ filters, onClear, onViewBrand }: { filters: FeedFilters; onClear: () => void; onViewBrand: (b: FeedBrand) => void }) {
  const intel = useMemo(() => filterBrands(filters).map(brandIntel).sort((a, b) => b.fit - a.fit), [filters]);
  if (intel.length === 0) return <EmptyState title="No brands match these filters" hint="Try a different niche or brand category." onClear={activeFilterCount(filters) ? onClear : undefined} />;
  return (
    <div className="grid gap-4 md:grid-cols-2">
      {intel.map((i) => (
        <article key={i.brand.id} data-testid={`brand-card-${i.brand.id}`} className="flex flex-col gap-4 rounded-2xl border border-border bg-card p-5 transition-colors hover:border-primary/40">
          <header className="flex items-center gap-3">
            <BrandMark brand={i.brand} size={48} />
            <div className="min-w-0 flex-1">
              <h3 className="truncate text-base font-bold text-white">{i.brand.name}</h3>
              <p className="truncate text-xs text-muted-foreground">{i.brand.industry}</p>
            </div>
            <Chip tone="primary">{i.fit}% fit</Chip>
          </header>
          <dl className="grid grid-cols-2 gap-3 text-sm">
            <div><dt className="text-[11px] text-muted-foreground">Detected creator partnerships</dt><dd className="font-bold text-white">{i.posts.length}</dd></div>
            <div><dt className="text-[11px] text-muted-foreground">Typical creator size</dt><dd className="font-bold text-white">{fmtCount(i.minFollowers)}–{fmtCount(i.maxFollowers)}</dd></div>
            <div><dt className="text-[11px] text-muted-foreground">Common formats</dt><dd className="font-bold text-white">{i.formats.slice(0, 2).map((f) => `${f.name} ${f.pct}%`).join(" · ")}</dd></div>
            <div><dt className="text-[11px] text-muted-foreground">Avg creator engagement</dt><dd className="font-bold text-white">{fmtPercent(i.avgEngagement)}</dd></div>
          </dl>
          <div className="flex flex-wrap gap-1.5" aria-label="Countries">{i.countries.map((c) => <Chip key={c}>{c}</Chip>)}</div>
          <button type="button" onClick={() => onViewBrand(i.brand)} aria-label={`View insights for ${i.brand.name}`}
            className="mt-auto self-start rounded-lg border border-primary/40 px-3.5 py-1.5 text-xs font-semibold text-primary hover:bg-primary/10">View insights →</button>
        </article>
      ))}
    </div>
  );
}
