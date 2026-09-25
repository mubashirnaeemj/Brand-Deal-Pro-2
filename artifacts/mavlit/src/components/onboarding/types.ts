export type PlatformKey = "instagram" | "youtube";
export type DescriptionMode = "manual" | "generate";

export type AudienceDemographics = {
  malePct: string;
  femalePct: string;
};

export type InstagramProfile = {
  username: string;
  followers: string;
  niches: string[];
  subNiches: string[];
  contentDescription: string;
  excludedCategories: string;
  audience: AudienceDemographics;
};

export type YouTubeProfile = {
  channelName: string;
  subscribers: string;
  niches: string[];
  subNiches: string[];
  contentDescription: string;
  excludedCategories: string;
  audience: AudienceDemographics;
};

export type OnboardingData = {
  instagramDescriptionMode: DescriptionMode;
  youtubeDescriptionMode: DescriptionMode;
  creator: {
    fullName: string;
    age: string;
    gender: string;
    platforms: PlatformKey[];
    contentDescription: string;
  };
  instagram: InstagramProfile;
  youtube: YouTubeProfile;
};

export type StepKey = "welcome" | "creator" | "instagram" | "youtube" | "review";
export type FieldErrors = Record<string, string>;

export const NICHE_OPTIONS = [
  "Music", "Beauty", "Health", "Fitness", "Fashion", "Finance", "Business",
  "Education", "Gaming", "Technology", "Food", "Travel", "Lifestyle",
  "Entertainment", "Sports", "Parenting", "Art", "Photography",
];

export const SUB_NICHE_OPTIONS = [
  "Music Production", "Songwriting", "DJing", "Audio Gear", "Skincare",
  "Makeup", "Wellness", "Strength Training", "Running", "Streetwear",
  "Personal Finance", "Investing", "Entrepreneurship", "Career Growth",
  "Online Learning", "Game Reviews", "Esports", "Consumer Tech",
  "Software", "Recipes", "Restaurant Reviews", "Adventure Travel",
  "Luxury Travel", "Home & Living", "Comedy", "Film & TV", "Football",
  "Basketball", "Family Life", "Digital Art", "Portrait Photography",
];

export const EMPTY_ONBOARDING: OnboardingData = {
  instagramDescriptionMode: "manual",
  youtubeDescriptionMode: "manual",
  creator: {
    fullName: "",
    age: "",
    gender: "",
    platforms: [],
    contentDescription: "",
  },
  instagram: {
    username: "",
    followers: "",
    niches: [],
    subNiches: [],
    contentDescription: "",
    excludedCategories: "",
    audience: { malePct: "", femalePct: "" },
  },
  youtube: {
    channelName: "",
    subscribers: "",
    niches: [],
    subNiches: [],
    contentDescription: "",
    excludedCategories: "",
    audience: { malePct: "", femalePct: "" },
  },
};

export const INPUT_CLASS =
  "w-full rounded-xl border border-border bg-secondary/80 px-4 py-3 text-sm text-white outline-none transition placeholder:text-muted-foreground/50 focus:border-primary/70 focus:ring-2 focus:ring-primary/15";

export function audienceTotal(audience: AudienceDemographics) {
  return (Number(audience.malePct) || 0) + (Number(audience.femalePct) || 0);
}