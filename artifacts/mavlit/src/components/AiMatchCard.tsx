import type { AiRankedMatch, AiMatchesVersion } from "@/lib/aiMatches";
import BrandMatchReasons, { CARD_REASON_LIMIT } from "./BrandMatchReasons";
import BrandLogo from "./BrandLogo";
import { Building2, Star } from "lucide-react";
import { useLocation } from "wouter";
import SaveBrandButton from "./SaveBrandButton";
import { nicheTextClass } from "@/lib/nicheColors";

// A fit above this percentage earns the "Most relevant brand" label.
export const MOST_RELEVANT_ABOVE = 80;

/** The fit percentage inside a circle that fills clockwise. */
function FitRing({ name, value, size = 60 }: { name: string; value: number; size?: number }) {
  const percent = Math.round(Math.min(100, Math.max(0, Number.isFinite(value) ? value : 0)));
  const radius = size / 2 - 5;
  const circumference = 2 * Math.PI * radius;
  return (
    <div role="progressbar" aria-label={`${name} confidence`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={percent}
      title={`${percent}% fit`} data-testid="ring-fit" className="relative flex shrink-0 cursor-default items-center justify-center"
      style={{ width: size, height: size }}>
      <svg className="absolute inset-0 -rotate-90" width={size} height={size} aria-hidden="true">
        <circle cx={size / 2} cy={size / 2} r={radius} stroke="hsl(240 5% 15%)" strokeWidth="4" fill="none" />
        <circle cx={size / 2} cy={size / 2} r={radius} stroke="hsl(262 83% 58%)" strokeWidth="4" fill="none" strokeLinecap="round"
          strokeDasharray={`${(percent / 100) * circumference} ${circumference}`} />
      </svg>
      <span className="z-10 flex flex-col items-center leading-none">
        <span className="text-xs font-bold text-white">{percent}%</span>
        <span className="mt-0.5 text-[9px] font-semibold uppercase tracking-wide text-muted-foreground">fit</span>
      </span>
    </div>
  );
}

export default function AiMatchCard({ match, expanded, onToggle, onOpen, version = "v2" }: {
  match: AiRankedMatch;
  expanded: boolean;
  onToggle: () => void;
  onOpen: () => void;
  version?: AiMatchesVersion;
}) {
  const [, navigate] = useLocation();
  const reasons = match.reasons ?? [];
  let website: string | null = null;
  if (version === "v3" && match.website?.trim()) {
    const value = match.website.trim();
    try {
      const url = new URL(/^[a-z][a-z\d+.-]*:/i.test(value) ? value : `https://${value}`);
      if (url.protocol === "https:" || url.protocol === "http:") website = url.href;
    } catch { /* Invalid websites keep the existing brand-details action. */ }
  }
  // A click anywhere on the card opens the brand details. Links and buttons inside keep their own action
  // (the brand's website, "Show all reasons", ...), and selecting text to copy it does not open anything.
  const openFromCard = (event: React.MouseEvent<HTMLElement>) => {
    if ((event.target as HTMLElement).closest("a, button")) return;
    if (window.getSelection()?.toString()) return;
    onOpen();
  };
  return (
    <article data-testid={`card-ai-brand-${match.brand_raw_id}`} onClick={openFromCard}
      className="flex cursor-pointer flex-col rounded-2xl border border-border bg-card transition-colors duration-300 hover:border-primary/50">
      <div className="flex items-center justify-between gap-3 p-6">
        <div className="flex min-w-0 flex-1 items-center gap-2.5">
          <BrandLogo name={match.brand_name} website={match.website} size={44} testId={`img-ai-logo-${match.brand_raw_id}`} />
          <div className="min-w-0 flex-1">
            <div className="flex min-w-0 items-baseline gap-2">
              <span className="shrink-0 text-xs font-semibold text-muted-foreground">#{match.rank}</span>
              {website ? (
                <a href={website} target="_blank" rel="noopener noreferrer" title={match.brand_name}
                  data-testid={`button-ai-brand-${match.brand_raw_id}`}
                  className="min-w-0 truncate rounded text-left text-sm font-bold text-white hover:text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">
                  {match.brand_name}
                </a>
              ) : <button type="button" onClick={onOpen} title={match.brand_name}
                data-testid={`button-ai-brand-${match.brand_raw_id}`}
                className="min-w-0 truncate rounded text-left text-sm font-bold text-white hover:text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">
                {match.brand_name}
              </button>}
            </div>
            {match.confidence > MOST_RELEVANT_ABOVE && (
              <span data-testid={`badge-most-relevant-${match.brand_raw_id}`}
                className="mt-1 mr-1.5 inline-flex max-w-full items-center gap-1 rounded-md bg-amber-400/15 px-2 py-0.5 text-xs font-semibold text-amber-300">
                <Star size={11} className="shrink-0 fill-current" aria-hidden />
                Most relevant brand
              </span>
            )}
            {match.niche && (
              <span data-testid={`text-ai-niche-${match.brand_raw_id}`}
                className={`mt-1 inline-flex max-w-full truncate rounded-md bg-white/5 px-2 py-0.5 text-xs font-semibold ${nicheTextClass(match.niche)}`}>
                {match.niche}
              </span>
            )}
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2.5">
          <SaveBrandButton brandId={match.brand_raw_id} name={match.brand_name} niche={match.niche} />
          <FitRing name={match.brand_name} value={match.confidence} />
        </div>
      </div>
      <div className="flex flex-1 flex-col gap-3 px-6 pb-6">
        <div className="h-px bg-border" />
        <p className="text-xs font-bold uppercase tracking-wider text-white">Why it's a match</p>
        {match.reason && (
          <p data-testid={`text-ai-reason-${match.brand_raw_id}`} className="text-sm font-bold leading-relaxed text-muted-foreground">{match.reason}</p>
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
        <button type="button" onClick={onOpen} data-testid={`button-contact-intel-${match.brand_raw_id}`}
          className="mt-auto flex w-full items-center justify-between gap-3 rounded-xl border border-border bg-[hsl(240_10%_8%)] px-4 py-3 text-left transition-colors hover:border-primary/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">
          <span className="min-w-0">
            <span className="block text-sm font-bold leading-snug text-white">Contact Intel</span>
            <span className="block text-xs leading-snug text-muted-foreground">Open match for available details</span>
          </span>
          <Building2 size={15} className="shrink-0 text-muted-foreground" aria-hidden />
        </button>
      </div>
      <div className="px-6 pb-5">
        <button type="button" data-testid={`button-pitch-${match.brand_raw_id}`}
          onClick={() => navigate(`/pitch?brand=${encodeURIComponent(match.brand_name)}`)}
          className="w-full rounded-xl border border-border py-2.5 text-sm font-semibold text-white/70 transition-all duration-200 hover:border-primary hover:bg-primary hover:text-white">
          Create pitch email →
        </button>
      </div>
    </article>
  );
}
