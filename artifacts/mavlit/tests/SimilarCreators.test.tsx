import { cleanup, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import Feed from "@/pages/Feed";
import { avatarHue, formatPostDate } from "@/lib/similarCreators";
import type { SimilarCreatorsResponse } from "@/lib/similarCreators";
import { installProfileApi } from "./fixtures/profileApi";
import { creatorProfile } from "./fixtures/creatorProfile";
import { renderProfile } from "./renderProfile";

const RESPONSE: SimilarCreatorsResponse = {
  ready: true, threshold: 70, min_partnership_score: 90, your_followers: 10_000, audience_range: { min: 3_334, max: 20_000 },
  you: { name: "Nova H", avg_likes: 400, avg_comments: 40, handle: "me", followers: 10_000, engagement_rate: 5, avg_reel_views: 20_000, posts_per_week: 2, brand_partnerships: 1,
          product_focused_pct: 35, content_categories: [{ name: "Tutorial", pct: 32 }, { name: "Product review", pct: 18 }, { name: "Lifestyle", pct: 20 }, { name: "Entertainment", pct: 10 }, { name: "Educational", pct: 5 }] },
  creators: [
    { username: "skinbyalice", full_name: "Alice A", profile_url: "https://www.instagram.com/skinbyalice", niche: "Beauty", description: "Skincare routines for sensitive skin.",
      tags: ["skincare", "spf", "routines"], country: "US", followers: 12_400, avg_likes: 900, avg_comments: 100, engagement_rate: 8.1, unique_brands: 6, top_brand_categories: ["Music", "Beauty"], top_formats: ["Reel", "Video"], avg_reel_views: 30_000, posts_per_week: 3.5, product_focused_pct: null, content_categories: null, similarity: 91, partnership_count: 10,
      partnerships: [{ brand: "Acme", category: "Music", post_url: "https://www.instagram.com/p/ABC/", date: "2026-05-01", confidence: 95, type: "Reel", likes: 11_800, comments: 612, views: 142_000, engagement: 8.7, thumbnail_url: "/feed/post-thumbnail?code=ABC" }, { brand: null, category: null, post_url: null, date: null, confidence: 92, type: "Post", likes: null, comments: null, views: null, engagement: null, thumbnail_url: null }] },
    { username: "glowcarol", full_name: null, profile_url: "https://www.instagram.com/glowcarol", niche: "Beauty", description: null, tags: [], country: null, followers: null, avg_likes: null, avg_comments: null, engagement_rate: null, unique_brands: 1, top_brand_categories: [], top_formats: ["Post"], avg_reel_views: null, posts_per_week: null, product_focused_pct: null, content_categories: null,
      similarity: 72, partnership_count: 1, partnerships: [{ brand: "Globex", category: null, post_url: "https://www.instagram.com/p/XYZ/", date: "2026-04-01", confidence: 92, type: "Video", likes: 40, comments: 4, views: 900, engagement: 0.4, thumbnail_url: "/feed/post-thumbnail?code=MISSING1" }] },
  ],
};

const four = (): SimilarCreatorsResponse => ({
  ...RESPONSE,
  creators: ["skinbyalice", "glowcarol", "dermdan", "serumsam"].map((username, i) => ({
    ...RESPONSE.creators[0], username, full_name: null, profile_url: `https://www.instagram.com/${username}`, similarity: 90 - i, followers: 10_000 * (i + 1),
  })),
});

let api: ReturnType<typeof installProfileApi>;
beforeEach(() => {
  vi.stubGlobal("ResizeObserver", class { observe() {} unobserve() {} disconnect() {} });
  Object.assign(HTMLElement.prototype, { hasPointerCapture: () => false, setPointerCapture: () => {}, releasePointerCapture: () => {}, scrollIntoView: () => {} });
  window.history.replaceState(null, "", "/feed");
  api = installProfileApi(creatorProfile({ onboarding_completed: true }));
});
afterEach(cleanup);

const openSimilar = async () => {
  renderProfile(<Feed />);
  await screen.findByRole("heading", { name: "Feed" });
  await userEvent.click(screen.getByTestId("feed-tab-similar"));
};

describe("Similar Creators (real data)", () => {
  it("shows the creators the API returns, with their numbers", async () => {
    api.setSimilarCreators(RESPONSE);
    await openSimilar();
    expect(await screen.findByTestId("creator-card-skinbyalice")).toBeInTheDocument();
    expect(screen.getByTestId("similar-stat-similar-creators")).toHaveTextContent("2");
    expect(screen.getByTestId("similar-stat-avg-match")).toHaveTextContent("82%");        // (91 + 72) / 2
    expect(screen.getByTestId("similar-stat-avg-followers")).toHaveTextContent("12.4K");   // only creators with a follower count
    expect(screen.getByTestId("similar-stat-detected-partnerships")).toHaveTextContent("11");
    const card = screen.getByTestId("creator-card-skinbyalice");
    expect(within(card).getByText("@skinbyalice")).toBeInTheDocument();
    expect(within(card).getByText("91% match")).toBeInTheDocument();
    expect(within(card).getByText("8.1%")).toBeInTheDocument();                           // engagement rate from the API
    expect(within(card).getByText("Engagement")).toBeInTheDocument();
    expect(within(card).getByText("Skincare routines for sensitive skin.")).toBeInTheDocument();
    expect(within(card).getByText("skincare")).toBeInTheDocument();
    expect(within(screen.getByTestId("creator-card-glowcarol")).getAllByText("—")).toHaveLength(2);   // no follower count and no engagement rate
    expect(api.requests.some((r) => r.path === "/api/mavlit/feed/similar-creators")).toBe(true);
    expect(screen.getByRole("button", { name: "Compare Creators" })).toBeInTheDocument();
    expect(within(card).getByRole("button", { name: "Why them, not me? @skinbyalice" })).toBeInTheDocument();
    expect(within(card).queryByText(/US/)).toBeNull();   // the country is not shown
  });

  it("opens the partnership history with links to the original posts", async () => {
    api.setSimilarCreators(RESPONSE);
    await openSimilar();
    await userEvent.click(await screen.findByRole("button", { name: "View partnerships for @skinbyalice" }));
    const dialog = await screen.findByRole("dialog");
    expect(within(dialog).getByRole("heading", { name: "@skinbyalice" })).toBeInTheDocument();
    // the creator's numbers first, like the prototype
    const numbers = within(dialog).getByLabelText("Creator numbers");
    expect(within(numbers).getByText("Followers").nextElementSibling).toHaveTextContent("12.4K");
    expect(within(numbers).getByText("Engagement").nextElementSibling).toHaveTextContent("8.1%");
    expect(within(numbers).getByText("Partnerships").nextElementSibling).toHaveTextContent("10");
    expect(within(dialog).getByRole("heading", { name: "Partnership history" })).toBeInTheDocument();
    expect(within(dialog).getAllByTestId(/^history-/)).toHaveLength(2);
    const first = within(dialog).getByTestId("history-0");
    expect(within(first).getByText("Acme")).toBeInTheDocument();
    expect(within(first).getByText("Reel")).toBeInTheDocument();                                  // the post type
    expect(within(first).getByText(/Music · 8.7% engagement/)).toBeInTheDocument();               // date · category · engagement
    expect(within(first).getByText("142K")).toBeInTheDocument();                                  // views
    expect(within(first).getByText("11.8K")).toBeInTheDocument();                                 // likes
    expect(within(first).getByText("612")).toBeInTheDocument();                                   // comments
    expect(await within(first).findByTestId("post-thumbnail")).toBeInTheDocument();               // the post picture, like on the profile page
    expect(api.requests.some((r) => r.path === "/api/mavlit/feed/post-thumbnail" && r.search === "?code=ABC")).toBe(true);
    const second = within(dialog).getByTestId("history-1");
    expect(within(second).getByText("Unknown brand")).toBeInTheDocument();
    expect(within(second).getByTestId("post-thumbnail-empty")).toHaveTextContent("No picture");    // no Instagram link, so no picture
    expect(within(second).getAllByText("—")).toHaveLength(3);                                     // nothing is known about that post's numbers
    expect(within(dialog).getByRole("link", { name: /View original post/ })).toHaveAttribute("href", "https://www.instagram.com/p/ABC/");
    expect(within(dialog).getByText(/Showing the 2 most recent of 10/)).toBeInTheDocument();
    expect(within(dialog).queryByText("US")).toBeNull();
  });

  it("asks the user to finish the profile when it has no embedding yet", async () => {
    api.setSimilarCreators({ ...RESPONSE, ready: false, creators: [] });
    await openSimilar();
    expect(await screen.findByText("Finish your profile to see similar creators")).toBeInTheDocument();
  });

  it("says so when nobody is 70% similar", async () => {
    api.setSimilarCreators({ ...RESPONSE, creators: [] });
    await openSimilar();
    expect(await screen.findByText("No similar creators yet")).toBeInTheDocument();
    expect(screen.getByText(/No creator with a confirmed brand partnership/)).toBeInTheDocument();
  });

  it("shows an error with a retry when the request fails", async () => {
    api.failSimilarCreators();
    await openSimilar();
    expect(await screen.findByText("Could not load similar creators")).toBeInTheDocument();
    api.failSimilarCreators(false); api.setSimilarCreators(RESPONSE);
    await userEvent.click(screen.getByRole("button", { name: "Try again" }));
    expect(await screen.findByTestId("creator-card-glowcarol")).toBeInTheDocument();
  });
});

describe("Why Them, Not Me? and Compare Creators (sample numbers for the real creators)", () => {
  it("compares you with the creator on real numbers: advantages from the data", async () => {
    api.setSimilarCreators(RESPONSE);
    await openSimilar();
    await userEvent.click(await screen.findByRole("button", { name: "Why them, not me? @skinbyalice" }));
    const dialog = await screen.findByRole("dialog");
    expect(within(dialog).getByRole("heading", { name: "Why Them, Not Me?" })).toBeInTheDocument();
    for (const name of ["Their Advantages", "Your Advantages", "Opportunities to Improve"]) expect(within(dialog).getByRole("region", { name })).toBeInTheDocument();
    // the five numbers, and nothing about product-focused or tutorial content
    for (const key of ["followers", "views", "engagement", "frequency", "deals"]) expect(within(dialog).getByTestId(`why-row-${key}`)).toBeInTheDocument();
    // the content mix is not compared while the creator has no estimated one (theirs is sample data): it is listed as not compared
    expect(within(dialog).queryByTestId("why-row-product")).toBeNull();
    expect(within(dialog).queryByTestId(/^why-row-category:/)).toBeNull();
    expect(within(dialog).getByTestId("why-missing")).toHaveTextContent("Not compared, because one of you has no number yet: Product-focused content, Content categories.");
    expect(within(dialog).getByTestId("why-row-followers")).toHaveTextContent("12.4K");
    expect(within(dialog).getByTestId("why-row-views")).toHaveTextContent("30K");
    expect(within(dialog).getByTestId("why-row-engagement")).toHaveTextContent("8.1%");
    expect(within(dialog).getByTestId("why-row-frequency")).toHaveTextContent("3.5");
    expect(within(dialog).getByTestId("why-row-deals")).toHaveTextContent("10");
    const theirs = within(within(dialog).getByRole("region", { name: "Their Advantages" }));
    expect(theirs.getByText("24% larger audience (12.4K vs 10K).")).toBeInTheDocument();
    expect(theirs.getByText("Posts more often (3.5 vs 2.0 a week).")).toBeInTheDocument();
    expect(theirs.getByText("Has more previous brand partnerships (10 vs 1).")).toBeInTheDocument();
    // the content category distribution is still the prototype's sample chart, shown with no sample-data line
    const mix = within(dialog).getByRole("region", { name: "Content category distribution" });
    expect(within(mix).getByText(/Their top category is/)).toBeInTheDocument();
    expect(within(mix).queryByTestId("sample-data-note")).toBeNull();
    expect(within(mix).queryByText(/Sample data/)).toBeNull();
  });

  it("leaves out a number one of you does not have, and says how to add the brand partnerships", async () => {
    api.setSimilarCreators({ ...RESPONSE, you: { ...RESPONSE.you, brand_partnerships: null, avg_reel_views: null } });
    await openSimilar();
    await userEvent.click(await screen.findByRole("button", { name: "Why them, not me? @skinbyalice" }));
    const dialog = await screen.findByRole("dialog");
    expect(within(dialog).queryByTestId("why-row-deals")).toBeNull();
    expect(within(dialog).queryByTestId("why-row-views")).toBeNull();
    expect(within(dialog).getByTestId("why-missing")).toHaveTextContent(/Avg Reel views, Brand partnerships, Product-focused content, Content categories\./);
    expect(within(dialog).getByTestId("why-missing")).toHaveTextContent(/Add your brand partnerships on your profile/);
  });

  it("limits the selection to three, lets you remove one and shows the dashboard", async () => {
    api.setSimilarCreators(four());
    await openSimilar();
    await userEvent.click(await screen.findByRole("button", { name: "Compare Creators" }));
    for (const h of ["skinbyalice", "glowcarol", "dermdan"]) await userEvent.click(screen.getByRole("button", { name: `Add @${h} to comparison` }));
    expect(screen.getByRole("button", { name: "Compare (3/3)" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Add @serumsam to comparison" })).toBeDisabled();
    await userEvent.click(within(screen.getByRole("list", { name: "Selected creators" })).getByRole("button", { name: "Remove @glowcarol from comparison" }));
    expect(screen.getByRole("button", { name: "Compare (2/3)" })).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Compare (2/3)" }));
    const dialog = await screen.findByRole("dialog");
    expect(within(dialog).getByRole("heading", { name: "Compare Creators" })).toBeInTheDocument();
    expect(within(dialog).getByTestId("cmp-col-real:skinbyalice")).toBeInTheDocument();
    expect(within(dialog).queryByTestId("cmp-col-real:glowcarol")).toBeNull();
    expect(within(dialog).getByTestId("cmp-followers")).toHaveTextContent("10K");
  });

  const openCompare = async (response: SimilarCreatorsResponse, picks: string[]) => {
    api.setSimilarCreators(response);
    await openSimilar();
    await userEvent.click(await screen.findByRole("button", { name: "Compare Creators" }));
    for (const h of picks) await userEvent.click(screen.getByRole("button", { name: `Add @${h} to comparison` }));
    await userEvent.click(screen.getByRole("button", { name: `Compare (${picks.length}/3)` }));
    return await screen.findByRole("dialog");
  };

  it("shows you with your own name and handle, not the prototype's profile", async () => {
    const dialog = await openCompare(RESPONSE, ["skinbyalice"]);
    const me = within(dialog).getByTestId("cmp-col-me");
    expect(within(me).getByText("You")).toBeInTheDocument();
    expect(within(me).getByText("@me")).toBeInTheDocument();             // your Instagram handle
    expect(within(me).getByText("NH")).toBeInTheDocument();              // the initials of your name (Nova H)
    expect(within(dialog).queryByText(/nova\.sound/)).toBeNull();        // nothing of the mock profile is left
  });

  it("fills the table with the real numbers of you and the creator", async () => {
    const dialog = await openCompare(RESPONSE, ["skinbyalice"]);
    expect(within(dialog).getByTestId("cmp-followers")).toHaveTextContent("10K");
    expect(within(dialog).getByTestId("cmp-followers")).toHaveTextContent("12.4K");
    expect(within(dialog).getByTestId("cmp-engagement-rate")).toHaveTextContent("5%");       // yours, from your profile
    expect(within(dialog).getByTestId("cmp-engagement-rate")).toHaveTextContent("8.1%");
    expect(within(dialog).getByTestId("cmp-average-reel-views")).toHaveTextContent("20K");
    expect(within(dialog).getByTestId("cmp-average-reel-views")).toHaveTextContent("30K");
    expect(within(dialog).getByTestId("cmp-average-likes")).toHaveTextContent("400");        // yours
    expect(within(dialog).getByTestId("cmp-average-likes")).toHaveTextContent("900");        // theirs
    expect(within(dialog).getByTestId("cmp-posts-per-week")).toHaveTextContent("2.0");
    expect(within(dialog).getByTestId("cmp-posts-per-week")).toHaveTextContent("3.5");
    // the Partnership performance section is gone from the table
    expect(within(dialog).queryByText("Partnership performance")).toBeNull();
    expect(within(dialog).queryByTestId("cmp-total-detected-partnerships")).toBeNull();
    expect(within(dialog).queryByTestId("cmp-unique-brands")).toBeNull();
  });

  it("names who leads each highlight card, from the real numbers", async () => {
    const dialog = await openCompare(RESPONSE, ["skinbyalice"]);
    expect(within(dialog).getByTestId("highlight-highest-engagement-rate")).toHaveTextContent(/@skinbyalice\s*8.1%/);   // 8.1% against your 5%
    expect(within(dialog).getByTestId("highlight-highest-average-views")).toHaveTextContent(/@skinbyalice\s*30K/);       // 30K against your 20K
    expect(within(dialog).getByTestId("highlight-most-partnerships")).toHaveTextContent(/@skinbyalice\s*10/);            // 10 against your 1
    expect(within(dialog).getByTestId("highlight-strongest-content-category")).toHaveTextContent(/%/);
  });

  it("gives you the card when you lead, and shares a card between creators who are level", async () => {
    const you = { ...RESPONSE.you, engagement_rate: 9, avg_reel_views: 50_000, brand_partnerships: 10 };
    const dialog = await openCompare({ ...RESPONSE, you }, ["skinbyalice"]);
    expect(within(dialog).getByTestId("highlight-highest-engagement-rate")).toHaveTextContent(/You\s*9%/);
    expect(within(dialog).getByTestId("highlight-highest-average-views")).toHaveTextContent(/You\s*50K/);
    expect(within(dialog).getByTestId("highlight-most-partnerships")).toHaveTextContent(/You & @skinbyalice\s*10/);        // 10 and 10: level, so both are named
  });

  it("lists what is still placeholder data, per column, and nothing that is real", async () => {
    const dialog = await openCompare(RESPONSE, ["skinbyalice"]);
    const note = within(dialog).getByTestId("sample-data-note");
    expect(note).toHaveTextContent(/You: Content strategy/);                                             // the content strategy is the prototype's sample for everyone
    expect(note).toHaveTextContent(/@skinbyalice: Content strategy/);
    expect(note).not.toHaveTextContent(/Followers|Engagement rate|Posts per week|Brand partnerships|Reel views|Unique brands/);   // all real (or not shown any more)
  });

  it("shows 0, not a made-up number, when there are no view counts, and still marks a missing posts per week as a placeholder", async () => {
    const noViews = { ...RESPONSE, you: { ...RESPONSE.you, avg_reel_views: null }, creators: [{ ...RESPONSE.creators[0], avg_reel_views: null, posts_per_week: null }] };
    const dialog = await openCompare(noViews, ["skinbyalice"]);
    expect(within(dialog).getByTestId("cmp-average-reel-views")).toHaveTextContent(/^Average Reel views\s*0\s*0$/);   // you and the creator: 0
    const note = within(dialog).getByTestId("sample-data-note");
    expect(note).not.toHaveTextContent(/Reel views/);
    expect(note).toHaveTextContent(/@skinbyalice: [^·]*Posts per week/);
  });

  it("keeps the content strategy as sample data even when a mix was estimated", async () => {
    const mix = [{ name: "Tutorial", pct: 90 }, { name: "Lifestyle", pct: 10 }];
    const estimated = { ...RESPONSE, you: { ...RESPONSE.you, product_focused_pct: 20, content_categories: mix }, creators: [{ ...RESPONSE.creators[0], product_focused_pct: 40, content_categories: mix }] };
    const dialog = await openCompare(estimated, ["skinbyalice"]);
    expect(within(dialog).getByTestId("sample-data-note")).toHaveTextContent(/Content strategy/);
    expect(within(dialog).getByTestId("cmp-tutorial")).not.toHaveTextContent("90%");
  });
});

describe("Same audience size filter", () => {
  it("is a hard filter the server applies: a third to twice my followers", async () => {
    const filtered: SimilarCreatorsResponse = { ...RESPONSE, creators: [RESPONSE.creators[0]] };
    api.setSimilarCreators(RESPONSE, filtered);
    await openSimilar();
    expect(await screen.findByTestId("creator-card-glowcarol")).toBeInTheDocument();
    expect(screen.getByTestId("same-audience-hint")).toHaveTextContent("3.3K to 20K followers: a third to twice your 10K");
    const box = screen.getByTestId("filter-same-audience");
    expect(box).not.toBeChecked();
    await userEvent.click(box);
    await waitFor(() => expect(screen.queryByTestId("creator-card-glowcarol")).toBeNull());
    expect(screen.getByTestId("creator-card-skinbyalice")).toBeInTheDocument();
    expect(screen.getByTestId("filter-same-audience")).toBeChecked();
    expect(api.requests.some((r) => r.path === "/api/mavlit/feed/similar-creators" && r.search === "?same_audience=true")).toBe(true);
    await userEvent.click(screen.getByTestId("filter-same-audience"));
    expect(await screen.findByTestId("creator-card-glowcarol")).toBeInTheDocument();                  // unticked: everyone is back
  });

  it("keeps the checkbox when nobody is in the range, so it can be unticked", async () => {
    api.setSimilarCreators(RESPONSE, { ...RESPONSE, creators: [] });
    await openSimilar();
    await userEvent.click(await screen.findByTestId("filter-same-audience"));
    expect(await screen.findByText("No creators with a similar audience size")).toBeInTheDocument();
    expect(screen.getByTestId("filter-same-audience")).toBeChecked();
    await userEvent.click(screen.getByTestId("filter-same-audience"));
    expect(await screen.findByTestId("creator-card-skinbyalice")).toBeInTheDocument();
  });

  it("is switched off, with a hint, when the profile has no follower count", async () => {
    api.setSimilarCreators({ ...RESPONSE, your_followers: null, audience_range: null });
    await openSimilar();
    expect(await screen.findByTestId("filter-same-audience")).toBeDisabled();
    expect(screen.getByTestId("same-audience-hint")).toHaveTextContent("Add your follower count");
  });
});

describe("the creator's own content mix", () => {
  it("is used, with no sample note, once the creators script has estimated it", async () => {
    const real = { ...RESPONSE.creators[0], product_focused_pct: 55, content_categories: [{ name: "Product review", pct: 50 }, { name: "Promotional", pct: 30 }, { name: "Lifestyle", pct: 20 }] };
    api.setSimilarCreators({ ...RESPONSE, creators: [real, RESPONSE.creators[1]] });
    await openSimilar();
    await userEvent.click(await screen.findByRole("button", { name: "Why them, not me? @skinbyalice" }));
    const dialog = await screen.findByRole("dialog");
    expect(within(dialog).getByTestId("why-row-product")).toHaveTextContent("55%");                      // theirs, from the API
    expect(within(dialog).getByTestId("why-row-category:Product review")).toHaveTextContent("50%");
    expect(within(dialog).getByTestId("why-row-category:Promotional")).toHaveTextContent("30%");           // a category only the 8-name list has
    expect(within(dialog).getByTestId("mix-source-note")).toHaveTextContent("Content mix estimated by MAVLIT from each creator's captions.");
  });
});

const READY_COMPETITOR = {
  id: 501, handle: "rival", status: "ready", stage: "Ready", error: null, source: "apify", full_name: "Rival R", followers: 8_000, posts_analyzed: 20,
  avg_likes: 400, avg_comments: 40, engagement_rate: 5.5, avg_reel_views: 12_000, posts_per_week: 2.5,
  product_focused_pct: 30, content_categories: [{ name: "Tutorial", pct: 60 }, { name: "Lifestyle", pct: 40 }],
  partnership_count: 3, partnership_brands: [{ brand_raw_id: 9, handle: "nike", name: null, posts: 2 }, { brand_raw_id: 10, handle: "acme", name: "Acme", posts: 1 }],
};

describe("Your competitors (Compare Creators)", () => {
  const openCompareMode = async (response: SimilarCreatorsResponse = RESPONSE) => {
    api.setSimilarCreators(response);
    await openSimilar();
    await userEvent.click(await screen.findByRole("button", { name: "Compare Creators" }));
    return await screen.findByTestId("competitor-panel");
  };

  it("is only offered in compare mode", async () => {
    api.setSimilarCreators(RESPONSE);
    await openSimilar();
    await screen.findByRole("button", { name: "Compare Creators" });
    expect(screen.queryByTestId("competitor-panel")).toBeNull();
    await userEvent.click(screen.getByRole("button", { name: "Compare Creators" }));
    expect(await screen.findByTestId("competitor-panel")).toBeInTheDocument();
  });

  it("adds a competitor by handle or link and shows the lookup while it runs", async () => {
    const panel = within(await openCompareMode());
    await userEvent.type(panel.getByLabelText("Competitor's Instagram handle or link"), "https://www.instagram.com/Rival/");
    await userEvent.click(panel.getByRole("button", { name: "Add competitor" }));
    const row = await panel.findByTestId("competitor-rival");
    expect(row).toHaveTextContent("@rival");
    expect(within(row).getByTestId("competitor-stage")).toHaveTextContent("Checking what we know about the creator");
    expect(api.requests.find((r) => r.method === "POST" && r.path === "/api/mavlit/feed/competitors")?.body).toEqual({ instagram: "https://www.instagram.com/Rival/" });
    expect(panel.getByLabelText("Competitor's Instagram handle or link")).toBeDisabled();                       // one lookup at a time
    expect(within(row).queryByRole("button", { name: /to comparison/ })).toBeNull();                              // not ready: nothing to compare yet
  });

  it("picks the lookup up when it finishes (the list is polled while one runs)", async () => {
    const panel = within(await openCompareMode());
    await userEvent.type(panel.getByLabelText("Competitor's Instagram handle or link"), "@rival");
    await userEvent.click(panel.getByRole("button", { name: "Add competitor" }));
    await panel.findByTestId("competitor-stage");
    api.setCompetitors([READY_COMPETITOR]);                                                                        // the job finished on the server
    const row = await panel.findByTestId("competitor-numbers", {}, { timeout: 6000 });
    expect(row).toHaveTextContent("8K followers · 5.5% engagement · 3 partnerships");
    expect(panel.getByTestId("competitor-brands")).toHaveTextContent("Works with @nike, Acme");                   // a brand with no name yet shows its handle
    expect(panel.getByLabelText("Competitor's Instagram handle or link")).toBeEnabled();
  }, 15_000);

  it("tells the user when no posts were found for the handle, because it is gone from the list", async () => {
    const panel = within(await openCompareMode());
    await userEvent.type(panel.getByLabelText("Competitor's Instagram handle or link"), "nosuchaccount");
    await userEvent.click(panel.getByRole("button", { name: "Add competitor" }));
    await panel.findByTestId("competitor-stage");
    api.setCompetitors([]);                                                                                         // the server dropped it: no posts
    const notice = await panel.findByTestId("competitor-notice", {}, { timeout: 6000 });
    expect(notice).toHaveTextContent("@nosuchaccount could not be found on Instagram: no posts were found");
    await userEvent.click(within(notice).getByRole("button", { name: "Dismiss" }));
    expect(panel.queryByTestId("competitor-notice")).toBeNull();
  }, 15_000);

  it("shows why an add was refused", async () => {
    const panel = within(await openCompareMode());
    api.failCompetitorAdd({ status: 429, detail: "Daily limit reached, try again tomorrow" });
    await userEvent.type(panel.getByLabelText("Competitor's Instagram handle or link"), "rival");
    await userEvent.click(panel.getByRole("button", { name: "Add competitor" }));
    expect(await panel.findByRole("alert")).toHaveTextContent(/limit/i);
  });

  it("lists a failed lookup with its reason and a way to try again", async () => {
    api.setCompetitors([{ ...READY_COMPETITOR, status: "failed", error: "Could not reach this Instagram account right now. Please try again." }]);
    const panel = within(await openCompareMode());
    const row = await panel.findByTestId("competitor-rival");
    expect(within(row).getByRole("alert")).toHaveTextContent("Could not reach this Instagram account");
    await userEvent.click(within(row).getByRole("button", { name: "Try again" }));
    expect(api.requests.some((r) => r.method === "POST" && r.path === "/api/mavlit/feed/competitors")).toBe(true);
  });

  it("compares you with a competitor on its real numbers, including the content mix the LLM estimated for it", async () => {
    api.setCompetitors([READY_COMPETITOR]);
    const panel = within(await openCompareMode());
    await userEvent.click(await panel.findByRole("button", { name: "Add @rival to comparison" }));
    await userEvent.click(screen.getByRole("button", { name: "Add @skinbyalice to comparison" }));
    await userEvent.click(screen.getByRole("button", { name: "Compare (2/3)" }));
    const dialog = await screen.findByRole("dialog");
    expect(within(dialog).getByTestId("cmp-col-competitor:501")).toHaveTextContent("@rival");
    expect(within(dialog).getByTestId("cmp-followers")).toHaveTextContent("8K");
    expect(within(dialog).getByTestId("cmp-engagement-rate")).toHaveTextContent("5.5%");
    expect(within(dialog).getByTestId("cmp-average-reel-views")).toHaveTextContent("12K");
    expect(within(dialog).getByTestId("cmp-posts-per-week")).toHaveTextContent("2.5");
    expect(within(dialog).getByTestId("cmp-tutorial")).toHaveTextContent("60%");                                   // its own estimated mix, not the sample
    const note = within(dialog).getByTestId("sample-data-note");
    expect(note).toHaveTextContent(/@skinbyalice: Content strategy/);                                              // the similar creator's mix is still the sample
    expect(note).not.toHaveTextContent(/@rival/);                                                                  // everything of the competitor is real
    expect(within(dialog).getByTestId("highlight-most-partnerships")).toHaveTextContent(/@skinbyalice\s*10/);       // 10 against the competitor's 3
  });

  it("keeps the comparison to three, removes a competitor from the list and from the comparison", async () => {
    api.setCompetitors([READY_COMPETITOR]);
    const panel = within(await openCompareMode(four()));
    for (const h of ["skinbyalice", "glowcarol"]) await userEvent.click(screen.getByRole("button", { name: `Add @${h} to comparison` }));
    await userEvent.click(await panel.findByRole("button", { name: "Add @rival to comparison" }));
    expect(screen.getByRole("button", { name: "Compare (3/3)" })).toBeInTheDocument();
    await userEvent.click(within(screen.getByRole("list", { name: "Selected creators" })).getByRole("button", { name: "Remove @glowcarol from comparison" }));
    await userEvent.click(panel.getByRole("button", { name: "Remove @rival from my competitors" }));
    await waitFor(() => expect(panel.queryByTestId("competitor-rival")).toBeNull());
    expect(api.competitorsOnServer).toEqual([]);
    expect(screen.getByRole("button", { name: "Compare (1/3)" })).toBeInTheDocument();                              // the removed competitor left the comparison too
    expect(screen.queryByTestId("competitor-notice")).toBeNull();                                                   // removing one is not "no posts found"
  });
});

describe("helpers", () => {
  it("gives the same avatar colour to the same username and a date in words", () => {
    expect(avatarHue("alice")).toBe(avatarHue("alice"));
    expect(avatarHue("alice")).toBeGreaterThanOrEqual(0);
    expect(formatPostDate("2026-05-01T12:00:00Z")).toMatch(/2026/);
    expect(formatPostDate(null)).toBe("");
    expect(formatPostDate("not a date")).toBe("");
  });
});
