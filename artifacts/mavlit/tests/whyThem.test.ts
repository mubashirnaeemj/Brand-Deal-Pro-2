import { describe, expect, it } from "vitest";
import type { SimilarCreator, YouStats } from "@/lib/similarCreators";
import { sampleMix, theirMix, whyAdvice, whyRows, yourMix, type Mix, type Samples } from "@/lib/whyThem";

const creator = (extra: Partial<SimilarCreator> = {}): SimilarCreator => ({
  username: "abc", full_name: null, profile_url: "https://www.instagram.com/abc", niche: "Music", description: null, tags: [], country: null, followers: 20_000,
  avg_likes: null, avg_comments: null, engagement_rate: 3, unique_brands: 3, top_brand_categories: [], top_formats: [], avg_reel_views: 50_000, posts_per_week: 3, product_focused_pct: null, content_categories: null, similarity: 80, partnership_count: 5, partnerships: [], ...extra,
});
const you = (extra: Partial<YouStats> = {}): YouStats => ({ name: "Nova H", avg_likes: 100, avg_comments: 10, handle: "me", followers: 10_000, engagement_rate: 6, avg_reel_views: 100_000, posts_per_week: 1.5, brand_partnerships: 2, product_focused_pct: null, content_categories: null, ...extra });

describe("whyRows", () => {
  it("has the five numbers, in order, and no content-mix rows", () => {
    expect(whyRows(you(), creator()).map((r) => r.key)).toEqual(["followers", "views", "engagement", "frequency", "deals"]);
  });
  it("leaves out a number either side lacks", () => {
    expect(whyRows(you({ brand_partnerships: null }), creator()).map((r) => r.key)).toContain("deals");   // a missing count is 0, not a gap
    expect(whyRows(you(), creator({ avg_reel_views: null, posts_per_week: null })).map((r) => r.key)).toEqual(["followers", "engagement", "deals"]);
  });
  it("shows posts per week with one decimal and a count as a whole number", () => {
    const rows = Object.fromEntries(whyRows(you(), creator()).map((r) => [r.key, r]));
    expect(rows.frequency.show(rows.frequency.them)).toBe("3.0");
    expect(rows.deals.show(rows.deals.them)).toBe("5");
  });
});

describe("whyAdvice (no LLM: sentences from the numbers)", () => {
  it("puts each lead on the right side, in the wording of the page", () => {
    const advice = whyAdvice(you(), creator());
    expect(advice.theirAdvantages).toEqual([
      "100% larger audience (20K vs 10K).",
      "Posts more often (3.0 vs 1.5 a week).",
      "Has more previous brand partnerships (5 vs 2).",
    ]);
    expect(advice.yourAdvantages).toEqual([
      "100% more average Reel views than @abc.",
      "Higher engagement rate (6% vs 3%).",
    ]);
  });
  it("words their lead in views and engagement, and yours in audience", () => {
    const advice = whyAdvice(you({ followers: 40_000, avg_reel_views: 10_000, engagement_rate: 2 }), creator());
    expect(advice.theirAdvantages).toContain("400% more average Reel views.");
    expect(advice.theirAdvantages).toContain("Higher engagement rate (3% vs 2%).");
    expect(advice.yourAdvantages).toContain("100% larger audience than @abc.");
  });
  it("ignores a lead under 8% and says so when nobody leads", () => {
    const advice = whyAdvice(you({ followers: 20_000, avg_reel_views: 50_000, engagement_rate: 3, posts_per_week: 3, brand_partnerships: 5 }), creator({ followers: 21_000 }));
    expect(advice.theirAdvantages).toEqual(["No clear metric lead over you."]);
    expect(advice.yourAdvantages).toEqual(["No clear metric lead over this creator right now."]);
  });
  it("handles a zero on your side without dividing by it", () => {
    const advice = whyAdvice(you({ brand_partnerships: 0 }), creator());
    expect(advice.theirAdvantages).toContain("Has more previous brand partnerships (5 vs 0).");
  });
  it("gives 3 to 5 improvements, built from the numbers where you are behind", () => {
    const advice = whyAdvice(you(), creator());
    expect(advice.improvements.length).toBeGreaterThanOrEqual(3);
    expect(advice.improvements.length).toBeLessThanOrEqual(5);
    expect(advice.improvements.join(" ")).toContain("3.0 posts a week");
    expect(advice.improvements.join(" ")).not.toMatch(/product demonstration|educational/i);
  });
});

const mix = (product: number, categories: Record<string, number>): Mix => ({ product, categories });

