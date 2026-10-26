import { useEffect, useRef, useState } from "react";
import { RefreshCw, Loader2 } from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";
import type { AiMatchesResponse, AiRankedMatch, AiMatchesVersion } from "@/lib/aiMatches";
import AiMatchCard from "./AiMatchCard";
import BrandMatchNicheChips from "./BrandMatchNicheChips";
import MatchPagination, { MATCHES_PER_PAGE } from "./MatchPagination";
import { filterBrandMatches, filterByNiche } from "@/lib/matchSearch";
import { Link } from "wouter";

interface Props {
  version: AiMatchesVersion;
  data?: AiMatchesResponse;
  loading: boolean;
  error: string | null;
  refreshing: boolean;
  onRefresh: () => void;
  onCheckStatus: () => void;
  onOpen: (match: AiRankedMatch) => void;
  progressMessage: string;
  expandedByBrand: Record<number, boolean>;
  onToggleReasons: (brandId: number) => void;
  search: string;
  niches?: string[];
  onNichesChange?: (niches: string[]) => void;
  /** When set, only the matches with these brand ids are shown (the "Saved" tab). */
  savedIds?: ReadonlySet<number> | null;
  timedOut?: boolean;
  preferences?: string | null;
}

function AiRankingStatus({ message, hasPreviousMatches }: { message: string; hasPreviousMatches: boolean }) {
  const reducedMotion = useReducedMotion();
  return (
    <div role="status" aria-live="polite" aria-atomic="true" data-testid="status-ai-pending" className="mb-5">
      <div className="flex items-center gap-2 text-sm text-[#e2e8f0]">
        <Loader2 size={14} aria-hidden="true" className="animate-spin shrink-0" />
        <motion.span key={message} initial={{ opacity: reducedMotion ? 1 : 0 }} animate={{ opacity: 1 }}
          transition={{ duration: reducedMotion ? 0 : 0.35 }}>
          {message}
        </motion.span>
      </div>
      <p className="mt-1 ml-[22px] text-xs text-[#64748b]">
        {hasPreviousMatches
          ? "This can take a minute or two — your previous ranking is shown below until it finishes."
          : "This can take a minute or two."}
      </p>
    </div>
  );
}

/**
 * While a v3 ranking runs: the progress line in the middle of the screen. Over the previous brands (blurred behind it)
 * when there are some, else on its own. After three minutes of waiting it says so and offers "Check status".
 */
function RankingOverlay({ message, timedOut, pending, onCheckStatus, floating }: {
  message: string; timedOut: boolean; pending: boolean; onCheckStatus: () => void; floating: boolean;
}) {
  const reducedMotion = useReducedMotion();
  const card = (
    <div role="status" aria-live="polite" data-testid="status-v3-updating"
      className="mx-auto flex max-w-md flex-col items-center gap-3 rounded-2xl border border-primary/30 bg-background/80 px-8 py-8 text-center shadow-2xl backdrop-blur-sm">
      {!timedOut && <Loader2 size={28} aria-hidden="true" className="animate-spin text-primary" />}
      <p className="text-sm font-semibold text-white/80">{timedOut ? "Still working — check back shortly" : "Updating your matches…"}</p>
      {timedOut ? (
        <p className="text-sm text-muted-foreground">Automatic checks have paused. Your ranking continues in the background.</p>
      ) : (
        <motion.p key={message} data-testid="text-ranking-message" initial={{ opacity: reducedMotion ? 1 : 0 }} animate={{ opacity: 1 }}
          transition={{ duration: reducedMotion ? 0 : 0.35 }} className="text-lg font-bold leading-snug text-white">
          {message}
        </motion.p>
      )}
      {!timedOut && <p className="text-xs text-muted-foreground">This can take a minute or two.</p>}
      {timedOut && pending && (
        <button type="button" data-testid="button-ai-check-status" onClick={onCheckStatus}
          className="rounded-lg border border-primary/50 px-3 py-2 text-sm font-semibold text-white hover:bg-primary/10">
          Check status
        </button>
      )}
    </div>
  );
  return floating
    ? <div className="absolute inset-0 z-10 flex items-start justify-center px-4"><div className="sticky top-[30vh] mt-16 w-full">{card}</div></div>
    : <div className="py-24">{card}</div>;
}

function formatRanked(value: string | null | undefined) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
}

