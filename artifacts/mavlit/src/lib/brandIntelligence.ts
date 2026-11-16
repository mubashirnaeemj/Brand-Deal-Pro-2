import { api } from "@/lib/api";
import { brandColor } from "@/lib/similarCreators";

export const BRAND_INTELLIGENCE_PATH = "/feed/brand-intelligence";

export interface BrandIntel {
  brand_raw_id: number; brand_name: string; niche: string | null; website: string | null; rank: number;
  confidence: number;                                  // how well the brand fits you (Matches v3), percent
  partnerships: number;                                // partnership posts scored 90 or more, instagram_posts and the test table together
  creators: number;                                    // different creators who made them
  min_followers: number | null; max_followers: number | null;   // the smallest and the biggest of those creators
  formats: { name: string; pct: number }[];            // the share of those posts per format (Reel, Carousel, ...), biggest first
  avg_engagement: number | null;                       // the average of those creators' engagement rates (percent)
}
export interface BrandIntelResponse { status: "idle" | "queued" | "running" | "completed" | "failed"; total: number; brands: BrandIntel[] }

export const fetchBrandIntelligence = () => api.get<BrandIntelResponse>(BRAND_INTELLIGENCE_PATH);

/** "12K–2.1M", "12K" when the smallest and the biggest are the same, "—" when there is no follower count. */
export function sizeRange(min: number | null, max: number | null, format: (n: number) => string): string {
  if (min === null || max === null) return "—";
  return min === max ? format(min) : `${format(min)}–${format(max)}`;
}

/** The brand mark colour, from the brand's name. */
export const intelColor = brandColor;

export interface BrandCreator {
  username: string; full_name: string | null; profile_url: string; niche: string | null;
  followers: number | null; engagement_rate: number | null;
  partnership_posts: number;                           // how many of the brand's partnership posts this creator made
}
export interface BrandCreatorsResponse { brand_raw_id: number; brand_name: string; creators: BrandCreator[] }

export const fetchBrandCreators = (brandId: number) => api.get<BrandCreatorsResponse>(`${BRAND_INTELLIGENCE_PATH}/${brandId}/creators`);

/** The "Why This Brand Could Be a Good Fit" lines: hardcoded sample text for now (only the brand's name and niche are filled in). */
export function sampleFitLines(name: string, niche: string | null): string[] {
  return [
    niche ? `${name} partners with ${niche} creators, the same niche as your profile.` : `${name} partners with creators across several niches.`,
    "Their creators are close to your audience size, so your follower count sits inside their usual range.",
    "Most of their detected partnerships are Reels, and Reels are a format you already publish.",
    "Their top content themes overlap with what you publish.",
  ];
}

/** A brand's website as a link: the address to open (https:// added when it is missing) and the short text to show ("nike.com"); null when there is none. */
export function websiteLink(website: string | null | undefined): { href: string; label: string } | null {
  const value = (website ?? "").trim();
  if (!value) return null;
  const href = /^[a-z][a-z0-9+.-]*:\/\//i.test(value) ? value : `https://${value}`;
  try {
    const url = new URL(href);
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    return { href: url.href, label: url.hostname.replace(/^www\./i, "") };
  } catch {
    return null;
  }
}
