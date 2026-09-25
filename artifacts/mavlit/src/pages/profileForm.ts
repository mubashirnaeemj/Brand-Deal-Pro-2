import type { CreatorProfile } from "@/contexts/AuthContext";
import type { AudienceDemographics } from "@/components/onboarding/types";

export type PrimaryPlatform = "instagram" | "youtube" | "";

export type PlatformDetails = {
  primaryNiche: string;
  subNiches: string[];
  excludedCategories: string;
  description: string;
  audience: AudienceDemographics;
};

export type ProfileForm = {
  fullName: string;
  age: string;
  gender: string;
  primaryPlatform: PrimaryPlatform;
  instagram: PlatformDetails & { username: string; followers: string };
  youtube: PlatformDetails & { channelName: string; subscribers: string };
};

const text = (value: string | null | undefined) => value ?? "";
const numberText = (value: number | null | undefined) => value == null ? "" : String(value);
const categoriesText = (values: string[] | null | undefined) => (values ?? []).join(", ");
const categoriesArray = (value: string) => [...new Set(value.split(",").map((item) => item.trim()).filter(Boolean))];
const optionalNumber = (value: string) => value.trim() === "" ? null : Number(value);

export function profileToForm(profile: CreatorProfile): ProfileForm {
  return {
    fullName: text(profile.full_name),
    age: numberText(profile.age),
    gender: text(profile.gender),
    primaryPlatform: profile.primary_platform === "youtube" || profile.primary_platform === "instagram"
      ? profile.primary_platform : "",
    instagram: {
      username: text(profile.instagram_handle),
      followers: numberText(profile.instagram_followers ?? (profile.primary_platform === "instagram" ? profile.follower_count : null)),
      primaryNiche: text(profile.instagram_primary_niche ?? profile.content_niche),
      subNiches: profile.instagram_sub_niches ?? profile.sub_niches ?? [],
      excludedCategories: categoriesText(profile.instagram_excluded_categories ?? profile.excluded_categories),
      description: text(profile.instagram_description),
      audience: {
        malePct: numberText(profile.instagram_audience_gender_male_pct ?? (profile.primary_platform === "instagram" ? profile.audience_gender_male_pct : null)),
        femalePct: numberText(profile.instagram_audience_gender_female_pct ?? (profile.primary_platform === "instagram" ? profile.audience_gender_female_pct : null)),
      },
    },
    youtube: {
      channelName: text(profile.youtube_channel_name),
      subscribers: numberText(profile.youtube_subscribers ?? (profile.primary_platform === "youtube" ? profile.follower_count : null)),
      primaryNiche: text(profile.youtube_primary_niche),
      subNiches: profile.youtube_sub_niches ?? [],
      excludedCategories: categoriesText(profile.youtube_excluded_categories),
      description: text(profile.youtube_description),
      audience: {
        malePct: numberText(profile.youtube_audience_gender_male_pct ?? (profile.primary_platform === "youtube" ? profile.audience_gender_male_pct : null)),
        femalePct: numberText(profile.youtube_audience_gender_female_pct ?? (profile.primary_platform === "youtube" ? profile.audience_gender_female_pct : null)),
      },
    },
  };
}

function audienceError(audience: AudienceDemographics, platform: string): string | null {
  const entries = [audience.malePct, audience.femalePct];
  if (entries.some((entry) => entry.trim() && (!Number.isFinite(Number(entry)) || Number(entry) < 0 || Number(entry) > 100))) {
    return `${platform} audience percentages must be between 0 and 100.`;
  }
  if (entries.reduce((total, entry) => total + (Number(entry) || 0), 0) > 100) {
    return `${platform} male and female percentages cannot total more than 100%.`;
  }
  return null;
}

export function validateProfile(form: ProfileForm, profile: CreatorProfile): string | null {
  if (!form.fullName.trim()) return "Full name is required.";
  if (!form.primaryPlatform) return "Choose Instagram or YouTube as your primary platform.";
  if (form.age.trim() && (!Number.isInteger(Number(form.age)) || Number(form.age) < 13 || Number(form.age) > 120)) {
    return "Age must be a whole number between 13 and 120.";
  }
  for (const [value, label] of [[form.instagram.followers, "Follower count"], [form.youtube.subscribers, "Subscriber count"]]) {
    if (value.trim() && (!Number.isInteger(Number(value)) || Number(value) < 0)) return `${label} must be a non-negative whole number.`;
  }
  const instagramAudienceError = audienceError(form.instagram.audience, "Instagram");
  if (instagramAudienceError) return instagramAudienceError;
  const youtubeAudienceError = audienceError(form.youtube.audience, "YouTube");
  if (youtubeAudienceError) return youtubeAudienceError;

  // The app still gates access on the required onboarding fields.
  if (!form.age.trim() || !form.gender.trim() || !form.instagram.username.trim() ||
      form.instagram.followers.trim() === "" || !form.instagram.primaryNiche.trim()) {
    return "To keep your profile active, complete age, gender, Instagram username, follower count, and Instagram primary niche.";
  }
  if (!form.instagram.description.trim() && !form.youtube.description.trim() && !profile.content_description?.trim()) {
    return "Add an Instagram or YouTube description to keep your profile active.";
  }
  if (form.primaryPlatform === "youtube" &&
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
    primary_platform: form.primaryPlatform,
    instagram_handle: instagramHandle || null,
    instagram_followers: optionalNumber(form.instagram.followers),
    follower_count: optionalNumber(form.primaryPlatform === "youtube" ? form.youtube.subscribers : form.instagram.followers),
    instagram_primary_niche: form.instagram.primaryNiche.trim() || null,
    content_niche: form.instagram.primaryNiche.trim() || null,
    instagram_sub_niches: form.instagram.subNiches,
    instagram_excluded_categories: categoriesArray(form.instagram.excludedCategories),
    instagram_description: form.instagram.description.trim() || null,
    instagram_audience_gender_male_pct: optionalNumber(form.instagram.audience.malePct),
    instagram_audience_gender_female_pct: optionalNumber(form.instagram.audience.femalePct),
    youtube_channel_name: form.youtube.channelName.trim() || null,
    youtube_subscribers: optionalNumber(form.youtube.subscribers),
    youtube_primary_niche: form.youtube.primaryNiche.trim() || null,
    youtube_sub_niches: form.youtube.subNiches,
    youtube_excluded_categories: categoriesArray(form.youtube.excludedCategories),
    youtube_description: form.youtube.description.trim() || null,
    youtube_audience_gender_male_pct: optionalNumber(form.youtube.audience.malePct),
    youtube_audience_gender_female_pct: optionalNumber(form.youtube.audience.femalePct),
  };
}