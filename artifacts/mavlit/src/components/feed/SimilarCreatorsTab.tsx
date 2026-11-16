import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, GitCompareArrows, Plus, X } from "lucide-react";
import { avatarHue, fetchSimilarCreators } from "@/lib/similarCreators";
import type { SimilarCreator } from "@/lib/similarCreators";
import { MAX_COMPARE, compareHandle, registerCompetitors, registerRealCreators } from "@/lib/feedCompare";
import { competitorKey, fetchCompetitors, isPending as competitorPending, vanished } from "@/lib/competitors";
import type { Competitor } from "@/lib/competitors";
import { fmtCount, fmtPercent } from "@/lib/feedData";
import { cn } from "@/lib/utils";
import CompareDialog from "./CompareDialog";
import CompetitorPanel from "./CompetitorPanel";
import { Chip, CreatorAvatar, EmptyState } from "./FeedVisuals";
import SimilarCreatorDialog from "./SimilarCreatorDialog";
import WhyThemDialog from "./WhyThemDialog";

export const displayName = (c: SimilarCreator) => c.full_name?.trim() || c.username;

export default function SimilarCreatorsTab() {
  const [open, setOpen] = useState<SimilarCreator | null>(null);
  const [compareMode, setCompareMode] = useState(false);
  const [compareIds, setCompareIds] = useState<string[]>([]);
  const [dashboard, setDashboard] = useState(false);
  const [whyThem, setWhyThem] = useState<SimilarCreator | null>(null);
  // Hard filter: only creators with a third of my followers up to twice as many (the server applies it, so the list is still full of matches).
  const [sameAudience, setSameAudience] = useState(false);
  const { data, isPending, isError, refetch } = useQuery({
    queryKey: ["feed", "similar-creators", sameAudience], queryFn: () => fetchSimilarCreators(sameAudience), staleTime: 60_000,
    placeholderData: (previous) => previous,   // the checkbox and the cards stay on screen while the filtered list loads
  });
  // Compare and "Why Them, Not Me?" look their creators up by id: make the real ones known before they are drawn.
  const ids = useMemo(() => registerRealCreators(data?.creators ?? [], data?.you ?? null), [data]);
  // The competitors the user added: polled while one is being looked up. One that was waiting and is gone had no posts (no such account, or it is private).
  const queryClient = useQueryClient();
  const competitorsQuery = useQuery({
    queryKey: ["feed", "competitors"], queryFn: fetchCompetitors, staleTime: 0, enabled: compareMode || compareIds.some((id) => id.startsWith("competitor:")),
    refetchInterval: (query) => (query.state.data?.some(competitorPending) ? 3000 : false),
  });
  const competitors: Competitor[] = useMemo(() => competitorsQuery.data ?? [], [competitorsQuery.data]);
  useMemo(() => registerCompetitors(competitors), [competitors]);   // before Compare reads them
  const [notices, setNotices] = useState<string[]>([]);
  const previous = useRef<Competitor[]>([]);
  useEffect(() => {
    const gone = vanished(previous.current, competitors);
    if (gone.length) setNotices((cur) => [...new Set([...cur, ...gone.map((h) => `@${h} could not be found on Instagram: no posts were found (the account may not exist or may be private).`)])]);
    previous.current = competitors;
  }, [competitors]);
  const toggleCompare = (id: string) => setCompareIds((cur) => cur.includes(id) ? cur.filter((x) => x !== id) : cur.length < MAX_COMPARE ? [...cur, id] : cur);

  if (isPending) return <p role="status" className="py-16 text-center text-sm text-muted-foreground">Finding creators like you…</p>;
  if (isError || !data) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-border bg-card/40 px-6 py-16 text-center" role="alert">
        <p className="text-base font-bold text-white">Could not load similar creators</p>
        <button type="button" onClick={() => void refetch()} className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90">Try again</button>
      </div>
    );
  }
  if (!data.ready) return <EmptyState title="Finish your profile to see similar creators" hint="We compare your profile with creators who have brand partnerships. Add your niche and audience description first." />;
  if (data.creators.length === 0 && !sameAudience) return <EmptyState title="No similar creators yet" hint={`No creator with a confirmed brand partnership is at least ${data.threshold}% similar to your profile yet.`} />;

  const creators = data.creators;
  const withFollowers = creators.filter((c) => c.followers !== null);
  const avgFollowers = withFollowers.length ? withFollowers.reduce((s, c) => s + (c.followers ?? 0), 0) / withFollowers.length : 0;
  const avgMatch = creators.length ? creators.reduce((s, c) => s + c.similarity, 0) / creators.length : 0;
  const range = data.audience_range;
  const audienceHint = !data.your_followers || !range
    ? "Add your follower count to your profile to use this filter."
    : `Only creators with ${fmtCount(range.min)} to ${fmtCount(range.max)} followers: a third to twice your ${fmtCount(data.your_followers)}.`;
  const partnerships = creators.reduce((s, c) => s + c.partnership_count, 0);
  const stats = [
    ["Similar creators", String(creators.length)], ["Avg match", `${Math.round(avgMatch)}%`],
    ["Avg followers", withFollowers.length ? fmtCount(avgFollowers) : "—"], ["Detected partnerships", String(partnerships)],
  ];
  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-card/60 p-3.5">
        <p className="text-sm text-muted-foreground">{compareMode ? `Pick up to ${MAX_COMPARE} creators to compare with your profile.` : "See how you stack up against one or several similar creators."}</p>
        <div className="flex flex-wrap items-center gap-2">
          {compareMode && compareIds.length > 0 && (
            <ul className="flex flex-wrap gap-1.5" aria-label="Selected creators">
              {compareIds.map((id) => {
                const handle = compareHandle(id) ?? id;
                return <li key={id}><button type="button" aria-label={`Remove @${handle} from comparison`} onClick={() => toggleCompare(id)} className="inline-flex items-center gap-1 rounded-full border border-primary/30 bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary hover:bg-primary/20">@{handle}<X size={11} aria-hidden="true" /></button></li>;
              })}
            </ul>
          )}
          {compareMode ? (
            <>
              <button type="button" disabled={compareIds.length === 0} onClick={() => setDashboard(true)} className="rounded-lg bg-primary px-3.5 py-2 text-xs font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-40">Compare ({compareIds.length}/{MAX_COMPARE})</button>
              <button type="button" onClick={() => { setCompareMode(false); setCompareIds([]); }} className="rounded-lg border border-border px-3 py-2 text-xs font-semibold text-muted-foreground hover:text-white">Cancel</button>
            </>
          ) : (
            <button type="button" onClick={() => setCompareMode(true)} className="inline-flex items-center gap-2 rounded-lg bg-primary px-3.5 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90">
              <GitCompareArrows size={15} aria-hidden="true" />Compare Creators
            </button>
          )}
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 rounded-2xl border border-border bg-card/60 p-3.5">
        <label className="inline-flex cursor-pointer items-center gap-2 text-sm font-semibold text-white">
          <input type="checkbox" checked={sameAudience} disabled={!data.your_followers} onChange={(event) => setSameAudience(event.target.checked)}
            className="h-4 w-4 accent-primary" data-testid="filter-same-audience" />
          Show creators with the same audience size as me
        </label>
        <p className="text-xs text-muted-foreground" data-testid="same-audience-hint">{audienceHint}</p>
      </div>
      {creators.length === 0 ? (
        <EmptyState title="No creators with a similar audience size" hint="None of the creators similar to you has a follower count in that range. Untick the filter to see everyone." />
      ) : <>
      {compareMode && (
        <CompetitorPanel competitors={competitors} notices={notices} selected={compareIds} full={compareIds.length >= MAX_COMPARE} onToggle={toggleCompare}
          onChanged={(removedKey) => { if (removedKey) { setCompareIds((cur) => cur.filter((x) => x !== removedKey)); previous.current = previous.current.filter((c) => competitorKey(c.id) !== removedKey); } void queryClient.invalidateQueries({ queryKey: ["feed", "competitors"] }); }}
          onDismissNotice={(notice) => setNotices((cur) => cur.filter((n) => n !== notice))} />
      )}
      <dl className="grid grid-cols-2 gap-3 lg:grid-cols-4" aria-label="Similar creators summary">
        {stats.map(([label, value]) => (
          <div key={label} className="rounded-2xl border border-border bg-card p-4">
            <dt className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</dt>
            <dd className="mt-1 text-2xl font-extrabold text-white" data-testid={`similar-stat-${label.toLowerCase().replace(/\s+/g, "-")}`}>{value}</dd>
          </div>
        ))}
      </dl>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {creators.map((c) => (
          <article key={c.username} data-testid={`creator-card-${c.username}`} className="flex flex-col gap-4 rounded-2xl border border-border bg-card p-5 transition-colors hover:border-primary/40">
            <header className="flex items-center gap-3">
              <CreatorAvatar creator={{ name: displayName(c), hue: avatarHue(c.username) }} size={52} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-bold text-white">@{c.username}</p>
                <p className="truncate text-xs text-muted-foreground">{c.niche}</p>
              </div>
              <Chip tone={c.similarity >= 80 ? "good" : "primary"}>{c.similarity}% match</Chip>
            </header>
            {c.description && <p className="line-clamp-3 text-xs text-muted-foreground">{c.description}</p>}
            {c.tags.length > 0 && (
              <ul className="flex flex-wrap gap-1.5" aria-label="Topics">
                {c.tags.slice(0, 5).map((tag) => <li key={tag}><Chip>{tag}</Chip></li>)}
              </ul>
            )}
            <dl className="grid grid-cols-3 gap-2 text-center">
              {[["Followers", c.followers === null ? "—" : fmtCount(c.followers)], ["Engagement", c.engagement_rate === null ? "—" : fmtPercent(c.engagement_rate)], ["Partnerships", String(c.partnership_count)]].map(([l, v]) => (
                <div key={l} className="rounded-lg bg-secondary/50 py-2"><dd className="text-sm font-extrabold text-white">{v}</dd><dt className="text-[10px] text-muted-foreground">{l}</dt></div>
              ))}
            </dl>
            <div className="mt-auto flex flex-wrap items-center gap-2">
              <button type="button" onClick={() => setOpen(c)} aria-label={`View partnerships for @${c.username}`}
                className="rounded-lg bg-primary px-3.5 py-1.5 text-xs font-semibold text-primary-foreground hover:bg-primary/90">View Partnerships</button>
              <button type="button" onClick={() => setWhyThem(c)} aria-label={`Why them, not me? @${c.username}`}
                className="rounded-lg border border-primary/40 px-3.5 py-1.5 text-xs font-semibold text-primary hover:bg-primary/10">Why Them, Not Me?</button>
            </div>
            {compareMode && (() => {
              const id = ids.get(c.username)!; const on = compareIds.includes(id); const full = !on && compareIds.length >= MAX_COMPARE;
              return (
                <button type="button" aria-pressed={on} disabled={full} onClick={() => toggleCompare(id)} aria-label={`${on ? "Remove" : "Add"} @${c.username} ${on ? "from" : "to"} comparison`}
                  title={full ? "Remove a creator first" : undefined}
                  className={cn("inline-flex items-center justify-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold disabled:opacity-40", on ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-400" : "border-border text-muted-foreground hover:text-white")}>
                  {on ? <Check size={13} aria-hidden="true" /> : <Plus size={13} aria-hidden="true" />}{on ? "In comparison" : full ? "Limit reached" : "Add to compare"}
                </button>
              );
            })()}
          </article>
        ))}
      </div>
      </>}
      <SimilarCreatorDialog creator={open} onClose={() => setOpen(null)} />
      <WhyThemDialog creator={whyThem} you={data.you ?? null} onClose={() => setWhyThem(null)} />
      <CompareDialog ids={compareIds} onChange={setCompareIds} open={dashboard} onOpenChange={setDashboard} />
    </div>
  );
}
