import type { CreatorProfile, DescriptionPlatform } from "@/contexts/AuthContext";

// The audience's age is written in the audience description, so only the gender is its own field.
export type AudienceFields = {
  audienceGender: string;
};

export function audienceFromProfile(profile: CreatorProfile, platform: DescriptionPlatform): AudienceFields {
  return { audienceGender: profile[`${platform}_audience_gender`] || "" };
}

export function fillEmptyAudience<T extends AudienceFields>(current: T, profile: CreatorProfile, platform: DescriptionPlatform): T {
  const generated = audienceFromProfile(profile, platform);
  return { ...current, audienceGender: current.audienceGender || generated.audienceGender };
}

export function audienceError(value: AudienceFields): string | null {
  if (!["", "male", "female", "both"].includes(value.audienceGender)) return "Select Male, Female, or Both, or leave gender empty.";
  return null;
}

export function audiencePayload(value: AudienceFields, platform: DescriptionPlatform): Partial<CreatorProfile> {
  return { [`${platform}_audience_gender`]: value.audienceGender || null };
}

// Legacy servers/drafts can still contain removed fields. Strip only these keys,
// preserving all other fields in the full-replacement profile PUT.
export function profileWriteBody(body: unknown): unknown {
  if (!body || typeof body !== "object" || Array.isArray(body)) return body;
  return Object.fromEntries(Object.entries(body).filter(([key]) =>
    !/^(?:(?:instagram|youtube)_)?audience_gender_(?:male|female)_pct$/.test(key) &&
    !/^(?:instagram|youtube)_audience_age_(?:min|max)$/.test(key))
    .map(([key, value]) => [
      key, /^(?:instagram|youtube)_audience_gender$/.test(key) && value === "" ? null : value,
    ]));
}
