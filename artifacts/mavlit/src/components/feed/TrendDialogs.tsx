import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { BrandCategoryTrend, ContentTrend, EmergingTrend, HashtagTrend } from "@/data/feed/trends";
import { fmtCount, fmtPercent } from "@/lib/feedData";
import { exampleCreators, examplePosts, growthSeries, ideasForTrend, periodLabel, scaleCount, scaleGrowth, signed, type TrendFilters } from "@/lib/feedTrends";
import { BrandMark, Chip } from "./FeedVisuals";
import { BrandList, CreatorList, ExamplePosts, FormatChips, GrowthBadge, GrowthChart, IdeaList, ModalSection, SampleChip, SampleNote, StatusBadge } from "./TrendParts";

const shell = "max-h-[92vh] max-w-3xl overflow-y-auto border-border bg-card p-0 sm:rounded-2xl";

function Header({ title, description, badges }: { title: string; description: string; badges: React.ReactNode }) {
  return (
    <DialogHeader className="text-left">
      <div className="flex flex-wrap items-center gap-2">{badges}<SampleChip /></div>
      <DialogTitle className="text-xl font-extrabold text-white">{title}</DialogTitle>
      <DialogDescription className="text-sm text-muted-foreground">{description}</DialogDescription>
    </DialogHeader>
  );
}

export function ContentTrendDialog({ trend, filters, share, onClose }: { trend: ContentTrend | null; filters: TrendFilters; share: number; onClose: () => void }) {
  return (
    <Dialog open={!!trend} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className={shell}>
        {trend && (() => {
          const g = scaleGrowth(trend.g, filters);
          return (
            <div className="flex flex-col gap-6 p-6">
              <Header title={trend.name} description={trend.about} badges={<><GrowthBadge value={g} /><StatusBadge status={trend.status} /><Chip>{trend.category}</Chip></>} />
              <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {[["Creators", fmtCount(scaleCount(trend.creators, filters, share))], ["Posts detected", fmtCount(scaleCount(trend.posts, filters, share))], ["Avg views", fmtCount(trend.views)], ["Avg engagement", fmtPercent(trend.eng)]].map(([l, v]) => (
                  <div key={l} className="rounded-xl border border-border bg-secondary/40 p-3"><dt className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{l}</dt><dd className="mt-1 text-lg font-extrabold text-white">{v}</dd></div>
                ))}
              </dl>
              <ModalSection title="Why it's gaining popularity"><p className="text-sm text-muted-foreground">{trend.why}</p></ModalSection>
              <ModalSection title={`Growth over time (${periodLabel(filters)})`}><GrowthChart data={growthSeries(trend.id, g, filters)} label={`Interest over ${periodLabel(filters)} for ${trend.name}`} /></ModalSection>
              <ModalSection title="Popular content formats"><FormatChips formats={trend.formats} /></ModalSection>
              <ModalSection title="Creators participating"><CreatorList creators={exampleCreators(trend.creatorIds, trend.niche, trend.id)} /></ModalSection>
              <ModalSection title="Example posts"><ExamplePosts posts={examplePosts(trend.niche, trend.id)} /></ModalSection>
              <ModalSection title="Related brands"><BrandList ids={trend.brands} /></ModalSection>
              <ModalSection title="Suggested content ideas"><IdeaList ideas={ideasForTrend(trend.name, trend.id)} /></ModalSection>
              <SampleNote />
            </div>
          );
        })()}
      </DialogContent>
    </Dialog>
  );
}

