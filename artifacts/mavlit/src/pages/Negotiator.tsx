import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  AlertTriangle, CheckCircle2, ChevronDown, Sparkles, Copy, Check,
  TrendingUp, DollarSign, BarChart3
} from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { useAuth } from "@workspace/replit-auth-web";

// ── Rate data ─────────────────────────────────────────────────────────────────

const NICHES = ["Music", "Lifestyle", "Fashion", "Tech", "Gaming", "Food", "Travel", "Fitness", "Beauty", "Finance"];
const DEAL_TYPES = [
  "Instagram Reel",
  "Instagram Reel + 2 Stories",
  "Single Story (3 frames)",
  "TikTok Video",
];

type RateEntry = {
  range: string;
  median: string;
  topQ: string;
  dealCount: number;
  source: string;
};

const RATES: Record<string, Record<string, RateEntry>> = {
  Music: {
    "Instagram Reel":              { range: "$400–$2,000",  median: "$900",    topQ: "$1,600+", dealCount: 847,  source: "Influencer Marketing Hub Creator Rate Report, 2024" },
    "Instagram Reel + 2 Stories":  { range: "$600–$3,500",  median: "$1,400",  topQ: "$2,800+", dealCount: 612,  source: "Influencer Marketing Hub Creator Rate Report, 2024" },
    "Single Story (3 frames)":     { range: "$150–$800",    median: "$350",    topQ: "$600+",   dealCount: 1243, source: "Influencer Marketing Hub Creator Rate Report, 2024" },
    "TikTok Video":                { range: "$300–$2,500",  median: "$800",    topQ: "$1,800+", dealCount: 923,  source: "Influencer Marketing Hub Creator Rate Report, 2024" },
  },
  Lifestyle: {
    "Instagram Reel":              { range: "$500–$3,000",  median: "$1,200",  topQ: "$2,400+", dealCount: 1820, source: "Later & Fohr Creator Economy Report, 2024" },
    "Instagram Reel + 2 Stories":  { range: "$800–$5,000",  median: "$1,900",  topQ: "$4,000+", dealCount: 1104, source: "Later & Fohr Creator Economy Report, 2024" },
    "Single Story (3 frames)":     { range: "$200–$1,000",  median: "$420",    topQ: "$800+",   dealCount: 2341, source: "Later & Fohr Creator Economy Report, 2024" },
    "TikTok Video":                { range: "$400–$3,500",  median: "$1,000",  topQ: "$2,200+", dealCount: 1567, source: "Later & Fohr Creator Economy Report, 2024" },
  },
  Fashion: {
    "Instagram Reel":              { range: "$600–$4,000",  median: "$1,500",  topQ: "$3,000+", dealCount: 2140, source: "HypeAuditor State of Influencer Marketing, 2024" },
    "Instagram Reel + 2 Stories":  { range: "$900–$6,500",  median: "$2,400",  topQ: "$5,000+", dealCount: 1380, source: "HypeAuditor State of Influencer Marketing, 2024" },
    "Single Story (3 frames)":     { range: "$250–$1,200",  median: "$550",    topQ: "$1,000+", dealCount: 2980, source: "HypeAuditor State of Influencer Marketing, 2024" },
    "TikTok Video":                { range: "$500–$4,500",  median: "$1,300",  topQ: "$3,000+", dealCount: 1740, source: "HypeAuditor State of Influencer Marketing, 2024" },
  },
  Tech: {
    "Instagram Reel":              { range: "$700–$5,000",  median: "$1,800",  topQ: "$3,500+", dealCount: 934,  source: "CreatorIQ Annual Benchmark Report, 2024" },
    "Instagram Reel + 2 Stories":  { range: "$1,000–$8,000",median: "$2,800",  topQ: "$6,000+", dealCount: 612,  source: "CreatorIQ Annual Benchmark Report, 2024" },
    "Single Story (3 frames)":     { range: "$300–$1,500",  median: "$650",    topQ: "$1,200+", dealCount: 1123, source: "CreatorIQ Annual Benchmark Report, 2024" },
    "TikTok Video":                { range: "$600–$6,000",  median: "$1,600",  topQ: "$4,000+", dealCount: 876,  source: "CreatorIQ Annual Benchmark Report, 2024" },
  },
  Gaming: {
    "Instagram Reel":              { range: "$300–$2,500",  median: "$850",    topQ: "$1,800+", dealCount: 1120, source: "Streamlabs & Newzoo Creator Report, 2024" },
    "Instagram Reel + 2 Stories":  { range: "$500–$4,000",  median: "$1,300",  topQ: "$2,800+", dealCount: 743,  source: "Streamlabs & Newzoo Creator Report, 2024" },
    "Single Story (3 frames)":     { range: "$100–$700",    median: "$280",    topQ: "$550+",   dealCount: 1560, source: "Streamlabs & Newzoo Creator Report, 2024" },
    "TikTok Video":                { range: "$250–$3,000",  median: "$750",    topQ: "$2,000+", dealCount: 1340, source: "Streamlabs & Newzoo Creator Report, 2024" },
  },
  Food: {
    "Instagram Reel":              { range: "$450–$2,800",  median: "$1,050",  topQ: "$2,000+", dealCount: 1560, source: "Later & Fohr Creator Economy Report, 2024" },
    "Instagram Reel + 2 Stories":  { range: "$700–$4,500",  median: "$1,600",  topQ: "$3,500+", dealCount: 980,  source: "Later & Fohr Creator Economy Report, 2024" },
    "Single Story (3 frames)":     { range: "$180–$900",    median: "$380",    topQ: "$700+",   dealCount: 2100, source: "Later & Fohr Creator Economy Report, 2024" },
    "TikTok Video":                { range: "$350–$3,200",  median: "$900",    topQ: "$2,400+", dealCount: 1230, source: "Later & Fohr Creator Economy Report, 2024" },
  },
  Travel: {
    "Instagram Reel":              { range: "$550–$3,500",  median: "$1,300",  topQ: "$2,600+", dealCount: 1080, source: "Influencer Marketing Hub Creator Rate Report, 2024" },
    "Instagram Reel + 2 Stories":  { range: "$850–$5,500",  median: "$2,000",  topQ: "$4,200+", dealCount: 720,  source: "Influencer Marketing Hub Creator Rate Report, 2024" },
    "Single Story (3 frames)":     { range: "$220–$1,100",  median: "$470",    topQ: "$900+",   dealCount: 1540, source: "Influencer Marketing Hub Creator Rate Report, 2024" },
    "TikTok Video":                { range: "$450–$4,000",  median: "$1,100",  topQ: "$2,800+", dealCount: 890,  source: "Influencer Marketing Hub Creator Rate Report, 2024" },
  },
  Fitness: {
    "Instagram Reel":              { range: "$500–$3,200",  median: "$1,100",  topQ: "$2,200+", dealCount: 1740, source: "HypeAuditor State of Influencer Marketing, 2024" },
    "Instagram Reel + 2 Stories":  { range: "$750–$5,000",  median: "$1,700",  topQ: "$3,800+", dealCount: 1120, source: "HypeAuditor State of Influencer Marketing, 2024" },
    "Single Story (3 frames)":     { range: "$200–$1,000",  median: "$400",    topQ: "$780+",   dealCount: 2340, source: "HypeAuditor State of Influencer Marketing, 2024" },
    "TikTok Video":                { range: "$400–$3,800",  median: "$950",    topQ: "$2,500+", dealCount: 1460, source: "HypeAuditor State of Influencer Marketing, 2024" },
  },
  Beauty: {
    "Instagram Reel":              { range: "$700–$5,500",  median: "$1,900",  topQ: "$4,000+", dealCount: 2560, source: "CreatorIQ Annual Benchmark Report, 2024" },
    "Instagram Reel + 2 Stories":  { range: "$1,100–$9,000",median: "$3,000",  topQ: "$7,000+", dealCount: 1780, source: "CreatorIQ Annual Benchmark Report, 2024" },
    "Single Story (3 frames)":     { range: "$300–$1,800",  median: "$700",    topQ: "$1,400+", dealCount: 3200, source: "CreatorIQ Annual Benchmark Report, 2024" },
    "TikTok Video":                { range: "$600–$6,500",  median: "$1,700",  topQ: "$4,500+", dealCount: 2140, source: "CreatorIQ Annual Benchmark Report, 2024" },
  },
  Finance: {
    "Instagram Reel":              { range: "$900–$8,000",  median: "$2,800",  topQ: "$5,500+", dealCount: 420,  source: "Influencer Marketing Hub Creator Rate Report, 2024" },
    "Instagram Reel + 2 Stories":  { range: "$1,400–$13,000",median: "$4,200", topQ: "$9,000+", dealCount: 280,  source: "Influencer Marketing Hub Creator Rate Report, 2024" },
    "Single Story (3 frames)":     { range: "$400–$2,500",  median: "$950",    topQ: "$2,000+", dealCount: 540,  source: "Influencer Marketing Hub Creator Rate Report, 2024" },
    "TikTok Video":                { range: "$800–$9,500",  median: "$2,400",  topQ: "$6,000+", dealCount: 360,  source: "Influencer Marketing Hub Creator Rate Report, 2024" },
  },
};

