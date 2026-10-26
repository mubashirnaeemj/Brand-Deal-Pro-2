import { describe, expect, it } from "vitest";
import { profilePatch, profileToForm, validateProfile } from "@/pages/profileForm";
import { creatorProfile } from "./fixtures/creatorProfile";

const emptyAudienceWrites = {
  instagram_audience_gender: null,
  instagram_audience_description: null,
  youtube_audience_gender: null,
  youtube_audience_description: null,
};

describe("profile form replacement patches", () => {
  it("handles missing pitch preferences and sends null when a saved preference is cleared", () => {
    expect(profileToForm(creatorProfile()).pitchStylePreferences).toBe("");
    const profile = creatorProfile({ pitch_style_preferences: "Keep it short." });
    const form = profileToForm(profile);
    expect(form.pitchStylePreferences).toBe("Keep it short.");
    form.pitchStylePreferences = " ";
    expect(profilePatch(form, profile).pitch_style_preferences).toBeNull();
    expect(validateProfile(form, profile)).toBeNull();
    form.pitchStylePreferences = " ".repeat(1000) + "x";
    expect(validateProfile(form, profile)).toBe("Pitch style preferences must be 1000 characters or fewer.");
  });

  it("loads separate audience demographics without falling back to legacy shared fields", () => {
    const form = profileToForm(creatorProfile({
      instagram_audience_gender: "female", instagram_audience_description: "Women aged 18-34 who love skincare.",
      youtube_audience_gender: "both",
    }));
    expect(form.instagram).toMatchObject({ audienceGender: "female", audienceDescription: "Women aged 18-34 who love skincare." });
    expect(form.youtube).toMatchObject({ audienceGender: "both" });
    expect(profileToForm(creatorProfile()).instagram).toMatchObject({ audienceGender: "", audienceDescription: "" });
    expect(form.instagram).not.toHaveProperty("audienceAgeMin");   // the age lives in the description now
  });

  it.each(["instagram", "youtube"] as const)("saves and clears %s demographics using the API fields", (platform) => {
    const profile = creatorProfile();
    const form = profileToForm(profile);
    Object.assign(form[platform], { audienceGender: "male" });
    expect(validateProfile(form, profile)).toBeNull();
    expect(profilePatch(form, profile)).toEqual({
      ...emptyAudienceWrites,
      brand_preferences: profile.brand_preferences,
      [`${platform}_audience_gender`]: "male",
    });
    const saved = { ...profile, ...profilePatch(form, profile) };
    const cleared = profileToForm(saved);
    Object.assign(cleared[platform], { audienceGender: "" });
    expect(profilePatch(cleared, saved)).toEqual({
      ...emptyAudienceWrites,
      brand_preferences: saved.brand_preferences,
      [`${platform}_audience_gender`]: null,
    });
  });

  it.each(["instagram", "youtube"] as const)("validates optional %s audience details", (platform) => {
    const profile = creatorProfile();
    const form = profileToForm(profile);
    expect(validateProfile(form, profile)).toBeNull();
    form[platform].audienceGender = "unknown";
    expect(validateProfile(form, profile)).toContain("Select Male, Female, or Both");
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
    expect(profilePatch(form, profile)).toEqual({ ...emptyAudienceWrites, brand_preferences: "More sunscreen brands." });
  });

  it.each(["", " ", "\n\t  "])("blank preferences %j explicitly clear the field with null", (blank) => {
    const profile = creatorProfile();
    expect(profilePatch({ ...profileToForm(profile), brandPreferences: blank }, profile))
      .toEqual({ ...emptyAudienceWrites, brand_preferences: null });
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
      ...emptyAudienceWrites,
      full_name: "Updated Creator",
      brand_preferences: profile.brand_preferences,
    });
  });
});
