import type { ContentType, FeedPartnership, Platform } from "./types";

type Row = [id: string, creator: string, brand: string, daysAgo: number, type: ContentType, platform: Platform,
  category: string, views: number, likes: number, comments: number, description: string];

const ROWS: Row[] = [
  ["p1", "c1", "native-instruments", 2, "Reel", "Instagram", "Beat Making", 142_000, 11_800, 612, "Flipped a single Maschine+ kit into a full beat in 60 seconds, with the full walkthrough linked in bio."],
  ["p2", "c2", "ableton", 4, "Reel", "Instagram", "Tutorials", 96_400, 8_100, 440, "Three Ableton Live 12 workflow tricks that cut my arrangement time in half."],
  ["p3", "c3", "arturia", 6, "Video", "YouTube", "Gear Reviews", 188_000, 9_400, 1_020, "Full review of the MiniFreak: what it does brilliantly and where it falls short."],
  ["p4", "c1", "splice", 9, "Carousel", "Instagram", "Tutorials", 58_200, 6_900, 310, "5 sample-chopping habits I use on every beat, plus the pack I built them from."],
  ["p5", "c4", "focusrite", 11, "Reel", "TikTok", "Studio Vlogs", 211_000, 24_300, 1_480, "Setting up a Scarlett 2i2 in a 9 sqm bedroom studio. Ten minutes from box to first take."],
  ["p6", "c6", "native-instruments", 13, "Video", "Instagram", "Beat Making", 174_500, 10_200, 530, "Drum-programming session using Komplete Kontrol and the new Battery kits."],
  ["p7", "c5", "ableton", 15, "Reel", "Instagram", "Studio Vlogs", 49_300, 4_700, 205, "A day in my Sydney studio, from sketching in Push to a finished demo."],
  ["p8", "c2", "focusrite", 17, "Story", "Instagram", "Gear Reviews", 31_800, 2_100, 96, "Quick-fire test of the Vocaster One for podcasters and singer-songwriters."],
  ["p9", "c7", "splice", 19, "Reel", "YouTube", "Tutorials", 27_600, 3_900, 288, "Layering vocal chops from Splice with a live harmony stack."],
  ["p10", "c3", "native-instruments", 22, "Video", "YouTube", "Gear Reviews", 132_000, 7_800, 690, "Is Komplete 15 Ultimate worth it? Honest breakdown for working producers."],
  ["p11", "c8", "rare-beauty", 1, "Reel", "Instagram", "Makeup Tutorials", 412_000, 38_700, 2_150, "Soft-pinch blush three ways: sheer, buildable and full-glam, with the matching lip."],
  ["p12", "c9", "sephora", 3, "Reel", "TikTok", "GRWM", 530_000, 61_000, 3_800, "GRWM with my Sephora Sale haul: the five products I'd rebuy first."],
  ["p13", "c8", "charlotte-tilbury", 7, "Carousel", "Instagram", "Skincare", 128_000, 14_900, 760, "Pillow Talk set swatched on three skin tones, with finishing tips."],
  ["p14", "c10", "rare-beauty", 10, "Reel", "Instagram", "Makeup Tutorials", 64_700, 8_800, 540, "Sensitive-skin approved: wearing the Liquid Touch foundation for 12 hours."],
  ["p15", "c9", "charlotte-tilbury", 14, "Video", "TikTok", "GRWM", 298_000, 33_200, 1_900, "Red-carpet face in 10 minutes with the Hollywood Flawless Filter."],
  ["p16", "c10", "sephora", 20, "Story", "Instagram", "Skincare", 22_100, 1_700, 88, "Skincare routine swap: Sephora picks for under $30."],
  ["p17", "c11", "gymshark", 2, "Reel", "Instagram", "Workouts", 640_000, 42_100, 1_760, "Push-day session in the new Vital Seamless line, including the fit check."],
  ["p18", "c12", "myprotein", 5, "Video", "YouTube", "Nutrition", 91_500, 6_300, 410, "High-protein meal prep for the week, built around one MyProtein stack."],
  ["p19", "c11", "nike", 8, "Reel", "Instagram", "Training Vlogs", 705_000, 55_300, 2_340, "Training camp vlog wearing the Metcon 9 for every set."],
  ["p20", "c12", "gymshark", 12, "Carousel", "Instagram", "Workouts", 38_900, 4_200, 190, "Five-day home workout split with the Gymshark resistance bands."],
  ["p21", "c11", "myprotein", 16, "Story", "Instagram", "Nutrition", 87_000, 5_100, 210, "My pre-workout and shake order, explained in four taps."],
  ["p22", "c12", "nike", 24, "Reel", "YouTube", "Training Vlogs", 112_000, 8_900, 520, "Treadmill intervals in the Pegasus 41. Honest 100 km review."],
  ["p23", "c13", "oura", 3, "Reel", "Instagram", "Wellness Routines", 76_800, 7_600, 360, "A week of sleep scores with Oura Ring 4 and what changed."],
  ["p24", "c14", "whoop", 6, "Reel", "TikTok", "Recovery", 54_300, 8_100, 410, "Why my WHOOP told me to rest, and why I finally listened."],
  ["p25", "c13", "athletic-greens", 9, "Carousel", "Instagram", "Wellness Routines", 31_400, 3_300, 152, "Morning routine ft. AG1: what's in it and how it fits my day."],
  ["p26", "c14", "athletic-greens", 18, "Story", "TikTok", "Nutrition", 18_700, 2_400, 130, "Student-budget wellness: is daily greens worth it?"],
  ["p27", "c13", "whoop", 21, "Video", "Instagram", "Recovery", 41_200, 4_600, 235, "Strain vs recovery: how I plan my training weeks around WHOOP."],
  ["p28", "c14", "oura", 27, "Reel", "TikTok", "Recovery", 29_900, 3_800, 205, "Sleep tracking face-off: Oura against my old smartwatch."],
  ["p29", "c4", "splice", 29, "Reel", "TikTok", "Beat Making", 163_000, 19_400, 980, "Writing a beat out of one Splice sample, from chop to 808."],
  ["p30", "c6", "arturia", 33, "Reel", "Instagram", "Gear Reviews", 108_000, 6_900, 355, "Arturia KeyLab 88 MkII, the full keybed verdict for beat makers."],
  ["p31", "c5", "focusrite", 40, "Carousel", "Instagram", "Studio Vlogs", 24_600, 2_900, 142, "Studio-tour carousel: signal chain from the Clarett+ to my monitors."],
  ["p32", "c7", "arturia", 46, "Reel", "YouTube", "Studio Vlogs", 19_800, 2_700, 177, "Recording vocals through the Arturia Minilab 3 and the AudioFuse."],
];

export const PARTNERSHIPS: FeedPartnership[] = ROWS.map(
  ([id, creatorId, brandId, daysAgo, type, platform, category, views, likes, comments, description]) =>
    ({ id, creatorId, brandId, daysAgo, type, platform, category, views, likes, comments, description }));
