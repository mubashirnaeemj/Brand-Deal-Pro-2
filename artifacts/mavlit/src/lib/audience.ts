import type { CreatorProfile, DescriptionPlatform } from "@/contexts/AuthContext";

export type AudienceFields = {
  audienceGender: string;
  audienceAgeMin: string;
  audienceAgeMax: string;
};

export function audienceFromProfile(profile: CreatorProfile, platform: DescriptionPlatform): AudienceFields {
  return {
    audienceGender: profile[`${platform}_audience_gender`] || "",
    audienceAgeMin: profile[`${platform}_audience_age_min`] == null ? "" : String(profile[`${platform}_audience_age_min`]),
    audienceAgeMax: profile[`${platform}_audience_age_max`] == null ? "" : String(profile[`${platform}_audience_age_max`]),
  };
}

export function fillEmptyAudience<T extends AudienceFields>(current: T, profile: CreatorProfile, platform: DescriptionPlatform): T {
  const generated = audienceFromProfile(profile, platform);
  return {
    ...current,
    audienceGender: current.audienceGender || generated.audienceGender,
    audienceAgeMin: current.audienceAgeMin.trim() ? current.audienceAgeMin : generated.audienceAgeMin,
    audienceAgeMax: current.audienceAgeMax.trim() ? current.audienceAgeMax : generated.audienceAgeMax,
  };
}

export function audienceError(value: AudienceFields): string | null {
  if (!["", "male", "female", "both"].includes(value.audienceGender)) return "Select Male, Female, or Both, or leave gender empty.";
  for (const age of [value.audienceAgeMin, value.audienceAgeMax]) {
    if (age.trim() && (!Number.isInteger(Number(age)) || Number(age) < 13 || Number(age) > 100)) {
      return "Audience ages must be whole numbers between 13 and 100.";
    }
  }
  if (value.audienceAgeMin.trim() && value.audienceAgeMax.trim() &&
      Number(value.audienceAgeMin) > Number(value.audienceAgeMax)) {
    return "Audience age from must be less than or equal to age to.";
  }
  return null;
}

export function audiencePayload(value: AudienceFields, platform: DescriptionPlatform): Partial<CreatorProfile> {
  return {
    [`${platform}_audience_gender`]: value.audienceGender || null,
    [`${platform}_audience_age_min`]: value.audienceAgeMin.trim() ? Number(value.audienceAgeMin) : null,
    [`${platform}_audience_age_max`]: value.audienceAgeMax.trim() ? Number(value.audienceAgeMax) : null,
  };
}

// Legacy servers/drafts can still contain removed fields. Strip only these keys,
// preserving all other fields in the full-replacement profile PUT.
export function profileWriteBody(body: unknown): unknown {
  if (!body || typeof body !== "object" || Array.isArray(body)) return body;
  return Object.fromEntries(Object.entries(body).filter(([key]) =>
    !/^(?:(?:instagram|youtube)_)?audience_gender_(?:male|female)_pct$/.test(key))
    .map(([key, value]) => [
      key, /^(?:instagram|youtube)_audience_gender$/.test(key) && value === "" ? null : value,
    ]));
}
