import type { CreatorProfile } from "@/contexts/AuthContext";
import { audienceAgeRangeError, audienceError, audienceFromProfile, audiencePayload, formatAudienceAgeRange } from "@/lib/audience";
import type { DescriptionMode } from "@/components/onboarding/types";
import { formatPlatforms, formatPrimaryNiches, NICHE_OPTIONS, parsePlatforms, parsePrimaryNiches, type PlatformKey } from "@/components/onboarding/types";

export type PlatformDetails = {
  primaryNiches: string[];
  subNiches: string[];
  excludedCategories: string[];
  description: string;
  descriptionMode: DescriptionMode;
  audienceGender: string;
  audienceAgeMin: string;
  audienceAgeMax: string;
  audienceAgeRange: string;
  audienceDescription: string;
};

export type ProfileForm = {
  fullName: string;
  age: string;
  gender: string;
  brandPreferences: string;
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
    brandPreferences: text(profile.brand_preferences),
    primaryPlatforms: parsePlatforms(profile.primary_platform),
    instagram: {
      username: text(profile.instagram_handle),
      followers: numberText(profile.instagram_followers ?? (firstPlatform === "instagram" ? profile.follower_count : null)),
      primaryNiches: parsePrimaryNiches(profile.instagram_primary_niche ?? profile.content_niche),
      subNiches: profile.instagram_sub_niches ?? profile.sub_niches ?? [],
      excludedCategories: profile.instagram_excluded_categories ?? profile.excluded_categories ?? [],
      description: text(profile.instagram_description),
      descriptionMode: profile.instagram_description_mode === "generate" ? "generate" : "manual",
      ...audienceFromProfile(profile, "instagram"),
      audienceAgeRange: formatAudienceAgeRange(audienceFromProfile(profile, "instagram")),
      audienceDescription: text(profile.instagram_audience_description),
    },
    youtube: {
      channelName: text(profile.youtube_channel_name),
      subscribers: numberText(profile.youtube_subscribers ?? (firstPlatform === "youtube" ? profile.follower_count : null)),
      primaryNiches: parsePrimaryNiches(profile.youtube_primary_niche),
      subNiches: profile.youtube_sub_niches ?? [],
      excludedCategories: profile.youtube_excluded_categories ?? [],
      description: text(profile.youtube_description),
      descriptionMode: profile.youtube_description_mode === "generate" ? "generate" : "manual",
      ...audienceFromProfile(profile, "youtube"),
      audienceAgeRange: formatAudienceAgeRange(audienceFromProfile(profile, "youtube")),
      audienceDescription: text(profile.youtube_audience_description),
    },
  };
}

