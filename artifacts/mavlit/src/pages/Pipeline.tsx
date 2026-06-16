import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Headphones, Music, Cpu, Camera, Zap,
  CheckCircle2, Check, Copy, ChevronDown, AlertTriangle,
  Sparkles, ArrowLeft, Info, Lightbulb,
} from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import ReplyLoggerModal from "@/components/ReplyLoggerModal";

// ── Types & Constants ─────────────────────────────────────────────────────────

type StageKey = "all" | "sent" | "replied" | "negotiating" | "contract" | "closed";
type Direction = "outbound" | "inbound";

interface Deal {
  id: string;
  brand: string;
  Icon: React.ElementType;
  color: string;
  contact: { name: string; title: string; company: string; type: "agency" | "in-house" };
  direction: Direction;
  stage: Exclude<StageKey, "all">;
  daysSince: number;
  timeLabel: string;
}

const DEALS: Deal[] = [
  { id: "sennheiser",         brand: "Sennheiser",          Icon: Headphones, color: "#7c3aed", direction: "outbound", stage: "sent",        daysSince: 6, timeLabel: "6 days ago",
    contact: { name: "Sarah Chen",      title: "Director of Influencer Marketing", company: "Edelman",            type: "agency"   } },
  { id: "spotify",            brand: "Spotify for Artists", Icon: Music,      color: "#1db954", direction: "outbound", stage: "replied",     daysSince: 2, timeLabel: "2 days ago",
    contact: { name: "Marcus Williams", title: "Creator Partnerships Manager",    company: "In-house",            type: "in-house" } },
  { id: "native-instruments", brand: "Native Instruments",  Icon: Cpu,        color: "#f59e0b", direction: "outbound", stage: "negotiating", daysSince: 1, timeLabel: "1 day ago",
    contact: { name: "Priya Sharma",    title: "Account Supervisor",               company: "Fleischman Hillard", type: "agency"   } },
  { id: "red-bull",           brand: "Red Bull",            Icon: Zap,        color: "#ef4444", direction: "inbound",  stage: "replied",     daysSince: 0, timeLabel: "Today",
    contact: { name: "Alex Rivera",     title: "Account Manager",                  company: "Edelman",            type: "agency"   } },
  { id: "gopro",              brand: "GoPro",               Icon: Camera,     color: "#0ea5e9", direction: "outbound", stage: "sent",        daysSince: 1, timeLabel: "1 day ago",
    contact: { name: "Jake Torres",     title: "Influencer Marketing Manager",     company: "In-house",           type: "in-house" } },
];

const DEAL_LOGS: Record<string, Array<{ date: string; text: string }>> = {
  "sennheiser":         [{ date: "Jun 10", text: "Pitch sent to Sarah Chen" }, { date: "Jun 16", text: "Follow-up sent" }],
  "spotify":            [{ date: "Jun 12", text: "Pitch sent to Marcus Williams" }, { date: "Jun 14", text: "Brand replied — interested, asking for media kit" }],
  "native-instruments": [{ date: "Jun 5",  text: "Pitch sent to Priya Sharma" }, { date: "Jun 11", text: "Follow-up sent" }, { date: "Jun 15", text: "Brand replied — interested, mentioned $500 budget" }],
  "red-bull":           [{ date: "Jun 16", text: "Alex Rivera from Edelman reached out via Email" }, { date: "Jun 16", text: "Reply sent — expressed interest, asked about deliverables" }],
  "gopro":              [{ date: "Jun 15", text: "Pitch sent to Jake Torres" }],
};

const NICHES     = ["Music Production","Gear Reviews","Lifestyle & Music","Electronic Music","Hip-Hop / Beats","Singer-Songwriter","Studio Vlogging","DJ / Live Sets"];
const DEAL_TYPES = ["Instagram Reel","Instagram Story","YouTube Integration","TikTok Video","YouTube Dedicated"];
const TONES      = ["Firm", "Flexible", "Relationship-first"];

