import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  FileDown,
  Presentation,
  ChevronRight,
  Instagram,
  Youtube,
  CheckCircle2,
  Users,
  TrendingUp,
  BarChart3,
  Handshake,
  Sparkles,
  Info,
  AlertCircle,
} from "lucide-react";
import { useLocation } from "wouter";
import { SiTiktok, SiFacebook } from "react-icons/si";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

// ── Types ────────────────────────────────────────────────────────────────────

type PlatformKey = "instagram" | "tiktok" | "youtube" | "facebook";

interface PlatformStats {
  followers: string;
  engagementRate: string;
  avgWatchTime: string;
  avgViews: string;
}

type StatsForm = Record<PlatformKey, PlatformStats>;

const DEFAULT_FORM: StatsForm = {
  instagram: { followers: "", engagementRate: "", avgWatchTime: "", avgViews: "" },
  tiktok:    { followers: "", engagementRate: "", avgWatchTime: "", avgViews: "" },
  youtube:   { followers: "", engagementRate: "", avgWatchTime: "", avgViews: "" },
  facebook:  { followers: "", engagementRate: "", avgWatchTime: "", avgViews: "" },
};

const DEMO_FORM: StatsForm = {
  instagram: { followers: "52000", engagementRate: "5.8", avgWatchTime: "1:45", avgViews: "8400"  },
  tiktok:    { followers: "31000", engagementRate: "7.2", avgWatchTime: "0:52", avgViews: "14200" },
  youtube:   { followers: "18500", engagementRate: "3.9", avgWatchTime: "6:30", avgViews: "3800"  },
  facebook:  { followers: "9200",  engagementRate: "2.1", avgWatchTime: "0:45", avgViews: "1900"  },
};

// ── Platform metadata ────────────────────────────────────────────────────────

const PLATFORMS: {
  key: PlatformKey;
  label: string;
  color: string;
  Icon: React.ElementType;
}[] = [
  { key: "instagram", label: "Instagram", color: "#e1306c", Icon: Instagram },
  { key: "tiktok",    label: "TikTok",    color: "#ffffff", Icon: SiTiktok  },
  { key: "youtube",   label: "YouTube",   color: "#ff0000", Icon: Youtube   },
  { key: "facebook",  label: "Facebook",  color: "#1877f2", Icon: SiFacebook },
];

// ── Helpers ──────────────────────────────────────────────────────────────────

