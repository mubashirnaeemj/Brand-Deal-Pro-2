import type { AiRankedMatch } from "@/lib/aiMatches";
import BrandMatchReasons, { CARD_REASON_LIMIT } from "./BrandMatchReasons";

export default function AiMatchCard({ match, expanded, onToggle, onOpen }: {
  match: AiRankedMatch;
  expanded: boolean;
  onToggle: () => void;
  onOpen: () => void;
}) {
  const reasons = match.reasons ?? [];
  return (
    <article data-testid={`card-ai-brand-${match.brand_raw_id}`}
      className="flex flex-col rounded-2xl border border-border bg-card p-6">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-baseline gap-2">
          <span className="text-xs font-semibold text-muted-foreground">#{match.rank}</span>
          <button type="button" onClick={onOpen}
            data-testid={`button-ai-brand-${match.brand_raw_id}`}
            className="min-w-0 truncate text-left text-sm font-bold text-white hover:text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded">
            {match.brand_name}
          </button>
        </div>
        <span className="shrink-0 cursor-default rounded-md bg-primary/15 px-2 py-0.5 text-xs font-bold text-primary">
          {match.confidence}% fit
        </span>
      </div>
      {match.reason && (
        <p className="mt-3 mb-1.5 text-[0.85rem] leading-relaxed text-muted-foreground">{match.reason}</p>
      )}
      {reasons.length > 0 && (
        <div className="mt-3 flex flex-col gap-3">
          <BrandMatchReasons reasons={expanded ? reasons : reasons.slice(0, CARD_REASON_LIMIT)} />
          {reasons.length > CARD_REASON_LIMIT && (
            <button type="button" data-testid={`button-ai-reasons-${match.brand_raw_id}`}
              aria-expanded={expanded} onClick={onToggle}
              className="self-start rounded-md text-sm font-semibold text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-card">
              {expanded ? "Show less" : `Show all ${reasons.length} reasons`}
            </button>
          )}
        </div>
      )}
    </article>
  );
}
