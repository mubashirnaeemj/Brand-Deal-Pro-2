import { cleanup, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import Feed from "@/pages/Feed";
import { sizeRange, websiteLink } from "@/lib/brandIntelligence";
import type { BrandIntelResponse } from "@/lib/brandIntelligence";
import { fmtCount } from "@/lib/feedData";
import { installProfileApi } from "./fixtures/profileApi";
import { creatorProfile } from "./fixtures/creatorProfile";
import { renderProfile } from "./renderProfile";

const RESPONSE: BrandIntelResponse = {
  status: "completed", total: 2,
  brands: [
    { brand_raw_id: 11, brand_name: "Acme Audio", niche: "Music", website: "https://www.acmeaudio.com/shop", rank: 1, confidence: 91, partnerships: 4, creators: 3, min_followers: 1_000, max_followers: 2_100_000,
      formats: [{ name: "Reel", pct: 50 }, { name: "Carousel", pct: 25 }, { name: "Photo", pct: 25 }], avg_engagement: 4.4 },
    { brand_raw_id: 12, brand_name: "Globex", niche: null, website: null, rank: 2, confidence: 64, partnerships: 1, creators: 0, min_followers: null, max_followers: null, formats: [], avg_engagement: null },
  ],
};

let api: ReturnType<typeof installProfileApi>;
beforeEach(() => {
  vi.stubGlobal("ResizeObserver", class { observe() {} unobserve() {} disconnect() {} });
  Object.assign(HTMLElement.prototype, { hasPointerCapture: () => false, setPointerCapture: () => {}, releasePointerCapture: () => {}, scrollIntoView: () => {} });
  window.history.replaceState(null, "", "/feed");
  api = installProfileApi(creatorProfile({ onboarding_completed: true }));
});
afterEach(cleanup);

const openBrands = async () => {
  renderProfile(<Feed />);
  await screen.findByRole("heading", { name: "Feed" });
  await userEvent.click(screen.getByTestId("feed-tab-brands"));
};

describe("Brand Intelligence (the user's matched brands)", () => {
  it("lists the matched brands with their real numbers, and none of the prototype's brands", async () => {
    api.setBrandIntelligence(RESPONSE);
    await openBrands();
    const acme = await screen.findByTestId("brand-card-11");
    expect(within(acme).getByText("Acme Audio")).toBeInTheDocument();
    expect(within(acme).getByText("91% fit")).toBeInTheDocument();
    expect(within(acme).getByTestId("intel-partnerships")).toHaveTextContent("4");                    // posts scored 90+ in instagram_posts and the test table
    expect(within(acme).getByTestId("intel-size")).toHaveTextContent("1K–2.1M");                       // the smallest to the biggest creator
    expect(within(acme).getByTestId("intel-formats")).toHaveTextContent("Reel 50% · Carousel 25%");    // the two most common formats
    expect(within(acme).getByTestId("intel-engagement")).toHaveTextContent("4.4%");                    // the average of the creators' engagement rates
    expect(screen.queryByText(/Native Instruments|Splice|WHOOP|Oura/)).toBeNull();                      // no prototype brands
    expect(within(acme).getByRole("button", { name: "View insights for Acme Audio" })).toBeInTheDocument();
    expect(api.requests.some((r) => r.path === "/api/mavlit/feed/brand-intelligence")).toBe(true);
  });

  it("keeps the order of the Brand Matches page and shows a dash for what is unknown", async () => {
    api.setBrandIntelligence(RESPONSE);
    await openBrands();
    await screen.findByTestId("brand-card-11");
    expect(screen.getAllByTestId(/^brand-card-/).map((c) => c.getAttribute("data-testid"))).toEqual(["brand-card-11", "brand-card-12"]);
    const globex = screen.getByTestId("brand-card-12");
    expect(within(globex).getByTestId("intel-partnerships")).toHaveTextContent("1");
    for (const id of ["intel-size", "intel-formats", "intel-engagement"]) expect(within(globex).getByTestId(id)).toHaveTextContent("—");
  });

  it("says so while the matches are being ranked, and when there are none", async () => {
    api.setBrandIntelligence({ status: "running", total: 0, brands: [] });
    await openBrands();
    expect(await screen.findByText("Finding your brand matches")).toBeInTheDocument();
    cleanup();
    api.setBrandIntelligence({ status: "completed", total: 0, brands: [] });
    await openBrands();
    expect(await screen.findByText("No matched brands yet")).toBeInTheDocument();
  });

  it("shows an error with a retry", async () => {
    api.failBrandIntelligence();
    await openBrands();
    expect(await screen.findByText("Could not load brand intelligence")).toBeInTheDocument();
    api.failBrandIntelligence(false); api.setBrandIntelligence(RESPONSE);
    await userEvent.click(screen.getByRole("button", { name: "Try again" }));
    expect(await screen.findByTestId("brand-card-11")).toBeInTheDocument();
  });
});

const CREATORS = {
  brand_raw_id: 11, brand_name: "Acme Audio",
  creators: [
    { username: "djshu_g", full_name: "Shu G", profile_url: "https://www.instagram.com/djshu_g", niche: "Music", followers: 52_100, engagement_rate: 5.8, partnership_posts: 2 },
    { username: "vinylgone", full_name: null, profile_url: "https://www.instagram.com/vinylgone", niche: null, followers: null, engagement_rate: null, partnership_posts: 1 },
  ],
};

describe("View insights", () => {
  it("lists the unique creators the brand works with, for real, and keeps the fit text as sample text", async () => {
    api.setBrandIntelligence(RESPONSE);
    api.setBrandCreators(11, CREATORS);
    await openBrands();
    await userEvent.click(await screen.findByRole("button", { name: "View insights for Acme Audio" }));
    const dialog = await screen.findByRole("dialog");
    expect(within(dialog).getByRole("heading", { name: "Acme Audio" })).toBeInTheDocument();
    const site = within(dialog).getByTestId("brand-website");                    // the website sits under the name, the niche under it
    expect(site).toHaveTextContent("acmeaudio.com");
    expect(site).toHaveAttribute("href", "https://www.acmeaudio.com/shop");
    expect(within(dialog).getByTestId("brand-niche")).toHaveTextContent("Music");
    const creators = within(dialog).getByRole("region", { name: "Creators This Brand Works With" });
    const shu = await within(creators).findByTestId("brand-creator-djshu_g");
    expect(shu).toHaveTextContent("@djshu_g");
    expect(shu).toHaveTextContent("Music · 2 partnership posts");
    expect(shu).toHaveTextContent("52.1K followers");
    expect(shu).toHaveTextContent("5.8% engagement");
    expect(shu).toHaveAttribute("href", "https://www.instagram.com/djshu_g");
    const vinyl = within(creators).getByTestId("brand-creator-vinylgone");
    expect(vinyl).toHaveTextContent("1 partnership post");          // singular
    expect(vinyl).toHaveTextContent("— followers");                 // unknown numbers are dashes
    expect(vinyl).toHaveTextContent("— engagement");
    expect(within(creators).getAllByRole("link")).toHaveLength(2);   // one row per unique creator
    const fit = within(dialog).getByRole("region", { name: "Why This Brand Could Be a Good Fit" });
    expect(within(fit).getByText("91% fit")).toBeInTheDocument();     // the real match percentage
    expect(within(fit).getAllByRole("listitem")).toHaveLength(4);     // the lines themselves are hardcoded
    expect(within(fit).getByText("Acme Audio partners with Music creators, the same niche as your profile.")).toBeInTheDocument();
    expect(within(fit).getByRole("link", { name: /Create pitch email/ })).toHaveAttribute("href", "/pitch?brand=Acme%20Audio");
    expect(api.requests.some((r) => r.path === "/api/mavlit/feed/brand-intelligence/11/creators")).toBe(true);
  });

  it("says so when no creator is known for the brand", async () => {
    api.setBrandIntelligence(RESPONSE);
    api.setBrandCreators(12, { brand_raw_id: 12, brand_name: "Globex", creators: [] });
    await openBrands();
    await userEvent.click(await screen.findByRole("button", { name: "View insights for Globex" }));
    expect(await screen.findByText("No creators are known for this brand's partnership posts yet.")).toBeInTheDocument();
    expect(screen.getByTestId("brand-niche")).toHaveTextContent("No niche yet");   // Globex has no niche
    expect(screen.queryByTestId("brand-website")).toBeNull();                       // and no website: nothing is shown for it
  });

  it("lists every unique creator, with their number in the heading", async () => {
    const many = Array.from({ length: 80 }, (_, i) => ({ username: `creator${i}`, full_name: null, profile_url: `https://www.instagram.com/creator${i}`, niche: null, followers: 1000 + i, engagement_rate: 2, partnership_posts: 1 }));
    api.setBrandIntelligence(RESPONSE);
    api.setBrandCreators(11, { brand_raw_id: 11, brand_name: "Acme Audio", creators: many });
    await openBrands();
    await userEvent.click(await screen.findByRole("button", { name: "View insights for Acme Audio" }));
    const creators = await screen.findByRole("region", { name: "Creators This Brand Works With" });
    expect(await within(creators).findByTestId("brand-creator-creator79")).toBeInTheDocument();
    expect(within(creators).getAllByRole("link")).toHaveLength(80);
    expect(within(creators).getByRole("heading", { name: "Creators This Brand Works With (80)" })).toBeInTheDocument();
  });

  it("shows an error with a retry when the creators cannot be loaded", async () => {
    api.setBrandIntelligence(RESPONSE);   // no creators set for brand 11: the fixture answers 404
    await openBrands();
    await userEvent.click(await screen.findByRole("button", { name: "View insights for Acme Audio" }));
    const dialog = await screen.findByRole("dialog");
    expect(await within(dialog).findByRole("alert")).toHaveTextContent("Could not load the creators");
    api.setBrandCreators(11, CREATORS);
    await userEvent.click(within(dialog).getByRole("button", { name: "Try again" }));
    expect(await within(dialog).findByTestId("brand-creator-djshu_g")).toBeInTheDocument();
  });
});

describe("websiteLink", () => {
  it("makes a link and a short text from whatever is stored, or nothing", () => {
    expect(websiteLink("https://www.nike.com/us/")).toEqual({ href: "https://www.nike.com/us/", label: "nike.com" });
    expect(websiteLink("nike.com")).toEqual({ href: "https://nike.com/", label: "nike.com" });
    expect(websiteLink("  http://shop.example.co.uk ")).toEqual({ href: "http://shop.example.co.uk/", label: "shop.example.co.uk" });
    expect(websiteLink("javascript:alert(1)")).toBeNull();
    expect(websiteLink("")).toBeNull();
    expect(websiteLink(null)).toBeNull();
  });
});

describe("sizeRange", () => {
  it("writes the smallest to the biggest, one number when they are the same, a dash when unknown", () => {
    expect(sizeRange(1_000, 2_100_000, fmtCount)).toBe("1K–2.1M");
    expect(sizeRange(5_000, 5_000, fmtCount)).toBe("5K");
    expect(sizeRange(null, 5_000, fmtCount)).toBe("—");
    expect(sizeRange(null, null, fmtCount)).toBe("—");
  });
});
