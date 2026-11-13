import type { BehaviorTrend } from "./types";
import type { Niche } from "../types";

const bt = (id: string, niche: Niche, text: string, adoption: number, g: number, eng: number, formats: string[], creatorIds: string[], p: string, c: string): BehaviorTrend =>
  ({ id, niche, text, adoption, g, eng, formats, creatorIds, p, c });

export const BEHAVIOR_TRENDS: BehaviorTrend[] = [
  bt("bh-m1", "Music", "More creators are publishing educational Reels instead of finished-track posts.", 38, 29, 6.4, ["Reel"], ["c2", "c1", "c7"], "ITY", "UCKA"),
  bt("bh-m2", "Music", "Product demonstration content is increasing, with the tool on screen for the whole clip.", 31, 24, 5.8, ["Reel", "Video"], ["c3", "c6", "c1"], "IY", "UCK"),
  bt("bh-m3", "Music", "Smaller creators are reviewing professional equipment through loans and rentals.", 22, 33, 6.9, ["Video", "Carousel"], ["c5", "c7", "c4"], "IY", "UCA"),
  bt("bh-m4", "Music", "Creators are experimenting with AI-generated content and disclosing how they used it.", 19, 58, 5.2, ["Reel", "Video"], ["c1", "c4", "c3"], "ITY", "UCKA"),
  bt("bh-b1", "Beauty", "Long GRWM videos are being replaced by 30-second routines.", 44, 31, 6.1, ["Reel"], ["c9", "c8"], "IT", "UCKA"),
  bt("bh-b2", "Beauty", "Ingredient education is moving into captions and on-screen text.", 36, 27, 6.8, ["Reel", "Carousel"], ["c10", "c8"], "IY", "UCK"),
  bt("bh-b3", "Beauty", "Dupe testing is replacing single-product reviews.", 29, 35, 6.0, ["Reel", "Carousel"], ["c9", "c10", "c8"], "ITY", "UCKA"),
  bt("bh-b4", "Beauty", "Sponsored integrations are getting shorter, often under 20 seconds.", 25, 21, 5.5, ["Reel", "Story"], ["c8", "c9"], "IT", "UCA"),
  bt("bh-f1", "Fitness", "Form-check content is replacing full-workout uploads.", 41, 32, 5.9, ["Reel", "Video"], ["c11", "c12"], "IY", "UCK"),
  bt("bh-f2", "Fitness", "Creators are showing wearable data inside workout posts.", 28, 46, 6.3, ["Reel", "Carousel"], ["c12", "c11"], "ITY", "UCKA"),
  bt("bh-f3", "Fitness", "Multi-week challenge series are outperforming one-off posts.", 34, 26, 6.7, ["Reel", "Story"], ["c12", "c11"], "IT", "UCKA"),
  bt("bh-f4", "Fitness", "Shorter workouts (under 20 minutes) are dominating saves.", 47, 22, 6.2, ["Reel"], ["c11", "c12"], "IT", "UCA"),
  bt("bh-h1", "Health & Wellness", "Wellness posts increasingly include personal data or test results.", 33, 41, 6.8, ["Reel", "Carousel"], ["c13", "c14"], "IT", "UCK"),
  bt("bh-h2", "Health & Wellness", "Sleep-first routines are replacing morning-routine content.", 37, 36, 7.0, ["Reel"], ["c13", "c14"], "ITY", "UCKA"),
  bt("bh-h3", "Health & Wellness", "Honest 'what didn't work' supplement reviews earn more trust and comments.", 26, 28, 6.4, ["Video", "Reel"], ["c14", "c13"], "IY", "UCA"),
  bt("bh-h4", "Health & Wellness", "Creators are stacking small habits into short, repeatable routines.", 43, 19, 5.9, ["Reel", "Carousel"], ["c13", "c14"], "IT", "UCKA"),
];
