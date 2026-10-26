import { describe, expect, it } from "vitest";
import { audienceError, audiencePayload, fillEmptyAudience, profileWriteBody } from "@/lib/audience";
import { creatorProfile } from "./fixtures/creatorProfile";

const empty = { audienceGender: "" };
describe("audience contract", () => {
  it("accepts an empty gender and the three listed values, and rejects anything else", () => {
    for (const gender of ["", "male", "female", "both"]) expect(audienceError({ audienceGender: gender })).toBeNull();
    expect(audienceError({ audienceGender: "unknown" })).toContain("Select Male, Female, or Both");
  });
  it("sends null for an empty gender and only the gender (the age is in the audience description)", () => {
    expect(audiencePayload(empty, "instagram")).toEqual({ instagram_audience_gender: null });
    expect(audiencePayload({ audienceGender: "both" }, "youtube")).toEqual({ youtube_audience_gender: "both" });
  });
  it("fills an empty gender from the generated estimate but keeps a typed one", () => {
    const profile = creatorProfile({ instagram_audience_gender: "female" });
    expect(fillEmptyAudience(empty, profile, "instagram")).toEqual({ audienceGender: "female" });
    expect(fillEmptyAudience({ audienceGender: "male" }, profile, "instagram")).toEqual({ audienceGender: "male" });
  });
  it("removes only obsolete percentage and age-range fields from full replacement writes", () => {
    const profile = {
      ...creatorProfile(), future_field: { keep: true },
      instagram_audience_gender_male_pct: 30, instagram_audience_gender_female_pct: 70,
      youtube_audience_gender_male_pct: 20, youtube_audience_gender_female_pct: 80,
      audience_gender_male_pct: 10, audience_gender_female_pct: 90,
      instagram_audience_age_min: 18, instagram_audience_age_max: 34, youtube_audience_age_min: 25, youtube_audience_age_max: 65,
    };
    expect(profileWriteBody(profile)).toEqual({ ...creatorProfile(), future_field: { keep: true } });
  });
  it("normalizes empty gender values from older responses to null", () => {
    expect(profileWriteBody({ instagram_audience_gender: "", youtube_audience_gender: "", full_name: "Creator" }))
      .toEqual({ instagram_audience_gender: null, youtube_audience_gender: null, full_name: "Creator" });
  });
});
