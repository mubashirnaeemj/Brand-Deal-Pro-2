import { describe, expect, it } from "vitest";
import { profilePatch, profileToForm, validateProfile } from "@/pages/profileForm";
import { restoreWizardForm } from "@/pages/profileWizardModel";
import { creatorProfile } from "./fixtures/creatorProfile";

describe("audience description carries the age", () => {
  it("round-trips a description that states the age range, with no separate age field", () => {
    const profile = creatorProfile();
    const form = profileToForm(profile);
    form.instagram.audienceDescription = "Women aged 25-44 who follow for skincare routines.";
    expect(validateProfile(form, profile)).toBeNull();
    const patch = profilePatch(form, profile);
    expect(patch).toMatchObject({ instagram_audience_description: "Women aged 25-44 who follow for skincare routines." });
    expect(Object.keys(patch).filter((key) => /audience_age/.test(key))).toEqual([]);
    expect(profileToForm({ ...profile, ...patch }).instagram.audienceDescription).toBe("Women aged 25-44 who follow for skincare routines.");
  });

  it("restores old drafts that still hold age boxes without keeping them", () => {
    const profile = creatorProfile();
    const draft = JSON.parse(JSON.stringify(profileToForm(profile)));
    draft.instagram.audienceAgeMin = "25";
    draft.instagram.audienceAgeMax = "44";
    draft.instagram.audienceAgeRange = "25-44";
    draft.instagram.audienceDescription = "Typed before the change";
    const restored = restoreWizardForm(profile, draft);
    expect(restored.instagram.audienceDescription).toBe("Typed before the change");
    expect(Object.keys(profilePatch(restored, profile)).filter((key) => /audience_age/.test(key))).toEqual([]);
  });

  it("saves and clears descriptions with the backend's 1500 character limit", () => {
    const profile = creatorProfile({ instagram_audience_description: "Saved audience" });
    const form = profileToForm(profile);
    form.instagram.audienceDescription = "x".repeat(1500);
    expect(validateProfile(form, profile)).toBeNull();
    form.instagram.audienceDescription += "x";
    expect(validateProfile(form, profile)).toContain("1500");
    form.instagram.audienceDescription = " ";
    expect(profilePatch(form, profile).instagram_audience_description).toBeNull();
  });
});
