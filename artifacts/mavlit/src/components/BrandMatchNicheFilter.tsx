import { ChevronDown } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { matchNiches } from "@/lib/matchSearch";
import { nicheTextClass } from "@/lib/nicheColors";

const summary = (selected: string[]) =>
  selected.length === 0 ? "All niches" : selected.length <= 2 ? selected.join(", ") : `${selected.length} niches`;

/** A dropdown of the matched brands' niches with a checkbox each: any number can be chosen; none means "All niches". */
export default function BrandMatchNicheFilter({ id, matches, value, onChange }: {
  id: string; matches: { niche: string | null }[]; value: string[]; onChange: (niches: string[]) => void;
}) {
  const niches = matchNiches(matches);
  if (niches.length === 0) return null;
  const toggle = (niche: string) => onChange(value.includes(niche) ? value.filter((item) => item !== niche) : [...value, niche]);
  return (
    <div className="w-full sm:w-64">
      <Popover>
        <PopoverTrigger asChild>
          <button type="button" id={id} data-testid="button-match-niche" aria-label={`Filter brand matches by niche: ${summary(value)}`}
            className="flex w-full items-center justify-between gap-2 rounded-xl border border-border bg-card py-3 pl-4 pr-3.5 text-sm text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">
            <span className="truncate">{summary(value)}</span>
            <ChevronDown size={16} aria-hidden="true" className="shrink-0 text-muted-foreground" />
          </button>
        </PopoverTrigger>
        <PopoverContent align="start" className="w-64 border-border bg-card p-2 text-white" data-testid="popover-match-niche">
          <div className="mb-1 flex items-center justify-between px-2 py-1">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Niches</span>
            {value.length > 0 && (
              <button type="button" onClick={() => onChange([])} data-testid="button-clear-niches"
                className="text-xs font-semibold text-primary hover:underline">Clear</button>
            )}
          </div>
          <ul className="max-h-64 overflow-y-auto">
            {niches.map(({ niche, count }) => (
              <li key={niche}>
                <label className="flex cursor-pointer items-center gap-2.5 rounded-lg px-2 py-2 text-sm hover:bg-white/5">
                  <input type="checkbox" checked={value.includes(niche)} onChange={() => toggle(niche)}
                    className="h-4 w-4 shrink-0 cursor-pointer accent-[#7c3aed]" />
                  <span className={`min-w-0 flex-1 truncate font-semibold ${nicheTextClass(niche)}`}>{niche}</span>
                  <span className="shrink-0 text-xs text-muted-foreground">{count}</span>
                </label>
              </li>
            ))}
          </ul>
        </PopoverContent>
      </Popover>
    </div>
  );
}
