import { Crown, X } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CREATORS } from "@/data/feed";
import { STRATEGY_ROWS, bestOf, comparableFor, type Comparable } from "@/lib/feedCompare";
import { fmtCount, fmtPercent } from "@/lib/feedData";
import { cn } from "@/lib/utils";
import { MetricBars, MixBars, SERIES_COLORS } from "./CompareCharts";
import { CreatorAvatar } from "./FeedVisuals";

interface Props { ids: string[]; onChange: (ids: string[]) => void; open: boolean; onOpenChange: (open: boolean) => void }

const labelOf = (c: Comparable) => (c.isMe ? "You" : `@${c.handle}`);

function Row({ label, cols, values, best, text }: { label: string; cols: Comparable[]; values: number[]; best?: "max"; text: (n: number, c: Comparable) => string }) {
  const max = Math.max(...values);
  return (
    <tr className="border-t border-border" data-testid={`cmp-${label.toLowerCase().replace(/[^a-z]+/g, "-")}`}>
      <th scope="row" className="py-2.5 pr-3 text-left text-xs font-semibold text-muted-foreground">{label}</th>
      {cols.map((c, i) => {
        const win = best === "max" && values[i] === max && values.filter((v) => v === max).length < values.length;
        return (
          <td key={c.id} className={cn("px-2 py-2.5 text-sm", win ? "font-extrabold text-emerald-400" : "font-semibold text-white")}>
            <div className="flex items-center gap-1.5">{win && <Crown size={12} aria-label="Best" />}{text(values[i], c)}</div>
            {best === "max" && <span className="mt-1 block h-1 overflow-hidden rounded-full bg-secondary"><span className="block h-full rounded-full" style={{ width: `${max ? (values[i] / max) * 100 : 0}%`, background: SERIES_COLORS[i] }} /></span>}
          </td>
        );
      })}
    </tr>
  );
}
const Section = ({ title, cols, children }: { title: string; cols: number; children: React.ReactNode }) => (
  <tbody><tr><th colSpan={cols + 1} className="pt-5 pb-1 text-left text-xs font-extrabold uppercase tracking-wider text-primary">{title}</th></tr>{children}</tbody>
);

