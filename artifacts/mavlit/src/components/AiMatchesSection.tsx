import { RefreshCw, Loader2 } from "lucide-react";
import { useState } from "react";
import type { AiMatchesResponse, AiRankedMatch } from "@/lib/aiMatches";
import AiMatchCard from "./AiMatchCard";

interface Props {
  data?: AiMatchesResponse;
  loading: boolean;
  error: string | null;
  refreshing: boolean;
  onRefresh: () => void;
  onOpen: (match: AiRankedMatch) => void;
}

function formatRanked(value: string | null | undefined) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString();
}

export default function AiMatchesSection({ data, loading, error, refreshing, onRefresh, onOpen }: Props) {
  const [expandedByBrand, setExpandedByBrand] = useState<Record<number, boolean>>({});
  const status = data?.status;
  const pending = status === "queued" || status === "running";
  const matches = data?.matches ?? [];
  const busy = refreshing || pending;
  const ranked = formatRanked(data?.ranked_at);
  const meta = ranked ? `Ranked ${ranked} — ${data?.total ?? matches.length} brands` : "";

  return (
    <section data-testid="section-matches-v2">
      <p className="mb-4 text-xs text-muted-foreground">
        V2 — AI ranking: an LLM compares your profile (niche, tags, description) with each brand's description and tags.
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
          {pending && (
            <p role="status" data-testid="status-ai-pending" className="mb-5 flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 size={14} className="animate-spin shrink-0" />
              <span>
                AI is ranking your brands — this can take a minute or two.
                {matches.length > 0 ? " Showing your previous ranking until it finishes." : ""}
              </span>
            </p>
          )}
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
                  onToggle={() => setExpandedByBrand((previous) => ({
                    ...previous, [match.brand_raw_id]: !previous[match.brand_raw_id],
                  }))}
                  onOpen={() => onOpen(match)} />
              ))}
            </div>
          )}
        </>
      )}
    </section>
  );
}
