import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle2, SlidersHorizontal, Music, Headphones, Zap, Camera, ShoppingBag, Cpu } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

const CATEGORIES = ["All", "Audio", "Streaming", "Lifestyle", "Software", "Retail", "Beverage"];

const BRANDS = [
  {
    id: 1,
    name: "Sennheiser",
    category: "Audio",
    initials: "SE",
    color: "#7c3aed",
    matchScore: 97,
    icon: Headphones,
    reasons: [
      "Your gear-focused content aligns perfectly with their pro audio audience — avg. 84% overlap with Sennheiser buyers.",
      "3 of your last 5 videos featured studio equipment, making native integration seamless and authentic.",
    ],
  },
  {
    id: 2,
    name: "Spotify for Artists",
    category: "Streaming",
    initials: "SP",
    color: "#1db954",
    matchScore: 94,
    icon: Music,
    reasons: [
      "Your audience skews 18–34 and streams 4+ hours of music daily — Spotify's exact target demographic.",
      "Creator-to-platform partnership campaigns are active in Q3; your niche positions you as a top-tier candidate.",
    ],
  },
  {
    id: 3,
    name: "Native Instruments",
    category: "Software",
    initials: "NI",
    color: "#f59e0b",
    matchScore: 91,
    icon: Cpu,
    reasons: [
      "68% of your followers self-identify as producers or beatmakers — exactly who NI targets with Maschine and Komplete.",
      "Your tutorial-style content averages 9-min watch time, giving sponsored segments meaningful exposure.",
    ],
  },
  {
    id: 4,
    name: "GoPro",
    category: "Lifestyle",
    initials: "GP",
    color: "#0ea5e9",
    matchScore: 88,
    icon: Camera,
    reasons: [
      "Live performance and behind-the-scenes content make up 40% of your catalog — prime territory for GoPro's POV narrative.",
      "Your engagement rate of 6.2% is 3× the platform average, ensuring sponsored content converts, not just reaches.",
    ],
  },
  {
    id: 5,
    name: "Sweetwater",
    category: "Retail",
    initials: "SW",
    color: "#ec4899",
    matchScore: 85,
    icon: ShoppingBag,
    reasons: [
      "Sweetwater's affiliate conversion rate is highest among gear-review creators — your format mirrors their top earners.",
      "Your comment section regularly features gear questions, signaling purchase-intent audiences Sweetwater actively seeks.",
    ],
  },
  {
    id: 6,
    name: "Red Bull",
    category: "Beverage",
    initials: "RB",
    color: "#ef4444",
    matchScore: 81,
    icon: Zap,
    reasons: [
      "Red Bull Music sponsors 200+ creator campaigns yearly; your music-lifestyle blend fits their cultural content strategy.",
      "Audience affinity analysis shows 71% of your followers also follow Red Bull Music's official channels.",
    ],
  },
];

function ScoreRing({ score }: { score: number }) {
  const r = 20;
  const circ = 2 * Math.PI * r;
  const dash = (score / 100) * circ;

  return (
    <div className="relative flex items-center justify-center w-14 h-14">
      <svg className="absolute inset-0 -rotate-90" width="56" height="56">
        <circle cx="28" cy="28" r={r} stroke="hsl(240 5% 15%)" strokeWidth="4" fill="none" />
        <circle
          cx="28"
          cy="28"
          r={r}
          stroke="hsl(262 83% 58%)"
          strokeWidth="4"
          fill="none"
          strokeDasharray={`${dash} ${circ}`}
          strokeLinecap="round"
        />
      </svg>
      <span className="text-xs font-bold text-white z-10">{score}%</span>
    </div>
  );
}

