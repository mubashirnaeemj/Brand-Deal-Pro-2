import { describe, expect, it } from "vitest";
import { profilePatch, profileToForm, validateProfile } from "@/pages/profileForm";
import { creatorProfile } from "./fixtures/creatorProfile";

describe("profile form replacement patches", () => {
  it("loads separate audience demographics without falling back to legacy shared fields", () => {
    const form = profileToForm(creatorProfile({
      instagram_audience_gender: "female", instagram_audience_age_min: 18, instagram_audience_age_max: 34,
      youtube_audience_gender: "both", youtube_audience_age_min: 25, youtube_audience_age_max: 65,
    }));
    expect(form.instagram).toMatchObject({ audienceGender: "female", audienceAgeMin: "18", audienceAgeMax: "34" });
    expect(form.youtube).toMatchObject({ audienceGender: "both", audienceAgeMin: "25", audienceAgeMax: "65" });
    expect(profileToForm(creatorProfile()).instagram).toMatchObject({ audienceGender: "", audienceAgeMin: "", audienceAgeMax: "" });
  });

  it.each(["instagram", "youtube"] as const)("saves and clears %s demographics using the API fields", (platform) => {
    const profile = creatorProfile();
    const form = profileToForm(profile);
    Object.assign(form[platform], { audienceGender: "male", audienceAgeMin: "18", audienceAgeMax: "45" });
    expect(validateProfile(form, profile)).toBeNull();
    expect(profilePatch(form, profile)).toEqual({
      brand_preferences: profile.brand_preferences,
      [`${platform}_audience_gender`]: "male",
      [`${platform}_audience_age_min`]: 18,
      [`${platform}_audience_age_max`]: 45,
    });
    const saved = { ...profile, ...profilePatch(form, profile) };
    const cleared = profileToForm(saved);
    Object.assign(cleared[platform], { audienceGender: "", audienceAgeMin: "", audienceAgeMax: "" });
    expect(profilePatch(cleared, saved)).toEqual({
      brand_preferences: saved.brand_preferences,
      [`${platform}_audience_gender`]: "",
      [`${platform}_audience_age_min`]: null,
      [`${platform}_audience_age_max`]: null,
    });
  });

  it.each(["instagram", "youtube"] as const)("validates optional %s audience details", (platform) => {
    const profile = creatorProfile();
    const form = profileToForm(profile);
    for (const invalid of ["-1", "1.5", "not a number"]) {
      form[platform].audienceAgeMin = invalid;
      expect(validateProfile(form, profile)).toContain("non-negative whole numbers");
    }
    form[platform].audienceAgeMin = "45";
    form[platform].audienceAgeMax = "18";
    expect(validateProfile(form, profile)).toContain("minimum age cannot");
    form[platform].audienceAgeMax = "";
    expect(validateProfile(form, profile)).toBeNull();
    form[platform].audienceGender = "unknown";
    expect(validateProfile(form, profile)).toContain("audience gender");
  });

  it("loads persisted preferences, including legacy missing/null values", () => {
    expect(profileToForm(creatorProfile()).brandPreferences).toBe("More guitar brands; fewer cosmetics.");
    expect(profileToForm(creatorProfile({ brand_preferences: null })).brandPreferences).toBe("");
    expect(profileToForm(creatorProfile({ brand_preferences: undefined })).brandPreferences).toBe("");
  });

  it("a preferences-only edit produces no unrelated normalization or field changes", () => {
    const profile = creatorProfile();
    const form = { ...profileToForm(profile), brandPreferences: "  More sunscreen brands.  " };
    expect(validateProfile(form, profile)).toBeNull();
    expect(profilePatch(form, profile)).toEqual({ brand_preferences: "More sunscreen brands." });
  });

  it.each(["", " ", "\n\t  "])("blank preferences %j explicitly clear the field with null", (blank) => {
    const profile = creatorProfile();
    expect(profilePatch({ ...profileToForm(profile), brandPreferences: blank }, profile))
      .toEqual({ brand_preferences: null });
  });

  it.each([999, 1000, 1001])("validates the exact %i-character boundary", (length) => {
    const profile = creatorProfile();
    const form = { ...profileToForm(profile), brandPreferences: "x".repeat(length) };
    expect(validateProfile(form, profile)).toBe(length > 1000
      ? "Brand preferences must be 1000 characters or fewer." : null);
  });

  it("does not trim before checking the 1000-character limit", () => {
    const profile = creatorProfile();
    expect(validateProfile({ ...profileToForm(profile), brandPreferences: `${" ".repeat(1000)}x` }, profile))
      .toBe("Brand preferences must be 1000 characters or fewer.");
  });

  it("keeps an unrelated edit as a small patch rather than a reconstructed profile", () => {
    const profile = creatorProfile();
    expect(profilePatch({ ...profileToForm(profile), fullName: "Updated Creator" }, profile)).toEqual({
      full_name: "Updated Creator",
      brand_preferences: profile.brand_preferences,
    });
  });
});
