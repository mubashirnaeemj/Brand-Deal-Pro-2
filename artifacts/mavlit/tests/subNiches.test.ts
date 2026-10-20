import { describe, expect, it } from "vitest";
import { normalizeSubNiche, normalizeSubNiches } from "@/lib/subNiches";
import { profilePatch, profileToForm } from "@/pages/profileForm";
import { restoreWizardForm } from "@/pages/profileWizardModel";
import { creatorProfile } from "./fixtures/creatorProfile";

describe("space-separated sub-niches", () => {
  it("replaces underscores, trims whitespace, and removes empty and duplicate entries", () => {
    expect(normalizeSubNiche("  country__music ")).toBe("country music");
    expect(normalizeSubNiches(["country_music", "Country music", "  bedroom__pop  ", "___", "bedroom pop"]))
      .toEqual(["country music", "bedroom pop"]);
  });

  it("normalizes persisted active-platform values on save without rewriting hidden YouTube data", () => {
    const profile = creatorProfile({ instagram_sub_niches: ["country_music"], youtube_sub_niches: ["hidden_youtube_value"] });
    const form = profileToForm(profile);
    form.primaryPlatforms = ["instagram"];
    expect(form.instagram.subNiches).toEqual(["country music"]);
    const patch = profilePatch(form, profile);
    expect(patch.instagram_sub_niches).toEqual(["country music"]);
    expect(patch).not.toHaveProperty("youtube_sub_niches");
  });

  it("normalizes new custom values and old drafts, and supports clearing every sub-niche", () => {
    const profile = creatorProfile();
    const draft = profileToForm(profile);
    draft.instagram.subNiches = ["country_music", "bedroom__pop"];
    const restored = restoreWizardForm(profile, draft);
    expect(restored.instagram.subNiches).toEqual(["country music", "bedroom pop"]);
    expect(profilePatch(restored, profile).instagram_sub_niches).toEqual(["country music", "bedroom pop"]);
    restored.instagram.subNiches = [];
    expect(profilePatch(restored, profile).instagram_sub_niches).toEqual([]);
  });
});
