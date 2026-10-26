import { Bookmark } from "lucide-react";
import useSavedBrands from "@/hooks/useSavedBrands";

/** Save / Saved toggle for a matched brand (the creator's shortlist, shown on the dashboard). */
export default function SaveBrandButton({ brandId, name, niche }: { brandId: number; name: string; niche?: string | null }) {
  const { isSaved, toggle } = useSavedBrands();
  const saved = isSaved(brandId);
  return (
    <button type="button" onClick={() => void toggle({ id: brandId, name, niche })} aria-pressed={saved}
      aria-label={`${saved ? "Remove" : "Save"} ${name}${saved ? " from saved brands" : ""}`}
      data-testid={`button-save-brand-${brandId}`}
      className={`inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
        saved ? "border-primary/50 bg-primary/15 text-primary" : "border-border text-muted-foreground hover:border-primary/50 hover:text-white"}`}>
      <Bookmark size={12} className={saved ? "fill-current" : ""} aria-hidden />
      {saved ? "Saved" : "Save"}
    </button>
  );
}