export function OpportunityDialog({ trend, filters, share, onClose }: { trend: EmergingTrend | null; filters: TrendFilters; share: number; onClose: () => void }) {
  return (
    <Dialog open={!!trend} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className={shell}>
        {trend && (() => {
          const g = scaleGrowth(trend.g, filters);
          return (
            <div className="flex flex-col gap-6 p-6">
              <Header title={trend.name} description={`${trend.stage} stage · ${trend.opportunity}`} badges={<><GrowthBadge value={g} /><Chip tone="primary">{trend.stage}</Chip></>} />
              <ModalSection title="Trend analysis">
                <p className="text-sm text-muted-foreground">{trend.analysis}</p>
                <p className="text-sm text-muted-foreground">About {trend.adoptionPct}% of creators in this niche publish this today, and {fmtCount(scaleCount(trend.creators, filters, share))} have started in the {periodLabel(filters)}.</p>
              </ModalSection>
              <ModalSection title={`Growth over time (${periodLabel(filters)})`}><GrowthChart data={growthSeries(trend.id, g, filters)} label={`Interest over ${periodLabel(filters)} for ${trend.name}`} /></ModalSection>
              <ModalSection title="Suggested content formats"><FormatChips formats={trend.formats} /></ModalSection>
              <ModalSection title="Content ideas to try"><IdeaList ideas={trend.ideas} /></ModalSection>
              <ModalSection title="Creators already participating"><CreatorList creators={exampleCreators(trend.creatorIds, trend.niche, trend.id)} /></ModalSection>
              <ModalSection title="Example posts"><ExamplePosts posts={examplePosts(trend.niche, trend.id)} /></ModalSection>
              <ModalSection title="Related brands"><BrandList ids={trend.brands} /></ModalSection>
              <SampleNote />
            </div>
          );
        })()}
      </DialogContent>
    </Dialog>
  );
}

const hue = (name: string) => [...name].reduce((h, ch) => (h * 31 + ch.charCodeAt(0)) % 360, 0);

export function CategoryDialog({ trend, filters, share, onClose }: { trend: BrandCategoryTrend | null; filters: TrendFilters; share: number; onClose: () => void }) {
  return (
    <Dialog open={!!trend} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className={shell}>
        {trend && (() => {
          const g = scaleGrowth(trend.g, filters);
          const max = Math.max(...trend.brands.map((b) => b.partnerships));
          return (
            <div className="flex flex-col gap-6 p-6">
              <Header title={trend.name} description={`${scaleCount(trend.partnerships, filters, share)} detected partnerships across ${trend.activeBrands} active brands in the ${periodLabel(filters)}.`} badges={<GrowthBadge value={g} />} />
              <ModalSection title="Brands in this category">
                <ul className="flex flex-col gap-2" data-testid="category-brands">
                  {trend.brands.map((b) => (
                    <li key={b.name} className="flex items-center gap-3 rounded-xl border border-border bg-background/40 p-3">
                      <BrandMark brand={{ name: b.name, color: `hsl(${hue(b.name)} 70% 62%)` }} size={36} />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-bold text-white">{b.name}</p>
                        <span className="mt-1.5 block h-1.5 overflow-hidden rounded-full bg-secondary"><span className="block h-full rounded-full bg-primary" style={{ width: `${(b.partnerships / max) * 100}%` }} /></span>
                      </div>
                      <p className="text-right text-xs text-muted-foreground"><span className="block font-semibold text-white">{scaleCount(b.partnerships, filters, share)} partnerships</span>{scaleCount(b.creators, filters, share)} creators</p>
                    </li>
                  ))}
                </ul>
              </ModalSection>
              <ModalSection title="Popular creator categories"><div className="flex flex-wrap gap-1.5">{trend.creatorCategories.map((c) => <Chip key={c}>{c}</Chip>)}</div></ModalSection>
              <ModalSection title="Typical creator size and sponsored formats"><p className="text-sm text-muted-foreground">Creators with {trend.range} followers; mostly {trend.formats.join(" and ")} content.</p></ModalSection>
              <SampleNote />
            </div>
          );
        })()}
      </DialogContent>
    </Dialog>
  );
}

export function HashtagDialog({ trend, filters, share, onClose }: { trend: HashtagTrend | null; filters: TrendFilters; share: number; onClose: () => void }) {
  return (
    <Dialog open={!!trend} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className={shell}>
        {trend && (
          <div className="flex flex-col gap-6 p-6">
            <Header title={trend.tag} description={`${fmtCount(scaleCount(trend.posts, filters, share))} posts in the ${periodLabel(filters)} · ${trend.category} · ${signed(scaleGrowth(trend.g, filters))}`}
              badges={<GrowthBadge value={scaleGrowth(trend.g, filters)} />} />
            <ModalSection title="Example posts"><ExamplePosts posts={examplePosts(trend.niche, trend.tag)} /></ModalSection>
            <ModalSection title="Creators using it"><CreatorList creators={exampleCreators([], trend.niche, trend.tag)} /></ModalSection>
            <SampleNote />
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
