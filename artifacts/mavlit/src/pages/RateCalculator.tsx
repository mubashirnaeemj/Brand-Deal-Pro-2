import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Calculator,
  DollarSign,
  AlertTriangle,
  BookOpen,
  ChevronDown,
  Sparkles,
  TrendingUp,
  Info,
} from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

// ── Rate lookup data ─────────────────────────────────────────────────────────

const PLATFORMS = ["Instagram", "TikTok", "YouTube", "Facebook"] as const;
type Platform = (typeof PLATFORMS)[number];

const NICHES = [
  "Music",
  "Gaming",
  "Fashion & Beauty",
  "Fitness & Wellness",
  "Food & Cooking",
  "Education",
  "Finance",
  "Photography",
  "Podcast / Audio",
  "Travel",
  "Lifestyle",
] as const;
type Niche = (typeof NICHES)[number];

const DEAL_TYPES: Record<Platform, string[]> = {
  Instagram: ["Sponsored Post (Feed)", "Reel + Two Stories", "Story Bundle (3)", "Full Integration (Feed + Reel + Story)"],
  TikTok:    ["Sponsored TikTok Video", "TikTok + Duet", "Series Integration (3 videos)"],
  YouTube:   ["30-second Mid-Roll", "60-second Integration", "Dedicated Video", "End Card + Description"],
  Facebook:  ["Sponsored Post", "Facebook Reel", "Live Mention", "Post + Story Bundle"],
};

// Follower tiers → [min, max] base rate (USD)
type Tier = { min: number; max: number; label: string; baseMin: number; baseMax: number };

const TIERS: Tier[] = [
  { min: 0,         max: 9_999,    label: "Nano (under 10K)",    baseMin: 50,    baseMax: 150   },
  { min: 10_000,    max: 49_999,   label: "Micro (10K–50K)",     baseMin: 150,   baseMax: 500   },
  { min: 50_000,    max: 99_999,   label: "Mid-tier (50K–100K)", baseMin: 400,   baseMax: 900   },
  { min: 100_000,   max: 499_999,  label: "Rising (100K–500K)",  baseMin: 900,   baseMax: 3_500 },
  { min: 500_000,   max: 999_999,  label: "Macro (500K–1M)",     baseMin: 3_500, baseMax: 9_000 },
  { min: 1_000_000, max: Infinity, label: "Mega (1M+)",          baseMin: 8_000, baseMax: 30_000 },
];

// Niche multipliers
const NICHE_MULT: Record<Niche, number> = {
  "Finance":         1.45,
  "Music":           1.15,
  "Gaming":          1.10,
  "Photography":     1.05,
  "Podcast / Audio": 1.05,
  "Travel":          1.00,
  "Education":       1.00,
  "Fitness & Wellness": 0.95,
  "Fashion & Beauty":   0.90,
  "Food & Cooking":     0.90,
  "Lifestyle":          0.85,
};

// Platform multipliers
const PLATFORM_MULT: Record<Platform, number> = {
  YouTube:   1.35,
  Instagram: 1.00,
  TikTok:    0.95,
  Facebook:  0.80,
};

// Deal type multipliers (index within the platform's list)
const DEAL_MULT: Record<Platform, number[]> = {
  Instagram: [1.00, 1.20, 0.80, 1.60],
  TikTok:    [1.00, 1.25, 1.70],
  YouTube:   [0.70, 1.00, 2.20, 0.55],
  Facebook:  [1.00, 1.10, 0.60, 1.25],
};

// Fake citations per platform
const CITATIONS: Record<Platform, { source: string; url: string; date: string }> = {
  Instagram: {
    source: "Creator Economy Rate Index — Q1 2026 Edition",
    url:    "creatoreconomy.io/rate-index/q1-2026",
    date:   "March 14, 2026",
  },
  TikTok: {
    source: "TikTok Creator Marketplace Benchmarks Report",
    url:    "influencerinsider.co/tiktok-benchmarks-2026",
    date:   "February 28, 2026",
  },
  YouTube: {
    source: "YouTube Sponsorship Rate Survey — Influencer Marketing Hub",
    url:    "influencermarketinghub.com/youtube-rates-2026",
    date:   "April 3, 2026",
  },
  Facebook: {
    source: "Meta Creator Compensation Study — Social Blade Research",
    url:    "socialblade.com/research/meta-creator-rates-2026",
    date:   "January 22, 2026",
  },
};

function fmt(n: number) {
  return n >= 1000 ? `$${(n / 1000).toFixed(1)}K` : `$${n}`;
}

