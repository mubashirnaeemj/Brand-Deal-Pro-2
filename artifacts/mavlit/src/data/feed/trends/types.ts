// Sample data for the Trending tab. Every figure here is illustrative demo data, not measured market activity.
// `p` = platforms the trend shows up on (I Instagram, T TikTok, Y YouTube); `c` = countries (U United States, C Canada, K United Kingdom, A Australia).
import type { Niche } from "../types";

export type TrendStatus = "Rising" | "Stable" | "Declining";
export type TrendStage = "Early" | "Accelerating" | "Mainstream";

interface Scoped { id: string; niche: Niche; p: string; c: string }

export interface ContentTrend extends Scoped {
  name: string; category: string;
  g: number;                  // growth over the last 30 days (percent); other periods are derived
  creators: number; posts: number; views: number; eng: number;
  status: TrendStatus; about: string; why: string;
  formats: string[]; brands: string[]; creatorIds: string[];
}
export interface EmergingTrend extends Scoped {
  name: string; g: number; stage: TrendStage; adoptionPct: number; creators: number; opportunity: string;
  analysis: string; creatorIds: string[]; brands: string[]; formats: string[]; ideas: string[];
}
export interface BrandCategoryTrend extends Scoped {
  name: string; g: number; activeBrands: number; partnerships: number;
  creatorCategories: string[]; range: string; formats: string[];
  brands: { name: string; partnerships: number; creators: number }[];
}
export interface BehaviorTrend extends Scoped {
  text: string; adoption: number; g: number; eng: number; formats: string[]; creatorIds: string[];
}
export interface HashtagTrend extends Scoped {
  tag: string; g: number; posts: number; category: string;
}
