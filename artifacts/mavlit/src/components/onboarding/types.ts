export type PlatformKey = "instagram" | "youtube";
export const parsePlatforms = (value: string | null | undefined): PlatformKey[] =>
  [...new Set((value ?? "").split(",").map((part) => part.trim().toLowerCase()))]
    .filter((part): part is PlatformKey => part === "instagram" || part === "youtube");
export const formatPlatforms = (platforms: PlatformKey[]): string => platforms.join(",");
// The profile API exposes each platform's primary niches as one text field.
export const parsePrimaryNiches = (value: string | null | undefined): string[] =>
  [...new Set((value ?? "").split(",").map((part) => part.trim()).filter(Boolean))];
export const formatPrimaryNiches = (niches: string[]): string | null =>
  niches.length ? niches.join(", ") : null;
export const samePrimaryNiches = (saved: string | null | undefined, selected: string[]): boolean =>
  JSON.stringify(parsePrimaryNiches(saved)) === JSON.stringify(selected);
export type DescriptionMode = "manual" | "generate";

export type InstagramProfile = {
  username: string;
  followers: string;
  niches: string[];
  subNiches: string[];
  contentDescription: string;
  excludedCategories: string[];
};

export type YouTubeProfile = {
  channelName: string;
  subscribers: string;
  niches: string[];
  subNiches: string[];
  contentDescription: string;
  excludedCategories: string[];
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

export const SUB_NICHES_BY_NICHE = {
  Music: ["Music Production", "Songwriting", "DJing", "Audio Gear", "Singing", "Live Performance", "Music Education", "Music Reviews", "Instrument Tutorials", "Recording & Mixing"],
  Health: ["Nutrition", "Mental Health", "Sleep", "Preventive Care", "Healthy Aging", "Women's Health", "Men's Health", "Holistic Health", "Public Health", "Wellness Routines"],
  Beauty: ["Skincare", "Makeup", "Haircare", "Fragrance", "Nail Art", "Beauty Tutorials", "Product Reviews", "Clean Beauty", "Bridal Beauty", "Men's Grooming"],
  Fitness: ["Strength Training", "Running", "Yoga", "Pilates", "HIIT", "Mobility", "Home Workouts", "Cycling", "Dance Fitness", "Recovery"],
} as const;

export const NICHE_OPTIONS = Object.keys(SUB_NICHES_BY_NICHE) as (keyof typeof SUB_NICHES_BY_NICHE)[];
export const subNicheOptions = (niches: string[]): string[] =>
  [...new Set(niches.flatMap((niche) =>
    niche in SUB_NICHES_BY_NICHE ? [...SUB_NICHES_BY_NICHE[niche as keyof typeof SUB_NICHES_BY_NICHE]] : []))];

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
    excludedCategories: [],
  },
  youtube: {
    channelName: "",
    subscribers: "",
    niches: [],
    subNiches: [],
    contentDescription: "",
    excludedCategories: [],
  },
};

export const INPUT_CLASS =
  "w-full rounded-xl border border-border bg-secondary/80 px-4 py-3 text-sm text-white outline-none transition placeholder:text-muted-foreground/50 focus:border-primary/70 focus:ring-2 focus:ring-primary/15";
