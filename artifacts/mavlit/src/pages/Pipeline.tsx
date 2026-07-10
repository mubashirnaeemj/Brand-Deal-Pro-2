import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Headphones, Music, Cpu, Camera, ShoppingBag, Zap,
  ChevronDown, ChevronUp, Copy, Check, Sparkles, AlertTriangle, Building2, Users, BookOpen,
} from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

// ── Types ──────────────────────────────────────────────────────────────────────

interface PitchRecord {
  id: string;
  brand: string;
  date: string;
  status: "waiting" | "conversation" | "closed";
  agreedRate?: string;
}

interface DealContext {
  platform: "" | "Instagram" | "TikTok" | "YouTube";
  deliverable: string;
  exclusivity: "" | "None" | "Narrow" | "Broad";
  exclusivityMonths: string;
  usage: "" | "Organic only" | "Includes paid usage or whitelisting";
}

// ── Brand database ─────────────────────────────────────────────────────────────

const BRAND_DB: Record<string, {
  Icon: React.ElementType; color: string; category: string;
  type: "agency" | "in-house"; signal: string;
}> = {
  "Sennheiser":          { Icon: Headphones,  color: "#7c3aed", category: "Audio",     type: "agency",   signal: "Q4 focus on studio and gaming headphones across creator channels"   },
  "Spotify for Artists": { Icon: Music,        color: "#1db954", category: "Streaming", type: "in-house", signal: "Creator economy partnership push — looking for music production voices" },
  "Native Instruments":  { Icon: Cpu,          color: "#f59e0b", category: "Software",  type: "agency",   signal: "Back-to-school promotion for MASCHINE and Komplete bundles"          },
  "GoPro":               { Icon: Camera,       color: "#0ea5e9", category: "Lifestyle", type: "in-house", signal: "Creator ambassador program — studio and live performance content"      },
  "Sweetwater":          { Icon: ShoppingBag,  color: "#ec4899", category: "Retail",    type: "in-house", signal: "Holiday season gear bundle promotion — gear review content preferred"  },
  "Red Bull":            { Icon: Zap,          color: "#ef4444", category: "Beverage",  type: "agency",   signal: "Music culture content series — studio sessions and live events"        },
};

// ── Activity context (hardcoded for demo) ──────────────────────────────────────

const ACTIVITY_CONTEXT: Record<string, string> = {
  "Spotify for Artists": "Last activity 4 days ago",
  "Native Instruments":  "Last activity 11 days ago",
  "Red Bull":            "Last activity today",
  "GoPro":              "Pitched today",
};

// ── Deal context data ──────────────────────────────────────────────────────────

const DEAL_PLATFORMS = ["Instagram", "TikTok", "YouTube"] as const;

const DELIVERABLES_BY_PLATFORM: Record<string, string[]> = {
  "":          ["Reel", "TikTok video", "Story", "YouTube integration", "Static post"],
  "Instagram": ["Reel", "Story", "Static post"],
  "TikTok":    ["TikTok video"],
  "YouTube":   ["YouTube integration"],
};

const EMPTY_DEAL_CONTEXT: DealContext = {
  platform: "", deliverable: "", exclusivity: "", exclusivityMonths: "", usage: "",
};

// ── Benchmark data (sample ranges — replace with real data) ────────────────────

type FollowerTier = "nano" | "micro" | "mid" | "macro";

interface BenchmarkRange { low: string; median: string; high: string; sampleNote: string; }

// Keys: `${platform}|${deliverable}|${tier}` — SAMPLE RANGES, clearly labeled
const BENCHMARK_DATA: Record<string, BenchmarkRange> = {
  // Instagram × Reel
  "Instagram|Reel|nano":  { low: "$150",   median: "$300",   high: "$600",    sampleNote: "~40 reported deals" },
  "Instagram|Reel|micro": { low: "$400",   median: "$750",   high: "$1,500",  sampleNote: "~90 reported deals" },
  "Instagram|Reel|mid":   { low: "$1,200", median: "$2,500", high: "$5,000",  sampleNote: "~55 reported deals" },
  "Instagram|Reel|macro": { low: "$4,000", median: "$8,000", high: "$15,000", sampleNote: "~25 reported deals" },
  // Instagram × Story
  "Instagram|Story|nano":  { low: "$75",    median: "$140",   high: "$250",   sampleNote: "~35 reported deals" },
  "Instagram|Story|micro": { low: "$175",   median: "$325",   high: "$600",   sampleNote: "~70 reported deals" },
  "Instagram|Story|mid":   { low: "$500",   median: "$950",   high: "$2,000", sampleNote: "~45 reported deals" },
  "Instagram|Story|macro": { low: "$1,500", median: "$3,000", high: "$6,000", sampleNote: "~18 reported deals" },
  // Instagram × Static post
  "Instagram|Static post|nano":  { low: "$100",   median: "$190",   high: "$350",   sampleNote: "~30 reported deals" },
  "Instagram|Static post|micro": { low: "$250",   median: "$480",   high: "$850",   sampleNote: "~55 reported deals" },
  "Instagram|Static post|mid":   { low: "$750",   median: "$1,500", high: "$2,800", sampleNote: "~35 reported deals" },
  "Instagram|Static post|macro": { low: "$2,500", median: "$5,000", high: "$9,000", sampleNote: "~14 reported deals" },
  // TikTok × TikTok video
  "TikTok|TikTok video|nano":  { low: "$100",   median: "$200",   high: "$400",    sampleNote: "~50 reported deals" },
  "TikTok|TikTok video|micro": { low: "$300",   median: "$600",   high: "$1,200",  sampleNote: "~110 reported deals" },
  "TikTok|TikTok video|mid":   { low: "$900",   median: "$1,800", high: "$3,500",  sampleNote: "~65 reported deals" },
  "TikTok|TikTok video|macro": { low: "$3,000", median: "$6,500", high: "$12,000", sampleNote: "~22 reported deals" },
  // YouTube × YouTube integration
  "YouTube|YouTube integration|nano":  { low: "$200",   median: "$450",   high: "$800",    sampleNote: "~22 reported deals" },
  "YouTube|YouTube integration|micro": { low: "$700",   median: "$1,500", high: "$3,000",  sampleNote: "~65 reported deals" },
  "YouTube|YouTube integration|mid":   { low: "$2,000", median: "$4,500", high: "$9,000",  sampleNote: "~48 reported deals" },
  "YouTube|YouTube integration|macro": { low: "$7,000", median: "$14,000","high": "$25,000",sampleNote: "~18 reported deals" },
};

