import { ChevronLeft, ChevronRight } from "lucide-react";

export const MATCHES_PER_PAGE = 30;

// The page numbers to show: first, last, the current page and its neighbours, with "…" for the gaps.
function pageItems(page: number, pageCount: number): (number | "gap")[] {
  const wanted = new Set([1, pageCount, page - 1, page, page + 1]);
  const pages = [...wanted].filter((n) => n >= 1 && n <= pageCount).sort((a, b) => a - b);
  const items: (number | "gap")[] = [];
  pages.forEach((n, i) => {
    if (i > 0 && n - pages[i - 1] > 1) items.push("gap");
    items.push(n);
  });
  return items;
}

/** Previous / page numbers / Next under the match cards, with "Showing 31–60 of 87 brands". Nothing for a single page. */
export default function MatchPagination({ page, pageCount, total, pageSize = MATCHES_PER_PAGE, onChange }: {
  page: number; pageCount: number; total: number; pageSize?: number; onChange: (page: number) => void;
}) {
  if (pageCount <= 1) return null;
  const first = (page - 1) * pageSize + 1;
  const last = Math.min(page * pageSize, total);
  const button = "inline-flex h-9 min-w-9 items-center justify-center rounded-lg border px-3 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:cursor-not-allowed disabled:opacity-40";
  return (
    <nav aria-label="Match pages" data-testid="match-pagination" className="mt-8 flex flex-col items-center gap-3">
      <p role="status" data-testid="text-match-range" className="text-xs text-muted-foreground">
        Showing {first}–{last} of {total} brands
      </p>
      <div className="flex flex-wrap items-center justify-center gap-1.5">
        <button type="button" onClick={() => onChange(page - 1)} disabled={page <= 1} data-testid="button-page-prev" aria-label="Previous page"
          className={`${button} border-border text-white hover:border-primary/50 hover:bg-primary/10`}>
          <ChevronLeft size={15} aria-hidden="true" />
        </button>
        {pageItems(page, pageCount).map((item, index) => item === "gap" ? (
          <span key={`gap-${index}`} aria-hidden="true" className="px-1 text-muted-foreground">…</span>
        ) : (
          <button key={item} type="button" onClick={() => onChange(item)} data-testid={`button-page-${item}`}
            aria-label={`Page ${item}`} aria-current={item === page ? "page" : undefined}
            className={`${button} ${item === page ? "border-primary bg-primary text-white" : "border-border text-muted-foreground hover:border-primary/50 hover:text-white"}`}>
            {item}
          </button>
        ))}
        <button type="button" onClick={() => onChange(page + 1)} disabled={page >= pageCount} data-testid="button-page-next" aria-label="Next page"
          className={`${button} border-border text-white hover:border-primary/50 hover:bg-primary/10`}>
          <ChevronRight size={15} aria-hidden="true" />
        </button>
      </div>
    </nav>
  );
}
