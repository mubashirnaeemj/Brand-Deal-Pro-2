import { Bookmark } from "lucide-react";
import useSavedBrands from "@/hooks/useSavedBrands";

/** Save toggle (a bookmark icon only; filled when saved) for a matched brand (the creator's shortlist, shown on the dashboard). */
export default function SaveBrandButton({ brandId, name, niche }: { brandId: number; name: string; niche?: string | null }) {
  const { isSaved, toggle } = useSavedBrands();
  const saved = isSaved(brandId);
  return (
    <button type="button" onClick={() => void toggle({ id: brandId, name, niche })} aria-pressed={saved}
      aria-label={`${saved ? "Remove" : "Save"} ${name}${saved ? " from saved brands" : ""}`}
      data-testid={`button-save-brand-${brandId}`}
      title={saved ? "Saved" : "Save"}
      className={`inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
        saved ? "border-primary/50 bg-primary/15 text-primary" : "border-border text-muted-foreground hover:border-primary/50 hover:text-white"}`}>
      <Bookmark size={15} className={saved ? "fill-current" : ""} aria-hidden />
    </button>
  );
}
