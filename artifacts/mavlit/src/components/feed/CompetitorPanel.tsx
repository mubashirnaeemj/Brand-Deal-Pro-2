import { useState } from "react";
import { Check, Loader2, Plus, Trash2 } from "lucide-react";
import { addCompetitor, competitorKey, isPending, removeCompetitor } from "@/lib/competitors";
import type { Competitor } from "@/lib/competitors";
import { fmtCount, fmtPercent } from "@/lib/feedData";
import { cn } from "@/lib/utils";

/** "Your competitors": add a creator you compete with by handle or link, then pick them for the comparison like a similar creator. */
export default function CompetitorPanel({ competitors, notices, selected, full, onToggle, onChanged, onDismissNotice }: {
  competitors: Competitor[]; notices: string[]; selected: string[]; full: boolean;
  onToggle: (key: string) => void; onChanged: (removedKey?: string) => void; onDismissNotice: (notice: string) => void;
}) {
  const [handle, setHandle] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const lookingUp = competitors.some(isPending);

  const submit = async (value: string) => {
    if (!value.trim() || busy) return;
    setBusy(true); setError(null);
    try { await addCompetitor(value.trim()); setHandle(""); onChanged(); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Could not add this creator."); }
    finally { setBusy(false); }
  };
  const remove = async (c: Competitor) => {
    try { await removeCompetitor(c.id); onChanged(competitorKey(c.id)); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Could not remove this creator."); }
  };

  return (
    <section aria-label="Your competitors" className="flex flex-col gap-3 rounded-2xl border border-border bg-card/60 p-4" data-testid="competitor-panel">
      <div>
        <h3 className="text-sm font-bold text-white">Your competitors</h3>
        <p className="text-xs text-muted-foreground">Add a creator you compete with, by Instagram handle or link. MAVLIT reads their latest posts, so it can take a minute the first time.</p>
      </div>
      <form className="flex flex-wrap gap-2" onSubmit={(event) => { event.preventDefault(); void submit(handle); }}>
        <input value={handle} onChange={(event) => setHandle(event.target.value)} placeholder="@handle or instagram.com/handle" aria-label="Competitor's Instagram handle or link" maxLength={200}
          disabled={busy || lookingUp} className="min-w-0 flex-1 rounded-lg border border-input bg-transparent px-3 py-2 text-sm text-white placeholder:text-muted-foreground disabled:opacity-50" />
        <button type="submit" disabled={busy || lookingUp || !handle.trim()} className="inline-flex items-center gap-2 rounded-lg bg-primary px-3.5 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-40">
          {busy ? <Loader2 size={14} className="animate-spin" aria-hidden="true" /> : <Plus size={14} aria-hidden="true" />}Add competitor
        </button>
      </form>
      {error && <p role="alert" className="text-xs text-red-400">{error}</p>}
      {notices.map((notice) => (
        <p key={notice} role="status" data-testid="competitor-notice" className="flex items-center justify-between gap-3 rounded-lg bg-amber-500/10 px-3 py-2 text-xs text-amber-300">
          {notice}<button type="button" onClick={() => onDismissNotice(notice)} className="font-semibold underline">Dismiss</button>
        </p>
      ))}
      {competitors.length > 0 && (
        <ul className="flex flex-col gap-2" aria-label="Competitors">
          {competitors.map((c) => {
            const key = competitorKey(c.id); const on = selected.includes(key); const blocked = !on && full;
            return (
              <li key={c.id} data-testid={`competitor-${c.handle}`} className="flex flex-wrap items-center gap-3 rounded-xl border border-border bg-background/40 p-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold text-white">@{c.handle}{c.full_name ? <span className="ml-2 font-normal text-muted-foreground">{c.full_name}</span> : null}</p>
                  {isPending(c) && <p className="flex items-center gap-1.5 text-xs text-primary" data-testid="competitor-stage"><Loader2 size={12} className="animate-spin" aria-hidden="true" />{c.stage ?? "Working on it"}…</p>}
                  {c.status === "failed" && <p role="alert" className="text-xs text-red-400">{c.error ?? "Could not read this creator."}</p>}
                  {c.status === "ready" && (
                    <p className="text-xs text-muted-foreground" data-testid="competitor-numbers">
                      {c.followers === null ? "— followers" : `${fmtCount(c.followers)} followers`} · {c.engagement_rate === null ? "— engagement" : `${fmtPercent(c.engagement_rate)} engagement`} · {c.partnership_count} partnership{c.partnership_count === 1 ? "" : "s"}
                    </p>
                  )}
                  {c.status === "ready" && c.partnership_brands.length > 0 && (
                    <p className="truncate text-[11px] text-muted-foreground" data-testid="competitor-brands">Works with {c.partnership_brands.slice(0, 4).map((b) => b.name ?? `@${b.handle}`).join(", ")}</p>
                  )}
                </div>
                {c.status === "ready" && (
                  <button type="button" aria-pressed={on} disabled={blocked} onClick={() => onToggle(key)} aria-label={`${on ? "Remove" : "Add"} @${c.handle} ${on ? "from" : "to"} comparison`}
                    className={cn("inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold disabled:opacity-40", on ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-400" : "border-border text-muted-foreground hover:text-white")}>
                    {on ? <Check size={13} aria-hidden="true" /> : <Plus size={13} aria-hidden="true" />}{on ? "In comparison" : blocked ? "Limit reached" : "Add to compare"}
                  </button>
                )}
                {c.status === "failed" && <button type="button" disabled={busy || lookingUp} onClick={() => void submit(c.handle)} className="rounded-lg border border-border px-3 py-1.5 text-xs font-semibold text-white hover:bg-white/5 disabled:opacity-40">Try again</button>}
                <button type="button" onClick={() => void remove(c)} aria-label={`Remove @${c.handle} from my competitors`} className="rounded-md p-1.5 text-muted-foreground hover:bg-secondary hover:text-white"><Trash2 size={14} aria-hidden="true" /></button>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