export default function AiMatchesSection({ version, data, loading, error, refreshing, onRefresh, onCheckStatus, onOpen,
  progressMessage, expandedByBrand, onToggleReasons, search, niches = [], onNichesChange, savedIds = null, timedOut = false, preferences }: Props) {
  const status = data?.status;
  const pending = status === "queued" || status === "running";
  const allMatches = data?.matches ?? [];
  const matches = savedIds ? allMatches.filter((match) => savedIds.has(match.brand_raw_id)) : allMatches;
  const filtered = filterBrandMatches(filterByNiche(matches, niches), search);

  // 30 brands per page, in rank order. A new search, niche choice or tab starts again at page 1.
  const [page, setPage] = useState(1);
  const gridTop = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const filterKey = JSON.stringify([search.trim(), niches, !!savedIds]);
  useEffect(() => { setPage(1); }, [filterKey]);
  const pageCount = Math.max(1, Math.ceil(filtered.length / MATCHES_PER_PAGE));
  const currentPage = Math.min(page, pageCount);   // e.g. the last card of the last page was unsaved
  const visible = filtered.slice((currentPage - 1) * MATCHES_PER_PAGE, currentPage * MATCHES_PER_PAGE);
  const goToPage = (next: number) => {
    setPage(next);
    gridTop.current?.scrollIntoView?.({ behavior: "smooth", block: "start" });
  };
  const busy = refreshing || pending;
  const ranking = version === "v3" && busy;
  // The previous brands stay on screen, blurred and out of reach, until the new ranking is ready.
  useEffect(() => { if (listRef.current) listRef.current.inert = ranking; });
  const ranked = formatRanked(data?.ranked_at);
  const meta = ranked ? `Ranked ${ranked} · ${data?.total ?? matches.length} brands` : "";

  return (
    <section data-testid={`section-matches-${version}`}>
      {version !== "v3" && (
        <p className="mb-4 text-xs text-muted-foreground">
          V2 — AI ranking: an LLM compares your profile (niche, tags, description) with each brand's description and tags.
        </p>
      )}
      {onNichesChange && <BrandMatchNicheChips matches={matches} value={niches} onChange={onNichesChange} />}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <span className="text-sm text-muted-foreground" data-testid="text-ai-meta">{meta}</span>
        <button type="button" data-testid="button-ai-rerank" onClick={onRefresh} disabled={busy || loading}
          className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-2.5 text-sm font-semibold text-white transition hover:border-primary/50 hover:bg-primary/10 disabled:cursor-not-allowed disabled:opacity-50">
          <RefreshCw size={15} className={busy ? "animate-spin" : ""} />
          {busy ? "Ranking…" : version === "v3" ? "Refresh matches" : "Re-rank with AI"}
        </button>
      </div>
      {version === "v3" && preferences?.trim() && (
        <aside data-testid="card-brand-preferences" className="mb-5 rounded-2xl border border-border bg-card p-5">
          <div className="mb-2 flex items-center justify-between gap-3">
            <h2 className="text-sm font-bold text-white">Your brand preferences</h2>
            <Link href="/creator-profile" className="text-sm font-semibold text-primary hover:underline">Edit</Link>
          </div>
          <p className="whitespace-pre-wrap break-words text-sm leading-relaxed text-muted-foreground">{preferences}</p>
        </aside>
      )}

      {error && <p role="alert" className="mb-4 text-sm" style={{ color: "#f87171" }}>{error}</p>}

      {loading && !data ? (
        <p role="status" className="py-16 text-center text-muted-foreground">Loading AI matches…</p>
      ) : (
        <>
          {busy && version !== "v3" && <AiRankingStatus message={progressMessage} hasPreviousMatches={matches.length > 0} />}
          {status === "failed" && (
            <p role="alert" data-testid="text-ai-failed" className="mb-5 text-sm" style={{ color: "#f87171" }}>
              AI ranking failed: {data?.error ?? "Unknown error"}.
              {version === "v3" ? (
                <button type="button" onClick={onRefresh} disabled={busy} className="ml-2 font-semibold underline">Try again</button>
              ) : ' Try "Re-rank with AI".'}
            </p>
          )}
          {savedIds && matches.length === 0 && (
            <p data-testid="text-no-saved-matches" className="py-16 text-center text-muted-foreground">
              None of your matched brands is saved yet. Use <span className="font-semibold text-white">Save</span> on a match to keep it here.
            </p>
          )}
          {!savedIds && version === "v3" && !busy && status !== "failed" && data?.total === 0 && matches.length === 0 && (
            <p className="py-16 text-center text-muted-foreground">No matches yet — complete your profile and save to generate them.</p>
          )}
          {version !== "v3" && status === "idle" && matches.length === 0 && (
            <p className="py-16 text-center text-muted-foreground">
              No AI ranking yet. It runs automatically when you save your creator profile, or click "Re-rank with AI".
            </p>
          )}
          {version !== "v3" && status === "completed" && matches.length === 0 && (
            <p className="py-16 text-center text-muted-foreground">The AI ranking found no brands for your profile.</p>
          )}
          {ranking && matches.length === 0 && (
            <RankingOverlay message={progressMessage} timedOut={timedOut} pending={pending} onCheckStatus={onCheckStatus} floating={false} />
          )}
          {matches.length > 0 && (
            <div className="relative min-h-[22rem]">
            <div ref={listRef} data-testid="matches-list" aria-hidden={ranking || undefined}
              className={ranking ? "pointer-events-none select-none opacity-60 blur-xl" : ""}>
              {(search.trim() || niches.length > 0) && (
                <p role="status" className="mb-4 text-xs text-muted-foreground">
                  Showing {filtered.length} of {matches.length} brands{niches.length ? ` in ${niches.join(", ")}` : ""}
                </p>
              )}
              {filtered.length > 0 ? (
                <>
                <div ref={gridTop} aria-busy={ranking} data-testid="grid-matches"
                  className="scroll-mt-28 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
                  {visible.map((match) => (
                    <AiMatchCard key={match.brand_raw_id} match={match} version={version}
                      expanded={expandedByBrand[match.brand_raw_id] ?? false}
                      onToggle={() => onToggleReasons(match.brand_raw_id)}
                      onOpen={() => onOpen(match)} />
                  ))}
                </div>
                <MatchPagination page={currentPage} pageCount={pageCount} total={filtered.length} onChange={goToPage} />
                </>
              ) : (
                <div className="py-16 text-center text-muted-foreground">
                  <p>{search.trim() ? `No brands match “${search.trim()}”${niches.length ? ` in ${niches.join(", ")}` : ""}.` : `No matches in ${niches.join(", ")}.`}</p>
                  <p className="mt-1 text-sm">{search.trim() ? "Try a different search, other niches or clear the search." : "Try other niches."}</p>
                </div>
              )}
            </div>
            {ranking && <RankingOverlay message={progressMessage} timedOut={timedOut} pending={pending} onCheckStatus={onCheckStatus} floating />}
            </div>
          )}
        </>
      )}
    </section>
  );
}
