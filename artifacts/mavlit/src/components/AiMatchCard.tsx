import type { AiRankedMatch } from "@/lib/aiMatches";
import BrandMatchReasons, { CARD_REASON_LIMIT } from "./BrandMatchReasons";
import BrandLogo from "./BrandLogo";

export default function AiMatchCard({ match, expanded, onToggle, onOpen }: {
  match: AiRankedMatch;
  expanded: boolean;
  onToggle: () => void;
  onOpen: () => void;
}) {
  const reasons = match.reasons ?? [];
  return (
    <article data-testid={`card-ai-brand-${match.brand_raw_id}`}
      className="flex flex-col rounded-2xl border border-border bg-card transition-colors duration-300 hover:border-primary/50">
      <div className="flex items-center justify-between gap-3 p-6">
        <div className="flex min-w-0 flex-1 items-center gap-2.5">
          <BrandLogo name={match.brand_name} website={match.website} testId={`img-ai-logo-${match.brand_raw_id}`} />
          <div className="min-w-0 flex-1">
            <div className="flex min-w-0 items-baseline gap-2">
              <span className="shrink-0 text-xs font-semibold text-muted-foreground">#{match.rank}</span>
              <button type="button" onClick={onOpen} title={match.brand_name}
                data-testid={`button-ai-brand-${match.brand_raw_id}`}
                className="min-w-0 truncate rounded text-left text-sm font-bold text-white hover:text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">
                {match.brand_name}
              </button>
            </div>
            {match.niche && (
              <span className="mt-1 inline-flex max-w-full truncate rounded-md bg-primary/15 px-2 py-0.5 text-xs font-semibold text-primary">
                {match.niche}
              </span>
            )}
          </div>
        </div>
        <span className="shrink-0 cursor-default rounded-md bg-primary/15 px-2 py-0.5 text-xs font-bold text-primary">
          {match.confidence}% fit
        </span>
      </div>
      <div className="flex flex-1 flex-col gap-3 px-6 pb-6">
        <div className="h-px bg-border" />
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Why it's a match</p>
        {match.reason && (
          <p data-testid={`text-ai-reason-${match.brand_raw_id}`} className="text-sm leading-relaxed text-muted-foreground">{match.reason}</p>
        )}
        {reasons.length > 0 && (
          <BrandMatchReasons reasons={expanded ? reasons : reasons.slice(0, CARD_REASON_LIMIT)} />
        )}
        {!match.reason && reasons.length === 0 && (
          <p className="text-sm text-muted-foreground">No match reasons were provided.</p>
        )}
        {reasons.length > CARD_REASON_LIMIT && (
          <button type="button" data-testid={`button-ai-reasons-${match.brand_raw_id}`}
            aria-expanded={expanded} onClick={onToggle}
            className="self-start rounded-md text-sm font-semibold text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-card">
            {expanded ? "Show less" : `Show all ${reasons.length} reasons`}
          </button>
        )}
      </div>
    </article>
  );
}
