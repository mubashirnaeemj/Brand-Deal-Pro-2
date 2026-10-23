import { useState } from "react";
import { matchNiches } from "@/lib/matchSearch";
import { nicheTextClass } from "@/lib/nicheColors";

const FIRST_SHOWN = 4;

/**
 * The matched brands' niches as toggle chips: the four with the most brands, then "View more" for all of them.
 * Any number can be chosen; none chosen means every niche.
 */
export default function BrandMatchNicheChips({ matches, value, onChange }: {
  matches: { niche: string | null }[]; value: string[]; onChange: (niches: string[]) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const niches = matchNiches(matches).sort((a, b) => b.count - a.count || a.niche.localeCompare(b.niche));
  if (niches.length === 0) return null;
  const top = niches.slice(0, FIRST_SHOWN);
  // A chosen niche stays visible even when it is not one of the biggest four.
  const visible = expanded ? niches : [...top, ...niches.slice(FIRST_SHOWN).filter(({ niche }) => value.includes(niche))];
  const toggle = (niche: string) => onChange(value.includes(niche) ? value.filter((item) => item !== niche) : [...value, niche]);
  return (
    <div className="mb-5" data-testid="match-niches">
      <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Filter brand matches by niche">
        {visible.map(({ niche, count }) => {
          const selected = value.includes(niche);
          return (
            <button key={niche} type="button" aria-pressed={selected} onClick={() => toggle(niche)} data-testid="chip-niche"
              className={`inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${selected ? "border-primary bg-primary/15" : "border-border bg-card hover:border-primary/50"}`}>
              <span className={nicheTextClass(niche)}>{niche}</span>
              <span className="text-xs font-normal text-muted-foreground">{count}</span>
            </button>
          );
        })}
        {niches.length > FIRST_SHOWN && (
          <button type="button" onClick={() => setExpanded(!expanded)} aria-expanded={expanded} data-testid="button-niches-more"
            className="rounded-full px-3 py-1.5 text-sm font-semibold text-primary hover:underline">
            {expanded ? "View less" : "View more"}
          </button>
        )}
        {value.length > 0 && (
          <button type="button" onClick={() => onChange([])} data-testid="button-clear-niches"
            className="rounded-full px-3 py-1.5 text-sm font-semibold text-muted-foreground hover:text-white hover:underline">
            Clear
          </button>
        )}
      </div>
    </div>
  );
}
