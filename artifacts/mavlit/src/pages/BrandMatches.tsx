import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import {
  CheckCircle2, SlidersHorizontal, Music, Headphones, Zap, Camera,
  ShoppingBag, Cpu, Copy, Check, Linkedin, ChevronDown, ChevronUp,
  Clock, X, Building2, Users,
} from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

const CATEGORIES = ["All", "Audio", "Streaming", "Lifestyle", "Software", "Retail", "Beverage"];

const TIMING_COPY =
  "Brand campaign calendars are planned 60–90 days out. Pitching in June means you're pitching for Q4/Holiday. Brands casting now won't be visible until those campaigns go live — which is why early outreach is a competitive advantage.";

type ContactType = "agency" | "in-house";

const BRANDS = [
  {
    id: 1,
    name: "Sennheiser",
    slug: "sennheiser",
    category: "Audio",
    color: "#7c3aed",
    matchScore: 97,
    icon: Headphones,
    contactType: "agency" as ContactType,
    contact: {
      name: "Sarah Chen",
      title: "Director of Influencer Marketing",
      company: "Edelman",
      linkedin: "https://linkedin.com/in/sarah-chen-example",
      email: "sarah.chen@edelman.com",
      note: "Handles creator partnerships for Sennheiser's North America campaigns.",
    },
    hashtag: "SennheiserPartner",
    reasons: [
      "Your gear-focused content aligns perfectly with their pro audio audience — avg. 84% overlap with Sennheiser buyers.",
      "3 of your last 5 videos featured studio equipment, making native integration seamless and authentic.",
    ],
  },
  {
    id: 2,
    name: "Spotify for Artists",
    slug: "spotify",
    category: "Streaming",
    color: "#1db954",
    matchScore: 94,
    icon: Music,
    contactType: "in-house" as ContactType,
    contact: {
      name: "Marcus Williams",
      title: "Creator Partnerships Manager",
      company: "Spotify",
      linkedin: "https://linkedin.com/in/marcus-williams-example",
      email: "m.williams@spotify.com",
      note: "Manages creator campaigns directly from Spotify's internal partnerships team.",
    },
    hashtag: "SpotifyPartner",
    reasons: [
      "Your audience skews 18–34 and streams 4+ hours of music daily — Spotify's exact target demographic.",
      "Creator-to-platform partnership campaigns are active in Q3; your niche positions you as a top-tier candidate.",
    ],
  },
  {
    id: 3,
    name: "Native Instruments",
    slug: "native-instruments",
    category: "Software",
    color: "#f59e0b",
    matchScore: 91,
    icon: Cpu,
    contactType: "agency" as ContactType,
    contact: {
      name: "Priya Sharma",
      title: "Account Supervisor",
      company: "Fleischman Hillard",
      linkedin: "https://linkedin.com/in/priya-sharma-example",
      email: "p.sharma@fleishman.com",
      note: "Oversees influencer and creator strategy for Native Instruments' global campaigns.",
    },
    hashtag: "NativeInstrumentsPartner",
    reasons: [
      "68% of your followers self-identify as producers or beatmakers — exactly who NI targets with Maschine and Komplete.",
      "Your tutorial-style content averages 9-min watch time, giving sponsored segments meaningful exposure.",
    ],
  },
  {
    id: 4,
    name: "GoPro",
    slug: "gopro",
    category: "Lifestyle",
    color: "#0ea5e9",
    matchScore: 88,
    icon: Camera,
    contactType: "in-house" as ContactType,
    contact: {
      name: "Jake Torres",
      title: "Influencer Marketing Manager",
      company: "GoPro",
      linkedin: "https://linkedin.com/in/jake-torres-example",
      email: "j.torres@gopro.com",
      note: "Runs GoPro's creator program and reviews inbound partnership pitches directly.",
    },
    hashtag: "GoPro",
    reasons: [
      "Live performance and behind-the-scenes content make up 40% of your catalog — prime territory for GoPro's POV narrative.",
      "Your engagement rate of 6.2% is 3× the platform average, ensuring sponsored content converts, not just reaches.",
    ],
  },
  {
    id: 5,
    name: "Sweetwater",
    slug: "sweetwater",
    category: "Retail",
    color: "#ec4899",
    matchScore: 85,
    icon: ShoppingBag,
    contactType: "in-house" as ContactType,
    contact: {
      name: "Dana Kim",
      title: "Brand Partnerships Lead",
      company: "Sweetwater",
      linkedin: "https://linkedin.com/in/dana-kim-example",
      email: "d.kim@sweetwater.com",
      note: "Leads Sweetwater's affiliate and creator partnership initiatives from their Fort Wayne HQ.",
    },
    hashtag: "SweetwaterPartner",
    reasons: [
      "Sweetwater's affiliate conversion rate is highest among gear-review creators — your format mirrors their top earners.",
      "Your comment section regularly features gear questions, signaling purchase-intent audiences Sweetwater actively seeks.",
    ],
  },
  {
    id: 6,
    name: "Red Bull",
    slug: "red-bull",
    category: "Beverage",
    color: "#ef4444",
    matchScore: 81,
    icon: Zap,
    contactType: "agency" as ContactType,
    contact: {
      name: "Alex Rivera",
      title: "Account Manager",
      company: "Edelman",
      linkedin: "https://linkedin.com/in/alex-rivera-example",
      email: "a.rivera@edelman.com",
      note: "Manages Red Bull Music creator campaigns across North America and Latin America.",
    },
    hashtag: "RedBullMusicPartner",
    reasons: [
      "Red Bull Music sponsors 200+ creator campaigns yearly; your music-lifestyle blend fits their cultural content strategy.",
      "Audience affinity analysis shows 71% of your followers also follow Red Bull Music's official channels.",
    ],
  },
];

