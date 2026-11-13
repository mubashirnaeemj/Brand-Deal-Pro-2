// Trending tab: "Creator Market Trends". A market-research dashboard built entirely from the sample data in src/data/feed/trends.
import { useMemo, useState } from "react";
import { Flame, Layers, ArrowUpRight, TrendingUp } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BRAND_CATEGORY_TRENDS, CONTENT_TRENDS } from "@/data/feed/trends";
import type { BrandCategoryTrend, ContentTrend } from "@/data/feed/trends";
import { fmtCount, fmtPercent } from "@/lib/feedData";
import {
  DEFAULT_TREND_FILTERS, PERIODS, growthSeries, overview, periodLabel, scaleCount, scaleGrowth, scope, signed, type Scoped, type TrendFilters,
} from "@/lib/feedTrends";
import { cn } from "@/lib/utils";
import { Chip, EmptyState } from "./FeedVisuals";
import { GrowthBadge, SampleChip, Sparkline, StatusBadge } from "./TrendParts";
import { CategoryDialog, ContentTrendDialog } from "./TrendDialogs";

const NICHE_OPTIONS = ["Music", "Beauty", "Fitness", "Health & Wellness"];
const PLATFORM_OPTIONS = ["Instagram", "TikTok", "YouTube"];
const COUNTRY_OPTIONS = ["United States", "Canada", "United Kingdom", "Australia"];
const byGrowth = <T extends { g: number }>(a: Scoped<T>, b: Scoped<T>) => b.item.g - a.item.g;

function FilterSelect({ label, value, all, options, onChange }: { label: string; value: string; all: string; options: string[]; onChange: (v: string) => void }) {
  return (
    <Select value={value || "all"} onValueChange={(v) => onChange(v === "all" ? "" : v)}>
      <SelectTrigger aria-label={label} data-testid={`trend-${label.toLowerCase()}`} className={cn("h-9 w-auto gap-2 rounded-lg bg-card text-sm", value && "border-primary/50 bg-primary/10")}><SelectValue /></SelectTrigger>
      <SelectContent><SelectItem value="all">{all}</SelectItem>{options.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
    </Select>
  );
}

function SectionHeading({ icon, title, subtitle, id }: { icon: React.ReactNode; title: string; subtitle: string; id: string }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-2">
      <div>
        <h2 id={id} className="flex items-center gap-2 text-lg font-extrabold text-white"><span className="text-primary" aria-hidden="true">{icon}</span>{title}</h2>
        <p className="text-sm text-muted-foreground">{subtitle}</p>
      </div>
      <SampleChip />
    </div>
  );
}
const Empty = ({ what }: { what: string }) => <p className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">No {what} for these filters.</p>;

