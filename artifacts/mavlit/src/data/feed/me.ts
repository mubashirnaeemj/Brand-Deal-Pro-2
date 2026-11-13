import type { FeedPartnership, MyCreatorProfile } from "./types";

// The logged-in creator in this prototype. Every tab reads from this one object, so the numbers always agree.
export const ME: MyCreatorProfile = {
  handle: "nova.sound",
  name: "Nova Hart",
  niche: "Music",
  platform: "Instagram",
  country: "United States",
  followers: 38_400,
  engagementRate: 6.3,
  avgReelViews: 21_400,
  postsPerWeek: 2.4,
  hue: 262,
  mix: { Tutorials: 30, "Gear Reviews": 20, "Beat Making": 30, "Studio Vlogs": 20 },
  partnerBrandIds: ["splice"],
};

// The logged-in creator's own detected sponsored post(s), so comparisons can include their partnership history.
export const ME_PARTNERSHIPS: FeedPartnership[] = [
  { id: "me1", creatorId: "me", brandId: "splice", daysAgo: 35, type: "Reel", platform: "Instagram", category: "Tutorials",
    views: 23_800, likes: 2_700, comments: 150, description: "Chopping a Splice sample three ways: the full workflow in 45 seconds." },
];