const TIER_CONFIG: Record<FollowerTier, { label: string; range: string }> = {
  nano:  { label: "Nano",     range: "under 25k" },
  micro: { label: "Micro",    range: "25k–100k" },
  mid:   { label: "Mid-tier", range: "100k–500k" },
  macro: { label: "Macro",    range: "500k+" },
};

const TIERS: FollowerTier[] = ["nano", "micro", "mid", "macro"];

function getFollowerTier(n: number): FollowerTier {
  if (n < 25_000)  return "nano";
  if (n < 100_000) return "micro";
  if (n < 500_000) return "mid";
  return "macro";
}

function readCreatorFollowers(platform: string): number | null {
  try {
    const raw = localStorage.getItem("mavlit_creator_profile");
    if (!raw) return null;
    const profile = JSON.parse(raw) as { stats?: Record<string, { followers?: string }> };
    const stats = profile.stats ?? {};
    // Try matching platform first, then take max across all
    const platformKey = Object.keys(stats).find(k => k.toLowerCase() === platform.toLowerCase());
    if (platformKey && stats[platformKey]?.followers) {
      const n = parseInt(stats[platformKey].followers!.replace(/[^0-9]/g, ""), 10);
      if (!isNaN(n) && n > 0) return n;
    }
    const counts = Object.values(stats)
      .map(s => parseInt((s.followers ?? "").replace(/[^0-9]/g, ""), 10))
      .filter(n => !isNaN(n) && n > 0);
    return counts.length > 0 ? Math.max(...counts) : null;
  } catch { return null; }
}

function readCreatorRate(platform: string, deliverable: string): { amount: string; includesExclusivity: boolean; includesPaidUsage: boolean } | null {
  try {
    const raw = localStorage.getItem("mavlit_creator_profile");
    if (!raw) return null;
    const profile = JSON.parse(raw) as { rates?: Record<string, { amount?: string; includesExclusivity?: boolean; includesPaidUsage?: boolean }> };
    const entry = profile.rates?.[`${platform}|${deliverable}`];
    if (!entry?.amount?.trim()) return null;
    return { amount: entry.amount.trim(), includesExclusivity: !!entry.includesExclusivity, includesPaidUsage: !!entry.includesPaidUsage };
  } catch { return null; }
}

// ── Creator profile (demo) ─────────────────────────────────────────────────────

const CREATOR_PROFILE = {
  name: "Alex Morgan", handle: "alexmorganmusic", platform: "YouTube",
  followers: "82K", engagementRate: "5.2",
  niche: "Music Production & Gear Reviews", pastPartnerships: "AudioTechnica, Ableton, Sweetwater",
};

// ── LocalStorage helpers ───────────────────────────────────────────────────────

const DEMO_PITCHES: PitchRecord[] = [
  { id: "demo-1", brand: "Sennheiser",          date: "Jun 10, 2026", status: "closed", agreedRate: "$2,400" },
  { id: "demo-2", brand: "Spotify for Artists", date: "Jun 12, 2026", status: "conversation" },
  { id: "demo-3", brand: "Native Instruments",  date: "Jun 5, 2026",  status: "conversation" },
  { id: "demo-4", brand: "Red Bull",            date: "Jun 16, 2026", status: "conversation" },
  { id: "demo-5", brand: "GoPro",               date: "Jun 15, 2026", status: "waiting"      },
];

const PITCHES_VERSION = "v2";

function loadPitches(): PitchRecord[] {
  try {
    const version = localStorage.getItem("mavlit_pitches_version");
    if (version === PITCHES_VERSION) {
      const raw = localStorage.getItem("mavlit_pitches");
      if (raw) return JSON.parse(raw) as PitchRecord[];
    }
  } catch { /* ignore */ }
  localStorage.setItem("mavlit_pitches", JSON.stringify(DEMO_PITCHES));
  localStorage.setItem("mavlit_pitches_version", PITCHES_VERSION);
  return DEMO_PITCHES;
}

function savePitches(pitches: PitchRecord[]) {
  try { localStorage.setItem("mavlit_pitches", JSON.stringify(pitches)); } catch { /* ignore */ }
}

function formatRate(rate: string): string {
  return rate.trim().startsWith("$") ? rate.trim() : `$${rate.trim()}`;
}

// ── Shared UI ──────────────────────────────────────────────────────────────────

function CopyBtn({ text }: { text: string }) {
  const [c, setC] = useState(false);
  return (
    <button onClick={() => { navigator.clipboard.writeText(text).then(() => { setC(true); setTimeout(() => setC(false), 2000); }); }}
      className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold border border-border text-muted-foreground hover:text-white hover:border-white/30 transition-all">
      {c ? <Check size={11} className="text-emerald-400" /> : <Copy size={11} />}{c ? "Copied!" : "Copy"}
    </button>
  );
}

function Spin() {
  return <motion.div animate={{ rotate: 360 }} transition={{ duration: 1.2, repeat: Infinity, ease: "linear" }} className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full shrink-0" />;
}

function OutputBox({ text }: { text: string }) {
  return (
    <div className="relative bg-black/60 border border-border rounded-xl p-4">
      <pre className="font-mono text-xs text-white/90 whitespace-pre-wrap leading-relaxed pr-16">{text}</pre>
      <div className="absolute top-3 right-3"><CopyBtn text={text} /></div>
    </div>
  );
}

