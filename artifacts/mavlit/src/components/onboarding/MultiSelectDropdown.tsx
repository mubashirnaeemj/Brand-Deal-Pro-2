import { useMemo, useState } from "react";
import { Check, ChevronDown, Search, X } from "lucide-react";

export default function MultiSelectDropdown({
  label,
  options,
  selected,
  onChange,
  placeholder,
  searchable = false,
  error,
  closeOnSelect = false,
}: {
  label: string;
  options: string[];
  selected: string[];
  onChange: (values: string[]) => void;
  placeholder: string;
  searchable?: boolean;
  error?: string;
  closeOnSelect?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const filtered = useMemo(
    () => options.filter((option) => option.toLowerCase().includes(query.toLowerCase())),
    [options, query],
  );

  const toggle = (option: string) => {
    onChange(selected.includes(option) ? selected.filter((item) => item !== option) : [...selected, option]);
    if (closeOnSelect) setOpen(false);
  };

  return (
    <div className="relative" onKeyDown={(event) => {
      if (event.key === "Escape") setOpen(false);
    }}>
      <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">{label}</label>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className={`flex min-h-12 w-full items-center justify-between gap-3 rounded-xl border bg-secondary/80 px-4 py-2.5 text-left text-sm transition ${
          error ? "border-red-500/60" : open ? "border-primary/70 ring-2 ring-primary/15" : "border-border"
        }`}
        aria-expanded={open}
      >
        <span className={selected.length ? "text-white" : "text-muted-foreground/60"}>
          {selected.length ? `${selected.length} selected` : placeholder}
        </span>
        <ChevronDown size={15} className={`shrink-0 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {selected.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {selected.map((item) => (
            <span key={item} className="inline-flex items-center gap-1 rounded-full border border-primary/25 bg-primary/10 px-2.5 py-1 text-xs text-primary">
              {item}
              <button type="button" onClick={() => toggle(item)} aria-label={`Remove ${item}`}>
                <X size={11} />
              </button>
            </span>
          ))}
        </div>
      )}

      {open && (
        <>
          <button type="button" className="fixed inset-0 z-30 cursor-default" onClick={() => setOpen(false)} aria-label="Close options" />
          <div className="absolute z-40 mt-2 w-full overflow-hidden rounded-xl border border-border bg-card p-2 shadow-2xl">
            {searchable && (
              <div className="relative mb-2">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  autoFocus
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Search options"
                  className="w-full rounded-lg border border-border bg-secondary py-2 pl-9 pr-3 text-sm text-white outline-none focus:border-primary/60"
                />
              </div>
            )}
            <div className="max-h-56 overflow-y-auto">
              {filtered.map((option) => {
                const active = selected.includes(option);
                return (
                  <button
                    key={option}
                    type="button"
                    onClick={() => toggle(option)}
                    className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm text-slate-300 hover:bg-secondary hover:text-white"
                  >
                    {option}
                    <span className={`flex h-5 w-5 items-center justify-center rounded border ${active ? "border-primary bg-primary text-white" : "border-border"}`}>
                      {active && <Check size={12} />}
                    </span>
                  </button>
                );
              })}
              {!filtered.length && <p className="px-3 py-6 text-center text-sm text-muted-foreground">No matching options</p>}
            </div>
            <button type="button" onClick={() => setOpen(false)}
              className="mt-2 w-full rounded-lg border border-border px-3 py-2 text-xs font-semibold text-white hover:bg-secondary">
              Done
            </button>
          </div>
        </>
      )}
      {error && <p className="mt-1.5 text-xs text-red-400">{error}</p>}
    </div>
  );
}