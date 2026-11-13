import type { BrandCategoryTrend } from "./types";
import type { Niche } from "../types";

type B = [name: string, partnerships: number, creators: number];
const bc = (id: string, niche: Niche, name: string, g: number, activeBrands: number, partnerships: number, creatorCategories: string[],
  range: string, formats: string[], p: string, c: string, brands: B[]): BrandCategoryTrend =>
  ({ id, niche, name, g, activeBrands, partnerships, creatorCategories, range, formats, p, c, brands: brands.map(([n, pp, cr]) => ({ name: n, partnerships: pp, creators: cr })) });

export const BRAND_CATEGORY_TRENDS: BrandCategoryTrend[] = [
  bc("bc-m1", "Music", "Music Production Software", 45, 14, 186, ["Tutorials", "Beat Making"], "20K–90K", ["Reel", "Video"], "ITY", "UCKA",
    [["Native Instruments", 52, 31], ["Ableton", 47, 28], ["Arturia", 34, 22], ["Splice", 53, 36]]),
  bc("bc-m2", "Music", "Audio Equipment", 32, 11, 121, ["Gear Reviews", "Studio Vlogs"], "25K–120K", ["Video", "Reel"], "IY", "UCK",
    [["Focusrite", 44, 26], ["Universal Audio", 31, 19], ["Shure", 26, 17], ["Audio-Technica", 20, 14]]),
  bc("bc-m3", "Music", "Music Distribution", 21, 6, 74, ["Studio Vlogs", "Tutorials"], "10K–60K", ["Reel", "Story"], "IT", "UCA",
    [["DistroKid", 29, 21], ["TuneCore", 24, 16], ["CD Baby", 21, 13]]),
  bc("bc-m4", "Music", "Studio Accessories", 15, 9, 58, ["Gear Reviews", "Studio Vlogs"], "15K–70K", ["Carousel", "Reel"], "IY", "UCKA",
    [["Gator Cases", 18, 12], ["Hosa", 22, 15], ["On-Stage", 18, 11]]),
  bc("bc-b1", "Beauty", "Skincare", 41, 18, 247, ["Skincare", "Education"], "30K–180K", ["Reel", "Carousel"], "ITY", "UCKA",
    [["Rare Beauty", 61, 38], ["CeraVe", 74, 44], ["The Ordinary", 66, 40]]),
  bc("bc-b2", "Beauty", "Fragrance", 36, 10, 92, ["GRWM", "Product Reviews"], "40K–200K", ["Reel", "Story"], "IT", "UCK",
    [["Sephora", 38, 26], ["Charlotte Tilbury", 31, 21], ["Glossier", 23, 15]]),
  bc("bc-b3", "Beauty", "Beauty Tools & Devices", 24, 7, 63, ["Product Reviews", "Makeup Tutorials"], "25K–150K", ["Reel", "Video"], "ITY", "UCA",
    [["Dyson", 22, 14], ["Foreo", 21, 13], ["Revlon", 20, 12]]),
  bc("bc-b4", "Beauty", "Makeup", 17, 21, 211, ["Makeup Tutorials", "GRWM"], "20K–160K", ["Reel", "Carousel"], "IT", "UCKA",
    [["Charlotte Tilbury", 58, 35], ["Rare Beauty", 54, 33], ["Fenty Beauty", 49, 30]]),
  bc("bc-f1", "Fitness", "Wearables & Trackers", 39, 8, 98, ["Training Science", "Workouts"], "30K–220K", ["Reel", "Video"], "IYT", "UCK",
    [["WHOOP", 43, 27], ["Garmin", 31, 20], ["Polar", 24, 15]]),
  bc("bc-f2", "Fitness", "Home Gym Equipment", 28, 9, 77, ["Equipment", "Workouts"], "20K–150K", ["Video", "Reel"], "IYT", "UCKA",
    [["Rogue", 28, 18], ["Bowflex", 25, 16], ["Rep Fitness", 24, 15]]),
  bc("bc-f3", "Fitness", "Sports Nutrition", 22, 16, 164, ["Nutrition", "Workouts"], "25K–250K", ["Reel", "Story"], "IT", "UCKA",
    [["MyProtein", 66, 41], ["Optimum Nutrition", 52, 33], ["Gymshark", 46, 28]]),
  bc("bc-f4", "Fitness", "Activewear", 14, 19, 203, ["Workouts", "Training Vlogs"], "30K–300K", ["Reel", "Carousel"], "IT", "UCKA",
    [["Gymshark", 71, 44], ["Nike", 83, 52], ["Lululemon", 49, 31]]),
  bc("bc-h1", "Health & Wellness", "Sleep Tech", 47, 7, 69, ["Sleep", "Wellness Routines"], "10K–80K", ["Reel", "Carousel"], "IT", "UCK",
    [["Oura", 34, 22], ["Eight Sleep", 20, 13], ["Calm", 15, 10]]),
  bc("bc-h2", "Health & Wellness", "Mental Wellness Apps", 34, 6, 55, ["Lifestyle", "Education"], "10K–70K", ["Reel", "Story"], "IT", "UCA",
    [["Headspace", 24, 16], ["Calm", 19, 13], ["Insight Timer", 12, 8]]),
  bc("bc-h3", "Health & Wellness", "Supplements", 26, 15, 138, ["Supplements", "Education"], "15K–120K", ["Reel", "Carousel"], "ITY", "UCKA",
    [["Athletic Greens (AG1)", 49, 30], ["Momentous", 33, 21], ["Thorne", 29, 18]]),
  bc("bc-h4", "Health & Wellness", "Recovery Gear", 19, 8, 61, ["Recovery", "Training Science"], "20K–110K", ["Video", "Reel"], "IYT", "UCKA",
    [["Therabody", 26, 17], ["Hyperice", 21, 14], ["WHOOP", 14, 10]]),
];