export default function CompareDialog({ ids, onChange, open, onOpenChange }: Props) {
  const cols = ["me", ...ids].map(comparableFor);
  const others = cols.slice(1);
  const free = CREATORS.filter((c) => !ids.includes(c.id));
  const replace = (index: number, next: string) => onChange(ids.map((id, i) => (i === index ? next : id)));
  const hiEng = bestOf(cols, (c) => c.engagement); const hiViews = bestOf(cols, (c) => c.avgReelViews);
  const hiDeals = bestOf(cols, (c) => c.partnerships.length);
  const strongest = cols.map((c) => ({ c, ...c.strongestCategory })).sort((a, b) => b.pct - a.pct)[0];
  const byId = (id: string) => cols.find((c) => c.id === id)!;
  const highlights = [
    { label: "Highest engagement rate", who: byId(hiEng), value: fmtPercent(byId(hiEng).engagement) },
    { label: "Highest average views", who: byId(hiViews), value: fmtCount(byId(hiViews).avgReelViews) },
    { label: "Most partnerships", who: byId(hiDeals), value: String(byId(hiDeals).partnerships.length) },
    { label: "Strongest content category", who: strongest.c, value: `${strongest.name} ${strongest.pct}%` },
  ];
  const n = cols.length;
  const rowsPct = (key: keyof Comparable["strategy"]) => cols.map((c) => c.strategy[key]);
  const pct = (v: number) => `${v}%`;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[94vh] max-w-6xl overflow-y-auto border-border bg-card p-0 sm:rounded-2xl">
        <div className="flex flex-col gap-6 p-6">
          <DialogHeader className="text-left">
            <DialogTitle className="text-xl font-extrabold text-white">Compare Creators</DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground">You against {others.length} similar creator{others.length === 1 ? "" : "s"}. Remove or replace anyone to change the comparison.</DialogDescription>
          </DialogHeader>

          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4" aria-label="Creators being compared">
            {cols.map((c, i) => (
              <li key={c.id} data-testid={`cmp-col-${c.id}`} className="flex flex-col gap-2 rounded-2xl border bg-background/40 p-3" style={{ borderColor: `${SERIES_COLORS[i]}66` }}>
                <div className="flex items-center gap-2.5">
                  <CreatorAvatar creator={c} size={36} />
                  <div className="min-w-0 flex-1"><p className="truncate text-sm font-bold text-white">{c.isMe ? "You" : `@${c.handle}`}</p><p className="truncate text-[11px] text-muted-foreground">{c.isMe ? `@${c.handle}` : c.name}</p></div>
                  {!c.isMe && <button type="button" aria-label={`Remove @${c.handle}`} onClick={() => onChange(ids.filter((id) => id !== c.id))} className="rounded-md p-1 text-muted-foreground hover:bg-secondary hover:text-white"><X size={14} aria-hidden="true" /></button>}
                </div>
                {!c.isMe && free.length > 0 && (
                  <Select value="" onValueChange={(v) => replace(i - 1, v)}>
                    <SelectTrigger aria-label={`Replace @${c.handle}`} className="h-8 text-xs"><SelectValue placeholder="Replace with…" /></SelectTrigger>
                    <SelectContent>{free.map((f) => <SelectItem key={f.id} value={f.id}>@{f.handle}</SelectItem>)}</SelectContent>
                  </Select>
                )}
              </li>
            ))}
            {ids.length < 3 && free.length > 0 && (
              <li className="flex flex-col justify-center gap-2 rounded-2xl border border-dashed border-border p-3">
                <Select value="" onValueChange={(v) => onChange([...ids, v])}>
                  <SelectTrigger aria-label="Add a creator" className="h-9 text-xs"><SelectValue placeholder="Add a creator…" /></SelectTrigger>
                  <SelectContent>{free.map((f) => <SelectItem key={f.id} value={f.id}>@{f.handle} · {f.similarity}% match</SelectItem>)}</SelectContent>
                </Select>
              </li>
            )}
          </ul>

          {others.length === 0 ? <p className="py-10 text-center text-sm text-muted-foreground">Add at least one creator to compare against.</p> : <>
            <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4" aria-label="Highlights">
              {highlights.map((h) => (
                <li key={h.label} className="rounded-2xl border border-emerald-500/25 bg-emerald-500/5 p-3.5" data-testid={`highlight-${h.label.toLowerCase().replace(/\s+/g, "-")}`}>
                  <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-emerald-400"><Crown size={12} aria-hidden="true" />{h.label}</p>
                  <p className="mt-1 text-sm font-extrabold text-white">{labelOf(h.who)}</p><p className="text-xs text-muted-foreground">{h.value}</p>
                </li>
              ))}
            </ul>

            <div className="grid gap-4 lg:grid-cols-2">
              <section className="rounded-2xl border border-border p-4" aria-label="Engagement chart"><h3 className="mb-1 text-sm font-bold text-white">Engagement rate</h3>
                <MetricBars unit="%" label="Engagement rate by creator" data={cols.map((c, i) => ({ name: labelOf(c), value: c.engagement, color: SERIES_COLORS[i] }))} /></section>
              <section className="rounded-2xl border border-border p-4" aria-label="Views chart"><h3 className="mb-1 text-sm font-bold text-white">Average Reel views</h3>
                <MetricBars label="Average Reel views by creator" data={cols.map((c, i) => ({ name: labelOf(c), value: c.avgReelViews, color: SERIES_COLORS[i] }))} /></section>
            </div>
            <section aria-label="Content strategy chart" className="rounded-2xl border border-border p-4">
              <h3 className="mb-1 text-sm font-bold text-white">Content strategy mix</h3>
              <MixBars label="Content strategy mix by creator" keys={STRATEGY_ROWS.map(([, l]) => l)} height={60 + n * 44}
                rows={cols.map((c) => ({ name: labelOf(c), ...Object.fromEntries(STRATEGY_ROWS.map(([k, l]) => [l, c.strategy[k]])) }))} />
            </section>

            <div className="overflow-x-auto rounded-2xl border border-border">
              <table className="w-full min-w-[640px] border-collapse px-4 text-left" aria-label="Creator comparison table">
                <thead><tr><th className="p-3 text-xs text-muted-foreground"><span className="sr-only">Metric</span></th>
                  {cols.map((c, i) => <th key={c.id} scope="col" className="px-2 py-3 text-xs font-bold" style={{ color: SERIES_COLORS[i] }}>{labelOf(c)}</th>)}</tr></thead>
                <Section title="Profile metrics" cols={n}>
                  <Row label="Followers" cols={cols} values={cols.map((c) => c.followers)} best="max" text={(v) => fmtCount(v)} />
                  <Row label="Engagement rate" cols={cols} values={cols.map((c) => c.engagement)} best="max" text={(v) => fmtPercent(v)} />
                  <Row label="Average Reel views" cols={cols} values={cols.map((c) => c.avgReelViews)} best="max" text={(v) => fmtCount(v)} />
                  <Row label="Average likes" cols={cols} values={cols.map((c) => c.avgLikes)} best="max" text={(v) => fmtCount(v)} />
                  <Row label="Average comments" cols={cols} values={cols.map((c) => c.avgComments)} best="max" text={(v) => fmtCount(v)} />
                  <Row label="Posts per week" cols={cols} values={cols.map((c) => c.postsPerWeek)} best="max" text={(v) => v.toFixed(1)} />
                </Section>
                <Section title="Content strategy" cols={n}>
                  <Row label="Tutorial" cols={cols} values={rowsPct("tutorial")} best="max" text={pct} />
                  <Row label="Product review" cols={cols} values={rowsPct("productReview")} best="max" text={pct} />
                  <Row label="Lifestyle" cols={cols} values={rowsPct("lifestyle")} best="max" text={pct} />
                  <Row label="Educational" cols={cols} values={rowsPct("educational")} best="max" text={pct} />
                  <Row label="Entertainment" cols={cols} values={rowsPct("entertainment")} best="max" text={pct} />
                </Section>
                <Section title="Partnership performance" cols={n}>
                  <Row label="Total detected partnerships" cols={cols} values={cols.map((c) => c.partnerships.length)} best="max" text={(v) => String(v)} />
                  <Row label="Unique brands" cols={cols} values={cols.map((c) => c.uniqueBrands)} best="max" text={(v) => String(v)} />
                  <Row label="Top brand categories" cols={cols} values={cols.map(() => 0)} text={(_, c) => c.topBrandCategories.join(", ") || "None yet"} />
                  <Row label="Common sponsored formats" cols={cols} values={cols.map(() => 0)} text={(_, c) => c.topFormats.join(", ") || "None yet"} />
                </Section>
              </table>
            </div>
          </>}
        </div>
      </DialogContent>
    </Dialog>
  );
}