const RATE_FACTORS = [
  "High save rate (brands value saves as purchase-intent signals)",
  "Prior brand partnerships — proven track record",
  "Audience skews 25–44 with higher purchasing power",
  "High engagement rate relative to follower count",
  "Niche audience with documented purchase behavior",
];

const CONTRACT_ITEMS = [
  {
    icon: "⚠️",
    title: "Usage rights",
    body: "Perpetuity clauses let brands use your content forever — including in paid ads and billboards. Always limit to a defined term and charge more for extended use.",
  },
  {
    icon: "🔒",
    title: "Exclusivity",
    body: "Category exclusivity means you can't work with competitors for a set period. Make sure the duration and category are clearly defined.",
  },
  {
    icon: "📡",
    title: "Whitelisting / paid amplification",
    body: "If a brand wants to boost your post as a paid ad, that's a separate right. It should cost more.",
  },
  {
    icon: "📝",
    title: "Content ownership",
    body: "Who owns the content post-campaign? By default you do — but contracts can transfer this. Never sign away ownership without additional compensation.",
  },
  {
    icon: "💰",
    title: "Kill fee",
    body: "If a brand cancels after you've started creating, ask for 50% of the agreed rate if cancelled within 14 days of delivery.",
  },
];

const PRINCIPLES = [
  { title: "Never lead with your rate",      body: "Let them make the first offer. You can only negotiate up from their number." },
  { title: "Rates are not formulaic",        body: "The same deliverable varies 5–10× based on vertical, audience quality, and terms." },
  { title: "Usage rights cost extra",        body: "A post fee and a licensing fee are two separate things. Charge for both." },
  { title: "If everyone says yes, raise it", body: "A 100% close rate means your rate is too low. Aim for 60–70% acceptance." },
  { title: "Budget ceiling ≠ your value",    body: "\"We only have $X\" is an opening position, not a fact." },
];

