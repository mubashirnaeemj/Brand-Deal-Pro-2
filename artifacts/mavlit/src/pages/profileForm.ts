import type { CreatorProfile } from "@/contexts/AuthContext";
import { formatPlatforms, NICHE_OPTIONS, parsePlatforms, type PlatformKey } from "@/components/onboarding/types";

export type PlatformDetails = {
  primaryNiche: string;
  subNiches: string[];
  excludedCategories: string[];
  description: string;
};

export type ProfileForm = {
  fullName: string;
  age: string;
  gender: string;
  primaryPlatforms: PlatformKey[];
  instagram: PlatformDetails & { username: string; followers: string };
  youtube: PlatformDetails & { channelName: string; subscribers: string };
};

const text = (value: string | null | undefined) => value ?? "";
const numberText = (value: number | null | undefined) => value == null ? "" : String(value);
const optionalNumber = (value: string) => value.trim() === "" ? null : Number(value);

export function profileToForm(profile: CreatorProfile): ProfileForm {
  const [firstPlatform] = parsePlatforms(profile.primary_platform);
  return {
    fullName: text(profile.full_name),
    age: numberText(profile.age),
    gender: text(profile.gender),
    primaryPlatforms: parsePlatforms(profile.primary_platform),
    instagram: {
      username: text(profile.instagram_handle),
      followers: numberText(profile.instagram_followers ?? (firstPlatform === "instagram" ? profile.follower_count : null)),
      primaryNiche: text(profile.instagram_primary_niche ?? profile.content_niche),
      subNiches: profile.instagram_sub_niches ?? profile.sub_niches ?? [],
      excludedCategories: profile.instagram_excluded_categories ?? profile.excluded_categories ?? [],
      description: text(profile.instagram_description),
    },
    youtube: {
      channelName: text(profile.youtube_channel_name),
      subscribers: numberText(profile.youtube_subscribers ?? (firstPlatform === "youtube" ? profile.follower_count : null)),
      primaryNiche: text(profile.youtube_primary_niche),
      subNiches: profile.youtube_sub_niches ?? [],
      excludedCategories: profile.youtube_excluded_categories ?? [],
      description: text(profile.youtube_description),
    },
  };
}

export function validateProfile(form: ProfileForm, profile: CreatorProfile): string | null {
  if (!form.fullName.trim()) return "Full name is required.";
  if (!form.primaryPlatforms.length) return "Choose at least one primary platform.";
  if (form.age.trim() && (!Number.isInteger(Number(form.age)) || Number(form.age) < 13 || Number(form.age) > 120)) {
    return "Age must be a whole number between 13 and 120.";
  }
  for (const [value, label] of [[form.instagram.followers, "Follower count"], [form.youtube.subscribers, "Subscriber count"]]) {
    if (value.trim() && (!Number.isInteger(Number(value)) || Number(value) < 0)) return `${label} must be a non-negative whole number.`;
  }
  // The app still gates access on the required onboarding fields.
  if (!form.age.trim() || !form.gender.trim() || !form.instagram.username.trim() ||
      form.instagram.followers.trim() === "" || !form.instagram.primaryNiche.trim()) {
    return "To keep your profile active, complete age, gender, Instagram username, follower count, and Instagram primary niche.";
  }
  if (!NICHE_OPTIONS.includes(form.instagram.primaryNiche as typeof NICHE_OPTIONS[number]) ||
      (form.youtube.primaryNiche && !NICHE_OPTIONS.includes(form.youtube.primaryNiche as typeof NICHE_OPTIONS[number]))) {
    return "Choose a listed primary niche (Music, Health, Beauty, or Fitness).";
  }
  if (!form.instagram.description.trim() && !form.youtube.description.trim() && !profile.content_description?.trim()) {
    return "Add an Instagram or YouTube description to keep your profile active.";
  }
  if (form.primaryPlatforms.includes("youtube") &&
      (!form.youtube.channelName.trim() || form.youtube.subscribers.trim() === "" || !form.youtube.primaryNiche.trim())) {
    return "Complete the YouTube channel name, subscriber count, and primary niche.";
  }
  return null;
}

export function profilePatch(form: ProfileForm, profile: CreatorProfile): Partial<CreatorProfile> {
  const instagramHandle = form.instagram.username.trim().replace(/^@/, "");
  return {
    full_name: form.fullName.trim(),
    creator_handle: instagramHandle || profile.creator_handle || "",
    age: optionalNumber(form.age),
    gender: form.gender.trim() || null,
    primary_platform: formatPlatforms(form.primaryPlatforms),
    instagram_handle: instagramHandle || null,
    instagram_followers: optionalNumber(form.instagram.followers),
    follower_count: optionalNumber(form.primaryPlatforms[0] === "youtube" ? form.youtube.subscribers : form.instagram.followers),
    instagram_primary_niche: form.instagram.primaryNiche.trim() || null,
    content_niche: form.instagram.primaryNiche.trim() || null,
    instagram_sub_niches: form.instagram.subNiches,
    instagram_excluded_categories: form.instagram.excludedCategories,
    instagram_description: form.instagram.description.trim() || null,
    youtube_channel_name: form.youtube.channelName.trim() || null,
    youtube_subscribers: optionalNumber(form.youtube.subscribers),
    youtube_primary_niche: form.youtube.primaryNiche.trim() || null,
    youtube_sub_niches: form.youtube.subNiches,
    youtube_excluded_categories: form.youtube.excludedCategories,
    youtube_description: form.youtube.description.trim() || null,
  };
}