const RATE_DATA: Record<string, { range: string; median: string; topQ: string; count: number }> = {
  "Instagram Reel":      { range: "$350–$1,500",   median: "$680",   topQ: "$1,200", count: 47 },
  "Instagram Story":     { range: "$150–$600",     median: "$280",   topQ: "$500",   count: 63 },
  "YouTube Integration": { range: "$600–$3,500",   median: "$1,400", topQ: "$2,800", count: 29 },
  "TikTok Video":        { range: "$300–$1,200",   median: "$550",   topQ: "$1,000", count: 41 },
  "YouTube Dedicated":   { range: "$1,200–$6,000", median: "$2,500", topQ: "$4,500", count: 18 },
};

const CONTRACT_ITEMS = [
  { label: "Usage rights term confirmed",                tip: "How long can the brand use your content? Define the term (e.g. 6 months, 1 year). Unlimited usage without a defined term significantly increases the value — price accordingly." },
  { label: "Exclusivity category and duration confirmed", tip: "Exclusivity means you can't work with competitors. Insist on a defined category (e.g. only headphone brands) and a hard end date. Open-ended exclusivity is a red flag." },
  { label: "Whitelisting rights addressed",              tip: "Whitelisting lets the brand run paid ads using your content. This is a separate, higher-value right. If it's in the contract, it should cost more." },
  { label: "Content ownership confirmed",                tip: "You created it — you should keep it. The default should be you own the content and grant the brand a license. Never sign away full ownership unless the rate reflects it." },
  { label: "Kill fee included",                          tip: "A kill fee protects you if the brand cancels after you've done the work. Standard is 50% of the total fee if cancelled within 14 days of delivery." },
  { label: "Payment terms and timeline confirmed",       tip: "Get NET 30 or better. Push for a deposit (25–50%) upfront before you start work. NET 60 / NET 90 is standard for brands but brutal for creators." },
];

const STAGE_STEPS = ["Pitch Sent", "Replied", "Negotiating", "Contract", "Closed"];
const STAGE_ORDER: Record<Exclude<StageKey, "all">, number> = { sent: 0, replied: 1, negotiating: 2, contract: 3, closed: 4 };
const STAGE_FILTERS: { id: StageKey; label: string }[] = [
  { id: "all", label: "All" }, { id: "sent", label: "Sent" }, { id: "replied", label: "Replied" },
  { id: "negotiating", label: "Negotiating" }, { id: "contract", label: "Contract" }, { id: "closed", label: "Closed" },
];

// ── Shared UI ──────────────────────────────────────────────────────────────────

