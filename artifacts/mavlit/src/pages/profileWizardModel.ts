import type { CreatorProfile, DescriptionPlatform } from "@/contexts/AuthContext";
import { fillEmptyAudience } from "@/lib/audience";
import { parsePrimaryNiches, type OnboardingData } from "@/components/onboarding/types";
import { profileToForm, type ProfileForm } from "./profileForm";

export type ProfileStep = 1 | 2 | 3;
export const generationKey = (username: string, niches: string[]) =>
  JSON.stringify([username.trim().replace(/^@/, "").toLowerCase(), niches]);
export const profileGenerationKey = (profile: CreatorProfile) =>
  generationKey(profile.instagram_handle || "", parsePrimaryNiches(profile.instagram_primary_niche ?? profile.content_niche));

export function instagramForm(form: ProfileForm): ProfileForm {
  return { ...form, primaryPlatforms: ["instagram"] };
}

/** Generated-mode outputs are server-owned; switching to manual preserves edits. */
export function applyProfileGeneration(form: ProfileForm, profile: CreatorProfile, platform: DescriptionPlatform): ProfileForm {
  const current = form[platform];
  const generated = profileToForm(profile)[platform];
  if (current.descriptionMode === "generate") {
    return { ...form, [platform]: {
      ...current,
      ...fillEmptyAudience({ ...current, audienceGender: "", audienceAgeMin: "", audienceAgeMax: "" }, profile, platform),
      description: generated.description,
      subNiches: generated.subNiches,
      ...(platform === "instagram" ? { followers: profileToForm(profile).instagram.followers } : {}),
    } };
  }
  return { ...form, [platform]: {
    ...fillEmptyAudience(current, profile, platform),
    description: current.description.trim() ? current.description : generated.description,
  } };
}

export function creatorInfoError(form: ProfileForm): string | null {
  if (!form.fullName.trim()) return "Full name is required.";
  if (!Number.isInteger(Number(form.age)) || Number(form.age) < 13 || Number(form.age) > 120) return "Enter an age between 13 and 120.";
  if (!form.gender) return "Select a gender option.";
  return null;
}

export function restoreWizardForm(profile: CreatorProfile, draft: unknown): ProfileForm {
  const initial = profileToForm(profile);
  if (!draft || typeof draft !== "object") return instagramForm(initial);
  const legacy = (draft as { data?: OnboardingData }).data;
  if (legacy?.creator && legacy.instagram && legacy.youtube) {
    return instagramForm({
      ...initial, fullName: legacy.creator.fullName, age: legacy.creator.age, gender: legacy.creator.gender,
      instagram: {
        ...initial.instagram, ...legacy.instagram,
        description: legacy.instagram.contentDescription,
        descriptionMode: legacy.instagramDescriptionMode === "generate" ? "generate" : "manual", primaryNiches: legacy.instagram.niches,
      },
      youtube: {
        ...initial.youtube, ...legacy.youtube,
        description: legacy.youtube.contentDescription,
        descriptionMode: legacy.youtubeDescriptionMode === "generate" ? "generate" : "manual", primaryNiches: legacy.youtube.niches,
      },
    });
  }
  const value = draft as Partial<ProfileForm>;
  if (typeof value.fullName !== "string" || !value.instagram || !value.youtube) return instagramForm(initial);
  return instagramForm({
    ...initial, ...value,
    instagram: { ...initial.instagram, ...value.instagram },
    youtube: { ...initial.youtube, ...value.youtube },
  });
}