async function readStream(endpoint: string, body: Record<string, unknown>, onChunk: (t: string) => void) {
  const res = await fetch(endpoint, { method: "POST", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  if (!res.ok) throw new Error("Server error");
  const reader = res.body?.getReader();
  if (!reader) throw new Error("No stream");
  const decoder = new TextDecoder();
  let buf = "";
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += decoder.decode(value, { stream: true });
    const lines = buf.split("\n");
    buf = lines.pop() ?? "";
    for (const line of lines) {
      if (!line.startsWith("data: ")) continue;
      try { const p = JSON.parse(line.slice(6)); if (p.done) return; if (p.error) throw new Error(p.error); if (p.content) onChunk(p.content); } catch { /* skip */ }
    }
  }
}

// ── Brand icon/initial helper ──────────────────────────────────────────────────

function BrandAvatar({ brand }: { brand: string }) {
  const db = BRAND_DB[brand];
  if (db) {
    const Icon = db.Icon;
    return (
      <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: `${db.color}25` }}>
        <Icon size={16} style={{ color: db.color }} />
      </div>
    );
  }
  return (
    <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 bg-secondary border border-border">
      <span className="text-sm font-bold text-white">{brand.charAt(0).toUpperCase()}</span>
    </div>
  );
}

// ── My Pitches Tab ─────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: PitchRecord["status"] }) {
  if (status === "waiting")      return <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-zinc-500/15 text-zinc-400 border border-zinc-500/20 whitespace-nowrap">Waiting for reply</span>;
  if (status === "conversation") return <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-primary/15 text-primary border border-primary/25 whitespace-nowrap">In conversation</span>;
  return <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/25 whitespace-nowrap">Closed</span>;
}

// ── Close Deal Modal ────────────────────────────────────────────────────────────

type CloseOutcome = "yes" | "no" | "no_response";

function CloseDealModal({
  brand,
  onConfirm,
  onCancel,
}: {
  brand: string;
  onConfirm: (outcome: CloseOutcome, rate: string) => void;
  onCancel: () => void;
}) {
  const [outcome, setOutcome] = useState<CloseOutcome | null>(null);
  const [rate, setRate] = useState("");

  const OUTCOMES: { value: CloseOutcome; label: string }[] = [
    { value: "yes",         label: "Yes — deal closed" },
    { value: "no",          label: "No — didn't happen" },
    { value: "no_response", label: "No response" },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onCancel}
      />

      {/* Modal card */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 8 }}
        transition={{ duration: 0.18 }}
        className="relative w-full max-w-sm bg-card border border-border rounded-2xl p-6 shadow-2xl space-y-5"
      >
        <div>
          <p className="text-xs text-muted-foreground font-medium mb-1">{brand}</p>
          <h3 className="text-white font-bold text-base leading-snug">
            Did this deal close successfully?
          </h3>
          <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
            This helps MAVLIT learn which matches actually convert.
          </p>
        </div>

        {/* Outcome buttons */}
        <div className="flex flex-col gap-2">
          {OUTCOMES.map(o => (
            <button
              key={o.value}
              onClick={() => setOutcome(o.value)}
              className={`w-full px-4 py-2.5 rounded-xl text-sm font-semibold border text-left transition-all ${
                outcome === o.value
                  ? o.value === "yes"
                    ? "bg-emerald-500/20 border-emerald-500/50 text-emerald-300"
                    : "bg-zinc-500/15 border-zinc-500/40 text-zinc-300"
                  : "border-border text-muted-foreground hover:text-white hover:border-white/20"
              }`}
            >
              {o.label}
            </button>
          ))}
        </div>

        {/* Rate field — only when "yes" */}
        <AnimatePresence>
          {outcome === "yes" && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              <label className="block text-xs font-semibold text-white/70 mb-1.5">
                What was the final rate? <span className="text-muted-foreground font-normal">(optional)</span>
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">$</span>
                <input
                  value={rate}
                  onChange={e => setRate(e.target.value)}
                  placeholder="1,200"
                  className="w-full pl-7 pr-3 py-2.5 rounded-xl bg-black/40 border border-border text-white text-sm placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary/60 transition-all"
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Actions */}
        <div className="flex gap-2 pt-1">
          <button
            onClick={onCancel}
            className="flex-1 px-4 py-2.5 rounded-xl border border-border text-sm font-semibold text-muted-foreground hover:text-white transition-all"
          >
            Cancel
          </button>
          <button
            onClick={() => outcome && onConfirm(outcome, rate)}
            disabled={outcome === null}
            className="flex-1 px-4 py-2.5 rounded-xl bg-primary text-white text-sm font-bold hover:bg-primary/90 disabled:opacity-40 transition-all"
          >
            Save outcome
          </button>
        </div>
      </motion.div>
    </div>
  );
}

// ── My Pitches Tab ─────────────────────────────────────────────────────────────

