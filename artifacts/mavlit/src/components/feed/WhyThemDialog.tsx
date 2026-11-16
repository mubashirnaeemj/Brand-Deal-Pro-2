import { Check, ShieldAlert, Sparkles, TrendingDown } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { avatarHue } from "@/lib/similarCreators";
import type { SimilarCreator, YouStats } from "@/lib/similarCreators";
import { comparableFor, sampleCreatorNumbers, sampleMeNumbers } from "@/lib/feedCompare";
import { theirMix, whyAdvice, whyRows, yourMix } from "@/lib/whyThem";
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

const LABELS = { followers: "Followers", views: "Avg Reel views", engagement: "Engagement rate", frequency: "Posts per week", deals: "Brand partnerships" } as const;

/** Your numbers against one similar creator's: followers, average Reel views, engagement rate, posts per week and brand partnerships. All real, no LLM. */
export default function WhyThemDialog({ creator, you, onClose }: { creator: SimilarCreator | null; you: YouStats | null; onClose: () => void }) {
  // The content mix is the one an LLM estimated from the captions (yours when MAVLIT generated your profile, the creator's when the creators script ran).
  // Until it ran for someone, the prototype's sample mix stands in (a mock creator's, picked from the username).
  const sampleMe = comparableFor("me");
  const sampleThem = creator ? comparableFor(`real:${creator.username}`) : null;
  const mine = you ? yourMix(you, sampleMe) : null;
  const theirs = creator && sampleThem ? theirMix(creator, sampleThem) : null;
  // The rows for average Reel views, brand partnerships, product-focused content and content categories are always there: a side with no number uses the
  // prototype's hardcoded sample one (the estimated mix when there is one).
  const mixes = mine && theirs ? { you: mine, them: theirs } : undefined;
  const samples = creator ? { you: sampleMeNumbers(), them: sampleCreatorNumbers(creator.username) } : undefined;
  const rows = creator && you ? whyRows(you, creator, mixes, samples) : [];
  const advice = creator && you ? whyAdvice(you, creator, mixes, samples) : null;
  const mixKeys = mine && theirs ? [...new Set([...Object.keys(mine.categories), ...Object.keys(theirs.categories)])] : [];
  const mixRows = mine && theirs ? [{ name: "You", ...mine.categories }, { name: `@${creator?.username}`, ...theirs.categories }] : [];
  const top = (categories: Record<string, number>) => Object.entries(categories).sort((a, b) => b[1] - a[1])[0];
  const missing = (Object.keys(LABELS) as (keyof typeof LABELS)[]).filter((key) => !rows.some((r) => r.key === key)).map((key) => LABELS[key]);
  return (
    <Dialog open={!!creator} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="max-h-[92vh] max-w-4xl overflow-y-auto border-border bg-card p-0 sm:rounded-2xl">
        {creator && you && advice && (
          <div className="flex flex-col gap-6 p-6">
            <DialogHeader className="text-left">
              <DialogTitle className="text-xl font-extrabold text-white">Why Them, Not Me?</DialogTitle>
              <DialogDescription className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                <CreatorAvatar creator={{ name: creator.full_name?.trim() || creator.username, hue: avatarHue(creator.username) }} size={24} /> You against <strong className="text-white">@{creator.username}</strong>
                <Chip tone="primary">{creator.similarity}% match</Chip>
              </DialogDescription>
            </DialogHeader>

            {rows.length > 0 && (
              <div className="grid gap-5 lg:grid-cols-2">
                {rows.length >= 3 && (
                  <section aria-label="Comparison chart">
                    <h3 className="mb-1 text-sm font-bold text-white">Side by side</h3>
                    <p className="text-xs text-muted-foreground">Each axis is scaled so the higher of the two is 100.</p>
                    <IndexRadar label={`Radar chart comparing you with @${creator.username}`}
                      axes={rows.map((r) => r.label)}
                      series={[{ name: "You", color: SERIES_COLORS[0], values: rows.map((r) => Math.round((r.me / Math.max(r.me, r.them, 1)) * 100)) },
                        { name: `@${creator.username}`, color: SERIES_COLORS[1], values: rows.map((r) => Math.round((r.them / Math.max(r.me, r.them, 1)) * 100)) }]} />
                  </section>
                )}
                <section aria-label="Metric comparison" className={cn("flex flex-col gap-2.5", rows.length < 3 && "lg:col-span-2")}>
                  <h3 className="text-sm font-bold text-white">The numbers</h3>
                  {rows.map((r) => {
                    const max = Math.max(r.me, r.them) || 1; const themLeads = r.them > r.me; const tie = r.them === r.me;
                    return (
                      <div key={r.key} data-testid={`why-row-${r.key}`} className="rounded-xl border border-border bg-background/40 p-2.5">
                        <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{r.label}</p>
                        {[["You", r.me, SERIES_COLORS[0], !themLeads && !tie], [`@${creator.username}`, r.them, SERIES_COLORS[1], themLeads]].map(([name, value, color, lead]) => (
                          <div key={name as string} className="flex items-center gap-2 text-xs">
                            <span className="w-24 shrink-0 truncate text-muted-foreground">{name as string}</span>
                            <span className="h-2 flex-1 overflow-hidden rounded-full bg-secondary"><span className="block h-full rounded-full" style={{ width: `${((value as number) / max) * 100}%`, background: color as string }} /></span>
                            <span className={cn("w-14 text-right font-bold", lead ? "text-emerald-400" : "text-white")}>{r.show(value as number)}</span>
                          </div>
                        ))}
                      </div>
                    );
                  })}
                </section>
              </div>
            )}
            {missing.length > 0 && (
              <p data-testid="why-missing" className="rounded-xl bg-secondary/50 p-3 text-xs text-muted-foreground">
                Not compared, because one of you has no number yet: {missing.join(", ")}.
              </p>
            )}

            {mine && theirs && (
              <section aria-label="Content category distribution">
                <h3 className="mb-1 text-sm font-bold text-white">Content category distribution</h3>
                <MixBars rows={mixRows} keys={mixKeys} height={150} label="Stacked bars of content categories for you and the selected creator" />
                {mine && theirs && top(theirs.categories) && top(mine.categories) && (
                  <p className="mt-1 text-xs text-muted-foreground">Their top category is {top(theirs.categories)[0].toLowerCase()} ({top(theirs.categories)[1]}%); yours is {top(mine.categories)[0].toLowerCase()} ({top(mine.categories)[1]}%).</p>
                )}
                {mine.real && theirs.real && (
                  <p data-testid="mix-source-note" className="mt-1 text-[11px] text-muted-foreground">Content mix estimated by MAVLIT from each creator's captions.</p>
                )}
              </section>
            )}

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