function fmt(n: string, suffix = "") {
  const v = parseFloat(n);
  if (isNaN(v)) return "—";
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M${suffix}`;
  if (v >= 1_000)     return `${(v / 1_000).toFixed(0)}K${suffix}`;
  return `${v}${suffix}`;
}

// ── Sub-components ───────────────────────────────────────────────────────────

function PlatformIcon({ Icon, color }: { Icon: React.ElementType; color: string }) {
  return <Icon size={18} style={{ color }} />;
}

function SlideCard({
  index,
  icon,
  title,
  children,
}: {
  index: number;
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 28 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, delay: 0.1 + index * 0.09 }}
      className="bg-card border border-border rounded-2xl overflow-hidden"
    >
      {/* Slide header */}
      <div className="flex items-center gap-3 px-7 py-4 border-b border-border bg-secondary/40">
        <span className="w-7 h-7 rounded-lg bg-primary/20 border border-primary/30 flex items-center justify-center text-xs font-black text-primary">
          {index + 1}
        </span>
        <div className="flex items-center gap-2 text-muted-foreground">
          {icon}
          <span className="text-sm font-semibold text-white">{title}</span>
        </div>
        <span className="ml-auto text-xs text-muted-foreground">Slide {index + 1} of 5</span>
      </div>
      {/* Slide body */}
      <div className="p-7">{children}</div>
    </motion.div>
  );
}

function StatChip({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5 px-4 py-3 rounded-xl bg-secondary border border-border">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="text-base font-bold text-white">{value}</span>
    </div>
  );
}

// ── Stats Input Form ─────────────────────────────────────────────────────────

function StatsForm({ onSubmit }: { onSubmit: (form: StatsForm) => void }) {
  const [, setLocation] = useLocation();
  const [form, setForm] = useState<StatsForm>(DEFAULT_FORM);
  const [errors, setErrors] = useState<Partial<Record<PlatformKey, string>>>({});

  const set = (platform: PlatformKey, field: keyof PlatformStats, value: string) => {
    setForm((prev) => ({
      ...prev,
      [platform]: { ...prev[platform], [field]: value },
    }));
    if (errors[platform]) setErrors((e) => ({ ...e, [platform]: undefined }));
  };

  const validate = () => {
    const newErrors: Partial<Record<PlatformKey, string>> = {};
    let ok = true;
    for (const { key } of PLATFORMS) {
      const p = form[key];
      if (!p.followers || !p.engagementRate || !p.avgWatchTime || !p.avgViews) {
        newErrors[key] = "Please fill in all fields for this platform.";
        ok = false;
      }
    }
    setErrors(newErrors);
    return ok;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validate()) onSubmit(form);
  };

  return (
    <div className="max-w-3xl mx-auto">
      {/* Back */}
      <motion.button
        initial={{ opacity: 0, x: -8 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.3 }}
        onClick={() => setLocation("/brands/fender")}
        data-testid="button-back"
        className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-white mb-8 transition-colors group"
      >
        <ArrowLeft size={15} className="group-hover:-translate-x-0.5 transition-transform" />
        Back to Fender
      </motion.button>

      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="mb-8"
      >
        <div className="flex items-center gap-2 mb-3">
          <Sparkles size={14} className="text-primary" />
          <span className="text-xs font-semibold text-primary uppercase tracking-wider">Pitch Deck Generator</span>
        </div>
        <h1 className="text-3xl font-extrabold text-white tracking-tight mb-2">
          First, tell us about your audience
        </h1>
        <p className="text-muted-foreground text-base leading-relaxed">
          To generate a pitch deck that converts, MAVLIT needs your real platform stats — follower count, engagement rate, average video watch time, and average views per post. This data populates your deck automatically so brands see exactly who they're reaching.
        </p>
      </motion.div>

      {/* Info banner */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, delay: 0.1 }}
        className="flex items-start gap-3 p-4 rounded-xl border border-primary/30 bg-primary/8 mb-8"
      >
        <Info size={15} className="text-primary mt-0.5 shrink-0" />
        <p className="text-sm text-muted-foreground leading-relaxed">
          Stats are used <span className="text-white font-semibold">only for your pitch deck</span> and are never shared without your consent. Accuracy matters — brands can verify numbers, so make sure they match your analytics dashboards.
        </p>
      </motion.div>

      <form onSubmit={handleSubmit} noValidate>
        <div className="flex flex-col gap-6">
          {PLATFORMS.map(({ key, label, color, Icon }, pi) => (
            <motion.div
              key={key}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.15 + pi * 0.07 }}
              className={`bg-card border rounded-2xl overflow-hidden transition-colors ${errors[key] ? "border-destructive/60" : "border-border"}`}
            >
              {/* Platform header */}
              <div
                className="flex items-center gap-3 px-6 py-4 border-b border-border"
                style={{ background: `${color}10` }}
              >
                <div
                  className="w-9 h-9 rounded-xl flex items-center justify-center"
                  style={{ background: `${color}22` }}
                >
                  <PlatformIcon Icon={Icon} color={color} />
                </div>
                <span className="font-bold text-white">{label}</span>
              </div>

              <div className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
                {[
                  { field: "followers"      as const, label: "Followers / Subscribers", placeholder: "e.g. 45000", suffix: "" },
                  { field: "engagementRate" as const, label: "Engagement Rate (%)",      placeholder: "e.g. 4.2",   suffix: "%" },
                  { field: "avgWatchTime"   as const, label: "Avg. Video Watch Time",    placeholder: "e.g. 2:35 or 155s", suffix: "" },
                  { field: "avgViews"       as const, label: "Avg. Views per Post",      placeholder: "e.g. 8200",  suffix: "" },
                ].map(({ field, label: fieldLabel, placeholder }) => (
                  <div key={field} className="flex flex-col gap-1.5">
                    <label
                      htmlFor={`${key}-${field}`}
                      className="text-xs font-semibold text-muted-foreground uppercase tracking-wider"
                    >
                      {fieldLabel}
                    </label>
                    <input
                      id={`${key}-${field}`}
                      data-testid={`input-${key}-${field}`}
                      type="text"
                      inputMode="decimal"
                      placeholder={placeholder}
                      value={form[key][field]}
                      onChange={(e) => set(key, field, e.target.value)}
                      className="w-full px-4 py-2.5 rounded-xl bg-secondary border border-border text-white placeholder:text-muted-foreground/50 text-sm font-medium focus:outline-none focus:border-primary/60 focus:ring-1 focus:ring-primary/30 transition-all"
                    />
                  </div>
                ))}
              </div>

              {errors[key] && (
                <div className="flex items-center gap-2 px-6 pb-4 text-xs text-destructive">
                  <AlertCircle size={12} />
                  {errors[key]}
                </div>
              )}
            </motion.div>
          ))}
        </div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.45 }}
          className="mt-8"
        >
          <button
            type="submit"
            data-testid="button-generate-deck"
            className="w-full flex items-center justify-center gap-2.5 py-4 rounded-xl bg-primary hover:bg-primary/90 text-white font-bold text-base shadow-lg shadow-primary/30 hover:shadow-primary/50 transition-all hover:-translate-y-0.5 active:translate-y-0"
          >
            <Sparkles size={18} />
            Generate My Pitch Deck
            <ChevronRight size={16} className="ml-1" />
          </button>
        </motion.div>
      </form>
    </div>
  );
}

// ── Pitch Deck Preview ───────────────────────────────────────────────────────

function DeckPreview({ form, onBack }: { form: StatsForm; onBack: () => void }) {
  const [toast, setToast] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2600);
  };

  const totalFollowers =
    (parseFloat(form.instagram.followers) || 0) +
    (parseFloat(form.tiktok.followers)    || 0) +
    (parseFloat(form.youtube.followers)   || 0) +
    (parseFloat(form.facebook.followers)  || 0);

  const avgEngagement = (
    PLATFORMS.reduce((sum, { key }) => sum + (parseFloat(form[key].engagementRate) || 0), 0) / 4
  ).toFixed(1);

  return (
    <div className="max-w-3xl mx-auto">
      {/* Back */}
      <motion.button
        initial={{ opacity: 0, x: -8 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.3 }}
        onClick={onBack}
        data-testid="button-back-to-form"
        className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-white mb-6 transition-colors group"
      >
        <ArrowLeft size={15} className="group-hover:-translate-x-0.5 transition-transform" />
        Edit Stats
      </motion.button>

      {/* Header + Export buttons */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="flex items-start justify-between gap-4 flex-wrap mb-8"
      >
        <div>
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle2 size={14} className="text-green-400" />
            <span className="text-xs font-semibold text-green-400 uppercase tracking-wider">Deck Ready</span>
          </div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight">
            Your Fender Pitch Deck
          </h1>
          <p className="text-muted-foreground text-sm mt-1">5 slides · Generated just now</p>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <button
            data-testid="button-export-pdf"
            onClick={() => showToast("Exporting as PDF...")}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-border bg-card hover:border-primary/50 hover:bg-secondary text-white text-sm font-semibold transition-all"
          >
            <FileDown size={15} />
            Export as PDF
          </button>
          <button
            data-testid="button-export-pptx"
            onClick={() => showToast("Exporting as PowerPoint...")}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary hover:bg-primary/90 text-white text-sm font-semibold shadow-md shadow-primary/30 transition-all"
          >
            <Presentation size={15} />
            Export as PowerPoint
          </button>
        </div>
      </motion.div>

      {/* ── Slide cards ── */}
      <div className="flex flex-col gap-5">

        {/* Slide 1: Creator Intro */}
        <SlideCard index={0} icon={<Users size={15} />} title="Creator Introduction">
          <div className="flex items-start gap-5 mb-6">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary/80 to-primary/40 flex items-center justify-center text-white font-black text-2xl shrink-0">
              C
            </div>
            <div>
              <h2 className="text-2xl font-extrabold text-white mb-1">Your Creator Profile</h2>
              <p className="text-muted-foreground text-sm leading-relaxed">
                Music creator · Guitar & production · Authentic gear storytelling across 4 platforms
              </p>
              <div className="flex gap-2 mt-3 flex-wrap">
                {["Music", "Guitar", "Production", "Gear Reviews"].map((t) => (
                  <span key={t} className="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-primary/15 text-primary border border-primary/30">
                    {t}
                  </span>
                ))}
              </div>
            </div>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {PLATFORMS.map(({ key, label, color, Icon }) => (
              <div key={key} className="flex flex-col items-center gap-1.5 p-3 rounded-xl bg-secondary border border-border">
                <PlatformIcon Icon={Icon} color={color} />
                <span className="text-sm font-bold text-white">{fmt(form[key].followers)}</span>
                <span className="text-xs text-muted-foreground">{label}</span>
              </div>
            ))}
          </div>
          <div className="mt-4 p-4 rounded-xl border border-primary/25 bg-primary/8">
            <p className="text-sm text-muted-foreground">
              Combined reach of{" "}
              <span className="text-white font-bold">{fmt(totalFollowers.toString())} followers</span> across
              all platforms, with an average engagement rate of{" "}
              <span className="text-white font-bold">{avgEngagement}%</span>.
            </p>
          </div>
        </SlideCard>

        {/* Slide 2: Audience Demographics */}
        <SlideCard index={1} icon={<BarChart3 size={15} />} title="Audience Demographics">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-5">
            <div className="p-4 rounded-xl bg-secondary border border-border">
              <p className="text-xs text-muted-foreground mb-2 uppercase tracking-wider font-semibold">Age Breakdown</p>
              {[["18–24", "34%"], ["25–34", "41%"], ["35–44", "18%"], ["45+", "7%"]].map(([range, pct]) => (
                <div key={range} className="flex items-center gap-2 mb-1.5">
                  <span className="text-xs text-muted-foreground w-12 shrink-0">{range}</span>
                  <div className="flex-1 h-1.5 bg-border rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full bg-primary"
                      style={{ width: pct }}
                    />
                  </div>
                  <span className="text-xs font-semibold text-white w-8 text-right">{pct}</span>
                </div>
              ))}
            </div>
            <div className="p-4 rounded-xl bg-secondary border border-border">
              <p className="text-xs text-muted-foreground mb-2 uppercase tracking-wider font-semibold">Gender</p>
              <div className="flex flex-col gap-2">
                {[["Male", "62%", "#7c3aed"], ["Female", "33%", "#ec4899"], ["Other", "5%", "#0ea5e9"]].map(([g, pct, color]) => (
                  <div key={g} className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground w-12 shrink-0">{g}</span>
                    <div className="flex-1 h-1.5 bg-border rounded-full overflow-hidden">
                      <div className="h-full rounded-full" style={{ width: pct, background: color }} />
                    </div>
                    <span className="text-xs font-semibold text-white w-8 text-right">{pct}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="p-4 rounded-xl bg-secondary border border-border">
              <p className="text-xs text-muted-foreground mb-2 uppercase tracking-wider font-semibold">Top Locations</p>
              {[["🇺🇸 United States", "48%"], ["🇬🇧 United Kingdom", "14%"], ["🇨🇦 Canada", "10%"], ["🇦🇺 Australia", "8%"]].map(([loc, pct]) => (
                <div key={loc} className="flex justify-between items-center mb-1.5">
                  <span className="text-xs text-muted-foreground">{loc}</span>
                  <span className="text-xs font-semibold text-white">{pct}</span>
                </div>
              ))}
            </div>
          </div>
          <p className="text-sm text-muted-foreground">
            Core audience is <span className="text-white font-semibold">millennial and Gen-Z musicians</span>, predominantly English-speaking markets — a high-purchase-intent segment for instrument and gear brands like Fender.
          </p>
        </SlideCard>

        {/* Slide 3: Platform Stats */}
        <SlideCard index={2} icon={<TrendingUp size={15} />} title="Platform Performance Stats">
          <div className="flex flex-col gap-5">
            {PLATFORMS.map(({ key, label, color, Icon }) => (
              <div key={key} className="flex flex-col gap-3">
                <div className="flex items-center gap-2">
                  <PlatformIcon Icon={Icon} color={color} />
                  <span className="text-sm font-bold text-white">{label}</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <StatChip label="Followers" value={fmt(form[key].followers)} />
                  <StatChip label="Engagement" value={`${form[key].engagementRate || "—"}%`} />
                  <StatChip label="Avg Watch Time" value={form[key].avgWatchTime || "—"} />
                  <StatChip label="Avg Views" value={fmt(form[key].avgViews)} />
                </div>
              </div>
            ))}
          </div>
        </SlideCard>

        {/* Slide 4: Brand Fit */}
        <SlideCard index={3} icon={<Sparkles size={15} />} title="Why We're a Match for Fender">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-5">
            {[
              {
                title: "Deep Audience Alignment",
                body: "68% of your followers are active musicians or aspiring players — the exact buyer persona Fender's sponsorship team targets for new product launches.",
                color: "#7c3aed",
              },
              {
                title: "Gear-First Content",
                body: `Your last 12 posts average ${avgEngagement}% engagement, with gear-related content outperforming lifestyle content by 2.3×.`,
                color: "#0ea5e9",
              },
              {
                title: "Native Integration Fit",
                body: "Your organic demo style (60–90s reviews, hands-on playthroughs) perfectly matches Fender's preferred content format for sponsored posts.",
                color: "#ec4899",
              },
              {
                title: "Cross-Platform Reach",
                body: `Combined ${fmt(totalFollowers.toString())} reach across 4 platforms means one partnership compounds across multiple audiences simultaneously.`,
                color: "#f59e0b",
              },
            ].map(({ title, body, color }) => (
              <div
                key={title}
                className="p-4 rounded-xl border border-border bg-secondary"
              >
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-2 h-2 rounded-full shrink-0" style={{ background: color }} />
                  <span className="text-sm font-bold text-white">{title}</span>
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed">{body}</p>
              </div>
            ))}
          </div>
          <div className="flex items-center justify-between p-4 rounded-xl border border-primary/30 bg-primary/10">
            <span className="text-sm font-semibold text-white">MAVLIT Match Score</span>
            <span className="text-2xl font-black text-primary">93%</span>
          </div>
        </SlideCard>

        {/* Slide 5: Proposed Deal */}
        <SlideCard index={4} icon={<Handshake size={15} />} title="Proposed Deal Structure">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
            <div className="p-5 rounded-xl bg-secondary border border-border text-center">
              <p className="text-xs text-muted-foreground uppercase tracking-wider mb-2 font-semibold">Deal Type</p>
              <p className="text-lg font-bold text-white">Sponsored Post</p>
              <p className="text-xs text-muted-foreground mt-1">+ optional ambassador upgrade</p>
            </div>
            <div
              className="p-5 rounded-xl border text-center"
              style={{ borderColor: "hsl(262 83% 58% / 0.4)", background: "hsl(262 83% 58% / 0.1)" }}
            >
              <p className="text-xs text-primary uppercase tracking-wider mb-2 font-semibold">Rate</p>
              <p className="text-3xl font-black text-white">$1,200</p>
              <p className="text-xs text-muted-foreground mt-1">Flat fee · per post</p>
            </div>
            <div className="p-5 rounded-xl bg-secondary border border-border text-center">
              <p className="text-xs text-muted-foreground uppercase tracking-wider mb-2 font-semibold">Deliverables</p>
              <p className="text-lg font-bold text-white">2 Posts</p>
              <p className="text-xs text-muted-foreground mt-1">1 video · 1 short-form</p>
            </div>
          </div>

          <div className="flex flex-col gap-2.5 mb-6">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
              What's included
            </p>
            {[
              "1 × 60–90 second YouTube integration (Fender product demo or review)",
              "1 × Instagram Reel or TikTok short featuring the product in organic context",
              "Perpetual usage rights for brand-owned channels (30 days post-publish)",
              "Performance report delivered 14 days after posting",
            ].map((item) => (
              <div key={item} className="flex items-start gap-2.5">
                <CheckCircle2 size={14} className="text-primary mt-0.5 shrink-0" />
                <span className="text-sm text-muted-foreground">{item}</span>
              </div>
            ))}
          </div>

          <div className="flex items-start gap-3 p-4 rounded-xl border border-amber-500/25 bg-amber-500/8">
            <Info size={14} className="text-amber-400 shrink-0 mt-0.5" />
            <p className="text-xs text-muted-foreground">
              Rate is negotiable. Based on your current stats, MAVLIT estimates a competitive range of{" "}
              <span className="text-white font-semibold">$800–$1,800</span> for this deal type with Fender.
            </p>
          </div>
        </SlideCard>
      </div>

      {/* Toast */}
      <AnimatePresence>
        {toast && (
          <motion.div
            key="toast"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-secondary border border-border rounded-xl px-5 py-3 text-sm font-semibold text-white shadow-2xl z-50 flex items-center gap-2 whitespace-nowrap"
          >
            <CheckCircle2 size={15} className="text-green-400" />
            {toast}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default function PitchDeck() {
  const isDemo = typeof window !== "undefined" && sessionStorage.getItem("demoMode") === "1";
  const [step, setStep] = useState<"form" | "preview">(isDemo ? "preview" : "form");
  const [formData, setFormData] = useState<StatsForm>(isDemo ? DEMO_FORM : DEFAULT_FORM);

  const handleFormSubmit = (data: StatsForm) => {
    setFormData(data);
    setStep("preview");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <div className="min-h-screen bg-background text-foreground overflow-x-hidden">
      <Navbar />
      <main className="pt-28 pb-24 px-4">
        <AnimatePresence mode="wait">
          {step === "form" ? (
            <motion.div
              key="form"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
            >
              <StatsForm onSubmit={handleFormSubmit} />
            </motion.div>
          ) : (
            <motion.div
              key="preview"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.35 }}
            >
              <DeckPreview form={formData} onBack={() => { setStep("form"); window.scrollTo({ top: 0 }); }} />
            </motion.div>
          )}
        </AnimatePresence>
      </main>
      <Footer />
    </div>
  );
}
