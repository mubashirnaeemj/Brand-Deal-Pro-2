import type { ApiMatch } from "@/lib/api";

const SIGNALS = [
  { key: "niche_tier", label: "Niche priority", type: "graded" },
  { key: "recent_partnership", label: "Recent paid partnership", type: "graded" },
  { key: "niche_creators", label: "Niche + creators match", type: "graded" },
  { key: "similar_partners", label: "Similar partners", type: "graded" },
  { key: "creator_size", label: "Creator size", type: "graded" },
  { key: "brand_tier", label: "Brand tier", type: "graded" },
  { key: "same_niche", label: "Same niche", type: "boolean" },
  { key: "follower_range", label: "Follower range", type: "boolean" },
  { key: "verified_contact", label: "Verified contact", type: "boolean" },
  { key: "tag_overlap", label: "Tag overlap", type: "boolean" },
  { key: "youtube_sponsor", label: "YouTube sponsor", type: "boolean" },
  { key: "latest_product", label: "Latest product", type: "boolean" },
] as const;

export default function MatchScoreBreakdown({ dimensions }: { dimensions: ApiMatch["dimensions"] }) {
  return (
    <div role="tooltip" className="absolute bottom-[calc(100%+8px)] right-0 z-[100] w-64 rounded-xl border border-border bg-[hsl(240_10%_6%)] shadow-2xl p-3 pointer-events-none">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-2.5">Score breakdown</p>
      <div className="flex flex-col gap-2">
        {SIGNALS.map(({ key, label, type }) => {
          const detail = dimensions[key];
          if (!detail || detail.score == null || !Number.isFinite(detail.score)) return null;
          if (type === "graded" && detail.score === 0) return null;
          const yes = detail.score > 0;
          return (
            <div key={key} className="flex justify-between items-center gap-3">
              <span className="text-[11px] text-muted-foreground">{label}</span>
              {type === "graded" ? (
                <span className="text-[11px] font-bold text-white">{Math.round(detail.score * 100)}%</span>
              ) : (
                <span className="text-[11px] font-bold" role="img" aria-label={yes ? "yes" : "no"}
                  style={{ color: yes ? "#22c55e" : "#f87171" }}>{yes ? "✓" : "✗"}</span>
              )}
            </div>
          );
        })}
      </div>
      <div className="absolute bottom-[-5px] right-3 w-2.5 h-2.5 rotate-45 bg-[hsl(240_10%_6%)] border-r border-b border-border" />
    </div>
  );
}