function BrandCard({ brand, index }: { brand: (typeof BRANDS)[0]; index: number }) {
  const Icon = brand.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -12, scale: 0.97 }}
      transition={{ duration: 0.35, delay: index * 0.06, ease: "easeOut" }}
      whileHover={{ y: -4, transition: { duration: 0.2 } }}
      data-testid={`card-brand-${brand.id}`}
      className="group relative flex flex-col bg-card border border-border rounded-2xl overflow-hidden hover:border-primary/50 transition-colors duration-300"
    >
      <div
        className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none rounded-2xl"
        style={{ boxShadow: `inset 0 0 40px 0 ${brand.color}18` }}
      />

      <div className="p-6 flex items-start gap-4">
        <div
          className="w-14 h-14 rounded-xl flex items-center justify-center text-white font-bold text-lg shrink-0 shadow-lg"
          style={{ background: `linear-gradient(135deg, ${brand.color}cc, ${brand.color}66)` }}
          data-testid={`img-logo-${brand.id}`}
        >
          <Icon size={24} />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <h3
              className="text-white font-bold text-lg leading-tight truncate"
              data-testid={`text-brandname-${brand.id}`}
            >
              {brand.name}
            </h3>
            <ScoreRing score={brand.matchScore} />
          </div>
          <span
            className="inline-flex items-center mt-1 px-2 py-0.5 rounded-md text-xs font-semibold"
            style={{ background: `${brand.color}22`, color: brand.color }}
            data-testid={`text-category-${brand.id}`}
          >
            {brand.category}
          </span>
        </div>
      </div>

      <div className="px-6 pb-6 flex flex-col gap-3 flex-1">
        <div className="h-px bg-border" />
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Why it's a match</p>
        <ul className="flex flex-col gap-3">
          {brand.reasons.map((reason, i) => (
            <li key={i} className="flex items-start gap-2.5">
              <CheckCircle2
                size={15}
                className="mt-0.5 shrink-0"
                style={{ color: brand.color }}
              />
              <span className="text-sm text-muted-foreground leading-relaxed">{reason}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="px-6 pb-5">
        <button
          data-testid={`button-pitch-${brand.id}`}
          className="w-full py-2.5 rounded-xl text-sm font-semibold border border-border text-white/70 hover:bg-primary hover:border-primary hover:text-white transition-all duration-200"
        >
          Generate Pitch Deck
        </button>
      </div>
    </motion.div>
  );
}

export default function BrandMatches() {
  const [activeCategory, setActiveCategory] = useState("All");

  const filtered =
    activeCategory === "All" ? BRANDS : BRANDS.filter((b) => b.category === activeCategory);

  return (
    <div className="min-h-screen bg-background text-foreground overflow-x-hidden">
      <Navbar />

      <main className="pt-28 pb-24 px-4">
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="mb-10"
          >
            <div className="flex items-center gap-2 mb-3">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-primary/15 text-primary border border-primary/30">
                <Music size={11} />
                Music Niche
              </span>
              <span className="text-muted-foreground text-xs">Updated today</span>
            </div>
            <h1 className="text-4xl font-extrabold text-white tracking-tight mb-2">
              Your Brand Matches
            </h1>
            <p className="text-muted-foreground text-base max-w-xl">
              MAVLIT found <span className="text-white font-semibold">{BRANDS.length} high-fit brands</span> based
              on your audience data, content style, and engagement metrics.
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.15 }}
            className="flex items-center gap-3 mb-8 flex-wrap"
          >
            <div className="flex items-center gap-1.5 text-muted-foreground mr-1">
              <SlidersHorizontal size={15} />
              <span className="text-sm font-medium">Filter:</span>
            </div>
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                data-testid={`button-filter-${cat.toLowerCase()}`}
                onClick={() => setActiveCategory(cat)}
                className={`px-4 py-1.5 rounded-full text-sm font-semibold border transition-all duration-200 ${
                  activeCategory === cat
                    ? "bg-primary border-primary text-white shadow-lg shadow-primary/30"
                    : "border-border text-muted-foreground hover:border-primary/50 hover:text-white"
                }`}
              >
                {cat}
              </button>
            ))}
            <span className="ml-auto text-xs text-muted-foreground hidden sm:block">
              {filtered.length} result{filtered.length !== 1 ? "s" : ""}
            </span>
          </motion.div>

          <AnimatePresence mode="popLayout">
            {filtered.length > 0 ? (
              <motion.div
                key="grid"
                className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5"
              >
                {filtered.map((brand, i) => (
                  <BrandCard key={brand.id} brand={brand} index={i} />
                ))}
              </motion.div>
            ) : (
              <motion.div
                key="empty"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex flex-col items-center justify-center py-24 text-center"
              >
                <p className="text-muted-foreground text-lg font-medium">No matches in this category yet.</p>
                <p className="text-muted-foreground text-sm mt-1">Try a different filter or check back after your next content upload.</p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>

      <Footer />
    </div>
  );
}
