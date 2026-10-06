import { RefreshCw, Loader2 } from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";
import type { AiMatchesResponse, AiRankedMatch, AiMatchesVersion } from "@/lib/aiMatches";
import AiMatchCard from "./AiMatchCard";

interface Props {
  version: AiMatchesVersion;
  data?: AiMatchesResponse;
  loading: boolean;
  error: string | null;
  refreshing: boolean;
  onRefresh: () => void;
  onOpen: (match: AiRankedMatch) => void;
  progressMessage: string;
  expandedByBrand: Record<number, boolean>;
  onToggleReasons: (brandId: number) => void;
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

function formatRanked(value: string | null | undefined) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString();
}

export default function AiMatchesSection({ version, data, loading, error, refreshing, onRefresh, onOpen,
  progressMessage, expandedByBrand, onToggleReasons }: Props) {
  const status = data?.status;
  const pending = status === "queued" || status === "running";
  const matches = data?.matches ?? [];
  const busy = refreshing || pending;
  const ranked = formatRanked(data?.ranked_at);
  const meta = ranked ? `Ranked ${ranked} — ${data?.total ?? matches.length} brands` : "";

  return (
    <section data-testid={`section-matches-${version}`}>
      <p className="mb-4 text-xs text-muted-foreground">
        {version === "v3"
          ? "V3 — AI ranking that weighs how well each brand fits your profile and its match evidence (the reasons under each brand) equally."
          : "V2 — AI ranking: an LLM compares your profile (niche, tags, description) with each brand's description and tags."}
      </p>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <span className="text-sm text-muted-foreground" data-testid="text-ai-meta">{meta}</span>
        <button type="button" data-testid="button-ai-rerank" onClick={onRefresh} disabled={busy || loading}
          className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-2.5 text-sm font-semibold text-white transition hover:border-primary/50 hover:bg-primary/10 disabled:cursor-not-allowed disabled:opacity-50">
          <RefreshCw size={15} className={busy ? "animate-spin" : ""} />
          {busy ? "Ranking…" : "Re-rank with AI"}
        </button>
      </div>

      {error && <p role="alert" className="mb-4 text-sm" style={{ color: "#f87171" }}>{error}</p>}

      {loading && !data ? (
        <p role="status" className="py-16 text-center text-muted-foreground">Loading AI matches…</p>
      ) : (
        <>
          {busy && <AiRankingStatus message={progressMessage} hasPreviousMatches={matches.length > 0} />}
          {status === "failed" && (
            <p role="alert" data-testid="text-ai-failed" className="mb-5 text-sm" style={{ color: "#f87171" }}>
              AI ranking failed: {data?.error ?? "Unknown error"}. Try "Re-rank with AI".
            </p>
          )}
          {status === "idle" && matches.length === 0 && (
            <p className="py-16 text-center text-muted-foreground">
              No AI ranking yet. It runs automatically when you save your creator profile, or click "Re-rank with AI".
            </p>
          )}
          {status === "completed" && matches.length === 0 && (
            <p className="py-16 text-center text-muted-foreground">The AI ranking found no brands for your profile.</p>
          )}
          {matches.length > 0 && (
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {matches.map((match) => (
                <AiMatchCard key={match.brand_raw_id} match={match}
                  expanded={expandedByBrand[match.brand_raw_id] ?? false}
                  onToggle={() => onToggleReasons(match.brand_raw_id)}
                  onOpen={() => onOpen(match)} />
              ))}
            </div>
          )}
        </>
      )}
    </section>
  );
}
