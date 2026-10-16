import { describe, expect, it } from "vitest";
import { profilePatch, profileToForm, validateProfile } from "@/pages/profileForm";
import { creatorProfile } from "./fixtures/creatorProfile";

describe("profile form replacement patches", () => {
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