describe("the sample numbers that stand in for a missing value", () => {
  const samples: Samples = { you: { avgReelViews: 21_400 }, them: { avgReelViews: 25_800 } };
  it("fill a side that has no average Reel views, and are not used when it has them", () => {
    const rows = whyRows(you({ avg_reel_views: null }), creator({ avg_reel_views: null }), undefined, samples);
    expect(rows.find((r) => r.key === "views")).toMatchObject({ me: 21_400, them: 25_800 });
    const real = whyRows(you(), creator(), undefined, samples);
    expect(real.find((r) => r.key === "views")).toMatchObject({ me: 100_000, them: 50_000 });
  });
  it("never fill the brand partnerships: yours is the number of posts you marked, and 0 when there is none", () => {
    const none = whyRows(you({ brand_partnerships: null }), creator(), undefined, samples).find((r) => r.key === "deals");
    expect(none).toMatchObject({ me: 0, them: 5 });                                          // null counts as 0, and the row is there
    expect(whyRows(you({ brand_partnerships: 3 }), creator()).find((r) => r.key === "deals")).toMatchObject({ me: 3, them: 5 });
    expect(whyAdvice(you({ brand_partnerships: null }), creator()).theirAdvantages).toContain("Has more previous brand partnerships (5 vs 0).");
  });
  it("leave the rows out when no samples are given, and never fill followers, engagement or posts per week", () => {
    expect(whyRows(you({ avg_reel_views: null }), creator()).map((r) => r.key)).toEqual(["followers", "engagement", "frequency", "deals"]);   // no sample views given: that row is left out
    const keys = whyRows(you({ followers: null, engagement_rate: null, posts_per_week: null }), creator(), undefined, samples).map((r) => r.key);
    expect(keys).toEqual(["views", "deals"]);   // the Reel views use the sample; the brand partnerships are always compared
  });
  it("go into the advice sentences too", () => {
    const advice = whyAdvice(you({ avg_reel_views: null }), creator({ avg_reel_views: null }), undefined, samples);
    expect(advice.theirAdvantages).toContain("21% more average Reel views.");                // 25.8K against 21.4K
  });
});

describe("the content mix rows", () => {
  const mixes = { you: mix(40, { Tutorial: 30, "Product review": 20, Lifestyle: 10 }), them: mix(20, { Tutorial: 10, Entertainment: 50, Educational: 5 }) };

  it("adds Product-focused content after the five numbers, and no content category rows", () => {
    const rows = whyRows(you(), creator(), mixes);
    expect(rows.map((r) => r.key)).toEqual(["followers", "views", "engagement", "frequency", "deals", "product"]);
    expect(rows[5]).toMatchObject({ key: "product", label: "Product-focused content", me: 40, them: 20 });
    expect(rows[5].show(40)).toBe("40%");
    for (const label of ["Entertainment content", "Lifestyle content", "Product review content", "Tutorial content", "Educational content"]) {
      expect(rows.map((r) => r.label)).not.toContain(label);
    }
  });
  it("turns the product-focused lead into a sentence but not the categories", () => {
    expect(whyAdvice(you(), creator(), mixes).yourAdvantages).toContain("Publishes more product-focused content (40% vs 20%).");
    const behind = whyAdvice(you(), creator(), { ...mixes, you: mix(10, mixes.you.categories) });
    expect(behind.theirAdvantages).toContain("Publishes more product-focused content (20% vs 10%).");
    expect(behind.theirAdvantages.join(" ")).not.toMatch(/Entertainment/);
  });
  it("uses the mix saved on your profile, else the sample one", () => {
    const sample = { strategy: { productFocused: 22, tutorial: 30, productReview: 20, lifestyle: 20, educational: 10, entertainment: 20 } } as never;
    const real = yourMix(you({ product_focused_pct: 35, content_categories: [{ name: "Tutorial", pct: 32 }, { name: "Product review", pct: 18 }] }), sample);
    expect(real).toEqual({ product: 35, categories: { Tutorial: 32, "Product review": 18 }, real: true });
    const fallback = yourMix(you(), sample);
    expect(fallback.real).toBe(false);
    expect(fallback.product).toBe(22);
    expect(fallback.categories).toEqual({ Tutorial: 30, "Product review": 20, Lifestyle: 20, Educational: 10, Entertainment: 20 });
    expect(sampleMix(sample).product).toBe(22);
    // a similar creator's own estimated mix wins over the sample one
    expect(theirMix(creator({ product_focused_pct: 50, content_categories: [{ name: "Promotional", pct: 50 }] }), sample)).toEqual({ product: 50, categories: { Promotional: 50 }, real: true });
    expect(theirMix(creator(), sample).real).toBe(false);
  });
});
