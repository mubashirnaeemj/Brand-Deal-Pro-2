import { useMemo, useState } from "react";
import { Check, GitCompareArrows, Plus, X } from "lucide-react";
import { CREATORS } from "@/data/feed";
import type { FeedCreator } from "@/data/feed";
import { activeFilterCount, filterCreators, fmtCount, fmtPercent, partnershipsOfCreator } from "@/lib/feedData";
import type { FeedFilters } from "@/lib/feedData";
import { MAX_COMPARE } from "@/lib/feedCompare";
import { cn } from "@/lib/utils";
import CompareDialog from "./CompareDialog";
import { Chip, CreatorAvatar, EmptyState } from "./FeedVisuals";
import WhyThemDialog from "./WhyThemDialog";

interface Props {
  filters: FeedFilters; onClear: () => void; onViewCreator: (c: FeedCreator) => void;
  compareIds: string[]; onCompareChange: (ids: string[]) => void;
}

export default function SimilarCreatorsTab({ filters, onClear, onViewCreator, compareIds, onCompareChange }: Props) {
  const [compareMode, setCompareMode] = useState(false);
  const [dashboard, setDashboard] = useState(false);
  const [whyThem, setWhyThem] = useState<FeedCreator | null>(null);
  const toggleCompare = (id: string) => onCompareChange(compareIds.includes(id) ? compareIds.filter((x) => x !== id) : compareIds.length < MAX_COMPARE ? [...compareIds, id] : compareIds);
  const creators = useMemo(() => filterCreators(filters).sort((a, b) => b.similarity - a.similarity), [filters]);
  const avg = (pick: (c: FeedCreator) => number) => (creators.length ? creators.reduce((s, c) => s + pick(c), 0) / creators.length : 0);
  const total = creators.reduce((s, c) => s + partnershipsOfCreator(c.id).length, 0);
  const stats = [
    ["Similar creators", String(creators.length)], ["Avg followers", fmtCount(avg((c) => c.followers))],
    ["Avg engagement", fmtPercent(avg((c) => c.engagementRate))], ["Detected partnerships", String(total)],
  ];
  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-card/60 p-3.5">
        <p className="text-sm text-muted-foreground">{compareMode ? `Pick up to ${MAX_COMPARE} creators to compare with your profile.` : "See how you stack up against one or several similar creators."}</p>
        <div className="flex flex-wrap items-center gap-2">
          {compareMode && compareIds.length > 0 && (
            <ul className="flex flex-wrap gap-1.5" aria-label="Selected creators">
              {compareIds.map((id) => {
                const handle = CREATORS.find((c) => c.id === id)!.handle;
                return <li key={id}><button type="button" aria-label={`Remove @${handle} from comparison`} onClick={() => toggleCompare(id)} className="inline-flex items-center gap-1 rounded-full border border-primary/30 bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary hover:bg-primary/20">@{handle}<X size={11} aria-hidden="true" /></button></li>;
              })}
            </ul>
          )}
          {compareMode ? (
            <>
              <button type="button" disabled={compareIds.length === 0} onClick={() => setDashboard(true)} className="rounded-lg bg-primary px-3.5 py-2 text-xs font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-40">Compare ({compareIds.length}/{MAX_COMPARE})</button>
              <button type="button" onClick={() => setCompareMode(false)} className="rounded-lg border border-border px-3 py-2 text-xs font-semibold text-muted-foreground hover:text-white">Cancel</button>
            </>
          ) : (
            <button type="button" onClick={() => setCompareMode(true)} className="inline-flex items-center gap-2 rounded-lg bg-primary px-3.5 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90">
              <GitCompareArrows size={15} aria-hidden="true" />Compare Creators
            </button>
          )}
        </div>
      </div>
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
                <p className="mt-auto text-xs text-muted-foreground">{count} brand partnership{count === 1 ? "" : "s"}</p>
                <div className="flex flex-wrap items-center gap-2">
                  <button type="button" onClick={() => onViewCreator(c)} aria-label={`View partnerships for @${c.handle}`}
                    className="rounded-lg bg-primary px-3.5 py-1.5 text-xs font-semibold text-primary-foreground hover:bg-primary/90">View Partnerships</button>
                  <button type="button" onClick={() => setWhyThem(c)} aria-label={`Why them, not me? @${c.handle}`}
                    className="rounded-lg border border-primary/40 px-3.5 py-1.5 text-xs font-semibold text-primary hover:bg-primary/10">Why Them, Not Me?</button>
                </div>
                {compareMode && (() => {
                  const on = compareIds.includes(c.id); const full = !on && compareIds.length >= MAX_COMPARE;
                  return (
                    <button type="button" aria-pressed={on} disabled={full} onClick={() => toggleCompare(c.id)} aria-label={`${on ? "Remove" : "Add"} @${c.handle} ${on ? "from" : "to"} comparison`}
                      title={full ? "Remove a creator first" : undefined}
                      className={cn("inline-flex items-center justify-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold disabled:opacity-40", on ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-400" : "border-border text-muted-foreground hover:text-white")}>
                      {on ? <Check size={13} aria-hidden="true" /> : <Plus size={13} aria-hidden="true" />}{on ? "In comparison" : full ? "Limit reached" : "Add to compare"}
                    </button>
                  );
                })()}
              </article>
            );
          })}
        </div>}
      <WhyThemDialog creator={whyThem} onClose={() => setWhyThem(null)} />
      <CompareDialog ids={compareIds} onChange={onCompareChange} open={dashboard} onOpenChange={setDashboard} />
    </div>
  );
}
