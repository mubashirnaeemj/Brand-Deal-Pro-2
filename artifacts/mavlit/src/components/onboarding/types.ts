export type PlatformKey = "instagram" | "youtube";

export type AudienceDemographics = {
  malePct: string;
  femalePct: string;
  topCountry: string;
};

export type InstagramProfile = {
  username: string;
  profileUrl: string;
  followers: string;
  niches: string[];
  subNiches: string[];
  contentDescription: string;
  excludedCategories: string;
  audience: AudienceDemographics;
};

export type YouTubeProfile = {
  channelName: string;
  channelUrl: string;
  subscribers: string;
  niches: string[];
  subNiches: string[];
  contentDescription: string;
  excludedCategories: string;
  audience: AudienceDemographics;
};

export type OnboardingData = {
  creator: {
    fullName: string;
    city: string;
    country: string;
    age: string;
    gender: string;
    contentDescription: string;
    platforms: PlatformKey[];
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
  creator: {
    fullName: "",
    city: "",
    country: "",
    age: "",
    gender: "",
    contentDescription: "",
    platforms: [],
  },
  instagram: {
    username: "",
    profileUrl: "",
    followers: "",
    niches: [],
    subNiches: [],
    contentDescription: "",
    excludedCategories: "",
    audience: { malePct: "", femalePct: "", topCountry: "" },
  },
  youtube: {
    channelName: "",
    channelUrl: "",
    subscribers: "",
    niches: [],
    subNiches: [],
    contentDescription: "",
    excludedCategories: "",
    audience: { malePct: "", femalePct: "", topCountry: "" },
  },
};

export const INPUT_CLASS =
  "w-full rounded-xl border border-border bg-secondary/80 px-4 py-3 text-sm text-white outline-none transition placeholder:text-muted-foreground/50 focus:border-primary/70 focus:ring-2 focus:ring-primary/15";

export function isValidUrl(value: string) {
  if (!value.trim()) return false;
  try {
    const url = new URL(value.startsWith("http") ? value : `https://${value}`);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

export function parseList(value: string) {
  return value.split(",").map((item) => item.trim()).filter(Boolean);
}

export function audienceTotal(audience: AudienceDemographics) {
  return (Number(audience.malePct) || 0) + (Number(audience.femalePct) || 0);
}