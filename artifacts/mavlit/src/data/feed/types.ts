export type Niche = "Music" | "Beauty" | "Fitness" | "Health & Wellness";
export type Platform = "Instagram" | "TikTok" | "YouTube";
export type Country = "United States" | "Canada" | "United Kingdom" | "Australia";
export type ContentType = "Reel" | "Story" | "Carousel" | "Video";

export interface FeedCreator {
  id: string;
  handle: string;
  name: string;
  niche: Niche;
  platform: Platform;
  country: Country;
  followers: number;
  engagementRate: number;      // percent
  avgReelViews: number;
  postsPerWeek: number;
  similarity: number;          // percent match with the logged-in creator
  hue: number;                 // avatar colour
  categories: string[];        // content categories they publish
  mix: Record<string, number>; // content category distribution, sums to 100
  bio: string;
}

export interface FeedBrand {
  id: string;
  name: string;
  industry: string;
  category: string;            // brand category (filter)
  niche: Niche;
  color: string;
  website: string;
  hq: Country;
  blurb: string;
}

export interface FeedPartnership {
  id: string;
  creatorId: string;
  brandId: string;
  daysAgo: number;
  type: ContentType;
  platform: Platform;
  category: string;            // content category of the sponsored post
  views: number;
  likes: number;
  comments: number;
  description: string;
}

export interface MyCreatorProfile {
  handle: string;
  name: string;
  niche: Niche;
  platform: Platform;
  country: Country;
  followers: number;
  engagementRate: number;
  avgReelViews: number;
  postsPerWeek: number;
  hue: number;
  mix: Record<string, number>;
  partnerBrandIds: string[];
}
