import { describe, expect, it } from "vitest";
import { nicheTextClass } from "@/lib/nicheColors";

describe("nicheTextClass", () => {
  it("gives each main niche its own colour", () => {
    const niches = ["Music", "Tech", "Beauty", "Fitness", "Health", "Fashion", "Food beverage", "Finance", "Home goods", "Entertainment"];
    const classes = niches.map((niche) => nicheTextClass(niche));
    expect(new Set(classes).size).toBe(niches.length);
    expect(classes.every((name) => /^text-[a-z]+-\d{3}$/.test(name))).toBe(true);
  });

  it("is the same colour for the same niche however it is written", () => {
    expect(nicheTextClass("music")).toBe(nicheTextClass("Music"));
    expect(nicheTextClass("  MUSIC ")).toBe(nicheTextClass("Music"));
    expect(nicheTextClass("Food_beverage")).toBe(nicheTextClass("Food beverage"));
    expect(nicheTextClass("food-beverage")).toBe(nicheTextClass("Food beverage"));
  });

  it("gives an unlisted niche a stable colour, and a muted one when there is no niche", () => {
    expect(nicheTextClass("Pet supplies")).toBe(nicheTextClass("Pet supplies"));
    expect(nicheTextClass("Pet supplies")).toMatch(/^text-[a-z]+-\d{3}$/);
    for (const none of [null, undefined, "", "  ", "Uncategorized", "Unknown"]) {
      expect(nicheTextClass(none)).toBe("text-muted-foreground");
    }
  });
});
