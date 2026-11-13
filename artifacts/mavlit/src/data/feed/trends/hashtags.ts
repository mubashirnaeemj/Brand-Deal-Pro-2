import type { HashtagTrend } from "./types";
import type { Niche } from "../types";

const ht = (niche: Niche, tag: string, g: number, posts: number, category: string, p: string, c: string): HashtagTrend =>
  ({ id: `ht-${niche.charAt(0).toLowerCase()}-${tag.replace(/[^a-z0-9]+/gi, "").toLowerCase()}`, niche, tag, g, posts, category, p, c });

export const HASHTAG_TRENDS: HashtagTrend[] = [
  ht("Music", "#aimusicproduction", 91, 4210, "AI & Tech", "ITY", "UCKA"),
  ht("Music", "#homestudio", 44, 12840, "Studio Vlogs", "ITY", "UCKA"),
  ht("Music", "#pluginoftheday", 33, 6120, "Tutorials", "IY", "UCK"),
  ht("Music", "#beatchallenge", 21, 9380, "Beat Making", "IT", "UCA"),
  ht("Music", "#sampleflip", 28, 5470, "Beat Making", "ITY", "UCK"),
  ht("Music", "#studiotour", 17, 7730, "Studio Vlogs", "IY", "UCKA"),
  ht("Music", "#mixingtips", 9, 8890, "Tutorials", "ITY", "UCKA"),
  ht("Music", "#reactionvideo", -11, 3560, "Entertainment", "TY", "UCKA"),
  ht("Beauty", "#glassskin", 66, 18420, "Skincare", "ITY", "UCKA"),
  ht("Beauty", "#skinbarrier", 49, 9710, "Education", "IY", "UCKA"),
  ht("Beauty", "#softglam", 37, 14260, "Makeup Tutorials", "IT", "UCK"),
  ht("Beauty", "#dupecheck", 34, 8130, "Product Reviews", "ITY", "UCKA"),
  ht("Beauty", "#fragrancelayering", 62, 5240, "Fragrance", "IT", "UCKA"),
  ht("Beauty", "#grwm", 8, 31900, "GRWM", "IT", "UCKA"),
  ht("Beauty", "#sensitiveskin", 24, 6870, "Skincare", "IY", "UCA"),
  ht("Beauty", "#heavycontour", -14, 2410, "Makeup Tutorials", "IT", "UCA"),
  ht("Fitness", "#zone2cardio", 57, 7150, "Training Science", "IYT", "UCKA"),
  ht("Fitness", "#homegym", 35, 16980, "Equipment", "IYT", "UCKA"),
  ht("Fitness", "#12330", 22, 11230, "Challenges", "IT", "UCKA"),
  ht("Fitness", "#formcheck", 28, 8460, "Training Science", "IY", "UCK"),
  ht("Fitness", "#mobilitymonday", 31, 6290, "Wellness", "IT", "UCKA"),
  ht("Fitness", "#pilateslifting", 70, 3880, "Training", "IT", "UCKA"),
  ht("Fitness", "#runclub", 19, 12150, "Lifestyle", "IT", "UCKA"),
  ht("Fitness", "#bulkingseason", -10, 4020, "Lifestyle", "ITY", "UCA"),
  ht("Health & Wellness", "#sleepscore", 54, 6940, "Sleep", "ITY", "UCKA"),
  ht("Health & Wellness", "#guthealth", 43, 11380, "Education", "IY", "UCKA"),
  ht("Health & Wellness", "#morningsunlight", 26, 5370, "Lifestyle", "IT", "UCK"),
  ht("Health & Wellness", "#nervoussystemreset", 63, 4610, "Mental Wellness", "ITY", "UCKA"),
  ht("Health & Wellness", "#supplementstack", 30, 7820, "Supplements", "IT", "UCA"),
  ht("Health & Wellness", "#coldplunge", 3, 9150, "Challenges", "ITY", "UCKA"),
  ht("Health & Wellness", "#creatineforwomen", 48, 3720, "Supplements", "IT", "UCA"),
  ht("Health & Wellness", "#detoxtea", -19, 2260, "Supplements", "IT", "UCKA"),
];