function Label({ children }: { children: React.ReactNode }) {
  return <label className="block text-xs font-semibold text-white/70 mb-1.5">{children}</label>;
}
function Sel({ value, onChange, options }: { value: string; onChange: (v: string) => void; options: string[] }) {
  return (
    <div className="relative">
      <select value={value} onChange={e => onChange(e.target.value)}
        className="w-full px-3 py-2 rounded-xl bg-black/40 border border-border text-white text-xs appearance-none focus:outline-none focus:border-primary/60 focus:ring-1 focus:ring-primary/30 transition-all pr-8">
        <option value="" disabled>Select…</option>
        {options.map(o => <option key={o} value={o}>{o}</option>)}
      </select>
      <ChevronDown size={12} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
    </div>
  );
}
function CopyBtn({ text }: { text: string }) {
  const [c, setC] = useState(false);
  return (
    <button onClick={() => { navigator.clipboard.writeText(text).then(() => { setC(true); setTimeout(() => setC(false), 2000); }); }}
      className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold border border-border text-muted-foreground hover:text-white hover:border-white/30 transition-all">
      {c ? <Check size={11} className="text-emerald-400" /> : <Copy size={11} />}{c ? "Copied!" : "Copy"}
    </button>
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

// ── Stage Timeline ─────────────────────────────────────────────────────────────

function StageTimeline({ deal }: { deal: Deal }) {
  const steps = deal.direction === "inbound"
    ? ["Brand contacted me", "Replied", "Negotiating", "Contract", "Closed"]
    : STAGE_STEPS;
  const currentIdx = STAGE_ORDER[deal.stage];
  return (
    <div className="flex items-center gap-0 mb-8">
      {steps.map((step, i) => {
        const done = i < currentIdx, current = i === currentIdx;
        return (
          <div key={step} className="flex items-center flex-1">
            <div className="flex flex-col items-center flex-1">
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-all ${done ? "bg-emerald-500 border-emerald-500 text-white" : current ? "bg-primary border-primary text-white" : "bg-transparent border-border text-muted-foreground"}`}>
                {done ? <Check size={12} /> : <span>{i + 1}</span>}
              </div>
              <span className={`text-xs mt-1.5 font-semibold text-center leading-tight ${current ? "text-white" : done ? "text-emerald-400" : "text-muted-foreground"}`}>{step}</span>
            </div>
            {i < steps.length - 1 && <div className={`h-0.5 flex-1 mb-5 mx-1 ${i < currentIdx ? "bg-emerald-500" : "bg-border"}`} />}
          </div>
        );
      })}
    </div>
  );
}

// ── Conversation Log ───────────────────────────────────────────────────────────

function ConversationLog({ deal, extraNotes = [] }: { deal: Deal; extraNotes?: Array<{ date: string; text: string }> }) {
  const [note, setNote] = useState("");
  const [notes, setNotes] = useState<Array<{ date: string; text: string }>>([]);
  const entries = [...(DEAL_LOGS[deal.id] ?? []), ...notes, ...extraNotes];
  return (
    <div className="bg-card border border-border rounded-2xl p-5 flex flex-col gap-4 h-full">
      <p className="text-xs font-bold text-white uppercase tracking-wider">Conversation log</p>
      <div className="flex flex-col gap-2 flex-1">
        {entries.map((e, i) => (
          <div key={i} className="flex items-start gap-3">
            <span className="text-xs text-muted-foreground w-10 shrink-0 pt-0.5">{e.date}</span>
            <div className="w-1.5 h-1.5 rounded-full bg-primary/60 mt-1.5 shrink-0" />
            <span className="text-xs text-white/80 leading-relaxed">{e.text}</span>
          </div>
        ))}
        {entries.length === 0 && <p className="text-xs text-muted-foreground">No activity yet.</p>}
      </div>
      <div className="mt-2 border-t border-border pt-4">
        <textarea value={note} onChange={e => setNote(e.target.value)} rows={2} placeholder="Log an update…"
          className="w-full px-3 py-2 rounded-xl bg-black/40 border border-border text-white text-xs placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary/60 resize-none transition-all mb-2" />
        <button onClick={() => { if (!note.trim()) return; setNotes(n => [...n, { date: "Today", text: note }]); setNote(""); }}
          disabled={!note.trim()}
          className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-secondary border border-border text-white hover:border-primary/40 disabled:opacity-40 transition-all">
          Add note
        </button>
      </div>
    </div>
  );
}

// ── Follow-up Generator ───────────────────────────────────────────────────────

function FollowUpGenerator({ deal, onFollowUpSent }: { deal: Deal; onFollowUpSent: () => void }) {
  const [generating, setGenerating] = useState(false);
  const [email, setEmail]           = useState<string | null>(null);
  const [error, setError]           = useState<string | null>(null);
  const [sent, setSent]             = useState(false);
  const outputRef = useRef<HTMLDivElement>(null);

  const generate = async () => {
    setGenerating(true); setEmail(null); setError(null);
    try {
      let full = "";
      await readStream("/api/pitch/followup", { brandName: deal.brand, daysSince: deal.daysSince },
        chunk => { full += chunk; setEmail(full); });
      setTimeout(() => outputRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 100);
    } catch { setError("Something went wrong. Please try again."); }
    finally { setGenerating(false); }
  };

  const markSent = () => { setSent(true); onFollowUpSent(); };

  return (
    <div className="space-y-4">
      <div className="bg-card border border-border rounded-2xl p-5 space-y-4">
        <div className="flex items-center gap-2">
          <Sparkles size={13} className="text-primary" />
          <p className="text-xs font-bold text-white uppercase tracking-wider">Follow-up Generator</p>
        </div>

        <div>
          <Label>Pitch sent</Label>
          <div className="px-3 py-2 rounded-xl bg-black/40 border border-border text-muted-foreground text-xs">{deal.timeLabel} ({deal.daysSince} days ago)</div>
        </div>

        <div className="flex items-start gap-2.5 px-3 py-3 rounded-xl bg-amber-500/10 border border-amber-500/30">
          <AlertTriangle size={12} className="text-amber-400 mt-0.5 shrink-0" />
          <p className="text-xs text-amber-200/90 leading-relaxed">
            <span className="font-bold text-amber-300">Send one follow-up only.</span> Keep it short, add one new piece of value. Do not mention rates.
          </p>
        </div>

        <button onClick={generate} disabled={generating || sent}
          className="w-full py-3 rounded-xl text-xs font-bold bg-primary hover:bg-primary/90 disabled:opacity-40 text-white transition-all flex items-center justify-center gap-2">
          {generating
            ? <><motion.div animate={{ rotate: 360 }} transition={{ duration: 1.2, repeat: Infinity, ease: "linear" }} className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full" />Generating…</>
            : <><Sparkles size={13} />✦ Generate follow-up email</>}
        </button>

        {error && <p className="text-xs text-red-400">{error}</p>}

        <AnimatePresence>
          {email && !sent && (
            <motion.div ref={outputRef} key="fu-out" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-3">
              <div className="relative bg-black/60 border border-border rounded-xl p-4">
                <pre className="font-mono text-xs text-white/90 whitespace-pre-wrap leading-relaxed">{email}</pre>
                <div className="absolute top-3 right-3"><CopyBtn text={email} /></div>
              </div>
              <button onClick={markSent}
                className="w-full py-2.5 rounded-xl text-xs font-bold border border-emerald-500/50 text-emerald-400 hover:bg-emerald-500/15 transition-all flex items-center justify-center gap-2">
                <CheckCircle2 size={13} />Mark follow-up as sent
              </button>
            </motion.div>
          )}
          {sent && (
            <motion.div key="fu-sent" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              className="flex items-center gap-2.5 px-3 py-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30">
              <CheckCircle2 size={14} className="text-emerald-400 shrink-0" />
              <p className="text-xs text-emerald-300 leading-relaxed">Follow-up sent. Note added to your conversation log.</p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

function FollowUpWindowClosed({ daysLeft }: { daysLeft: number }) {
  return (
    <div className="bg-card border border-border rounded-2xl p-6 flex flex-col items-center text-center gap-4">
      <div className="flex items-center gap-2 self-start">
        <Sparkles size={13} className="text-primary" />
        <p className="text-xs font-bold text-white uppercase tracking-wider">Follow-up Generator</p>
      </div>
      <div className="w-12 h-12 rounded-full bg-amber-500/10 flex items-center justify-center">
        <AlertTriangle size={20} className="text-amber-400" />
      </div>
      <div className="space-y-2">
        <p className="text-sm font-semibold text-white">
          Follow-up window opens in <span className="text-amber-400">{daysLeft} {daysLeft === 1 ? "day" : "days"}</span>.
        </p>
        <p className="text-xs text-muted-foreground leading-relaxed">
          Sending too soon can hurt your chances — give them time to respond.
        </p>
      </div>
    </div>
  );
}

// ── Negotiating Tools ─────────────────────────────────────────────────────────

function NegotiatingTools({ deal, prefillOffer = "" }: { deal: Deal; prefillOffer?: string }) {
  const [rateNiche, setRateNiche]       = useState("");
  const [rateDT, setRateDT]             = useState("");
  const [myCounter, setMyCounter]       = useState("");
  const [tone, setTone]                 = useState("Flexible");
  const [usage, setUsage]               = useState(false);
  const [excl, setExcl]                 = useState(false);
  const [white, setWhite]               = useState(false);
  const [generating, setGenerating]     = useState(false);
  const [counterText, setCounterText]   = useState<string | null>(null);
  const [counterError, setCounterError] = useState<string | null>(null);

  const theirOffer = prefillOffer || (deal.id === "native-instruments" ? "$500" : "");
  const rateInfo   = rateNiche && rateDT ? RATE_DATA[rateDT] ?? null : null;

  const generate = async () => {
    if (!myCounter.trim() || !theirOffer) return;
    setGenerating(true); setCounterText(null); setCounterError(null);
    try {
      let full = "";
      await readStream("/api/negotiator/counter", {
        brandName: deal.brand, theirOffer, myCounter, tone, usageRights: usage, exclusivity: excl, whitelisting: white,
      }, chunk => { full += chunk; setCounterText(full); });
    } catch { setCounterError("Something went wrong. Please try again."); }
    finally { setGenerating(false); }
  };

  return (
    <div className="space-y-5 overflow-y-auto">
      {/* Rate intelligence */}
      <div className="bg-card border border-border rounded-2xl p-5 space-y-4">
        <div className="flex items-center gap-2">
          <Lightbulb size={13} className="text-primary" />
          <p className="text-xs font-bold text-white uppercase tracking-wider">Rate intelligence</p>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div><Label>Niche</Label><Sel value={rateNiche} onChange={setRateNiche} options={NICHES} /></div>
          <div><Label>Deal type</Label><Sel value={rateDT} onChange={setRateDT} options={DEAL_TYPES} /></div>
        </div>
        <AnimatePresence>
          {rateInfo && (
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-3">
              <div className="grid grid-cols-3 gap-2">
                {[{ label: "Observed range", val: rateInfo.range }, { label: "Median", val: rateInfo.median }, { label: "Top quartile", val: rateInfo.topQ }].map(c => (
                  <div key={c.label} className="bg-secondary/60 border border-border rounded-xl p-3 text-center">
                    <p className="text-xs text-muted-foreground mb-1">{c.label}</p>
                    <p className="text-sm font-extrabold text-white">{c.val}</p>
                  </div>
                ))}
              </div>
              <p className="text-xs text-muted-foreground text-center">Based on {rateInfo.count} reported deals · MAVLIT Rate Index</p>
              <div className="flex items-start gap-2 px-3 py-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30">
                <AlertTriangle size={12} className="text-amber-400 mt-0.5 shrink-0" />
                <p className="text-xs text-amber-200/90 leading-relaxed">Rates are not formulaic. The same deliverable can vary 5–10× based on vertical, audience quality, and exclusivity terms.</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Counter-offer generator */}
      <div className="bg-card border border-border rounded-2xl p-5 space-y-4">
        <div className="flex items-center gap-2">
          <Sparkles size={13} className="text-primary" />
          <p className="text-xs font-bold text-white uppercase tracking-wider">Counter-offer generator</p>
        </div>
        <div>
          <Label>Their offer</Label>
          <input value={theirOffer || "—"} readOnly
            className="w-full px-3 py-2 rounded-xl bg-black/40 border border-border text-muted-foreground text-xs opacity-60 cursor-default" />
        </div>
        <div>
          <Label>Your counter</Label>
          <input value={myCounter} onChange={e => setMyCounter(e.target.value)} placeholder="e.g. $1,200"
            className="w-full px-3 py-2 rounded-xl bg-black/40 border border-border text-white text-xs placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary/60 focus:ring-1 focus:ring-primary/30 transition-all" />
        </div>
        <div><Label>Tone</Label><Sel value={tone} onChange={setTone} options={TONES} /></div>

        <div className="border-t border-border pt-3 space-y-2">
          <p className="text-xs font-semibold text-muted-foreground mb-2">Deal terms context</p>
          {[{ label: "Usage rights defined", val: usage, set: setUsage }, { label: "Exclusivity defined", val: excl, set: setExcl }, { label: "Whitelisting addressed", val: white, set: setWhite }].map(t => (
            <button key={t.label} onClick={() => t.set((v: boolean) => !v)}
              className="flex items-center gap-2.5 w-full text-left p-2 rounded-lg hover:bg-secondary/40 transition-colors">
              <div className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-all ${t.val ? "bg-primary border-primary" : "border-border"}`}>
                {t.val && <Check size={10} className="text-white" />}
              </div>
              <span className="text-xs text-white/80">{t.label}</span>
            </button>
          ))}
        </div>

        <button onClick={generate} disabled={!myCounter.trim() || generating}
          className="w-full py-3 rounded-xl text-xs font-bold bg-primary hover:bg-primary/90 disabled:opacity-40 text-white transition-all flex items-center justify-center gap-2">
          {generating ? (<><motion.div animate={{ rotate: 360 }} transition={{ duration: 1.2, repeat: Infinity, ease: "linear" }} className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full" />Generating…</>) : (<><Sparkles size={13} />✦ Generate counter-offer response</>)}
        </button>
        {counterError && <p className="text-xs text-red-400">{counterError}</p>}
        <AnimatePresence>
          {counterText && (
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="relative bg-black/60 border border-border rounded-xl p-4">
              <pre className="font-mono text-xs text-white/90 whitespace-pre-wrap leading-relaxed">{counterText}</pre>
              <div className="absolute top-3 right-3"><CopyBtn text={counterText} /></div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

// ── Contract Checklist ─────────────────────────────────────────────────────────

function ContractChecklist() {
  const [checks, setChecks] = useState<boolean[]>(new Array(CONTRACT_ITEMS.length).fill(false));
  const [tooltip, setTooltip] = useState<number | null>(null);
  const allDone = checks.every(Boolean);
  return (
    <div className="bg-card border border-border rounded-2xl p-5 space-y-4">
      <p className="text-xs font-bold text-white uppercase tracking-wider">Contract checklist</p>
      <div className="space-y-2">
        {CONTRACT_ITEMS.map((item, i) => (
          <div key={i} className="relative">
            <button onClick={() => setChecks(c => c.map((v, j) => j === i ? !v : v))}
              className="flex items-start gap-2.5 w-full text-left p-2.5 rounded-xl hover:bg-secondary/40 transition-colors">
              <div className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 mt-0.5 transition-all ${checks[i] ? "bg-emerald-500 border-emerald-500" : "border-border"}`}>
                {checks[i] && <Check size={10} className="text-white" />}
              </div>
              <span className={`text-xs leading-relaxed transition-colors ${checks[i] ? "text-white/50 line-through" : "text-white/80"}`}>{item.label}</span>
              <button onClick={e => { e.stopPropagation(); setTooltip(tooltip === i ? null : i); }}
                className="ml-auto shrink-0 text-muted-foreground hover:text-white transition-colors mt-0.5">
                <Info size={12} />
              </button>
            </button>
            <AnimatePresence>
              {tooltip === i && (
                <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                  className="absolute z-10 left-0 right-0 mt-1 px-3 py-2.5 rounded-xl bg-black border border-primary/30 text-xs text-white/80 leading-relaxed shadow-xl">
                  {item.tip}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        ))}
      </div>
      <AnimatePresence>
        {allDone && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className="flex items-start gap-2 px-3 py-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30">
            <CheckCircle2 size={14} className="text-emerald-400 mt-0.5 shrink-0" />
            <p className="text-xs text-emerald-300 leading-relaxed">You have reviewed the key contract terms. Consult a lawyer before signing.</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Deal Workspace ─────────────────────────────────────────────────────────────

function DealWorkspace({ deal, prefillOffer, onClose }: { deal: Deal; prefillOffer: string; onClose: () => void }) {
  const [extraNotes, setExtraNotes] = useState<Array<{ date: string; text: string }>>([]);

  const isSent          = deal.stage === "sent";
  const followUpReady   = isSent && deal.daysSince >= 5;
  const daysUntilOpen   = isSent && !followUpReady ? 5 - deal.daysSince : 0;
  const isContract      = deal.stage === "contract" && !prefillOffer;

  let RightPanel: React.ReactNode;
  if (isSent) {
    RightPanel = followUpReady
      ? <FollowUpGenerator deal={deal} onFollowUpSent={() => setExtraNotes(n => [...n, { date: "Today", text: "Follow-up sent." }])} />
      : <FollowUpWindowClosed daysLeft={daysUntilOpen} />;
  } else if (isContract) {
    RightPanel = <ContractChecklist />;
  } else {
    RightPanel = <NegotiatingTools deal={deal} prefillOffer={prefillOffer} />;
  }

  const stageBadgeClass =
    deal.stage === "sent"        ? "bg-violet-500/15 text-violet-400" :
    deal.stage === "replied"     ? "bg-sky-500/15 text-sky-400" :
    deal.stage === "negotiating" ? "bg-amber-500/15 text-amber-400" :
    deal.stage === "contract"    ? "bg-orange-500/15 text-orange-400" :
                                   "bg-emerald-500/15 text-emerald-400";

  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }}>
      <button onClick={onClose} className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-white transition-colors mb-6 group">
        <ArrowLeft size={14} className="group-hover:-translate-x-0.5 transition-transform" />Back to Pipeline
      </button>

      <div className="flex items-center gap-4 mb-8 pb-6 border-b border-border">
        <div className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{ background: `${deal.color}25` }}>
          <deal.Icon size={22} style={{ color: deal.color }} />
        </div>
        <div>
          <h2 className="text-xl font-extrabold text-white">{deal.brand}</h2>
          <p className="text-sm text-muted-foreground">{deal.contact.name} · {deal.contact.title} · {deal.contact.company}</p>
        </div>
        <div className="ml-auto">
          <span className={`px-3 py-1.5 rounded-full text-xs font-bold ${stageBadgeClass}`}>
            {deal.stage.charAt(0).toUpperCase() + deal.stage.slice(1)}
          </span>
        </div>
      </div>

      <StageTimeline deal={deal} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ConversationLog deal={deal} extraNotes={extraNotes} />
        <div>{RightPanel}</div>
      </div>
    </motion.div>
  );
}

// ── Deal Card ──────────────────────────────────────────────────────────────────

function DealCard({ deal, onExpand, onReply }: { deal: Deal; onExpand: () => void; onReply: () => void }) {
  const stageBadge = {
    sent:        { bg: "bg-violet-500/15",  text: "text-violet-400"  },
    replied:     { bg: "bg-sky-500/15",     text: "text-sky-400"     },
    negotiating: { bg: "bg-amber-500/15",   text: "text-amber-400"   },
    contract:    { bg: "bg-orange-500/15",  text: "text-orange-400"  },
    closed:      { bg: "bg-emerald-500/15", text: "text-emerald-400" },
  }[deal.stage];

  const dirBadge = deal.direction === "inbound"
    ? { bg: "bg-teal-500/15", text: "text-teal-400", label: "Inbound"  }
    : { bg: "bg-zinc-500/15", text: "text-zinc-400",  label: "Outbound" };

  let ActionBtn: React.ReactNode;
  if (deal.stage === "sent") {
    ActionBtn = <button onClick={onExpand} className="shrink-0 px-3 py-1.5 rounded-lg text-xs font-bold border border-primary/50 text-primary hover:bg-primary hover:text-white transition-all whitespace-nowrap">Open deal →</button>;
  } else if (deal.stage === "replied") {
    ActionBtn = <button onClick={onReply} className="shrink-0 px-3 py-1.5 rounded-lg text-xs font-bold border border-sky-500/50 text-sky-400 hover:bg-sky-500/20 transition-all whitespace-nowrap">Log reply →</button>;
  } else if (deal.stage === "negotiating") {
    ActionBtn = <button onClick={onExpand} className="shrink-0 px-3 py-1.5 rounded-lg text-xs font-bold border border-amber-500/50 text-amber-400 hover:bg-amber-500/15 transition-all whitespace-nowrap">Open deal workspace →</button>;
  } else if (deal.stage === "contract") {
    ActionBtn = <button onClick={onExpand} className="shrink-0 px-3 py-1.5 rounded-lg text-xs font-bold border border-orange-500/50 text-orange-400 hover:bg-orange-500/15 transition-all whitespace-nowrap">Review contract →</button>;
  } else {
    ActionBtn = <button className="shrink-0 px-3 py-1.5 rounded-lg text-xs font-bold border border-emerald-500/50 text-emerald-400 hover:bg-emerald-500/15 transition-all whitespace-nowrap">View summary →</button>;
  }

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}
      className="flex items-center gap-3 p-4 rounded-2xl bg-card border border-border hover:border-primary/20 transition-colors">
      <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: `${deal.color}25` }}>
        <deal.Icon size={17} style={{ color: deal.color }} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-bold text-white leading-tight truncate">{deal.brand}</p>
        <p className="text-xs text-muted-foreground truncate">{deal.contact.name} · {deal.contact.title}</p>
      </div>
      <span className={`shrink-0 px-2 py-0.5 rounded-full text-xs font-semibold ${dirBadge.bg} ${dirBadge.text}`}>{dirBadge.label}</span>
      <span className={`shrink-0 px-2 py-0.5 rounded-full text-xs font-semibold ${stageBadge.bg} ${stageBadge.text}`}>{deal.stage.charAt(0).toUpperCase() + deal.stage.slice(1)}</span>
      <span className="shrink-0 text-xs text-muted-foreground hidden sm:block w-16 text-right">{deal.timeLabel}</span>
      {ActionBtn}
    </motion.div>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────────

export default function Pipeline() {
  const [filter, setFilter]         = useState<StageKey>("all");
  const [expandedId, setExpandedId] = useState<string | null>(() => {
    const id = sessionStorage.getItem("mavlit_expand_deal");
    if (id) sessionStorage.removeItem("mavlit_expand_deal");
    return id;
  });
  const [prefillOffer, setPrefillOffer] = useState<string>(() => {
    const offer = sessionStorage.getItem("mavlit_prefill_offer");
    if (offer) sessionStorage.removeItem("mavlit_prefill_offer");
    return offer ?? "";
  });
  const [dismissedIds, setDismissedIds] = useState<string[]>([]);
  const [replyDeal, setReplyDeal]       = useState<Deal | null>(null);

  const expandedDeal = DEALS.find(d => d.id === expandedId) ?? null;
  const visible  = DEALS.filter(d => !dismissedIds.includes(d.id));
  const filtered = filter === "all" ? visible : visible.filter(d => d.stage === filter);

  const handleOpenCounterOffer = (dealId: string, offer: string) => {
    setPrefillOffer(offer);
    setExpandedId(dealId);
    setReplyDeal(null);
  };

  return (
    <div className="min-h-screen bg-background text-foreground overflow-x-hidden">
      <Navbar />

      <main className="pt-28 pb-24 px-4">
        <div className="max-w-5xl mx-auto">

          {expandedDeal ? (
            <DealWorkspace
              deal={expandedDeal}
              prefillOffer={prefillOffer}
              onClose={() => { setExpandedId(null); setPrefillOffer(""); }}
            />
          ) : (
            <>
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} className="mb-8">
                <h1 className="text-4xl font-extrabold text-white tracking-tight mb-2">Pipeline</h1>
                <p className="text-muted-foreground text-base max-w-2xl">
                  Every deal in one place — outbound pitches, inbound inquiries, and everything in between.
                </p>
              </motion.div>

              <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, delay: 0.06 }}
                className="flex gap-2 mb-6 p-1 bg-card border border-border rounded-2xl w-fit flex-wrap">
                {STAGE_FILTERS.map(({ id, label }) => (
                  <button key={id} onClick={() => setFilter(id)}
                    className={`px-4 py-1.5 rounded-xl text-sm font-bold transition-all ${filter === id ? "bg-primary text-white shadow-md shadow-primary/30" : "text-muted-foreground hover:text-white"}`}>
                    {label}
                    <span className="ml-1.5 text-xs opacity-60">
                      {id === "all" ? visible.length : visible.filter(d => d.stage === id).length}
                    </span>
                  </button>
                ))}
              </motion.div>

              <div className="flex flex-col gap-3">
                <AnimatePresence>
                  {filtered.map(deal => (
                    <DealCard
                      key={deal.id}
                      deal={deal}
                      onExpand={() => setExpandedId(deal.id)}
                      onReply={() => setReplyDeal(deal)}
                    />
                  ))}
                </AnimatePresence>
                {filtered.length === 0 && (
                  <div className="text-center py-16 text-muted-foreground text-sm">No deals in this stage yet.</div>
                )}
              </div>
            </>
          )}

        </div>
      </main>

      <Footer />

      <AnimatePresence>
        {replyDeal && (
          <ReplyLoggerModal
            brandName={replyDeal.brand}
            dealId={replyDeal.id}
            onClose={() => setReplyDeal(null)}
            onDismiss={() => setDismissedIds(ids => [...ids, replyDeal.id])}
            onOpenCounterOffer={handleOpenCounterOffer}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
