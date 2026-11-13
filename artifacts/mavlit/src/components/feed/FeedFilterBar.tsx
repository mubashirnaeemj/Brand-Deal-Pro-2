import { Check, ChevronDown, X } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  BRAND_CATEGORIES, CONTENT_CATEGORIES, COUNTRIES, DATE_RANGES, ENGAGEMENT_RANGES, EMPTY_FILTERS, FOLLOWER_RANGES, NICHES, PLATFORMS,
  activeFilterCount, type FeedFilters,
} from "@/lib/feedData";
import { cn } from "@/lib/utils";

type ListKey = Exclude<keyof FeedFilters, "date">;

const MULTI: { key: ListKey; label: string; options: string[] }[] = [
  { key: "niche", label: "Niche", options: NICHES },
  { key: "platform", label: "Platform", options: PLATFORMS },
  { key: "country", label: "Country", options: COUNTRIES },
  { key: "followers", label: "Followers", options: FOLLOWER_RANGES.map((r) => r.id) },
  { key: "engagement", label: "Engagement rate", options: ENGAGEMENT_RANGES.map((r) => r.id) },
  { key: "contentCategory", label: "Content category", options: CONTENT_CATEGORIES },
  { key: "brandCategory", label: "Brand category", options: BRAND_CATEGORIES },
];

function MultiSelect({ label, options, value, onChange }: { label: string; options: string[]; value: string[]; onChange: (next: string[]) => void }) {
  const toggle = (option: string) => onChange(value.includes(option) ? value.filter((v) => v !== option) : [...value, option]);
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button type="button" data-testid={`filter-${label.toLowerCase().replace(/\s+/g, "-")}`}
          className={cn("inline-flex h-9 items-center gap-2 rounded-lg border px-3 text-sm font-medium transition-colors",
            value.length ? "border-primary/50 bg-primary/10 text-white" : "border-border bg-card text-muted-foreground hover:text-white")}>
          {label}
          {value.length > 0 && <span className="rounded-full bg-primary px-1.5 text-[10px] font-bold text-primary-foreground">{value.length}</span>}
          <ChevronDown size={14} aria-hidden="true" />
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-60 p-1.5">
        <ul role="listbox" aria-label={label} aria-multiselectable="true" className="max-h-72 overflow-y-auto">
          {options.map((option) => {
            const on = value.includes(option);
            return (
              <li key={option} role="presentation">
                <button type="button" role="option" aria-selected={on} onClick={() => toggle(option)}
                  className="flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-left text-sm text-white hover:bg-secondary">
                  <span className={cn("flex h-4 w-4 items-center justify-center rounded border", on ? "border-primary bg-primary" : "border-border")}>
                    {on && <Check size={11} className="text-primary-foreground" aria-hidden="true" />}
                  </span>{option}
                </button>
              </li>
            );
          })}
        </ul>
        {value.length > 0 && (
          <button type="button" onClick={() => onChange([])} className="mt-1 w-full rounded-md px-2.5 py-1.5 text-left text-xs font-semibold text-primary hover:bg-secondary">Clear {label.toLowerCase()}</button>
        )}
      </PopoverContent>
    </Popover>
  );
}

export default function FeedFilterBar({ filters, onChange }: { filters: FeedFilters; onChange: (next: FeedFilters) => void }) {
  const active = activeFilterCount(filters);
  const chips = [
    ...MULTI.flatMap(({ key, label }) => filters[key].map((v) => ({ key, v, text: v, label }))),
    ...(filters.date ? [{ key: "date" as const, v: filters.date, text: DATE_RANGES.find((r) => r.id === filters.date)?.label ?? "", label: "Date" }] : []),
  ];
  return (
    <section aria-label="Filters" className="flex flex-col gap-3 rounded-2xl border border-border bg-card/60 p-4">
      <div className="flex flex-wrap items-center gap-2">
        {MULTI.map(({ key, label, options }) => (
          <MultiSelect key={key} label={label} options={options} value={filters[key]} onChange={(next) => onChange({ ...filters, [key]: next })} />
        ))}
        <Select value={filters.date || "any"} onValueChange={(v) => onChange({ ...filters, date: v === "any" ? "" : v })}>
          <SelectTrigger aria-label="Partnership date" data-testid="filter-partnership-date"
            className={cn("h-9 w-auto gap-2 rounded-lg bg-card text-sm", filters.date && "border-primary/50 bg-primary/10")}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="any">Partnership date: any</SelectItem>
            {DATE_RANGES.map((r) => <SelectItem key={r.id} value={r.id}>{r.label}</SelectItem>)}
          </SelectContent>
        </Select>
        {active > 0 && (
          <button type="button" onClick={() => onChange(EMPTY_FILTERS)} data-testid="filters-clear-all"
            className="ml-auto inline-flex h-9 items-center gap-1.5 rounded-lg px-3 text-sm font-semibold text-primary hover:bg-primary/10">
            <X size={14} aria-hidden="true" />Clear all ({active})
          </button>
        )}
      </div>
      {chips.length > 0 && (
        <div className="flex flex-wrap gap-1.5" aria-label="Active filters">
          {chips.map((c) => (
            <button key={`${c.key}-${c.v}`} type="button" aria-label={`Remove ${c.label} filter ${c.text}`}
              onClick={() => onChange(c.key === "date" ? { ...filters, date: "" } : { ...filters, [c.key]: (filters[c.key as ListKey]).filter((v) => v !== c.v) })}
              className="inline-flex items-center gap-1 rounded-full border border-primary/30 bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary hover:bg-primary/20">
              {c.text}<X size={11} aria-hidden="true" />
            </button>
          ))}
        </div>
      )}
    </section>
  );
}