export default function TrendingTab() {
  const [filters, setFilters] = useState<TrendFilters>(DEFAULT_TREND_FILTERS);
  const [content, setContent] = useState<Scoped<ContentTrend> | null>(null);
  const [category, setCategory] = useState<Scoped<BrandCategoryTrend> | null>(null);
  const set = (patch: Partial<TrendFilters>) => setFilters((f) => ({ ...f, ...patch }));

  const data = useMemo(() => ({
    content: scope(CONTENT_TRENDS, filters).sort(byGrowth),
    brands: scope(BRAND_CATEGORY_TRENDS, filters).sort(byGrowth),
    overview: overview(filters),
  }), [filters]);
  const nothing = data.content.length + data.brands.length === 0;
  const touched = filters.niche !== DEFAULT_TREND_FILTERS.niche || !!filters.platform || !!filters.country || filters.period !== DEFAULT_TREND_FILTERS.period;
  const days = periodLabel(filters);
  const ov = data.overview;
  const summary = [
    { label: "Rising Content Topics", value: String(ov.rising), sub: `of ${ov.tracked} tracked topics`, Icon: Flame },
    { label: "Fastest Growing Content Trend", value: ov.fastest?.name ?? "—", sub: ov.fastest ? `${signed(ov.fastest.growth)} in the ${days}` : "No data for these filters", Icon: ArrowUpRight },
    { label: "Most Active Brand Category", value: ov.busiest?.name ?? "—", sub: ov.busiest ? `${fmtCount(ov.busiest.partnerships)} partnerships observed` : "No data for these filters", Icon: Layers },
    { label: "Growing Brand Categories", value: String(ov.growingBrands), sub: "showing increased activity", Icon: TrendingUp },
  ];

  return (
    <div className="flex flex-col gap-8">
      <header className="flex flex-col gap-4">
        <div>
          <h2 className="text-2xl font-extrabold tracking-tight text-white">Creator Market Trends</h2>
          <p className="mt-1 text-sm text-muted-foreground">Discover what's gaining momentum in your niche, explore emerging content opportunities, and understand where brands are investing.</p>
        </div>
        <p role="note" className="flex items-start gap-2 rounded-xl border border-amber-500/25 bg-amber-500/5 p-3 text-xs text-amber-200/90">
          <SampleChip /><span>All growth percentages and statistics on this page are illustrative sample data, not real measured market activity.</span>
        </p>
        <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-border bg-card/60 p-3.5" role="group" aria-label="Trend filters">
          <div role="group" aria-label="Time period" className="inline-flex rounded-lg border border-border bg-card p-0.5">
            {PERIODS.map((p) => (
              <button key={p.id} type="button" aria-pressed={filters.period === p.id} onClick={() => set({ period: p.id })}
                className={cn("rounded-md px-3 py-1.5 text-xs font-semibold", filters.period === p.id ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-white")}>{p.label}</button>
            ))}
          </div>
          <FilterSelect label="Niche" value={filters.niche} all="All niches" options={NICHE_OPTIONS} onChange={(niche) => set({ niche })} />
          <FilterSelect label="Platform" value={filters.platform} all="All platforms" options={PLATFORM_OPTIONS} onChange={(platform) => set({ platform })} />
          <FilterSelect label="Country" value={filters.country} all="All countries" options={COUNTRY_OPTIONS} onChange={(country) => set({ country })} />
          {touched && <button type="button" onClick={() => setFilters(DEFAULT_TREND_FILTERS)} className="h-9 px-2 text-xs font-semibold text-primary hover:underline">Reset</button>}
        </div>
      </header>

      {nothing ? <EmptyState title="No trends for these filters" hint="Try a different platform or country, or choose All niches." onClear={undefined} /> : <>
        <dl className="grid grid-cols-2 gap-3 lg:grid-cols-4" aria-label="Trending overview">
          {summary.map(({ label, value, sub, Icon }) => (
            <div key={label} className="rounded-2xl border border-border bg-card p-4" data-testid={`overview-${label.toLowerCase().replace(/\s+/g, "-")}`}>
              <dt className="flex items-center justify-between text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{label}<Icon size={14} className="text-primary" aria-hidden="true" /></dt>
              <dd className="mt-2 text-xl font-extrabold leading-tight text-white">{value}</dd>
              <p className="mt-1 text-xs text-muted-foreground">{sub}</p>
            </div>
          ))}
        </dl>

        <section aria-labelledby="content-trends" className="flex flex-col gap-4">
          <SectionHeading id="content-trends" icon={<Flame size={18} />} title="Content Trends" subtitle="Discover the content formats and topics gaining popularity among creators like you." />
          {data.content.length === 0 ? <Empty what="content trends" /> : (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {data.content.map((s) => {
                const t = s.item; const g = scaleGrowth(t.g, filters);
                return (
                  <button key={t.id} type="button" data-testid={`content-trend-${t.id}`} onClick={() => setContent(s)} aria-label={`Open trend ${t.name}`}
                    className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-4 text-left transition-colors hover:border-primary/40">
                    <span className="flex items-start justify-between gap-2"><span><span className="block text-sm font-extrabold text-white">{t.name}</span><span className="text-[11px] text-muted-foreground">{t.category}</span></span><StatusBadge status={t.status} /></span>
                    <span className="flex items-center justify-between gap-3"><GrowthBadge value={g} className="text-sm" /><Sparkline values={growthSeries(t.id, g, filters).map((p) => p.value)} positive={g >= 0} /></span>
                    <span className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                      <span><b className="block text-sm text-white">{fmtCount(scaleCount(t.creators, filters, s.share))}</b>creators</span>
                      <span><b className="block text-sm text-white">{fmtCount(scaleCount(t.posts, filters, s.share))}</b>posts detected</span>
                      <span><b className="block text-sm text-white">{fmtCount(t.views)}</b>avg views</span>
                      <span><b className="block text-sm text-white">{fmtPercent(t.eng)}</b>avg engagement</span>
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </section>

        <section aria-labelledby="brand-trends" className="flex flex-col gap-4">
          <SectionHeading id="brand-trends" icon={<Layers size={18} />} title="Brand Market Trends" subtitle="Understand which industries and brand categories are becoming more active in creator partnerships." />
          {data.brands.length === 0 ? <Empty what="brand categories" /> : (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {data.brands.map((s) => {
                const t = s.item; const g = scaleGrowth(t.g, filters);
                return (
                  <button key={t.id} type="button" data-testid={`brand-category-${t.id}`} onClick={() => setCategory(s)} aria-label={`Open brand category ${t.name}`}
                    className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-4 text-left transition-colors hover:border-primary/40">
                    <span className="flex items-start justify-between gap-2"><span className="text-sm font-extrabold text-white">{t.name}</span><GrowthBadge value={g} /></span>
                    <span className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                      <span><b className="block text-sm text-white">{t.activeBrands}</b>active brands</span>
                      <span><b className="block text-sm text-white">{fmtCount(scaleCount(t.partnerships, filters, s.share))}</b>partnerships</span>
                    </span>
                    <span className="text-xs text-muted-foreground">Creators: <b className="text-white">{t.range}</b> followers</span>
                    <span className="flex flex-wrap gap-1">{t.creatorCategories.map((c) => <Chip key={c}>{c}</Chip>)}{t.formats.map((f) => <Chip key={f} tone="primary">{f}</Chip>)}</span>
                  </button>
                );
              })}
            </div>
          )}
        </section>

      </>}

      <ContentTrendDialog trend={content?.item ?? null} share={content?.share ?? 1} filters={filters} onClose={() => setContent(null)} />
      <CategoryDialog trend={category?.item ?? null} share={category?.share ?? 1} filters={filters} onClose={() => setCategory(null)} />
    </div>
  );
}