export function validateProfile(form: ProfileForm, profile: CreatorProfile): string | null {
  if (form.brandPreferences.length > 1000) return "Brand preferences must be 1000 characters or fewer.";
  if (!form.fullName.trim()) return "Full name is required.";
  if (!form.primaryPlatforms.length) return "Choose at least one primary platform.";
  if (form.age.trim() && (!Number.isInteger(Number(form.age)) || Number(form.age) < 13 || Number(form.age) > 120)) {
    return "Age must be a whole number between 13 and 120.";
  }
  for (const [value, label] of [[form.instagram.followers, "Follower count"], ...(form.primaryPlatforms.includes("youtube") ? [[form.youtube.subscribers, "Subscriber count"]] : [])]) {
    if (value.trim() && (!Number.isInteger(Number(value)) || Number(value) < 0)) return `${label} must be a non-negative whole number.`;
  }
  for (const platform of ["instagram", "youtube"] as const) {
    if (!form.primaryPlatforms.includes(platform)) continue;
    const label = platform === "instagram" ? "Instagram" : "YouTube";
    const error = audienceAgeRangeError(form[platform].audienceAgeRange) || audienceError(form[platform]);
    if (error) return `${label}: ${error}`;
    if (form[platform].audienceDescription.length > 1500) return `${label}: Audience description must be 1500 characters or fewer.`;
  }
  // The app still gates access on the required onboarding fields.
  if (!form.age.trim() || !form.gender.trim() || !form.instagram.username.trim() ||
      form.instagram.followers.trim() === "" || !form.instagram.primaryNiches.length) {
    return "To keep your profile active, complete age, gender, Instagram username, follower count, and Instagram primary niche.";
  }
  if (form.instagram.primaryNiches.some((niche) => !NICHE_OPTIONS.includes(niche as typeof NICHE_OPTIONS[number])) ||
      (form.primaryPlatforms.includes("youtube") && form.youtube.primaryNiches.some((niche) => !NICHE_OPTIONS.includes(niche as typeof NICHE_OPTIONS[number])))) {
    return "Choose a listed primary niche (Music, Health, Beauty, or Fitness).";
  }
  if (!form.instagram.description.trim() && !form.youtube.description.trim() && !profile.content_description?.trim()) {
    return "Add an Instagram or YouTube description to keep your profile active.";
  }
  if (form.primaryPlatforms.includes("youtube") &&
      (!form.youtube.channelName.trim() || form.youtube.subscribers.trim() === "" || !form.youtube.primaryNiches.length)) {
    return "Complete the YouTube channel name, subscriber count, and primary niche.";
  }
  return null;
}

function profileValues(form: ProfileForm, profile: CreatorProfile): Partial<CreatorProfile> {
  const instagramHandle = form.instagram.username.trim().replace(/^@/, "");
  return {
    full_name: form.fullName.trim(),
    brand_preferences: form.brandPreferences.trim() || null,
    creator_handle: instagramHandle || profile.creator_handle || "",
    age: optionalNumber(form.age),
    gender: form.gender.trim() || null,
    primary_platform: formatPlatforms(form.primaryPlatforms),
    instagram_handle: instagramHandle || null,
    instagram_followers: optionalNumber(form.instagram.followers),
    follower_count: optionalNumber(form.primaryPlatforms[0] === "youtube" ? form.youtube.subscribers : form.instagram.followers),
    instagram_primary_niche: formatPrimaryNiches(form.instagram.primaryNiches),
    content_niche: formatPrimaryNiches(form.instagram.primaryNiches),
    instagram_sub_niches: form.instagram.subNiches,
    instagram_excluded_categories: form.instagram.excludedCategories,
    instagram_description: form.instagram.description.trim() || null,
    instagram_description_mode: form.instagram.descriptionMode,
    ...audiencePayload(form.instagram, "instagram"),
    instagram_audience_description: form.instagram.audienceDescription.trim() || null,
    content_description: profile.content_description?.trim() || form.instagram.description.trim() || form.youtube.description.trim() || null,
    youtube_channel_name: form.youtube.channelName.trim() || null,
    youtube_subscribers: optionalNumber(form.youtube.subscribers),
    youtube_primary_niche: formatPrimaryNiches(form.youtube.primaryNiches),
    youtube_sub_niches: form.youtube.subNiches,
    youtube_excluded_categories: form.youtube.excludedCategories,
    youtube_description: form.youtube.description.trim() || null,
    youtube_description_mode: form.youtube.descriptionMode,
    ...audiencePayload(form.youtube, "youtube"),
    youtube_audience_description: form.youtube.audienceDescription.trim() || null,
  };
}

export function profilePatch(form: ProfileForm, profile: CreatorProfile): Partial<CreatorProfile> {
  const values = profileValues(form, profile);
  const original = profileValues(profileToForm(profile), profile);
  // Do not normalize or overwrite unrelated fields during a preferences-only edit.
  return Object.fromEntries(Object.entries(values).filter(([key, value]) =>
    key === "brand_preferences" ||
    form.primaryPlatforms.some((platform) => key.startsWith(`${platform}_audience_`)) ||
    JSON.stringify(value) !== JSON.stringify(original[key as keyof CreatorProfile])));
}