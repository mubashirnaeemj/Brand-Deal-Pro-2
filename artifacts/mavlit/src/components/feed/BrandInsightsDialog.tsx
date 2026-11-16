import { useQuery } from "@tanstack/react-query";
import { ExternalLink } from "lucide-react";
import { Link } from "wouter";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { fetchBrandCreators, intelColor, sampleFitLines, websiteLink } from "@/lib/brandIntelligence";
import type { BrandIntel } from "@/lib/brandIntelligence";
import { fmtCount, fmtPercent } from "@/lib/feedData";
import { avatarHue } from "@/lib/similarCreators";
import { BrandMark, Chip, CreatorAvatar } from "./FeedVisuals";

/** "View insights" for a matched brand: the real creators it works with, and a (sample) list of why it could fit. */
export default function BrandInsightsDialog({ brand, onClose }: { brand: BrandIntel | null; onClose: () => void }) {
  const { data, isPending, isError, refetch } = useQuery({
    queryKey: ["feed", "brand-creators", brand?.brand_raw_id], queryFn: () => fetchBrandCreators(brand!.brand_raw_id), enabled: !!brand, staleTime: 60_000,
  });
  const mark = brand ? { name: brand.brand_name, color: intelColor(brand.brand_name) } : null;
  const site = websiteLink(brand?.website);
  return (
    <Dialog open={!!brand} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto border-border bg-card p-0 sm:rounded-2xl">
        {brand && mark && (
          <div className="flex flex-col gap-6 p-6">
            <DialogHeader className="text-left">
              <div className="flex items-center gap-4">
                <BrandMark brand={mark} size={56} />
                <div>
                  <DialogTitle className="text-xl font-extrabold text-white">{brand.brand_name}</DialogTitle>
                  <DialogDescription asChild>
                    <div className="flex flex-col text-sm text-muted-foreground">
                      {site && <a href={site.href} target="_blank" rel="noopener noreferrer" data-testid="brand-website" className="inline-flex items-center gap-1 self-start font-semibold text-primary hover:underline">{site.label}<ExternalLink size={11} aria-hidden="true" /></a>}
                      <span data-testid="brand-niche">{brand.niche ?? "No niche yet"}</span>
                    </div>
                  </DialogDescription>
                </div>
              </div>
            </DialogHeader>
            <section aria-label="Creators This Brand Works With" className="flex flex-col gap-3">
              <h3 className="text-sm font-bold text-white">Creators This Brand Works With{data ? ` (${data.creators.length})` : ""}</h3>
              {isPending && <p role="status" className="text-sm text-muted-foreground">Loading creators…</p>}
              {isError && (
                <p role="alert" className="text-sm text-red-400">Could not load the creators. <button type="button" onClick={() => void refetch()} className="font-semibold underline">Try again</button></p>
              )}
              {data && data.creators.length === 0 && <p className="text-sm text-muted-foreground">No creators are known for this brand's partnership posts yet.</p>}
              {data && data.creators.length > 0 && (
                <ul className="flex flex-col gap-2">
                  {data.creators.map((c) => (
                    <li key={c.username}>
                      <a href={c.profile_url} target="_blank" rel="noopener noreferrer" data-testid={`brand-creator-${c.username}`}
                        className="flex w-full items-center gap-3 rounded-xl border border-border bg-background/40 p-3 text-left transition-colors hover:border-primary/40">
                        <CreatorAvatar creator={{ name: c.full_name?.trim() || c.username, hue: avatarHue(c.username) }} size={40} />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-bold text-white">@{c.username}</span>
                          <span className="block truncate text-xs text-muted-foreground">{[c.niche, `${c.partnership_posts} partnership post${c.partnership_posts === 1 ? "" : "s"}`].filter(Boolean).join(" · ")}</span>
                        </span>
                        <span className="text-right text-xs text-muted-foreground">
                          <span className="block font-semibold text-white">{c.followers === null ? "— followers" : `${fmtCount(c.followers)} followers`}</span>
                          {c.engagement_rate === null ? "— engagement" : `${fmtPercent(c.engagement_rate)} engagement`}
                        </span>
                        <ExternalLink size={12} className="shrink-0 text-muted-foreground" aria-hidden="true" />
                      </a>
                    </li>
                  ))}
                </ul>
              )}
            </section>
            <section aria-label="Why This Brand Could Be a Good Fit" className="flex flex-col gap-3 rounded-xl border border-primary/25 bg-primary/5 p-4">
              <div className="flex items-center justify-between gap-3">
                <h3 className="text-sm font-bold text-white">Why This Brand Could Be a Good Fit</h3>
                <Chip tone="primary">{brand.confidence}% fit</Chip>
              </div>
              <ul className="flex list-disc flex-col gap-1.5 pl-5 text-sm text-muted-foreground marker:text-primary" data-testid="fit-lines">
                {sampleFitLines(brand.brand_name, brand.niche).map((line) => <li key={line}>{line}</li>)}
              </ul>
              <Link href={`/pitch?brand=${encodeURIComponent(brand.brand_name)}`}
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