function MyPitchesTab({
  pitches, onUpdate, onUseDealMaker,
}: {
  pitches: PitchRecord[];
  onUpdate: (p: PitchRecord[]) => void;
  onUseDealMaker: (brand: string) => void;
}) {
  const [closingId, setClosingId] = useState<string | null>(null);

  const openClose   = (id: string) => setClosingId(id);
  const cancelClose = () => setClosingId(null);

  const confirmClose = (outcome: CloseOutcome, rate: string) => {
    if (!closingId) return;
    const finalRate = outcome === "yes" && rate.trim()
      ? (rate.trim().startsWith("$") ? rate.trim() : `$${rate.trim()}`)
      : undefined;
    const updated = pitches.map(p =>
      p.id === closingId
        ? { ...p, status: "closed" as const, agreedRate: finalRate }
        : p
    );
    onUpdate(updated);
    cancelClose();
  };

  const closingBrand = pitches.find(p => p.id === closingId)?.brand ?? "";

  if (pitches.length === 0) {
    return (
      <div className="text-center py-20">
        <p className="text-muted-foreground text-sm">No pitches yet. Head to the Pitch page to send your first one.</p>
      </div>
    );
  }

  return (
    <>
      {/* Modal */}
      <AnimatePresence>
        {closingId && (
          <CloseDealModal
            brand={closingBrand}
            onConfirm={confirmClose}
            onCancel={cancelClose}
          />
        )}
      </AnimatePresence>

      <div className="space-y-2">
        {pitches.map(deal => (
          <div key={deal.id} className="flex items-center gap-3 px-4 py-3.5 rounded-2xl bg-card border border-border">
            <BrandAvatar brand={deal.brand} />

            {/* Brand name + date + activity context */}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-white truncate">{deal.brand}</p>
              <p className="text-xs text-muted-foreground">{deal.date}</p>
              {deal.status !== "closed" && ACTIVITY_CONTEXT[deal.brand] && (
                <p className="text-xs text-muted-foreground/60">{ACTIVITY_CONTEXT[deal.brand]}</p>
              )}
            </div>

            <StatusBadge status={deal.status} />

            {/* Non-closed actions */}
            {deal.status !== "closed" && (
              <>
                <button
                  onClick={() => onUseDealMaker(deal.brand)}
                  className="shrink-0 text-xs text-primary font-semibold hover:text-primary/80 transition-colors whitespace-nowrap"
                >
                  Use Deal Tools →
                </button>
                <button
                  onClick={() => openClose(deal.id)}
                  className="shrink-0 px-3 py-1.5 rounded-lg text-xs font-semibold border border-border text-muted-foreground hover:text-white hover:border-white/30 transition-all whitespace-nowrap"
                >
                  Mark as closed
                </button>
              </>
            )}

            {/* Closed rate */}
            {deal.status === "closed" && deal.agreedRate && (
              <span className="shrink-0 text-xs text-emerald-400 font-semibold">
                {formatRate(deal.agreedRate)}
              </span>
            )}
          </div>
        ))}
      </div>
    </>
  );
}

// ── Accordion card ─────────────────────────────────────────────────────────────