type Brand = (typeof BRANDS)[0];

/* ─── Score Ring ─────────────────────────────────────────── */
function ScoreRing({ score, size = 56 }: { score: number; size?: number }) {
  const r = size / 2 - 6;
  const circ = 2 * Math.PI * r;
  const dash = (score / 100) * circ;
  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      <svg className="absolute inset-0 -rotate-90" width={size} height={size}>
        <circle cx={size / 2} cy={size / 2} r={r} stroke="hsl(240 5% 15%)" strokeWidth="4" fill="none" />
        <circle cx={size / 2} cy={size / 2} r={r} stroke="hsl(262 83% 58%)" strokeWidth="4" fill="none"
          strokeDasharray={`${dash} ${circ}`} strokeLinecap="round" />
      </svg>
      <span className="text-xs font-bold text-white z-10">{score}%</span>
    </div>
  );
}

/* ─── Copy Email Button ──────────────────────────────────── */
function CopyEmailButton({ email, variant = "default" }: { email: string; variant?: "default" | "panel" }) {
  const [copied, setCopied] = useState(false);
  const handle = () => {
    navigator.clipboard.writeText(email).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };
  const base = "flex items-center gap-1.5 rounded-lg text-xs font-semibold transition-all duration-200";
  const styles = variant === "panel"
    ? `${base} px-4 py-2 border border-border text-muted-foreground hover:text-white hover:border-white/30`
    : `${base} px-3 py-1.5 border border-border text-muted-foreground hover:text-white hover:border-white/30`;
  return (
    <button onClick={handle} className={styles}>
      {copied ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
      {copied ? "Copied!" : "Copy email"}
    </button>
  );
}

/* ─── Contact Type Badge ─────────────────────────────────── */
function ContactBadge({ type }: { type: ContactType }) {
  if (type === "agency") {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-primary/15 text-primary border border-primary/30">
        <Building2 size={11} />
        Agency-side
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
      <Users size={11} />
      In-house
    </span>
  );
}

/* ─── Contact Intel Panel (slide-out) ───────────────────── */
function ContactPanel({ brand, onClose }: { brand: Brand; onClose: () => void }) {
  const Icon = brand.icon;
  const [, setLocation] = useLocation();

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose]);

  const handlePitch = () => {
    onClose();
    setLocation(`/pitch?brand=${encodeURIComponent(brand.name)}`);
  };

  return (
    <>
      {/* Backdrop */}
      <motion.div
        key="backdrop"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        className="fixed inset-0 bg-black/60 z-40 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Panel */}
      <motion.div
        key="panel"
        initial={{ x: "100%" }}
        animate={{ x: 0 }}
        exit={{ x: "100%" }}
        transition={{ type: "spring", damping: 28, stiffness: 260 }}
        className="fixed top-0 right-0 h-full w-full max-w-md bg-[hsl(240_10%_5%)] border-l border-border z-50 flex flex-col overflow-hidden shadow-2xl"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-border shrink-0">
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center text-white shrink-0"
              style={{ background: `linear-gradient(135deg, ${brand.color}cc, ${brand.color}66)` }}
            >
              <Icon size={18} />
            </div>
            <div>
              <h2 className="text-white font-bold text-base leading-tight">{brand.name}</h2>
              <span className="text-xs" style={{ color: brand.color }}>{brand.category}</span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <ScoreRing score={brand.matchScore} size={44} />
            <button
              onClick={onClose}
              className="w-8 h-8 flex items-center justify-center rounded-lg text-muted-foreground hover:text-white hover:bg-white/5 transition-colors"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">

          {/* Contact Intel */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Contact Intel</p>
            <div className="rounded-2xl bg-card border border-border p-5 space-y-4">
              {/* Name + badge */}
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-white font-bold text-base leading-snug">{brand.contact.name}</p>
                  <p className="text-sm text-muted-foreground mt-0.5">{brand.contact.title}</p>
                  <p className="text-sm text-muted-foreground">{brand.contact.company}</p>
                </div>
                <ContactBadge type={brand.contactType} />
              </div>

              <div className="h-px bg-border" />

              {/* Actions */}
              <div className="flex items-center gap-2 flex-wrap">
                <a
                  href={brand.contact.linkedin}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold bg-primary text-white hover:bg-primary/85 transition-colors duration-200"
                >
                  <Linkedin size={13} />
                  View on LinkedIn
                </a>
                <CopyEmailButton email={brand.contact.email} variant="panel" />
              </div>

              {/* Email display */}
              <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-background border border-border">
                <span className="text-xs text-muted-foreground font-mono flex-1 truncate">{brand.contact.email}</span>
              </div>

              {/* Note */}
              <p className="text-xs text-muted-foreground leading-relaxed">{brand.contact.note}</p>
            </div>
          </div>

          {/* Why it's a match */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Why it's a match</p>
            <ul className="space-y-3">
              {brand.reasons.map((reason, i) => (
                <li key={i} className="flex items-start gap-2.5">
                  <CheckCircle2 size={14} className="mt-0.5 shrink-0" style={{ color: brand.color }} />
                  <span className="text-sm text-muted-foreground leading-relaxed">{reason}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Hashtag research tip */}
          <div className="px-4 py-3 rounded-xl bg-white/[0.03] border border-border">
            <p className="text-xs text-muted-foreground leading-relaxed">
              <span className="font-semibold text-white/50">Research tip:</span> Search{" "}
              <span className="font-mono text-white/60">#{brand.hashtag}Partner</span> or{" "}
              <span className="font-mono text-white/60">#{brand.hashtag}Ad</span> on Instagram to see the volume and style of their past creator campaigns before you pitch.
            </p>
          </div>
        </div>

        {/* Footer CTA */}
        <div className="px-6 py-5 border-t border-border shrink-0">
          <button
            onClick={handlePitch}
            className="w-full py-3 rounded-xl text-sm font-bold bg-primary text-white hover:bg-primary/85 transition-colors duration-200 shadow-lg shadow-primary/20"
          >
            Create pitch email →
          </button>
        </div>
      </motion.div>
    </>
  );
}

/* ─── Brand Card ─────────────────────────────────────────── */
function BrandCard({ brand, index, onOpen }: { brand: Brand; index: number; onOpen: () => void }) {
  const Icon = brand.icon;
  const [timingOpen, setTimingOpen] = useState(false);
  const [, setLocation] = useLocation();

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -12, scale: 0.97 }}
      transition={{ duration: 0.35, delay: index * 0.06, ease: "easeOut" }}
      whileHover={{ y: -4, transition: { duration: 0.2 } }}
      data-testid={`card-brand-${brand.id}`}
      onClick={() => setLocation(`/brands/${brand.slug}`)}
      className="group relative flex flex-col bg-card border border-border rounded-2xl overflow-hidden hover:border-primary/50 transition-colors duration-300 cursor-pointer"
    >
      <div
        className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none rounded-2xl"
        style={{ boxShadow: `inset 0 0 40px 0 ${brand.color}18` }}
      />

      {/* Header */}
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
            <h3 className="text-white font-bold text-lg leading-tight truncate" data-testid={`text-brandname-${brand.id}`}>
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

          {/* Timing badge — expandable */}
          <button
            onClick={(e) => { e.stopPropagation(); setTimingOpen((o) => !o); }}
            className="mt-2 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/25 text-emerald-400 text-xs font-semibold hover:bg-emerald-500/15 transition-colors duration-200"
          >
            <Clock size={11} />
            Pitch now → Q4/Holiday campaigns
            {timingOpen ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
          </button>

          <AnimatePresence>
            {timingOpen && (
              <motion.p
                initial={{ opacity: 0, height: 0, marginTop: 0 }}
                animate={{ opacity: 1, height: "auto", marginTop: 8 }}
                exit={{ opacity: 0, height: 0, marginTop: 0 }}
                transition={{ duration: 0.25 }}
                className="text-xs text-muted-foreground leading-relaxed overflow-hidden"
              >
                {TIMING_COPY}
              </motion.p>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Why it's a match */}
      <div className="px-6 pb-4 flex flex-col gap-3 flex-1">
        <div className="h-px bg-border" />
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Why it's a match</p>
        <ul className="flex flex-col gap-3">
          {brand.reasons.map((reason, i) => (
            <li key={i} className="flex items-start gap-2.5">
              <CheckCircle2 size={15} className="mt-0.5 shrink-0" style={{ color: brand.color }} />
              <span className="text-sm text-muted-foreground leading-relaxed">{reason}</span>
            </li>
          ))}
        </ul>

        {/* Compact contact preview */}
        <div className="mt-1 px-4 py-3 rounded-xl bg-[hsl(240_10%_8%)] border border-border flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-sm font-bold text-white leading-snug truncate">{brand.contact.name}</p>
            <p className="text-xs text-muted-foreground truncate">{brand.contact.title} · {brand.contact.company}</p>
          </div>
          <ContactBadge type={brand.contactType} />
        </div>
      </div>

      {/* CTA */}
      <div className="px-6 pb-5 pt-1">
        <button
          data-testid={`button-pitch-${brand.id}`}
          onClick={(e) => { e.stopPropagation(); setLocation(`/pitch?brand=${encodeURIComponent(brand.name)}`); }}
          className="w-full py-2.5 rounded-xl text-sm font-semibold border border-border text-white/70 hover:bg-primary hover:border-primary hover:text-white transition-all duration-200"
        >
          Create pitch email →
        </button>
      </div>
    </motion.div>
  );
}

/* ─── Page ───────────────────────────────────────────────── */
export default function BrandMatches() {
  const [activeCategory, setActiveCategory] = useState("All");
  const [selectedBrand, setSelectedBrand] = useState<Brand | null>(null);

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
            className="mb-6"
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
              <motion.div key="grid" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {filtered.map((brand, i) => (
                  <BrandCard key={brand.id} brand={brand} index={i} onOpen={() => setSelectedBrand(brand)} />
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

      {/* Contact Intel Panel */}
      <AnimatePresence>
        {selectedBrand && (
          <ContactPanel brand={selectedBrand} onClose={() => setSelectedBrand(null)} />
        )}
      </AnimatePresence>
    </div>
  );
}