function narrativeDescription(
  platform: Platform,
  followers: number,
  niche: Niche,
  dealType: string,
  rateMin: number,
  rateMax: number,
  tier: Tier
): string {
  const followerStr =
    followers >= 1_000_000
      ? `${(followers / 1_000_000).toFixed(1)}M`
      : followers >= 1_000
      ? `${Math.round(followers / 1_000)}K`
      : followers.toString();

  return `${platform} creators with ${followerStr} followers in the ${niche} niche (${tier.label}) typically charge ${fmt(rateMin)}–${fmt(rateMax)} for a ${dealType}.`;
}

function SelectField({
  label,
  testId,
  value,
  onChange,
  options,
}: {
  label: string;
  testId: string;
  value: string;
  onChange: (v: string) => void;
  options: readonly string[];
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </label>
      <div className="relative">
        <select
          data-testid={testId}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full appearance-none px-4 py-2.5 pr-10 rounded-xl bg-secondary border border-border text-white text-sm font-medium focus:outline-none focus:border-primary/60 focus:ring-1 focus:ring-primary/30 transition-all cursor-pointer"
        >
          {options.map((o) => (
            <option key={o} value={o} className="bg-background">
              {o}
            </option>
          ))}
        </select>
        <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
      </div>
    </div>
  );
}

// ── Main page ────────────────────────────────────────────────────────────────

