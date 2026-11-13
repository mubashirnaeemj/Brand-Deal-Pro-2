import { Link } from "wouter";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { FeedBrand, FeedCreator } from "@/data/feed";
import { brandIntel, fmtCount, fmtPercent } from "@/lib/feedData";
import { BrandMark, Chip, CreatorAvatar } from "./FeedVisuals";

export default function BrandDialog({ brand, onClose, onViewCreator }: {
  brand: FeedBrand | null; onClose: () => void; onViewCreator: (creator: FeedCreator) => void;
}) {
  const intel = brand ? brandIntel(brand) : null;
  return (
    <Dialog open={!!brand} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto border-border bg-card p-0 sm:rounded-2xl">
        {brand && intel && (
          <div className="flex flex-col gap-6 p-6">
            <DialogHeader className="text-left">
              <div className="flex items-center gap-4">
                <BrandMark brand={brand} size={56} />
                <div>
                  <DialogTitle className="text-xl font-extrabold text-white">{brand.name}</DialogTitle>
                  <DialogDescription className="text-sm text-muted-foreground">{brand.industry} · {brand.website} · {brand.blurb}</DialogDescription>
                </div>
              </div>
            </DialogHeader>
            <section aria-label="Creators This Brand Works With" className="flex flex-col gap-3">
              <h3 className="text-sm font-bold text-white">Creators This Brand Works With</h3>
              <ul className="flex flex-col gap-2">
                {intel.creators.map((c) => (
                  <li key={c.id}>
                    <button type="button" onClick={() => onViewCreator(c)}
                      className="flex w-full items-center gap-3 rounded-xl border border-border bg-background/40 p-3 text-left transition-colors hover:border-primary/40">
                      <CreatorAvatar creator={c} size={40} />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-bold text-white">@{c.handle}</span>
                        <span className="block truncate text-xs text-muted-foreground">{c.categories.join(" · ")}</span>
                      </span>
                      <span className="text-right text-xs text-muted-foreground">
                        <span className="block font-semibold text-white">{fmtCount(c.followers)} followers</span>{fmtPercent(c.engagementRate)} engagement
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </section>
            <section aria-label="Why This Brand Could Be a Good Fit" className="flex flex-col gap-3 rounded-xl border border-primary/25 bg-primary/5 p-4">
              <div className="flex items-center justify-between gap-3">
                <h3 className="text-sm font-bold text-white">Why This Brand Could Be a Good Fit</h3>
                <Chip tone="primary">{intel.fit}% fit</Chip>
              </div>
              <ul className="flex list-disc flex-col gap-1.5 pl-5 text-sm text-muted-foreground marker:text-primary">
                {intel.insights.map((line) => <li key={line}>{line}</li>)}
              </ul>
              <Link href={`/pitch?brand=${encodeURIComponent(brand.name)}`}
                className="mt-1 inline-flex self-start rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90">
                Create pitch email →
              </Link>
            </section>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
