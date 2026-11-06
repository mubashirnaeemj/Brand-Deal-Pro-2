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

export type InstagramProfile = import("@/lib/audience").AudienceFields & {
  username: string;
  followers: string;
  niches: string[];
  subNiches: string[];
  contentDescription: string;
  excludedCategories: string[];
};

export type YouTubeProfile = import("@/lib/audience").AudienceFields & {
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

// Sub-niche choices per primary niche: 50 each, and no sub-niche appears twice (not within a niche, not across niches).
export const SUB_NICHES_BY_NICHE = {
  Music: [
    "Music Production", "Songwriting", "DJing", "Audio Gear", "Singing", "Live Performance",
    "Music Education", "Music Reviews", "Instrument Tutorials", "Recording & Mixing", "Guitar", "Bass Guitar",
    "Piano & Keyboard", "Drums & Percussion", "Violin & Strings", "Ukulele", "Saxophone & Brass", "Vocal Coaching",
    "Beat Making", "Mastering", "Music Theory", "Ear Training", "Cover Songs", "Original Music",
    "Acoustic Sessions", "Hip Hop", "R&B & Soul", "Pop", "Rock", "Metal",
    "Jazz", "Classical", "Country", "Electronic Music", "Lo-fi", "Indie",
    "Gospel & Worship", "Latin Music", "K-Pop", "Afrobeats", "Reggae", "Folk",
    "Vinyl Collecting", "Concert Vlogs", "Studio Vlogs", "Music Business", "Music Marketing", "Producer Tips",
    "Sampling", "Synth & Modular",
  ],
  Health: [
    "Nutrition", "Mental Health", "Sleep", "Preventive Care", "Healthy Aging", "Women's Health",
    "Men's Health", "Holistic Health", "Public Health", "Wellness Routines", "Gut Health", "Hormone Health",
    "Heart Health", "Diabetes Care", "Weight Management", "Stress Management", "Meditation", "Mindfulness",
    "Breathwork", "Chronic Illness", "Autoimmune Health", "Pain Management", "Immune Health", "Eye Health",
    "Dental Health", "Sexual Health", "Allergy & Asthma", "Fertility", "Pregnancy & Postnatal", "Menopause",
    "Children's Health", "Senior Care", "Vitamins & Supplements", "Herbal Remedies", "Functional Medicine", "Detox & Cleanse",
    "Intermittent Fasting", "Plant-Based Eating", "Meal Prep", "Healthy Recipes", "Hydration", "Longevity",
    "Biohacking", "Cholesterol & Blood Pressure", "Thyroid Health", "Digestive Disorders", "Mental Wellness Journaling", "Therapy & Counseling",
    "Addiction Recovery", "First Aid & Safety",
  ],
  Beauty: [
    "Skincare", "Makeup", "Haircare", "Fragrance", "Nail Art", "Beauty Tutorials",
    "Product Reviews", "Clean Beauty", "Bridal Beauty", "Men's Grooming", "Acne Care", "Anti-Aging",
    "Sun Care", "Korean Beauty", "Natural Hair", "Curly Hair", "Hair Color", "Hair Styling",
    "Braids & Protective Styles", "Wigs & Extensions", "Eye Makeup", "Lip Care", "Lipstick & Lip Color", "Foundation & Complexion",
    "Contour & Highlight", "Brows & Lashes", "Special Effects Makeup", "Drugstore Beauty", "Luxury Beauty", "Budget Beauty",
    "Vegan & Cruelty-Free", "Body Care", "Bath & Shower", "Hand & Foot Care", "Manicures & Gel Polish", "Perfume Reviews",
    "Makeup Tools & Brushes", "Skin Barrier Repair", "Sensitive Skin", "Oily Skin", "Dry Skin", "Hyperpigmentation",
    "Teen Skincare", "Mature Skin", "Barbering", "Beard Care", "Salon Services", "Spa & Facials",
    "Beauty Hauls", "Get Ready With Me",
  ],
  Fitness: [
    "Strength Training", "Running", "Yoga", "Pilates", "HIIT", "Mobility",
    "Home Workouts", "Cycling", "Dance Fitness", "Recovery", "Weightlifting", "Powerlifting",
    "Bodybuilding", "CrossFit", "Calisthenics", "Kettlebell Training", "Resistance Bands", "Functional Fitness",
    "Core Training", "Glute Training", "Upper Body Workouts", "Leg Day", "Cardio", "Marathon Training",
    "Trail Running", "Triathlon", "Swimming", "Rowing", "Walking & Hiking", "Jump Rope",
    "Boxing", "Kickboxing", "Martial Arts", "Brazilian Jiu-Jitsu", "Climbing", "Gym Vlogs",
    "Gym Beginners", "Fat Loss", "Muscle Building", "Body Recomposition", "Stretching & Flexibility", "Foam Rolling",
    "Injury Prevention", "Prenatal Fitness", "Senior Fitness", "Teen Athletes", "Sports Performance", "Team Sports",
    "Outdoor Workouts", "Fitness Challenges",
  ],
} as const;

export const NICHE_OPTIONS = Object.keys(SUB_NICHES_BY_NICHE) as (keyof typeof SUB_NICHES_BY_NICHE)[];
/** The sub-niches of the chosen niches, each once, in alphabetical order (A to Z, ignoring case). */
export const subNicheOptions = (niches: string[]): string[] =>
  [...new Set(niches.flatMap((niche) =>
    niche in SUB_NICHES_BY_NICHE ? [...SUB_NICHES_BY_NICHE[niche as keyof typeof SUB_NICHES_BY_NICHE]] : []))]
    .sort((a, b) => a.localeCompare(b, "en", { sensitivity: "base" }));

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
    audienceGender: "",
    username: "",
    followers: "",
    niches: [],
    subNiches: [],
    contentDescription: "",
    excludedCategories: [],
  },
  youtube: {
    audienceGender: "",
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