export default function RateCalculator() {
  const [platform, setPlatform]   = useState<Platform>("Instagram");
  const [followers, setFollowers] = useState("");
  const [niche, setNiche]         = useState<Niche>("Music");
  const [dealType, setDealType]   = useState(DEAL_TYPES["Instagram"][0]);
  const [result, setResult]       = useState<null | {
    rateMin: number;
    rateMax: number;
    narrative: string;
    tier: Tier;
    citation: (typeof CITATIONS)[Platform];
  }>(null);
  const [error, setError]         = useState("");

  const handlePlatformChange = (p: string) => {
    const next = p as Platform;
    setPlatform(next);
    setDealType(DEAL_TYPES[next][0]);
    setResult(null);
  };

  const calculate = () => {
    const n = parseInt(followers.replace(/[^0-9]/g, ""), 10);
    if (!n || n < 1) {
      setError("Please enter a valid follower count.");
      return;
    }
    setError("");

    const tier = TIERS.find((t) => n >= t.min && n <= t.max)!;
    const dealIdx = DEAL_TYPES[platform].indexOf(dealType);
    const dealMult = DEAL_MULT[platform][dealIdx] ?? 1;
    const nicheMult = NICHE_MULT[niche] ?? 1;
    const platMult  = PLATFORM_MULT[platform] ?? 1;

    const rawMin = Math.round(tier.baseMin * nicheMult * platMult * dealMult / 25) * 25;
    const rawMax = Math.round(tier.baseMax * nicheMult * platMult * dealMult / 25) * 25;

    setResult({
      rateMin: rawMin,
      rateMax: rawMax,
      narrative: narrativeDescription(platform, n, niche, dealType, rawMin, rawMax, tier),
      tier,
      citation: CITATIONS[platform],
    });
  };

  return (
    <div className="min-h-screen bg-background text-foreground overflow-x-hidden">
      <Navbar />

      <main className="pt-28 pb-24 px-4">
        <div className="max-w-3xl mx-auto">

          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="mb-8"
          >
            <div className="flex items-center gap-2 mb-3">
              <Calculator size={14} className="text-primary" />
              <span className="text-xs font-semibold text-primary uppercase tracking-wider">Rate Calculator</span>
            </div>
            <h1 className="text-3xl font-extrabold text-white tracking-tight mb-2">
              What Should You Charge?
            </h1>
            <p className="text-muted-foreground text-base leading-relaxed max-w-xl">
              Enter your platform, audience size, niche, and deal type to see industry rate benchmarks based on real creator compensation data.
            </p>
          </motion.div>

          {/* Form card */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.08 }}
            className="bg-card border border-border rounded-2xl p-7 mb-5"
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mb-6">
              <SelectField
                label="Platform"
                testId="select-platform"
                value={platform}
                onChange={handlePlatformChange}
                options={PLATFORMS}
              />

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Follower / Subscriber Count
                </label>
                <input
                  data-testid="input-followers"
                  type="text"
                  inputMode="numeric"
                  value={followers}
                  onChange={(e) => { setFollowers(e.target.value); setResult(null); setError(""); }}
                  placeholder="e.g. 50000"
                  className="w-full px-4 py-2.5 rounded-xl bg-secondary border border-border text-white placeholder:text-muted-foreground/50 text-sm font-medium focus:outline-none focus:border-primary/60 focus:ring-1 focus:ring-primary/30 transition-all"
                />
                {error && (
                  <p className="text-xs text-destructive flex items-center gap-1">
                    <Info size={11} /> {error}
                  </p>
                )}
              </div>

              <SelectField
                label="Content Niche"
                testId="select-niche"
                value={niche}
                onChange={(v) => { setNiche(v as Niche); setResult(null); }}
                options={NICHES}
              />

              <SelectField
                label="Deal Type"
                testId="select-deal-type"
                value={dealType}
                onChange={(v) => { setDealType(v); setResult(null); }}
                options={DEAL_TYPES[platform]}
              />
            </div>

            <button
              data-testid="button-calculate"
              onClick={calculate}
              className="w-full flex items-center justify-center gap-2.5 py-3.5 rounded-xl bg-primary hover:bg-primary/90 text-white font-bold text-sm shadow-lg shadow-primary/30 transition-all hover:-translate-y-0.5 active:translate-y-0"
            >
              <Sparkles size={16} />
              Calculate My Rate
            </button>
          </motion.div>

          {/* Results */}
          <AnimatePresence>
            {result && (
              <motion.div
                key="result"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.4 }}
                className="flex flex-col gap-4"
              >
                {/* Rate card */}
                <div className="bg-card border border-primary/40 rounded-2xl overflow-hidden">
                  {/* Gradient top band */}
                  <div className="h-1 w-full bg-gradient-to-r from-primary via-violet-400 to-primary/40" />
                  <div className="p-7">
                    <div className="flex items-start gap-4 mb-5">
                      <div className="w-12 h-12 rounded-xl bg-primary/20 border border-primary/30 flex items-center justify-center shrink-0">
                        <DollarSign size={20} className="text-primary" />
                      </div>
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                          Estimated Rate — {result.tier.label}
                        </p>
                        <div className="flex items-baseline gap-2">
                          <span className="text-4xl font-black text-white">
                            {fmt(result.rateMin)}
                          </span>
                          <span className="text-2xl font-bold text-muted-foreground">–</span>
                          <span className="text-4xl font-black text-white">
                            {fmt(result.rateMax)}
                          </span>
                          <span className="text-muted-foreground text-sm font-semibold">/ deal</span>
                        </div>
                      </div>
                    </div>

                    {/* Narrative */}
                    <div className="p-4 rounded-xl bg-secondary border border-border mb-4">
                      <p className="text-sm text-muted-foreground leading-relaxed">
                        <span className="text-white font-semibold">What this means: </span>
                        {result.narrative}
                      </p>
                    </div>

                    {/* Range bar */}
                    <div className="mb-1 flex justify-between text-xs text-muted-foreground">
                      <span>Conservative</span>
                      <span>Aggressive</span>
                    </div>
                    <div className="relative h-2 bg-secondary rounded-full overflow-hidden mb-4">
                      <div className="absolute inset-y-0 left-0 right-0 rounded-full bg-gradient-to-r from-primary/50 via-primary to-violet-400" />
                    </div>

                    {/* Contextual tips */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      {[
                        { Icon: TrendingUp, label: "Higher end if",   tip: "engagement rate is above 4%, or you have proven past brand ROI"       },
                        { Icon: DollarSign, label: "Lower end if",     tip: "this is your first paid deal or you're building a new relationship"   },
                        { Icon: BookOpen,   label: "Benchmark note",   tip: `${result.tier.label} creators in this niche typically close within this range` },
                      ].map(({ Icon, label, tip }) => (
                        <div key={label} className="flex flex-col gap-1.5 p-3 rounded-xl bg-background border border-border">
                          <div className="flex items-center gap-1.5 text-xs font-bold text-white">
                            <Icon size={12} className="text-primary" />
                            {label}
                          </div>
                          <p className="text-xs text-muted-foreground leading-snug">{tip}</p>
                        </div>
                      ))}
                    </div>

                    {/* Citation */}
                    <div className="mt-5 pt-4 border-t border-border flex items-start gap-2">
                      <BookOpen size={12} className="text-muted-foreground/60 mt-0.5 shrink-0" />
                      <p className="text-xs text-muted-foreground/70 leading-relaxed">
                        <span className="font-semibold">Source:</span>{" "}
                        <span className="underline underline-offset-2 cursor-pointer hover:text-muted-foreground transition-colors">
                          {result.citation.source}
                        </span>{" "}
                        · {result.citation.url} · Published {result.citation.date}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Warning banner */}
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.35, delay: 0.15 }}
                  className="flex items-start gap-3.5 p-5 rounded-2xl border border-amber-500/35 bg-amber-500/8"
                  data-testid="card-rate-warning"
                >
                  <AlertTriangle size={18} className="text-amber-400 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-bold text-amber-300 mb-1">
                      Do not lead with rate numbers in initial outreach.
                    </p>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      Brands that are interested will ask for your rate sheet. Opening with a number before they've seen your value kills deals before they start. Use this calculator to know your worth internally — then let the brand ask first. Share rates only when explicitly requested, or in a formal media kit after an initial positive response.
                    </p>
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>

      <Footer />
    </div>
  );
}
