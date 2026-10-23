import { describe, expect, it } from "vitest";
import { filterByNiche, matchNiches } from "@/lib/matchSearch";

const brands = [
  { name: "a", niche: "Music" }, { name: "b", niche: "Tech" }, { name: "c", niche: "music" },
  { name: "d", niche: null }, { name: "e", niche: "  " }, { name: "f", niche: "Beauty" },
];

describe("matchNiches", () => {
  it("lists only the niches present, counted case-insensitively, sorted, without empty ones", () => {
    expect(matchNiches(brands)).toEqual([
      { niche: "Beauty", count: 1 }, { niche: "Music", count: 2 }, { niche: "Tech", count: 1 },
    ]);
  });
  it("is empty when no brand has a niche", () => {
    expect(matchNiches([{ niche: null }, { niche: "" }])).toEqual([]);
  });
});

describe("filterByNiche", () => {
  it("keeps only the brands of the niche, ignoring case", () => {
    expect(filterByNiche(brands, "Music").map((brand) => brand.name)).toEqual(["a", "c"]);
    expect(filterByNiche(brands, "tech").map((brand) => brand.name)).toEqual(["b"]);
  });
  it("keeps the brands of any of several chosen niches", () => {
    expect(filterByNiche(brands, ["Music", "beauty"]).map((brand) => brand.name)).toEqual(["a", "c", "f"]);
    expect(filterByNiche(brands, ["Tech", "Food"]).map((brand) => brand.name)).toEqual(["b"]);
  });
  it("returns every brand when nothing is chosen and none for an unknown niche", () => {
    expect(filterByNiche(brands, "")).toHaveLength(brands.length);
    expect(filterByNiche(brands, [])).toHaveLength(brands.length);
    expect(filterByNiche(brands, "Food")).toEqual([]);
  });
});
