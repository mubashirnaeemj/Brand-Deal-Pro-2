import { ChevronDown } from "lucide-react";
import { matchNiches } from "@/lib/matchSearch";

/** "All niches" plus the niches of the creator's matched brands; choosing one shows only those brands. */
export default function BrandMatchNicheFilter({ id, matches, value, onChange }: {
  id: string; matches: { niche: string | null }[]; value: string; onChange: (niche: string) => void;
}) {
  const niches = matchNiches(matches);
  if (niches.length === 0) return null;
  return (
    <div className="relative w-full sm:w-64">
      <label htmlFor={id} className="sr-only">Filter brand matches by niche</label>
      <select id={id} data-testid="select-match-niche" value={value} onChange={(event) => onChange(event.target.value)}
        className="w-full cursor-pointer appearance-none rounded-xl border border-border bg-card py-3 pl-4 pr-10 text-sm text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">
        <option value="">All niches</option>
        {niches.map(({ niche, count }) => <option key={niche} value={niche}>{niche} ({count})</option>)}
      </select>
      <ChevronDown size={16} aria-hidden="true" className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
    </div>
  );
}