function AccordionCard({ title, description, isOpen, onToggle, children }: {
  title: string; description?: string; isOpen: boolean; onToggle: () => void; children: React.ReactNode;
}) {
  return (
    <div className="bg-card border border-border rounded-2xl overflow-hidden">
      <button onClick={onToggle}
        className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-secondary/30 transition-colors">
        <div>
          <span className="text-sm font-bold text-white">{title}</span>
          {description && (
            <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
          )}
        </div>
        {isOpen ? <ChevronUp size={16} className="text-muted-foreground shrink-0 ml-3" /> : <ChevronDown size={16} className="text-muted-foreground shrink-0 ml-3" />}
      </button>
      <AnimatePresence>
        {isOpen && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.22 }}
            className="overflow-hidden">
            <div className="px-5 pb-5 space-y-4 border-t border-border pt-4">
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Rate Intelligence ──────────────────────────────────────────────────────────

function RateEstimator({ dealContext }: { dealContext: DealContext }) {
  const { platform, deliverable, exclusivity, usage } = dealContext;
  const hasContext = !!(platform && deliverable);

  const followerCount = hasContext ? readCreatorFollowers(platform) : null;
  const followerTier  = followerCount !== null ? getFollowerTier(followerCount) : null;
  const benchmarkKey  = hasContext && followerTier ? `${platform}|${deliverable}|${followerTier}` : null;
  const benchmark     = benchmarkKey ? BENCHMARK_DATA[benchmarkKey] ?? null : null;

  // Creator's own rate for this platform × deliverable
  const creatorRate   = hasContext ? readCreatorRate(platform, deliverable) : null;
  const hasRate       = !!creatorRate;
  // "specified" = creator deliberately toggled at least one flag
  const hasSpecified  = !!(creatorRate?.includesExclusivity || creatorRate?.includesPaidUsage);

  const dealHasExclusivity = exclusivity === "Narrow" || exclusivity === "Broad";
  const dealHasPaidUsage   = usage === "Includes paid usage or whitelisting";

  // ── Dynamic modifier notes — adapt to how much rate data the creator provided ──
  const modifierNotes: string[] = [];

  if (!hasRate) {
    // Case 1: no rate entered — generic guidance
    if (exclusivity === "Narrow")
      modifierNotes.push("Narrow exclusivity typically pushes deals toward the upper portion of the range.");
    if (exclusivity === "Broad")
      modifierNotes.push("Broad category exclusivity often sits noticeably higher in the range — sometimes above it.");
    if (dealHasPaidUsage)
      modifierNotes.push("Paid usage or whitelisting rights commonly add a meaningful premium on top of the base range.");
    if (!exclusivity && !usage)
      modifierNotes.push("With no exclusivity and organic-only usage, deals typically sit in the lower to middle of the range.");
  } else if (hasRate && hasSpecified) {
    // Case 3: rate + flags set — precise comparison only
    if (dealHasExclusivity && !creatorRate.includesExclusivity)
      modifierNotes.push(
        exclusivity === "Broad"
          ? "Broad category exclusivity isn't included in your typical rate for this deliverable — deals with it tend to sit noticeably higher in this range."
          : "Narrow exclusivity isn't included in your typical rate — it typically pushes deals toward the upper portion of the range."
      );
    if (dealHasPaidUsage && !creatorRate.includesPaidUsage)
      modifierNotes.push("Paid usage rights aren't in your typical rate for this deliverable. Usage rights commonly add a meaningful premium.");
    if (dealHasExclusivity && creatorRate.includesExclusivity)
      modifierNotes.push("Your typical rate for this deliverable already accounts for exclusivity — no additional adjustment needed for that term.");
    if (dealHasPaidUsage && creatorRate.includesPaidUsage)
      modifierNotes.push("Your typical rate already includes paid usage rights — that term is already priced in.");
    if (!dealHasExclusivity && !dealHasPaidUsage)
      modifierNotes.push("No exclusivity or paid usage in this deal — your typical rate is a solid reference point.");
  }
  // Case 2 (hasRate && !hasSpecified): no dynamic modifier bullets — neutral note shown separately below range cards

  return (
    <div className="space-y-4">
      {/* Disclaimer */}
      <div className="px-4 py-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30">
        <div className="flex items-start gap-2.5">
          <AlertTriangle size={13} className="text-amber-400 mt-0.5 shrink-0" />
          <p className="text-xs text-amber-200/90 leading-relaxed">
            These are observed ranges from reported deals — not a rate card and not what you should charge. Rates vary significantly based on your vertical, audience quality, exclusivity terms, and the specific brand's budget. Use this as context, not as an answer. You will need to use your own judgment based on your conversations with this brand.
          </p>
        </div>
      </div>

      {/* Empty state */}
      {!hasContext && (
        <div className="px-4 py-5 rounded-xl bg-secondary/40 border border-border text-center">
          <p className="text-xs text-muted-foreground">Set a <span className="text-white font-medium">Platform</span> and <span className="text-white font-medium">Deliverable type</span> in the Deal context above to see benchmark ranges.</p>
        </div>
      )}

      {/* Benchmark */}
      {hasContext && (
        <AnimatePresence mode="wait">
          <motion.div key={benchmarkKey ?? "no-data"} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-4">

            {/* Context bar */}
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-2 py-0.5 rounded-md text-xs font-semibold bg-primary/15 text-primary border border-primary/30">{platform}</span>
              <span className="px-2 py-0.5 rounded-md text-xs font-semibold bg-secondary text-muted-foreground border border-border">{deliverable}</span>
              {followerTier && (
                <span className="px-2 py-0.5 rounded-md text-xs font-semibold bg-secondary text-muted-foreground border border-border">
                  {TIER_CONFIG[followerTier].label} · {TIER_CONFIG[followerTier].range}
                  {followerCount !== null && <span className="text-white/50"> ({(followerCount / 1000).toFixed(0)}k from profile)</span>}
                </span>
              )}
              {!followerTier && (
                <span className="text-xs text-muted-foreground italic">Add your follower count in Profile settings to personalise this</span>
              )}
            </div>

            {/* Your rate row — shown when creator entered a rate for this deliverable */}
            {hasRate && (
              <div className="flex items-center justify-between gap-3 px-4 py-3 rounded-xl bg-primary/8 border border-primary/20">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-primary/70 mb-0.5">Your typical rate</p>
                  <p className="text-lg font-extrabold text-white">
                    ${creatorRate.amount.replace(/^\$/, "")}
                  </p>
                  {hasSpecified && (
                    <p className="text-[10px] text-white/40 mt-0.5 leading-tight">
                      Includes:{" "}
                      {[creatorRate.includesExclusivity && "exclusivity", creatorRate.includesPaidUsage && "paid usage rights"].filter(Boolean).join(" · ")}
                    </p>
                  )}
                </div>
                <div className="text-right shrink-0">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-0.5">Benchmark range</p>
                  {benchmark
                    ? <p className="text-xs font-bold text-white/70">{benchmark.low} – {benchmark.high}</p>
                    : <p className="text-xs text-muted-foreground italic">No data for this tier</p>
                  }
                </div>
              </div>
            )}

            {/* Range cards */}
            {benchmark ? (
              <>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { label: "Low end",   val: benchmark.low,    dim: true  },
                    { label: "Median",    val: benchmark.median, dim: false },
                    { label: "High end",  val: benchmark.high,   dim: true  },
                  ].map(c => (
                    <div key={c.label} className={`rounded-xl p-3 text-center border ${c.dim ? "bg-secondary/40 border-border" : "bg-primary/10 border-primary/30"}`}>
                      <p className="text-xs text-muted-foreground mb-1 leading-tight">{c.label}</p>
                      <p className={`text-sm font-extrabold ${c.dim ? "text-white/80" : "text-white"}`}>{c.val}</p>
                    </div>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground text-center">
                  {benchmark.sampleNote} · MAVLIT Rate Index · <span className="text-amber-400/80">sample data</span>
                </p>

                {/* Case 2: rate entered but no flags specified — neutral note */}
                {hasRate && !hasSpecified && (
                  <div className="flex items-start gap-2.5 px-3.5 py-3 rounded-xl bg-amber-500/8 border border-amber-500/20">
                    <AlertTriangle size={12} className="text-amber-400/80 mt-0.5 shrink-0" />
                    <p className="text-xs text-amber-200/70 leading-relaxed">
                      Consider whether your usual rate already accounts for this deal's exclusivity and usage terms.
                    </p>
                  </div>
                )}
              </>
            ) : (
              /* No data for this combo yet */
              <div className="px-4 py-4 rounded-xl bg-secondary/40 border border-border text-center">
                <p className="text-xs text-muted-foreground">No benchmark data yet for this combination. The developer can add it to the rate table.</p>
              </div>
            )}

            {/* What moves this range */}
            <div className="bg-card border border-border rounded-xl p-4 space-y-3">
              <p className="text-xs font-bold text-white uppercase tracking-wider">What moves this range</p>
              <ul className="space-y-2">
                {modifierNotes.map((note, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <span className="mt-0.5 w-1.5 h-1.5 rounded-full bg-primary shrink-0" />
                    <span className="text-xs text-white/80 leading-relaxed">{note}</span>
                  </li>
                ))}
                {[
                  "Audience quality matters more than follower count alone — strong engagement and niche specificity both lift rates.",
                  "In-house brand teams and agency-managed deals often have different budget structures and approval timelines.",
                  "Being approached rather than cold-pitching typically gives you a stronger negotiating position.",
                ].map((note, i) => (
                  <li key={`static-${i}`} className="flex items-start gap-2">
                    <span className="mt-0.5 w-1.5 h-1.5 rounded-full bg-white/20 shrink-0" />
                    <span className="text-xs text-muted-foreground leading-relaxed">{note}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Tier reference */}
            {followerTier && (
              <details className="group">
                <summary className="text-xs text-muted-foreground cursor-pointer hover:text-white transition-colors select-none list-none flex items-center gap-1">
                  <ChevronDown size={11} className="group-open:rotate-180 transition-transform" />
                  See all tiers for {platform} × {deliverable}
                </summary>
                <div className="mt-2 grid grid-cols-2 gap-1.5">
                  {TIERS.map(t => {
                    const d = BENCHMARK_DATA[`${platform}|${deliverable}|${t}`];
                    const isActive = t === followerTier;
                    return (
                      <div key={t} className={`rounded-lg px-3 py-2 border text-xs ${isActive ? "bg-primary/10 border-primary/30" : "bg-secondary/40 border-border"}`}>
                        <p className={`font-semibold mb-0.5 ${isActive ? "text-primary" : "text-white/60"}`}>
                          {TIER_CONFIG[t].label} <span className="font-normal">({TIER_CONFIG[t].range})</span>
                        </p>
                        {d ? <p className="text-white/70">{d.low} – {d.high}</p> : <p className="text-muted-foreground italic">No data</p>}
                      </div>
                    );
                  })}
                </div>
              </details>
            )}

          </motion.div>
        </AnimatePresence>
      )}
    </div>
  );
}

// ── Contract Advice ────────────────────────────────────────────────────────────

function ContractAdvice({ contactType, dealContext }: { contactType?: "agency" | "in-house"; dealContext: DealContext }) {
  const [text, setText]      = useState("");
  const [generating, setGen] = useState(false);
  const [output, setOutput]  = useState<string | null>(null);
  const [error, setError]    = useState<string | null>(null);

  const analyze = async () => {
    if (!text.trim()) return;
    setGen(true); setOutput(null); setError(null);
    try {
      let full = "";
      await readStream("/api/pipeline/contract-advice", {
        contractText: text,
        contactType,
        dealPlatform:    dealContext.platform    || undefined,
        dealDeliverable: dealContext.deliverable || undefined,
        dealExclusivity: dealContext.exclusivity
          ? dealContext.exclusivity + (dealContext.exclusivityMonths ? ` (${dealContext.exclusivityMonths} months)` : "")
          : undefined,
        dealUsage: dealContext.usage || undefined,
      }, chunk => { full += chunk; setOutput(full); });
    } catch { setError("Something went wrong. Please try again."); }
    finally { setGen(false); }
  };

  return (
    <div className="space-y-4">
      <div className="px-4 py-4 rounded-xl bg-amber-500/10 border border-amber-500/30 space-y-2">
        <p className="text-sm text-amber-100 leading-relaxed">
          <span className="font-bold text-amber-300">MAVLIT is not a law firm or an attorney and does not provide legal advice.</span> This tool flags common contract issues for informational and educational purposes only. It does not review your full contract, it may be incomplete or inaccurate, and it is not a substitute for a lawyer. Always consult a licensed attorney before signing, relying on, or negotiating any contract.
        </p>
        {contactType === "agency" && (
          <p className="text-xs text-white/70 leading-relaxed border-t border-primary/15 pt-2">
            Agency contracts often include broader usage rights clauses — pay particular attention to the scope and duration of any license grants.
          </p>
        )}
      </div>

      <div>
        <p className="text-xs font-semibold text-white/70 mb-1.5">Paste your contract text</p>
        <textarea value={text} onChange={e => setText(e.target.value)} rows={7}
          placeholder="Paste the contract or the specific clauses you want reviewed…"
          className="w-full px-3 py-2.5 rounded-xl bg-black/40 border border-border text-white text-xs placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary/60 resize-none transition-all" />
      </div>

      <button onClick={analyze} disabled={!text.trim() || generating}
        className="w-full py-3 rounded-xl text-xs font-bold bg-primary hover:bg-primary/90 disabled:opacity-40 text-white transition-all flex items-center justify-center gap-2">
        {generating ? <><Spin />Analyzing…</> : <><Sparkles size={13} />✦ Analyze contract</>}
      </button>

      {error && <p className="text-xs text-red-400">{error}</p>}
      {output && <OutputBox text={output} />}

      {/* Static educational checklist — always visible */}
      <div className="bg-card border border-border rounded-xl p-5 space-y-4">
        <div className="flex items-center gap-2">
          <BookOpen size={14} className="text-primary shrink-0" />
          <p className="text-xs font-bold text-white uppercase tracking-wider">What to check in any brand deal</p>
        </div>
        <ul className="space-y-3.5">
          {[
            { label: "Usage rights",            body: "How the brand can use your content and for how long. The more they can do with it — ads, other campaigns, your name and likeness — the more it should be worth. Make sure the fee reflects the usage." },
            { label: "Exclusivity",             body: "Whether you're barred from working with other brands in the same space. Keep any exclusivity as narrow in scope and as short in duration as possible." },
            { label: "Payment",                 body: "How much you'll be paid and when. Consider asking for a portion upfront so you're protected if payment is delayed or the deal falls through after you've delivered." },
            { label: "Kill / cancellation clauses", body: "Whether the brand can cancel the deal, on what notice, and what happens to your fee if they do — especially after you've already started or finished the work." },
            { label: "Ownership vs. license",   body: "Whether you keep ownership of your content or hand it over entirely, and what permissions the brand is receiving. These are meaningfully different things." },
            { label: "Scope and revisions",     body: "What exactly you must deliver and how many rounds of revisions the brand can request. Undefined scope and unlimited revisions are the same thing." },
          ].map(({ label, body }) => (
            <li key={label} className="flex items-start gap-3">
              <span className="mt-0.5 w-1.5 h-1.5 rounded-full bg-primary/50 shrink-0" />
              <div>
                <span className="text-xs font-semibold text-white">{label} — </span>
                <span className="text-xs text-muted-foreground leading-relaxed">{body}</span>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

// ── Media Kit ─────────────────────────────────────────────────────────────────

function MediaKit({ brandName, brandCategory }: { brandName?: string; brandCategory?: string }) {
  const [generating, setGen] = useState(false);
  const [output, setOutput]  = useState<string | null>(null);
  const [error, setError]    = useState<string | null>(null);

  const generate = async () => {
    setGen(true); setOutput(null); setError(null);
    try {
      let full = "";
      await readStream("/api/pipeline/media-kit", {
        ...CREATOR_PROFILE,
        brandContext: brandName ? `This media kit is being prepared for ${brandName}${brandCategory ? ` (${brandCategory})` : ""}.` : undefined,
      }, chunk => { full += chunk; setOutput(full); });
    } catch { setError("Something went wrong. Please try again."); }
    finally { setGen(false); }
  };

  return (
    <div className="space-y-4">
      <div className="px-4 py-3.5 rounded-xl bg-secondary/60 border border-border">
        <p className="text-xs text-white/80 leading-relaxed">
          This is a quick stats summary — not a formal pitch deck. Use your own judgment about what to include or adjust based on your specific conversations with this brand.
        </p>
      </div>

      <button onClick={generate} disabled={generating}
        className="w-full py-3 rounded-xl text-xs font-bold bg-primary hover:bg-primary/90 disabled:opacity-40 text-white transition-all flex items-center justify-center gap-2">
        {generating ? <><Spin />Generating…</> : <><Sparkles size={13} />✦ Generate my media kit</>}
      </button>

      {error && <p className="text-xs text-red-400">{error}</p>}
      {output && <OutputBox text={output} />}
    </div>
  );
}

// ── Deal Context Panel ─────────────────────────────────────────────────────────

function PillGroup<T extends string>({
  options, value, onChange, label,
}: { options: readonly T[] | T[]; value: T | ""; onChange: (v: T | "") => void; label: string }) {
  return (
    <div>
      <p className="text-xs font-semibold text-white/60 mb-2">{label}</p>
      <div className="flex flex-wrap gap-1.5">
        {options.map(opt => (
          <button key={opt} onClick={() => onChange(value === opt ? "" : opt)}
            className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition-all ${value === opt ? "bg-primary/15 border-primary/40 text-primary" : "border-border text-muted-foreground hover:border-white/30 hover:text-white"}`}>
            {opt}
          </button>
        ))}
      </div>
    </div>
  );
}

function DealContextPanel({ value, onChange }: { value: DealContext; onChange: (ctx: DealContext) => void }) {
  const set = <K extends keyof DealContext>(key: K, val: DealContext[K]) => {
    const next = { ...value, [key]: val };
    if (key === "platform") {
      const allowed = DELIVERABLES_BY_PLATFORM[val as string] ?? [];
      if (next.deliverable && !allowed.includes(next.deliverable)) next.deliverable = "";
    }
    onChange(next);
  };

  const deliverableOptions = DELIVERABLES_BY_PLATFORM[value.platform] ?? DELIVERABLES_BY_PLATFORM[""];
  const showMonths = value.exclusivity === "Narrow" || value.exclusivity === "Broad";

  return (
    <div className="bg-card border border-border rounded-2xl p-5 space-y-4">
      <div>
        <p className="text-xs font-bold text-white uppercase tracking-wider">Deal context</p>
        <p className="text-xs text-muted-foreground mt-0.5">Used by Rate Intelligence and Contract Advice below — all optional.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <PillGroup
          label="Platform"
          options={DEAL_PLATFORMS}
          value={value.platform}
          onChange={v => set("platform", v as DealContext["platform"])}
        />
        <PillGroup
          label="Deliverable type"
          options={deliverableOptions}
          value={value.deliverable as DealContext["deliverable"]}
          onChange={v => set("deliverable", v)}
        />
        <div>
          <p className="text-xs font-semibold text-white/60 mb-2">Exclusivity</p>
          <div className="flex flex-wrap gap-1.5">
            {(["None", "Narrow", "Broad"] as const).map(opt => (
              <button key={opt} onClick={() => set("exclusivity", value.exclusivity === opt ? "" : opt)}
                className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition-all ${value.exclusivity === opt ? "bg-primary/15 border-primary/40 text-primary" : "border-border text-muted-foreground hover:border-white/30 hover:text-white"}`}>
                {opt === "Narrow" ? "Narrow — specific product" : opt === "Broad" ? "Broad — whole category" : opt}
              </button>
            ))}
          </div>
          <AnimatePresence>
            {showMonths && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
                <div className="mt-2 flex items-center gap-2">
                  <input
                    type="number" min={1} max={36} placeholder="Duration (months)"
                    value={value.exclusivityMonths}
                    onChange={e => set("exclusivityMonths", e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-black/40 border border-border text-white text-xs placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary/60 transition-all"
                  />
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
        <PillGroup
          label="Usage"
          options={["Organic only", "Includes paid usage or whitelisting"]}
          value={value.usage}
          onChange={v => set("usage", v as DealContext["usage"])}
        />
      </div>
    </div>
  );
}

// ── Deal Maker Tab ─────────────────────────────────────────────────────────────

function DealMakerTab({
  pitches, selectedBrand, onSelectBrand,
}: {
  pitches: PitchRecord[];
  selectedBrand: string;
  onSelectBrand: (b: string) => void;
}) {
  const [custom, setCustom]         = useState("");
  const [openCard, setOpenCard]     = useState<string | null>(null);
  const [dealContext, setDealContext] = useState<DealContext>(EMPTY_DEAL_CONTEXT);

  const toggle = (id: string) => setOpenCard(prev => prev === id ? null : id);

  const brandOptions = [
    ...pitches.filter(p => p.status !== "closed").map(p => p.brand),
    "A brand I found myself",
  ];
  const uniqueOptions = [...new Set(brandOptions)];

  const isCustom  = selectedBrand === "A brand I found myself";
  const brandName = isCustom ? custom.trim() : selectedBrand;
  const brandInfo = brandName && !isCustom ? BRAND_DB[brandName] : null;

  return (
    <div className="space-y-5">
      {/* Brand dropdown */}
      <div className="bg-card border border-border rounded-2xl p-5 space-y-4">
        <div>
          <p className="text-xs font-bold text-white uppercase tracking-wider mb-2">Which brand are you working on?</p>
          <div className="relative">
            <select
              value={selectedBrand}
              onChange={e => { onSelectBrand(e.target.value); setCustom(""); }}
              className="w-full px-3.5 py-3 rounded-xl bg-black/40 border border-border text-white text-sm appearance-none focus:outline-none focus:border-primary/60 transition-all pr-9"
            >
              <option value="" disabled>Select a brand…</option>
              {uniqueOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
            </select>
            <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
          </div>
        </div>

        <AnimatePresence>
          {isCustom && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
              <p className="text-xs font-semibold text-white/70 mb-1.5">Brand name</p>
              <input value={custom} onChange={e => setCustom(e.target.value)} placeholder="e.g. Focusrite, Rode, Ableton"
                className="w-full px-3 py-2.5 rounded-xl bg-black/40 border border-border text-white text-sm placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary/60 transition-all" />
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {brandInfo && (
            <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              className="px-4 py-3.5 rounded-xl bg-secondary/60 border border-border space-y-2">
              <div className="flex items-center gap-3">
                <BrandAvatar brand={brandName} />
                <div>
                  <p className="text-sm font-bold text-white">{brandName}</p>
                  <p className="text-xs text-muted-foreground">{brandInfo.category}</p>
                </div>
                <div className="ml-auto">
                  {brandInfo.type === "agency"
                    ? <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-primary/15 text-primary border border-primary/30"><Building2 size={10} />Agency-side</span>
                    : <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"><Users size={10} />In-house</span>
                  }
                </div>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">{brandInfo.signal}</p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Deal context */}
      <DealContextPanel value={dealContext} onChange={setDealContext} />

      {/* Tool cards */}
      <AccordionCard
        title="Rate Intelligence"
        description="See observed deal ranges for your niche and deliverables, and what moves them."
        isOpen={openCard === "rate"}
        onToggle={() => toggle("rate")}
      >
        <RateEstimator dealContext={dealContext} />
      </AccordionCard>

      <AccordionCard
        title="Contract Advice"
        description="Paste a message with contract terms to flag potential issues"
        isOpen={openCard === "contract"}
        onToggle={() => toggle("contract")}
      >
        <ContractAdvice contactType={brandInfo?.type} dealContext={dealContext} />
      </AccordionCard>

      <AccordionCard
        title="Media Kit"
        description="Generate a quick stats summary to share with brands"
        isOpen={openCard === "media"}
        onToggle={() => toggle("media")}
      >
        <MediaKit brandName={brandName || undefined} brandCategory={brandInfo?.category} />
      </AccordionCard>
    </div>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────────

export default function Pipeline() {
  const [tab, setTab]               = useState<"pitches" | "dealmaker">("pitches");
  const [pitches, setPitches]       = useState<PitchRecord[]>(() => loadPitches());
  const [dealmakerBrand, setDealmakerBrand] = useState("");

  const updatePitches = (updated: PitchRecord[]) => {
    setPitches(updated);
    savePitches(updated);
  };

  const goToDealMaker = (brand: string) => {
    setDealmakerBrand(brand);
    setTab("dealmaker");
  };

  return (
    <div className="min-h-screen bg-background text-foreground overflow-x-hidden">
      <Navbar />

      <main className="pt-28 pb-24 px-4">
        <div className="max-w-3xl mx-auto">

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} className="mb-8">
            <h1 className="text-4xl font-extrabold text-white tracking-tight mb-2">Pipeline</h1>
            <p className="text-muted-foreground text-base">Track your pitches and use Deal Tools to prepare for every conversation.</p>
          </motion.div>

          {/* Tabs */}
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, delay: 0.06 }}
            className="flex gap-2 mb-7 p-1 bg-card border border-border rounded-2xl w-fit">
            {[{ id: "pitches" as const, label: "My Pitches" }, { id: "dealmaker" as const, label: "Deal Tools" }].map(t => (
              <button key={t.id} onClick={() => setTab(t.id)}
                className={`px-5 py-2 rounded-xl text-sm font-bold transition-all ${tab === t.id ? "bg-primary text-white shadow-md shadow-primary/30" : "text-muted-foreground hover:text-white"}`}>
                {t.label}
                {t.id === "pitches" && (
                  <span className="ml-1.5 text-xs opacity-60">{pitches.length}</span>
                )}
              </button>
            ))}
          </motion.div>

          <AnimatePresence mode="wait">
            {tab === "pitches" && (
              <motion.div key="pitches" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
                <MyPitchesTab pitches={pitches} onUpdate={updatePitches} onUseDealMaker={goToDealMaker} />
              </motion.div>
            )}
            {tab === "dealmaker" && (
              <motion.div key="dealmaker" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
                <DealMakerTab pitches={pitches} selectedBrand={dealmakerBrand} onSelectBrand={setDealmakerBrand} />
              </motion.div>
            )}
          </AnimatePresence>

        </div>
      </main>

      <Footer />
    </div>
  );
}
