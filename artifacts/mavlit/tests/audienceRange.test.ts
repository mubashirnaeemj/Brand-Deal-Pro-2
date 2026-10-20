import { describe, expect, it } from "vitest";
import { audienceAgeRangeError, formatAudienceAgeRange, parseAudienceAgeRange } from "@/lib/audience";
import { profilePatch, profileToForm, validateProfile } from "@/pages/profileForm";
import { restoreWizardForm } from "@/pages/profileWizardModel";
import { creatorProfile } from "./fixtures/creatorProfile";

describe("single audience range field", () => {
  it.each(["25-44", "25 – 44", " 25 — 44 "])("round-trips %s through the existing numeric API", (input) => {
    const profile = creatorProfile();
    const form = profileToForm(profile);
    Object.assign(form.instagram, { audienceAgeRange: input, ...parseAudienceAgeRange(input), audienceDescription: "My audience" });
    expect(validateProfile(form, profile)).toBeNull();
    const patch = profilePatch(form, profile);
    expect(patch).toMatchObject({ instagram_audience_age_min: 25, instagram_audience_age_max: 44, instagram_audience_description: "My audience" });
    const restored = profileToForm({ ...profile, ...patch });
    expect(restored.instagram.audienceAgeRange).toBe("25-44");
    expect(restored.instagram.audienceDescription).toBe("My audience");
  });

  it.each(["25", "25,44", "25-44-55", "-", "12-44", "25-101", "44-25", "25.5-44", "hello"])("rejects invalid range %s", (value) => {
    expect(audienceAgeRangeError(value)).not.toBeNull();
  });

  it("keeps optional bounds and empty values without inventing a missing age", () => {
    expect(formatAudienceAgeRange({ audienceAgeMin: "", audienceAgeMax: "" })).toBe("");
    expect(formatAudienceAgeRange({ audienceAgeMin: "25", audienceAgeMax: "" })).toBe("25-");
    expect(audienceAgeRangeError("25-")).toBeNull();
    expect(audienceAgeRangeError("-44")).toBeNull();
    expect(parseAudienceAgeRange("")).toEqual({ audienceAgeMin: "", audienceAgeMax: "" });
  });

  it("restores old min/max drafts using their own values, not stale server ages", () => {
    const profile = creatorProfile({ instagram_audience_age_min: 18, instagram_audience_age_max: 34 });
    const draft = JSON.parse(JSON.stringify(profileToForm(profile)));
    delete draft.instagram.audienceAgeRange;
    delete draft.instagram.audienceDescription;
    draft.instagram.audienceAgeMin = "25";
    draft.instagram.audienceAgeMax = "44";
    const restored = restoreWizardForm(profile, draft);
    expect(restored.instagram.audienceAgeRange).toBe("25-44");
    expect(restored.instagram.audienceDescription).toBe("");
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
