import { matchNiches } from "@/lib/matchSearch";

/** Every niche of the matched brands as a toggle chip, most brands first. Any number can be chosen; none means all. */
export default function BrandMatchNicheChips({ matches, value, onChange }: {
  matches: { niche: string | null }[]; value: string[]; onChange: (niches: string[]) => void;
}) {
  const niches = matchNiches(matches).sort((a, b) => b.count - a.count || a.niche.localeCompare(b.niche));
  if (niches.length === 0) return null;
  const toggle = (niche: string) => onChange(value.includes(niche) ? value.filter((item) => item !== niche) : [...value, niche]);
  return (
    <div className="mb-5" data-testid="match-niches">
      <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Filter brand matches by niche">
        {niches.map(({ niche, count }) => {
          const selected = value.includes(niche);
          return (
            <button key={niche} type="button" aria-pressed={selected} onClick={() => toggle(niche)} data-testid="chip-niche"
              className={`inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-sm font-semibold text-white transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${selected ? "border-primary bg-primary/15" : "border-border bg-card hover:border-primary/50"}`}>
              <span>{niche}</span>
              <span className="text-xs font-normal text-muted-foreground">{count}</span>
            </button>
          );
        })}
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
