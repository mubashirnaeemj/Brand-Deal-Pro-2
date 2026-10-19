import { describe, expect, it } from "vitest";
import { audienceError, audiencePayload, fillEmptyAudience, profileWriteBody } from "@/lib/audience";
import { creatorProfile } from "./fixtures/creatorProfile";

const empty = { audienceGender: "", audienceAgeMin: "", audienceAgeMax: "" };
describe("audience contract", () => {
  it.each([13, 100])("accepts the inclusive age boundary %i", (age) => {
    expect(audienceError({ ...empty, audienceAgeMin: String(age), audienceAgeMax: String(age) })).toBeNull();
  });
  it.each([12, 101, 18.5])("rejects age %i", (age) => {
    expect(audienceError({ ...empty, audienceAgeMin: String(age) })).toContain("13 and 100");
  });
  it("sends null for empty values and numbers, not strings, for ages", () => {
    expect(audiencePayload(empty, "instagram")).toEqual({
      instagram_audience_gender: null, instagram_audience_age_min: null, instagram_audience_age_max: null,
    });
    expect(audiencePayload({ audienceGender: "both", audienceAgeMin: "13", audienceAgeMax: "100" }, "youtube")).toEqual({
      youtube_audience_gender: "both", youtube_audience_age_min: 13, youtube_audience_age_max: 100,
    });
  });
  it("fills each empty input separately, preserves typed zero/text, and leaves null estimates empty", () => {
    const profile = creatorProfile({ instagram_audience_gender: "female", instagram_audience_age_min: 18, instagram_audience_age_max: null });
    expect(fillEmptyAudience(empty, profile, "instagram")).toEqual({ audienceGender: "female", audienceAgeMin: "18", audienceAgeMax: "" });
    expect(fillEmptyAudience({ audienceGender: "male", audienceAgeMin: "0", audienceAgeMax: "65" }, profile, "instagram"))
      .toEqual({ audienceGender: "male", audienceAgeMin: "0", audienceAgeMax: "65" });
  });
  it("removes only obsolete percentage fields from full replacement writes", () => {
    const profile = {
      ...creatorProfile(), future_field: { keep: true },
      instagram_audience_gender_male_pct: 30, instagram_audience_gender_female_pct: 70,
      youtube_audience_gender_male_pct: 20, youtube_audience_gender_female_pct: 80,
      audience_gender_male_pct: 10, audience_gender_female_pct: 90,
    };
    expect(profileWriteBody(profile)).toEqual({ ...creatorProfile(), future_field: { keep: true } });
  });
  it("normalizes empty gender values from older responses to null", () => {
    expect(profileWriteBody({ instagram_audience_gender: "", youtube_audience_gender: "", full_name: "Creator" }))
      .toEqual({ instagram_audience_gender: null, youtube_audience_gender: null, full_name: "Creator" });
  });
});
