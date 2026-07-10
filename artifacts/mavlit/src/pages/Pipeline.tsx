import { useState } from "react";
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

// ── Rate data ──────────────────────────────────────────────────────────────────

const RATE_PLATFORMS = ["YouTube", "Instagram", "TikTok"] as const;
type RatePlatform = typeof RATE_PLATFORMS[number];

const RATE_FORMATS: Record<RatePlatform, string[]> = {
  YouTube:   ["Dedicated video", "Integration / mention"],
  Instagram: ["Reel", "Story set"],
  TikTok:    ["Short-form video"],
};

const RATE_DATA: Record<string, { range: string; median: string; topQ: string; count: number }> = {
  "YouTube|Dedicated video":       { range: "$1,200–$6,000", median: "$2,500", topQ: "$4,500", count: 18 },
  "YouTube|Integration / mention": { range: "$600–$3,500",   median: "$1,400", topQ: "$2,800", count: 29 },
  "Instagram|Reel":                { range: "$350–$1,500",   median: "$680",   topQ: "$1,200", count: 47 },
  "Instagram|Story set":           { range: "$150–$600",     median: "$280",   topQ: "$500",   count: 63 },
  "TikTok|Short-form video":       { range: "$300–$1,200",   median: "$550",   topQ: "$1,000", count: 41 },
};

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

function RateEstimator() {
  const [platform, setPlatform] = useState<RatePlatform | "">("");
  const [format, setFormat]     = useState("");

  const formats = platform ? RATE_FORMATS[platform as RatePlatform] : [];
  const rateKey = platform && format ? `${platform}|${format}` : "";
  const rate    = rateKey ? RATE_DATA[rateKey] : null;

  return (
    <div className="space-y-4">
      <div className="px-4 py-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30">
        <div className="flex items-start gap-2.5">
          <AlertTriangle size={13} className="text-amber-400 mt-0.5 shrink-0" />
          <p className="text-xs text-amber-200/90 leading-relaxed">
            These are observed ranges from reported deals — not a rate card and not what you should charge. Rates vary significantly based on your vertical, audience quality, exclusivity terms, and the specific brand's budget. Use this as context, not as an answer. You will need to use your own judgment based on your conversations with this brand.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <p className="text-xs font-semibold text-white/70 mb-1.5">Platform</p>
          <div className="relative">
            <select value={platform} onChange={e => { setPlatform(e.target.value as RatePlatform); setFormat(""); }}
              className="w-full px-3 py-2.5 rounded-xl bg-black/40 border border-border text-sm appearance-none focus:outline-none focus:border-primary/60 transition-all pr-8 text-white">
              <option value="" disabled className="text-muted-foreground">Select…</option>
              {RATE_PLATFORMS.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
            <ChevronDown size={12} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
          </div>
        </div>
        <div>
          <p className="text-xs font-semibold text-white/70 mb-1.5">Content type</p>
          <div className="relative">
            <select value={format} onChange={e => setFormat(e.target.value)} disabled={!platform}
              className="w-full px-3 py-2.5 rounded-xl bg-black/40 border border-border text-sm appearance-none focus:outline-none focus:border-primary/60 transition-all pr-8 text-white disabled:opacity-40">
              <option value="" disabled className="text-muted-foreground">Select…</option>
              {formats.map(f => <option key={f} value={f}>{f}</option>)}
            </select>
            <ChevronDown size={12} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
          </div>
        </div>
      </div>

      <AnimatePresence>
        {rate && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-3">
            <div className="grid grid-cols-3 gap-2">
              {[{ label: "Observed range", val: rate.range }, { label: "Median", val: rate.median }, { label: "Top quartile", val: rate.topQ }].map(c => (
                <div key={c.label} className="bg-secondary/60 border border-border rounded-xl p-3 text-center">
                  <p className="text-xs text-muted-foreground mb-1 leading-tight">{c.label}</p>
                  <p className="text-sm font-extrabold text-white">{c.val}</p>
                </div>
              ))}
            </div>
            <p className="text-xs text-muted-foreground text-center">Based on {rate.count} reported deals · MAVLIT Rate Index</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Contract Advice ────────────────────────────────────────────────────────────

function ContractAdvice({ contactType }: { contactType?: "agency" | "in-house" }) {
  const [text, setText]      = useState("");
  const [generating, setGen] = useState(false);
  const [output, setOutput]  = useState<string | null>(null);
  const [error, setError]    = useState<string | null>(null);

  const analyze = async () => {
    if (!text.trim()) return;
    setGen(true); setOutput(null); setError(null);
    try {
      let full = "";
      await readStream("/api/pipeline/contract-advice", { contractText: text, contactType }, chunk => { full += chunk; setOutput(full); });
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
            { label: "Usage rights", body: "Know exactly how the brand can use your content and for how long. The more they can do with it — sharing, ads, other campaigns, your name and likeness — the more it's worth, so make sure the fee reflects the usage." },
            { label: "Exclusivity", body: "Understand whether you're barred from working with other brands, and try to keep any exclusivity as narrow and short as possible." },
            { label: "Payment", body: "Confirm how much, when you'll be paid, and consider asking for a portion upfront so you're protected if payment is delayed." },
            { label: "Kill / cancellation clauses", body: "Check whether the brand can cancel, on what notice, and what happens to your fee if they do — especially after you've already delivered." },
            { label: "Ownership vs. license", body: "Know whether you keep ownership of your content or hand it over, and what permissions the brand is getting." },
            { label: "Scope and revisions", body: "Make sure the deliverables and the number of revisions are clearly defined, so you're not doing unlimited unpaid rework." },
          ].map(({ label, body }) => (
            <li key={label} className="flex flex-col gap-0.5">
              <span className="text-xs font-semibold text-white">{label}</span>
              <span className="text-xs text-muted-foreground leading-relaxed">{body}</span>
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

// ── Deal Maker Tab ─────────────────────────────────────────────────────────────

function DealMakerTab({
  pitches, selectedBrand, onSelectBrand,
}: {
  pitches: PitchRecord[];
  selectedBrand: string;
  onSelectBrand: (b: string) => void;
}) {
  const [custom, setCustom]     = useState("");
  const [openCard, setOpenCard] = useState<string | null>(null);

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

      {/* Tool cards */}
      <AccordionCard
        title="Rate Intelligence"
        description="See observed deal ranges for your niche and deliverables, and what moves them."
        isOpen={openCard === "rate"}
        onToggle={() => toggle("rate")}
      >
        <RateEstimator />
      </AccordionCard>

      <AccordionCard
        title="Contract Advice"
        description="Paste a message with contract terms to flag potential issues"
        isOpen={openCard === "contract"}
        onToggle={() => toggle("contract")}
      >
        <ContractAdvice contactType={brandInfo?.type} />
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