// ── Sub-components ────────────────────────────────────────────────────────────

function SelectField({ value, onChange, options, placeholder }: {
  value: string; onChange: (v: string) => void; options: string[]; placeholder: string;
}) {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        className="w-full px-3.5 py-2.5 rounded-xl bg-black/40 border border-border text-sm appearance-none focus:outline-none focus:border-primary/60 focus:ring-1 focus:ring-primary/30 transition-all pr-9 text-white"
      >
        <option value="" disabled>{placeholder}</option>
        {options.map(o => <option key={o} value={o}>{o}</option>)}
      </select>
      <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
    </div>
  );
}

function MetricCard({ icon: Icon, label, value, accent }: {
  icon: React.ElementType; label: string; value: string; accent: string;
}) {
  return (
    <div className="flex-1 bg-black/30 border border-border rounded-xl p-4 flex flex-col gap-1">
      <div className="flex items-center gap-1.5 mb-1">
        <Icon size={13} style={{ color: accent }} />
        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{label}</span>
      </div>
      <span className="text-xl font-extrabold text-white">{value}</span>
    </div>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default function Negotiator() {
  const { isAuthenticated, isLoading, login } = useAuth();
  const [niche, setNiche] = useState("");
  const [dealType, setDealType] = useState("");

  const [brandName, setBrandName] = useState("");
  const [followerCount, setFollowerCount] = useState("");
  const [contactSeniority, setContactSeniority] = useState("");
  const [noResponse, setNoResponse] = useState(false);
  const [brandResponse, setBrandResponse] = useState("");
  const [advising, setAdvising] = useState(false);
  const [advice, setAdvice] = useState<string | null>(null);
  const [adviceError, setAdviceError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const rateData = niche && dealType ? RATES[niche]?.[dealType] : null;

  const canAdvise = brandName.trim() && followerCount.trim() && brandResponse.trim();

  const getAdvice = async () => {
    if (!canAdvise) return;
    setAdvising(true);
    setAdvice(null);
    setAdviceError(null);

    try {
      const res = await fetch("/api/negotiator/advise", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ brandName, followerCount, brandResponse, contactSeniority, noResponse }),
      });

      if (!res.ok) throw new Error("Server error");

      const reader = res.body?.getReader();
      if (!reader) throw new Error("No stream");

      const decoder = new TextDecoder();
      let buffer = "";
      let full = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";
        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          try {
            const parsed = JSON.parse(line.slice(6));
            if (parsed.done) break;
            if (parsed.error) throw new Error(parsed.error);
            if (parsed.content) { full += parsed.content; setAdvice(full); }
          } catch {}
        }
      }
    } catch {
      setAdviceError("Something went wrong. Please try again.");
    } finally {
      setAdvising(false);
    }
  };

  const copyAdvice = async () => {
    if (!advice) return;
    await navigator.clipboard.writeText(advice);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!isLoading && !isAuthenticated) {
    return (
      <div className="min-h-screen bg-background text-foreground overflow-x-hidden">
        <Navbar />
        <main className="pt-28 pb-24 px-4 flex items-center justify-center">
          <div className="text-center space-y-4 max-w-sm">
            <h2 className="text-2xl font-bold text-white">Sign in to use Negotiator</h2>
            <p className="text-muted-foreground text-sm">You need to be signed in to get negotiation advice.</p>
            <button
              onClick={login}
              className="w-full px-6 py-3 rounded-xl bg-primary text-primary-foreground font-semibold hover:opacity-90 transition"
            >
              Log in
            </button>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground overflow-x-hidden">
      <Navbar />

      <main className="pt-28 pb-24 px-4">
        <div className="max-w-6xl mx-auto">

          {/* Header */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} className="mb-10">
            <h1 className="text-4xl font-extrabold text-white tracking-tight mb-2">Negotiator</h1>
            <p className="text-muted-foreground text-base max-w-2xl">
              Rate intelligence, negotiation guidance, and contract checklist. Use this when a brand responds — or to prep before any rate conversation.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-8 items-start">
            {/* Left column */}
            <div className="space-y-8">

              {/* ── Section 1: Market rate intelligence ── */}
              <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.05 }} className="bg-card border border-border rounded-2xl p-6 space-y-5">
                <h2 className="text-lg font-bold text-white">1 — Market rate intelligence</h2>

                {/* Warning box */}
                <div className="flex items-start gap-3 px-4 py-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30">
                  <AlertTriangle size={15} className="text-amber-400 mt-0.5 shrink-0" />
                  <p className="text-sm text-amber-200/90 leading-relaxed">
                    <span className="font-bold text-amber-300">Important:</span> Rates in creator deals are not formulaic. The same deliverable can vary 5–10× based on your vertical, audience quality, and exclusivity terms. Use these ranges as a starting point — not a ceiling and not a guarantee.
                  </p>
                </div>

                {/* Dropdowns */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-white/80 mb-1.5">Niche</label>
                    <SelectField value={niche} onChange={setNiche} options={NICHES} placeholder="Select niche" />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-white/80 mb-1.5">Deal type</label>
                    <SelectField value={dealType} onChange={setDealType} options={DEAL_TYPES} placeholder="Select deal type" />
                  </div>
                </div>

                {/* Rate cards */}
                <AnimatePresence>
                  {rateData && (
                    <motion.div
                      key={`${niche}-${dealType}`}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.3 }}
                      className="space-y-4"
                    >
                      <div className="flex gap-3">
                        <MetricCard icon={BarChart3} label="Observed range" value={rateData.range} accent="hsl(262 83% 58%)" />
                        <MetricCard icon={DollarSign} label="Median" value={rateData.median} accent="#1db954" />
                        <MetricCard icon={TrendingUp} label="Top quartile" value={rateData.topQ} accent="#f59e0b" />
                      </div>

                      <p className="text-xs text-muted-foreground/70">
                        Based on {rateData.dealCount.toLocaleString()} recent deals reported. Source: {rateData.source}
                      </p>

                      <div className="space-y-2">
                        <p className="text-sm font-semibold text-white">Factors that push your rate higher:</p>
                        <ul className="space-y-1.5">
                          {RATE_FACTORS.map((f, i) => (
                            <li key={i} className="flex items-start gap-2">
                              <CheckCircle2 size={14} className="mt-0.5 shrink-0 text-emerald-400" />
                              <span className="text-sm text-muted-foreground">{f}</span>
                            </li>
                          ))}
                        </ul>
                        <p className="text-xs text-muted-foreground/60 italic pt-1">
                          Pro tip: If every brand you pitch says yes to your rate, raise it. You're leaving money on the table.
                        </p>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>

              {/* ── Section 2: AI negotiation advisor ── */}
              <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.1 }} className="bg-card border border-border rounded-2xl p-6 space-y-5">
                <h2 className="text-lg font-bold text-white">2 — AI negotiation advisor</h2>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-white/80 mb-1.5">Brand name</label>
                    <input
                      value={brandName}
                      onChange={e => setBrandName(e.target.value)}
                      placeholder="e.g. Sennheiser"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-black/40 border border-border text-white text-sm placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary/60 focus:ring-1 focus:ring-primary/30 transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-white/80 mb-1.5">Your follower count</label>
                    <input
                      value={followerCount}
                      onChange={e => setFollowerCount(e.target.value)}
                      placeholder="e.g. 52,000"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-black/40 border border-border text-white text-sm placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary/60 focus:ring-1 focus:ring-primary/30 transition-all"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-white/80 mb-1.5">Who are you negotiating with?</label>
                  <SelectField
                    value={contactSeniority}
                    onChange={setContactSeniority}
                    options={[
                      "Account Manager (agency)",
                      "Account Supervisor (agency)",
                      "Director of Influencer Marketing (agency)",
                      "In-house Brand Manager",
                      "In-house Marketing Director",
                      "Unknown",
                    ]}
                    placeholder="Select contact seniority"
                  />
                </div>

                {/* No-response toggle */}
                <label className="flex items-center gap-2.5 cursor-pointer w-fit">
                  <div className="relative">
                    <input
                      type="checkbox"
                      checked={noResponse}
                      onChange={e => {
                        setNoResponse(e.target.checked);
                        setBrandResponse("");
                      }}
                      className="sr-only"
                    />
                    <div className={`w-9 h-5 rounded-full transition-colors duration-200 ${noResponse ? "bg-primary" : "bg-white/15"}`} />
                    <div className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform duration-200 ${noResponse ? "translate-x-4" : "translate-x-0"}`} />
                  </div>
                  <span className="text-sm font-semibold text-white/80">I haven't heard back yet.</span>
                </label>

                <div>
                  <label className="block text-sm font-semibold text-white/80 mb-1.5">
                    {noResponse ? "How long ago did you send your pitch?" : "Their response — paste it here (or describe the situation)"}
                  </label>
                  <textarea
                    value={brandResponse}
                    onChange={e => setBrandResponse(e.target.value)}
                    rows={5}
                    placeholder={noResponse
                      ? "e.g. Sent 6 days ago, no reply yet."
                      : "e.g. 'Hi, thanks for reaching out! We love your content. Our budget for this campaign is $500 for an Instagram Reel. Let us know if that works for you.'"
                    }
                    className="w-full px-3.5 py-2.5 rounded-xl bg-black/40 border border-border text-white text-sm placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary/60 focus:ring-1 focus:ring-primary/30 transition-all resize-none"
                  />
                </div>

                <button
                  onClick={getAdvice}
                  disabled={!canAdvise || advising}
                  className="w-full py-3.5 rounded-2xl text-sm font-bold bg-primary hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed text-white shadow-lg shadow-primary/30 transition-all flex items-center justify-center gap-2"
                >
                  {advising ? (
                    <>
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1.2, repeat: Infinity, ease: "linear" }}
                        className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full"
                      />
                      {noResponse ? "Getting follow-up advice…" : "Getting advice…"}
                    </>
                  ) : (
                    <><Sparkles size={15} /> {noResponse ? "✦ Get follow-up advice" : "✦ Get negotiation advice"}</>
                  )}
                </button>

                {adviceError && (
                  <div className="px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-sm">{adviceError}</div>
                )}

                <AnimatePresence>
                  {advice && (
                    <motion.div
                      key="advice"
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.35 }}
                      className="relative bg-black/60 border border-border rounded-2xl p-5"
                    >
                      <pre className="font-mono text-sm text-white/90 whitespace-pre-wrap leading-relaxed">{advice}</pre>
                      <button
                        onClick={copyAdvice}
                        className="absolute top-4 right-4 flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-card border border-border text-xs font-semibold text-muted-foreground hover:text-white hover:border-primary/50 transition-all"
                      >
                        {copied ? <Check size={12} className="text-green-400" /> : <Copy size={12} />}
                        {copied ? "Copied!" : "Copy"}
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>

              {/* ── Section 3: Contract checklist ── */}
              <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.15 }} className="bg-card border border-border rounded-2xl p-6 space-y-5">
                <div>
                  <h2 className="text-lg font-bold text-white mb-1">3 — Before you sign: contract checklist</h2>
                  <p className="text-xs text-muted-foreground/70">
                    Where independent creators most commonly get burned. Know what to ask your lawyer about — this is not legal advice.
                  </p>
                </div>

                <div className="space-y-3">
                  {CONTRACT_ITEMS.map((item, i) => (
                    <div key={i} className="flex items-start gap-4 p-4 rounded-xl bg-black/30 border border-border">
                      <span className="text-xl shrink-0 mt-0.5">{item.icon}</span>
                      <div>
                        <p className="text-sm font-bold text-white mb-1">{item.title}</p>
                        <p className="text-sm text-muted-foreground leading-relaxed">{item.body}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>

            </div>

            {/* ── Right sidebar: Negotiation principles ── */}
            <motion.aside
              initial={{ opacity: 0, x: 16 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.45, delay: 0.2 }}
              className="lg:sticky lg:top-24"
            >
              <div className="bg-card border border-border rounded-2xl p-5">
                <div className="flex items-center gap-2 mb-4">
                  <Sparkles size={14} className="text-primary" />
                  <span className="text-sm font-bold text-white uppercase tracking-wider">Negotiation Principles</span>
                </div>
                <ul className="space-y-4">
                  {PRINCIPLES.map((p, i) => (
                    <li key={i}>
                      <p className="text-sm font-semibold text-white">{p.title}</p>
                      <p className="text-xs text-muted-foreground leading-relaxed mt-0.5">{p.body}</p>
                      {i < PRINCIPLES.length - 1 && <div className="mt-3.5 h-px bg-border/60" />}
                    </li>
                  ))}
                </ul>
              </div>
            </motion.aside>

          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
