import { describe, expect, it } from "vitest";
import { NICHE_OPTIONS, SUB_NICHES_BY_NICHE, subNicheOptions } from "@/components/onboarding/types";
import { normalizeSubNiche } from "@/lib/subNiches";

describe("sub-niche choices", () => {
  it("has the four niches with exactly 50 sub-niches each", () => {
    expect([...NICHE_OPTIONS].sort()).toEqual(["Beauty", "Fitness", "Health", "Music"]);
    for (const niche of NICHE_OPTIONS) expect(SUB_NICHES_BY_NICHE[niche], niche).toHaveLength(50);
  });

  it("never repeats a sub-niche: not within a niche and not across niches (ignoring case and spacing)", () => {
    const all = NICHE_OPTIONS.flatMap((niche) => [...SUB_NICHES_BY_NICHE[niche]]);
    expect(all).toHaveLength(200);
    const keys = all.map((value) => normalizeSubNiche(value).toLowerCase());
    expect(new Set(keys).size).toBe(200);
  });

  it("every sub-niche is a clean, non-empty label", () => {
    for (const niche of NICHE_OPTIONS) {
      for (const value of SUB_NICHES_BY_NICHE[niche]) {
        expect(value).toBe(value.trim());
        expect(normalizeSubNiche(value)).toBe(value);   // normalizing leaves it unchanged, so saved values match the options
        expect(value.length).toBeGreaterThan(1);
      }
    }
  });

  it("offers the sub-niches of every selected niche, once each", () => {
    expect(subNicheOptions(["Music"])).toHaveLength(50);
    expect(subNicheOptions(["Music", "Fitness"])).toHaveLength(100);
    expect(subNicheOptions(["Music", "Music"])).toHaveLength(50);
    expect(subNicheOptions(["Cooking"])).toEqual([]);
  });
});
