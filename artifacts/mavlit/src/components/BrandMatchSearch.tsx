import { Search, X } from "lucide-react";

export default function BrandMatchSearch({ id, label, value, onChange }: {
  id: string; label: string; value: string; onChange: (value: string) => void;
}) {
  return (
    <div className="relative mb-6 max-w-lg">
      <label htmlFor={id} className="sr-only">{label}</label>
      <Search size={17} aria-hidden="true" className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
      <input id={id} type="search" data-testid="input-match-search" value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder="Search by brand name, niche or website…"
        className="w-full rounded-xl border border-border bg-card py-3 pl-10 pr-10 text-sm text-white placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary [&::-webkit-search-cancel-button]:hidden" />
      {value && (
        <button type="button" aria-label="Clear brand search" data-testid="button-clear-match-search"
          onClick={() => onChange("")}
          className="absolute right-3 top-1/2 -translate-y-1/2 rounded p-1 text-muted-foreground hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">
          <X size={16} aria-hidden="true" />
        </button>
      )}
    </div>
  );
}
