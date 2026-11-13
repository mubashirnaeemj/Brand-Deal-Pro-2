import type { MyCreatorProfile } from "./types";

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
