import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { fetchBrandIntelligence, intelColor, sizeRange } from "@/lib/brandIntelligence";
import type { BrandIntel } from "@/lib/brandIntelligence";
import { fmtCount, fmtPercent } from "@/lib/feedData";
import BrandInsightsDialog from "./BrandInsightsDialog";
import { BrandMark, Chip, EmptyState } from "./FeedVisuals";

/** The brands the user is matched with (the Brand Matches page's list), each with what its partnership posts say. */
export default function BrandIntelligenceTab() {
  const [selected, setSelected] = useState<BrandIntel | null>(null);
  const { data, isPending, isError, refetch } = useQuery({ queryKey: ["feed", "brand-intelligence"], queryFn: fetchBrandIntelligence, staleTime: 60_000 });
  if (isPending) return <p role="status" className="py-16 text-center text-sm text-muted-foreground">Loading your matched brands…</p>;
  if (isError || !data) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-border bg-card/40 px-6 py-16 text-center" role="alert">
        <p className="text-base font-bold text-white">Could not load brand intelligence</p>
        <button type="button" onClick={() => void refetch()} className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90">Try again</button>
      </div>
    );
  }
  if (data.brands.length === 0) {
    const working = data.status === "queued" || data.status === "running";
    return working
      ? <EmptyState title="Finding your brand matches" hint="Your matches are being ranked. Check back in a minute." />
      : <EmptyState title="No matched brands yet" hint="Brand Intelligence covers the brands you are matched with. Complete your profile and your matches will show up here." />;
  }
  return (
    <div className="grid gap-4 md:grid-cols-2">
      {data.brands.map((b) => {
        const brand = { name: b.brand_name, color: intelColor(b.brand_name) };
        return (
          <article key={b.brand_raw_id} data-testid={`brand-card-${b.brand_raw_id}`} className="flex flex-col gap-4 rounded-2xl border border-border bg-card p-5 transition-colors hover:border-primary/40">
            <header className="flex items-center gap-3">
              <BrandMark brand={brand} size={48} />
              <div className="min-w-0 flex-1">
                <h3 className="truncate text-base font-bold text-white">{b.brand_name}</h3>
                <p className="truncate text-xs text-muted-foreground">{b.niche ?? "—"}</p>
              </div>
              <Chip tone="primary">{b.confidence}% fit</Chip>
            </header>
            <dl className="grid grid-cols-2 gap-3 text-sm">
              <div><dt className="text-[11px] text-muted-foreground">Detected creator partnerships</dt><dd className="font-bold text-white" data-testid="intel-partnerships">{b.partnerships}</dd></div>
              <div><dt className="text-[11px] text-muted-foreground">Typical creator size</dt><dd className="font-bold text-white" data-testid="intel-size">{sizeRange(b.min_followers, b.max_followers, fmtCount)}</dd></div>
              <div><dt className="text-[11px] text-muted-foreground">Common formats</dt><dd className="font-bold text-white" data-testid="intel-formats">{b.formats.length ? b.formats.slice(0, 2).map((f) => `${f.name} ${f.pct}%`).join(" · ") : "—"}</dd></div>
              <div><dt className="text-[11px] text-muted-foreground">Avg creator engagement</dt><dd className="font-bold text-white" data-testid="intel-engagement">{b.avg_engagement === null ? "—" : fmtPercent(b.avg_engagement)}</dd></div>
            </dl>
            <button type="button" onClick={() => setSelected(b)} aria-label={`View insights for ${b.brand_name}`}
              className="mt-auto self-start rounded-lg border border-primary/40 px-3.5 py-1.5 text-xs font-semibold text-primary hover:bg-primary/10">View insights →</button>
          </article>
        );
      })}
      <BrandInsightsDialog brand={selected} onClose={() => setSelected(null)} />
    </div>
  );
}
