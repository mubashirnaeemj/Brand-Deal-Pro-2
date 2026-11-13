import { Check, ShieldAlert, Sparkles, TrendingDown } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { FeedCreator } from "@/data/feed";
import { comparableFor, metricRows, whyThemNotMe, STRATEGY_ROWS } from "@/lib/feedCompare";
import { cn } from "@/lib/utils";
import { IndexRadar, MixBars, SERIES_COLORS } from "./CompareCharts";
import { Chip, CreatorAvatar } from "./FeedVisuals";

function List({ title, icon, tone, items }: { title: string; icon: React.ReactNode; tone: string; items: string[] }) {
  return (
    <section aria-label={title} className={cn("rounded-2xl border p-4", tone)}>
      <h3 className="mb-2.5 flex items-center gap-2 text-sm font-extrabold text-white">{icon}{title}</h3>
      <ul className="flex flex-col gap-2 text-sm text-muted-foreground">{items.map((i) => <li key={i} className="flex gap-2"><span aria-hidden="true">•</span><span>{i}</span></li>)}</ul>
    </section>
  );
}

export default function WhyThemDialog({ creator, onClose }: { creator: FeedCreator | null; onClose: () => void }) {
  const me = comparableFor("me");
  const them = creator ? comparableFor(creator.id) : null;
  const rows = them ? metricRows(me, them) : [];
  const advice = them ? whyThemNotMe(them) : null;
  const mixKeys = STRATEGY_ROWS.map(([, label]) => label);
  const mixRows = them ? [me, them].map((c) => ({ name: c.isMe ? "You" : `@${c.handle}`, ...Object.fromEntries(STRATEGY_ROWS.map(([k, label]) => [label, c.strategy[k]])) })) : [];
  return (
    <Dialog open={!!creator} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="max-h-[92vh] max-w-4xl overflow-y-auto border-border bg-card p-0 sm:rounded-2xl">
        {creator && them && advice && (
          <div className="flex flex-col gap-6 p-6">
            <DialogHeader className="text-left">
              <DialogTitle className="text-xl font-extrabold text-white">Why Them, Not Me?</DialogTitle>
              <DialogDescription className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                <CreatorAvatar creator={creator} size={24} /> You against <strong className="text-white">@{creator.handle}</strong>
                <Chip tone="primary">{creator.similarity}% match</Chip>
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-5 lg:grid-cols-2">
              <section aria-label="Comparison chart">
                <h3 className="mb-1 text-sm font-bold text-white">Side by side</h3>
                <p className="text-xs text-muted-foreground">Each axis is scaled so the higher of the two is 100.</p>
                <IndexRadar label={`Radar chart comparing you with @${creator.handle}`}
                  axes={rows.map((r) => r.label)}
                  series={[{ name: "You", color: SERIES_COLORS[0], values: rows.map((r) => Math.round((r.me / Math.max(r.me, r.them)) * 100)) },
                    { name: `@${creator.handle}`, color: SERIES_COLORS[1], values: rows.map((r) => Math.round((r.them / Math.max(r.me, r.them)) * 100)) }]} />
              </section>
              <section aria-label="Metric comparison" className="flex flex-col gap-2.5">
                <h3 className="text-sm font-bold text-white">The numbers</h3>
                {rows.map((r) => {
                  const max = Math.max(r.me, r.them) || 1; const themLeads = r.them > r.me; const tie = r.them === r.me;
                  return (
                    <div key={r.key} data-testid={`why-row-${r.key}`} className="rounded-xl border border-border bg-background/40 p-2.5">
                      <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{r.label}</p>
                      {[["You", r.me, SERIES_COLORS[0], !themLeads && !tie], [`@${creator.handle}`, r.them, SERIES_COLORS[1], themLeads]].map(([name, value, color, lead]) => (
                        <div key={name as string} className="flex items-center gap-2 text-xs">
                          <span className="w-24 shrink-0 truncate text-muted-foreground">{name as string}</span>
                          <span className="h-2 flex-1 overflow-hidden rounded-full bg-secondary"><span className="block h-full rounded-full" style={{ width: `${((value as number) / max) * 100}%`, background: color as string }} /></span>
                          <span className={cn("w-12 text-right font-bold", lead ? "text-emerald-400" : "text-white")}>{r.show(value as number)}</span>
                        </div>
                      ))}
                    </div>
                  );
                })}
              </section>
            </div>

            <section aria-label="Content category distribution">
              <h3 className="mb-1 text-sm font-bold text-white">Content category distribution</h3>
              <MixBars rows={mixRows} keys={mixKeys} height={150} label="Stacked bars of content categories for you and the selected creator" />
              <p className="mt-1 text-xs text-muted-foreground">Their top category is {them.strongestCategory.name.toLowerCase()} ({them.strongestCategory.pct}%); yours is {me.strongestCategory.name.toLowerCase()} ({me.strongestCategory.pct}%).</p>
            </section>

            <div className="grid gap-4 md:grid-cols-2">
              <List title="Their Advantages" icon={<TrendingDown size={15} className="rotate-180 text-sky-400" aria-hidden="true" />} tone="border-sky-500/25 bg-sky-500/5" items={advice.theirAdvantages} />
              <List title="Your Advantages" icon={<Check size={15} className="text-emerald-400" aria-hidden="true" />} tone="border-emerald-500/25 bg-emerald-500/5" items={advice.yourAdvantages} />
            </div>
            <section aria-label="Opportunities to Improve" className="rounded-2xl border border-primary/30 bg-primary/5 p-4">
              <h3 className="mb-3 flex items-center gap-2 text-sm font-extrabold text-white"><Sparkles size={15} className="text-primary" aria-hidden="true" />Opportunities to Improve</h3>
              <ol className="flex flex-col gap-2">
                {advice.improvements.map((line, i) => (
                  <li key={line} className="flex gap-3 text-sm text-muted-foreground">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/20 text-[11px] font-extrabold text-primary">{i + 1}</span>{line}
                  </li>
                ))}
              </ol>
            </section>
            <p role="note" className="flex gap-2 rounded-xl bg-secondary/50 p-3 text-xs text-muted-foreground">
              <ShieldAlert size={14} className="mt-0.5 shrink-0" aria-hidden="true" />
              These are estimated competitive insights based on available public data, not confirmed reasons for any brand's partnership decisions.
            </p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
