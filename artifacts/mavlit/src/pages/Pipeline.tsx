import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Headphones, Music, Cpu, Camera, Zap,
  CheckCircle2, Check, Copy, ChevronDown,
  Sparkles, ArrowLeft, X, FileText,
} from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

// ── Types & Constants ─────────────────────────────────────────────────────────

type StageKey = "all" | "sent" | "replied" | "negotiating" | "closed";
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
  niche: string;
  pitchDate: string;
}

interface ClosedInfo {
  outcome: "signed" | "nodeal";
  finalRate?: string;
  revisit?: boolean;
}

const DEALS: Deal[] = [
  { id: "sennheiser",         brand: "Sennheiser",          Icon: Headphones, color: "#7c3aed", direction: "outbound", stage: "sent",        daysSince: 6, timeLabel: "Jun 10", niche: "Audio Gear Reviews",  pitchDate: "Jun 10",
    contact: { name: "Sarah Chen",      title: "Director of Influencer Marketing", company: "Edelman",            type: "agency"   } },
  { id: "spotify",            brand: "Spotify for Artists", Icon: Music,      color: "#1db954", direction: "outbound", stage: "replied",     daysSince: 2, timeLabel: "Jun 12", niche: "Music Production",    pitchDate: "Jun 12",
    contact: { name: "Marcus Williams", title: "Creator Partnerships Manager",    company: "In-house",            type: "in-house" } },
  { id: "native-instruments", brand: "Native Instruments",  Icon: Cpu,        color: "#f59e0b", direction: "outbound", stage: "negotiating", daysSince: 1, timeLabel: "Jun 5",  niche: "Music Production",    pitchDate: "Jun 5",
    contact: { name: "Priya Sharma",    title: "Account Supervisor",               company: "Fleischman Hillard", type: "agency"   } },
  { id: "red-bull",           brand: "Red Bull",            Icon: Zap,        color: "#ef4444", direction: "inbound",  stage: "replied",     daysSince: 0, timeLabel: "Today",  niche: "Lifestyle & Music",   pitchDate: "",
    contact: { name: "Alex Rivera",     title: "Account Manager",                  company: "Edelman",            type: "agency"   } },
  { id: "gopro",              brand: "GoPro",               Icon: Camera,     color: "#0ea5e9", direction: "outbound", stage: "sent",        daysSince: 1, timeLabel: "Jun 15", niche: "Studio Vlogging",     pitchDate: "Jun 15",
    contact: { name: "Jake Torres",     title: "Influencer Marketing Manager",     company: "In-house",           type: "in-house" } },
];

const DEAL_LOGS: Record<string, Array<{ date: string; text: string }>> = {
  "sennheiser":         [{ date: "Jun 10", text: "Pitch sent to Sarah Chen" }, { date: "Jun 16", text: "Follow-up sent" }],
  "spotify":            [{ date: "Jun 12", text: "Pitch sent to Marcus Williams" }, { date: "Jun 14", text: "Brand replied — interested, asking for media kit" }],
  "native-instruments": [{ date: "Jun 5",  text: "Pitch sent to Priya Sharma" }, { date: "Jun 11", text: "Follow-up sent" }, { date: "Jun 15", text: "Brand replied — interested, mentioned $500 budget" }],
  "red-bull":           [{ date: "Jun 16", text: "Alex Rivera from Edelman reached out via Email" }, { date: "Jun 16", text: "Reply sent — expressed interest, asked about deliverables" }],
  "gopro":              [{ date: "Jun 15", text: "Pitch sent to Jake Torres" }],
};

const STAGE_STEPS = ["Pitch Sent", "Replied", "Negotiating", "Closed"];
const STAGE_ORDER: Record<Exclude<StageKey, "all">, number> = { sent: 0, replied: 1, negotiating: 2, closed: 3 };
const STAGE_FILTERS: { id: StageKey; label: string }[] = [
  { id: "all", label: "All" }, { id: "sent", label: "Sent" }, { id: "replied", label: "Replied" },
  { id: "negotiating", label: "Negotiating" }, { id: "closed", label: "Closed" },
];

const CREATOR_PROFILE = {
  name: "Alex Morgan", handle: "alexmorganmusic", platform: "YouTube",
  followers: "82K", engagementRate: "5.2",
  niche: "Music Production & Gear Reviews", pastPartnerships: "AudioTechnica, Ableton, Sweetwater",
};

// ── Shared UI ──────────────────────────────────────────────────────────────────

function Label({ children }: { children: React.ReactNode }) {
  return <label className="block text-xs font-semibold text-white/70 mb-1.5">{children}</label>;
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

// ── Stage Timeline ─────────────────────────────────────────────────────────────

function StageTimeline({ deal }: { deal: Deal }) {
  const steps = deal.direction === "inbound"
    ? ["Brand contacted me", "Replied", "Negotiating", "Closed"]
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

// ── Media Kit Footer ───────────────────────────────────────────────────────────

function MediaKitFooter() {
  const [open, setOpen]         = useState(false);
  const [generating, setGen]    = useState(false);
  const [kit, setKit]           = useState<string | null>(null);
  const [error, setError]       = useState<string | null>(null);

  const generate = async () => {
    setOpen(true);
    if (kit) return;
    setGen(true); setError(null);
    try {
      let full = "";
      await readStream("/api/pipeline/media-kit", { ...CREATOR_PROFILE }, chunk => { full += chunk; setKit(full); });
    } catch { setError("Something went wrong. Please try again."); }
    finally { setGen(false); }
  };

  return (
    <div className="mt-5 pt-4 border-t border-border">
      <button onClick={generate} className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-white transition-colors">
        <FileText size={11} />
        <span className="underline underline-offset-2">Generate a quick media kit →</span>
      </button>
      <AnimatePresence>
        {open && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
            <div className="mt-3 space-y-2">
              {generating && !kit && (
                <div className="flex items-center gap-2 text-xs text-muted-foreground px-1 py-2">
                  <Spin />Generating media kit…
                </div>
              )}
              {kit && <OutputBox text={kit} />}
              {error && <p className="text-xs text-red-400">{error}</p>}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Sent Panel ────────────────────────────────────────────────────────────────

const SENT_OPTIONS = [
  { id: "nudge" as const,  label: "Send a follow-up nudge",  desc: "A short, warm check-in. Nothing new added."      },
  { id: "new"   as const,  label: "Add something new",        desc: "Share a recent post, stat, or campaign angle."   },
  { id: "angle" as const,  label: "Try a different angle",    desc: "Reframe your pitch from a fresh perspective."    },
];
type SentOption = "nudge" | "new" | "angle";

function SentPanel({ deal, onFollowUpSent }: { deal: Deal; onFollowUpSent: () => void }) {
  const isReady  = deal.daysSince >= 5;
  const daysLeft = 5 - deal.daysSince;

  const [selected, setSelected]   = useState<SentOption | null>(null);
  const [generating, setGen]      = useState(false);
  const [output, setOutput]       = useState<string | null>(null);
  const [error, setError]         = useState<string | null>(null);
  const [sent, setSent]           = useState(false);
  const outRef = useRef<HTMLDivElement>(null);

  if (!isReady) {
    return (
      <div className="space-y-5">
        <div className="px-5 py-5 rounded-2xl bg-card border border-border">
          <p className="text-sm text-muted-foreground leading-relaxed">
            Waiting for reply. Follow-up window opens in{" "}
            <span className="text-white font-semibold">{daysLeft} {daysLeft === 1 ? "day" : "days"}</span>.
            {" "}Sending too soon hurts your chances.
          </p>
        </div>
        <MediaKitFooter />
      </div>
    );
  }

  const generate = async () => {
    if (!selected) return;
    setGen(true); setOutput(null); setError(null);
    try {
      let full = "";
      await readStream("/api/pipeline/followup", {
        brandName: deal.brand, contactFirstName: deal.contact.name.split(" ")[0],
        daysSince: deal.daysSince, pitchDate: deal.pitchDate, niche: deal.niche, option: selected,
      }, chunk => { full += chunk; setOutput(full); });
      setTimeout(() => outRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" }), 100);
    } catch { setError("Something went wrong. Please try again."); }
    finally { setGen(false); }
  };

  return (
    <div className="space-y-5">
      <div className="bg-card border border-border rounded-2xl p-5 space-y-4">
        <p className="text-xs font-bold text-white uppercase tracking-wider">What do you want to do?</p>

        <div className="space-y-2">
          {SENT_OPTIONS.map(opt => (
            <button key={opt.id} onClick={() => { setSelected(opt.id); setOutput(null); setSent(false); }}
              className={`w-full text-left p-3.5 rounded-xl border transition-all ${selected === opt.id ? "border-primary/60 bg-primary/10" : "border-border hover:border-primary/30 hover:bg-secondary/40"}`}>
              <p className={`text-xs font-bold ${selected === opt.id ? "text-primary" : "text-white"}`}>{opt.label}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{opt.desc}</p>
            </button>
          ))}
        </div>

        <button onClick={generate} disabled={!selected || generating || sent}
          className="w-full py-3 rounded-xl text-xs font-bold bg-primary hover:bg-primary/90 disabled:opacity-40 text-white transition-all flex items-center justify-center gap-2">
          {generating ? <><Spin />Writing…</> : <><Sparkles size={13} />✦ Write this message</>}
        </button>

        {error && <p className="text-xs text-red-400">{error}</p>}

        <AnimatePresence>
          {output && !sent && (
            <motion.div ref={outRef} key="sent-out" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-3">
              <OutputBox text={output} />
              <button onClick={() => { setSent(true); onFollowUpSent(); }}
                className="w-full py-2.5 rounded-xl text-xs font-bold border border-emerald-500/50 text-emerald-400 hover:bg-emerald-500/15 transition-all flex items-center justify-center gap-2">
                <CheckCircle2 size={13} />Mark as sent
              </button>
            </motion.div>
          )}
          {sent && (
            <motion.div key="sent-done" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              className="flex items-center gap-2.5 px-3 py-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30">
              <CheckCircle2 size={14} className="text-emerald-400 shrink-0" />
              <p className="text-xs text-emerald-300">Sent. Note added to your conversation log.</p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      <MediaKitFooter />
    </div>
  );
}

// ── Replied Panel ─────────────────────────────────────────────────────────────

type ReplyCategory = "interested" | "offered_number" | "asked_call" | "declined";

const OPTION_SETS: Record<ReplyCategory, string[]> = {
  interested:     ["Respond with more info", "Propose next steps", "Share my media kit"],
  offered_number: ["Counter this offer",     "Accept and confirm", "Ask for time to consider"],
  asked_call:     ["Confirm a call and ask about budget", "Decline the call and ask for details by email", "Suggest a briefer async option"],
  declined:       ["Thank them gracefully",  "Ask for feedback",   "Suggest future collaboration"],
};

function RepliedPanel({ deal, onAddNote }: { deal: Deal; onAddNote: (note: string) => void }) {
  const [message, setMessage]   = useState("");
  const [reading, setReading]   = useState(false);
  const [category, setCategory] = useState<ReplyCategory | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [generating, setGen]    = useState(false);
  const [output, setOutput]     = useState<string | null>(null);
  const [error, setError]       = useState<string | null>(null);
  const outRef = useRef<HTMLDivElement>(null);

  const readMessage = async () => {
    if (!message.trim()) return;
    setReading(true);
    try {
      const res = await fetch("/api/pitch/analyze-reply", {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message, brandName: deal.brand }),
      });
      const data = res.ok ? await res.json() as { category?: ReplyCategory } : {};
      setCategory(data.category ?? "interested");
      onAddNote(`${deal.brand} replied — message logged`);
    } catch { setCategory("interested"); }
    finally { setReading(false); }
  };

  const generate = async () => {
    if (!selected) return;
    setGen(true); setOutput(null); setError(null);
    try {
      let full = "";
      await readStream("/api/pipeline/replied", {
        brandName: deal.brand, contactFirstName: deal.contact.name.split(" ")[0],
        brandMessage: message, option: selected, niche: deal.niche,
      }, chunk => { full += chunk; setOutput(full); });
      setTimeout(() => outRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" }), 100);
    } catch { setError("Something went wrong. Please try again."); }
    finally { setGen(false); }
  };

  return (
    <div className="space-y-5">
      <div className="bg-card border border-border rounded-2xl p-5 space-y-4">
        {!category ? (
          <>
            <Label>Paste their message here</Label>
            <textarea value={message} onChange={e => setMessage(e.target.value)} rows={5}
              placeholder={`Paste ${deal.brand}'s reply…`}
              className="w-full px-3 py-2.5 rounded-xl bg-black/40 border border-border text-white text-xs placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary/60 resize-none transition-all" />
            <button onClick={readMessage} disabled={!message.trim() || reading}
              className="w-full py-3 rounded-xl text-xs font-bold bg-primary hover:bg-primary/90 disabled:opacity-40 text-white transition-all flex items-center justify-center gap-2">
              {reading ? <><Spin />Reading…</> : "Read their message"}
            </button>
          </>
        ) : (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
            <div className="px-3 py-2.5 rounded-xl bg-secondary/60 border border-border">
              <p className="text-xs text-muted-foreground mb-1">Their message</p>
              <p className="text-xs text-white/80 leading-relaxed line-clamp-3">{message}</p>
            </div>

            <p className="text-xs font-bold text-white uppercase tracking-wider">What do you want to do?</p>

            <div className="space-y-2">
              {(OPTION_SETS[category] ?? OPTION_SETS.interested).map(opt => (
                <button key={opt} onClick={() => { setSelected(opt); setOutput(null); }}
                  className={`w-full text-left px-3.5 py-3 rounded-xl border transition-all ${selected === opt ? "border-primary/60 bg-primary/10" : "border-border hover:border-primary/30 hover:bg-secondary/40"}`}>
                  <p className={`text-xs font-semibold ${selected === opt ? "text-primary" : "text-white"}`}>{opt}</p>
                </button>
              ))}
            </div>

            <button onClick={generate} disabled={!selected || generating}
              className="w-full py-3 rounded-xl text-xs font-bold bg-primary hover:bg-primary/90 disabled:opacity-40 text-white transition-all flex items-center justify-center gap-2">
              {generating ? <><Spin />Writing…</> : <><Sparkles size={13} />✦ Write this message</>}
            </button>

            {error && <p className="text-xs text-red-400">{error}</p>}

            <AnimatePresence>
              {output && (
                <motion.div ref={outRef} key="replied-out" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                  <OutputBox text={output} />
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}
      </div>
      <MediaKitFooter />
    </div>
  );
}

// ── Negotiating Panel ─────────────────────────────────────────────────────────

const NEGOTIATE_OPTIONS = [
  { id: "counter"      as const, label: "They offered a number and I want to counter", needsInput: true  },
  { id: "deliverables" as const, label: "We are discussing deliverables",               needsInput: false },
  { id: "rate-range"   as const, label: "I want to send a rate range",                 needsInput: false },
  { id: "close"        as const, label: "I want to close the deal",                    needsInput: false },
];
type NegotiateOption = "counter" | "deliverables" | "rate-range" | "close";

function NegotiatingPanel({ deal }: { deal: Deal }) {
  const [selected, setSelected] = useState<NegotiateOption | null>(null);
  const [theirOffer, setOffer]  = useState(deal.id === "native-instruments" ? "$500" : "");
  const [generating, setGen]    = useState(false);
  const [output, setOutput]     = useState<string | null>(null);
  const [error, setError]       = useState<string | null>(null);
  const outRef = useRef<HTMLDivElement>(null);

  const needsInput = NEGOTIATE_OPTIONS.find(o => o.id === selected)?.needsInput ?? false;
  const canGenerate = selected !== null && (!needsInput || theirOffer.trim().length > 0);

  const generate = async () => {
    if (!canGenerate) return;
    setGen(true); setOutput(null); setError(null);
    try {
      let full = "";
      await readStream("/api/pipeline/negotiate", {
        brandName: deal.brand, contactFirstName: deal.contact.name.split(" ")[0],
        option: selected, theirOffer: needsInput ? theirOffer : undefined, niche: deal.niche,
      }, chunk => { full += chunk; setOutput(full); });
      setTimeout(() => outRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" }), 100);
    } catch { setError("Something went wrong. Please try again."); }
    finally { setGen(false); }
  };

  return (
    <div className="space-y-5">
      <div className="bg-card border border-border rounded-2xl p-5 space-y-4">
        <p className="text-xs font-bold text-white uppercase tracking-wider">Where are you?</p>

        <div className="space-y-2">
          {NEGOTIATE_OPTIONS.map(opt => (
            <button key={opt.id} onClick={() => { setSelected(opt.id); setOutput(null); }}
              className={`w-full text-left px-3.5 py-3.5 rounded-xl border transition-all ${selected === opt.id ? "border-primary/60 bg-primary/10" : "border-border hover:border-primary/30 hover:bg-secondary/40"}`}>
              <p className={`text-xs font-semibold ${selected === opt.id ? "text-primary" : "text-white"}`}>{opt.label}</p>
            </button>
          ))}
        </div>

        <AnimatePresence>
          {selected === "counter" && (
            <motion.div key="counter-in" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
              <Label>What did they offer?</Label>
              <input value={theirOffer} onChange={e => setOffer(e.target.value)} placeholder="e.g. $500"
                className="w-full px-3 py-2 rounded-xl bg-black/40 border border-border text-white text-xs placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary/60 transition-all" />
            </motion.div>
          )}
        </AnimatePresence>

        <button onClick={generate} disabled={!canGenerate || generating}
          className="w-full py-3 rounded-xl text-xs font-bold bg-primary hover:bg-primary/90 disabled:opacity-40 text-white transition-all flex items-center justify-center gap-2">
          {generating ? <><Spin />Writing…</> : <><Sparkles size={13} />✦ Write this message</>}
        </button>

        {error && <p className="text-xs text-red-400">{error}</p>}

        <AnimatePresence>
          {output && (
            <motion.div ref={outRef} key="neg-out" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              <OutputBox text={output} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      <MediaKitFooter />
    </div>
  );
}

// ── Closed Panel ──────────────────────────────────────────────────────────────

function ClosedPanel({ deal, info }: { deal: Deal; info: ClosedInfo }) {
  const rows = [
    { label: "Brand",    val: deal.brand },
    { label: "Contact",  val: `${deal.contact.name} · ${deal.contact.title}` },
    { label: "Outcome",  val: info.outcome === "signed" ? "Deal signed ✓" : "No deal" },
    ...(info.finalRate   ? [{ label: "Final rate", val: info.finalRate }] : []),
    { label: "Closed",   val: "Today" },
  ];
  return (
    <div className="space-y-5">
      <div className="bg-card border border-border rounded-2xl p-5 space-y-5">
        <p className="text-xs font-bold text-white uppercase tracking-wider">Deal Summary</p>
        <div className="space-y-3">
          {rows.map(row => (
            <div key={row.label} className="flex justify-between items-start gap-4">
              <span className="text-xs text-muted-foreground shrink-0">{row.label}</span>
              <span className="text-xs text-white text-right leading-relaxed">{row.val}</span>
            </div>
          ))}
        </div>
        <div className={`px-3 py-2.5 rounded-xl text-xs leading-relaxed ${info.outcome === "signed" ? "bg-emerald-500/10 border border-emerald-500/30 text-emerald-300" : "bg-secondary/60 border border-border text-muted-foreground"}`}>
          {info.outcome === "signed"
            ? "This brand has been added to your past partnerships."
            : info.revisit
              ? "Added to your revisit list for next quarter."
              : "No action needed — on to the next one."}
        </div>
      </div>
      <MediaKitFooter />
    </div>
  );
}

// ── Mark as Closed Modal ──────────────────────────────────────────────────────

function MarkClosedModal({ deal, onClose, onConfirm }: {
  deal: Deal;
  onClose: () => void;
  onConfirm: (info: ClosedInfo) => void;
}) {
  const [step, setStep]         = useState<"pick" | "signed" | "nodeal">("pick");
  const [finalRate, setFinalRate] = useState("");

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <motion.div initial={{ scale: 0.95, opacity: 0, y: 12 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.95, opacity: 0, y: 12 }}
        className="bg-card border border-border rounded-2xl p-6 w-full max-w-sm shadow-2xl">

        <div className="flex items-start justify-between mb-1">
          <p className="text-sm font-bold text-white">How did it go?</p>
          <button onClick={onClose} className="text-muted-foreground hover:text-white transition-colors -mt-0.5"><X size={16} /></button>
        </div>
        <p className="text-xs text-muted-foreground mb-5">{deal.brand} · {deal.contact.name}</p>

        {step === "pick" && (
          <div className="space-y-2">
            {[
              { id: "signed",   label: "Deal signed",    icon: "🎉", next: "signed"  },
              { id: "nodeal",   label: "No deal",         icon: "🚫", next: "nodeal"  },
              { id: "deciding", label: "Still deciding",  icon: "⏳", next: null       },
            ].map(opt => (
              <button key={opt.id}
                onClick={() => opt.next ? setStep(opt.next as "signed" | "nodeal") : onClose()}
                className="w-full text-left px-4 py-3.5 rounded-xl border border-border hover:border-primary/40 hover:bg-primary/10 transition-all flex items-center gap-3">
                <span className="text-base">{opt.icon}</span>
                <span className="text-sm font-semibold text-white">{opt.label}</span>
              </button>
            ))}
          </div>
        )}

        {step === "signed" && (
          <div className="space-y-4">
            <div>
              <Label>Final rate agreed (optional)</Label>
              <input value={finalRate} onChange={e => setFinalRate(e.target.value)} placeholder="e.g. $1,200"
                className="w-full px-3 py-2 rounded-xl bg-black/40 border border-border text-white text-xs placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary/60 transition-all" />
            </div>
            <div className="flex gap-2">
              <button onClick={() => setStep("pick")} className="flex-1 py-2.5 rounded-xl border border-border text-xs font-semibold text-muted-foreground hover:text-white transition-all">Back</button>
              <button onClick={() => onConfirm({ outcome: "signed", finalRate: finalRate.trim() || undefined })}
                className="flex-1 py-2.5 rounded-xl bg-primary text-white text-xs font-bold hover:bg-primary/90 transition-all">Confirm</button>
            </div>
          </div>
        )}

        {step === "nodeal" && (
          <div className="space-y-4">
            <p className="text-sm font-semibold text-white">Re-pitch next quarter?</p>
            <div className="flex gap-2">
              <button onClick={() => onConfirm({ outcome: "nodeal", revisit: false })}
                className="flex-1 py-2.5 rounded-xl border border-border text-xs font-semibold text-muted-foreground hover:text-white transition-all">No</button>
              <button onClick={() => onConfirm({ outcome: "nodeal", revisit: true })}
                className="flex-1 py-2.5 rounded-xl bg-secondary border border-border text-white text-xs font-bold hover:border-primary/40 transition-all">Yes</button>
            </div>
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}

// ── Deal Workspace ─────────────────────────────────────────────────────────────

function DealWorkspace({ deal, closedInfo, onMarkClosed, onClose }: {
  deal: Deal;
  closedInfo?: ClosedInfo;
  onMarkClosed: () => void;
  onClose: () => void;
}) {
  const [extraNotes, setExtraNotes] = useState<Array<{ date: string; text: string }>>([]);
  const addNote = (text: string) => setExtraNotes(n => [...n, { date: "Today", text }]);

  let RightPanel: React.ReactNode;
  if      (deal.stage === "closed")      RightPanel = <ClosedPanel deal={deal} info={closedInfo ?? { outcome: "nodeal" }} />;
  else if (deal.stage === "sent")        RightPanel = <SentPanel deal={deal} onFollowUpSent={() => addNote("Follow-up sent.")} />;
  else if (deal.stage === "replied")     RightPanel = <RepliedPanel deal={deal} onAddNote={addNote} />;
  else                                   RightPanel = <NegotiatingPanel deal={deal} />;

  const stageBadgeClass =
    deal.stage === "sent"        ? "bg-violet-500/15 text-violet-400"  :
    deal.stage === "replied"     ? "bg-sky-500/15 text-sky-400"        :
    deal.stage === "negotiating" ? "bg-amber-500/15 text-amber-400"    :
                                   "bg-emerald-500/15 text-emerald-400";

  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }}>
      <button onClick={onClose} className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-white transition-colors mb-6 group">
        <ArrowLeft size={14} className="group-hover:-translate-x-0.5 transition-transform" />Back to Pipeline
      </button>

      <div className="flex items-center gap-4 mb-8 pb-6 border-b border-border">
        <div className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0" style={{ background: `${deal.color}25` }}>
          <deal.Icon size={22} style={{ color: deal.color }} />
        </div>
        <div className="min-w-0">
          <h2 className="text-xl font-extrabold text-white">{deal.brand}</h2>
          <p className="text-sm text-muted-foreground truncate">{deal.contact.name} · {deal.contact.title} · {deal.contact.company}</p>
        </div>
        <div className="ml-auto flex items-center gap-3 shrink-0">
          <span className={`px-3 py-1.5 rounded-full text-xs font-bold ${stageBadgeClass}`}>
            {deal.stage.charAt(0).toUpperCase() + deal.stage.slice(1)}
          </span>
          {deal.stage !== "closed" && (
            <button onClick={onMarkClosed}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold border border-border text-muted-foreground hover:text-white hover:border-white/30 transition-all whitespace-nowrap">
              Mark as closed
            </button>
          )}
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

function DealCard({ deal, onExpand }: { deal: Deal; onExpand: () => void }) {
  const stageBadge = (
    { sent: { bg: "bg-violet-500/15", text: "text-violet-400" },
      replied: { bg: "bg-sky-500/15", text: "text-sky-400" },
      negotiating: { bg: "bg-amber-500/15", text: "text-amber-400" },
      closed: { bg: "bg-emerald-500/15", text: "text-emerald-400" } } as Record<string, { bg: string; text: string }>
  )[deal.stage] ?? { bg: "bg-zinc-500/15", text: "text-zinc-400" };

  const dirBadge = deal.direction === "inbound"
    ? { bg: "bg-teal-500/15", text: "text-teal-400", label: "Inbound"  }
    : { bg: "bg-zinc-500/15", text: "text-zinc-400",  label: "Outbound" };

  const btnCls = "shrink-0 px-3 py-1.5 rounded-lg text-xs font-bold border transition-all whitespace-nowrap";
  const ActionBtn = deal.stage === "closed"
    ? <button onClick={onExpand} className={`${btnCls} border-emerald-500/50 text-emerald-400 hover:bg-emerald-500/15`}>View summary →</button>
    : <button onClick={onExpand} className={`${btnCls} border-primary/50 text-primary hover:bg-primary hover:text-white`}>Open deal →</button>;

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
  const [stageOverrides, setStageOverrides] = useState<Record<string, Exclude<StageKey, "all">>>({});
  const [closedInfoMap,  setClosedInfoMap]  = useState<Record<string, ClosedInfo>>({});
  const [markingClosed,  setMarkingClosed]  = useState<string | null>(null);

  const effectiveDeals  = DEALS.map(d => stageOverrides[d.id] ? { ...d, stage: stageOverrides[d.id] as Deal["stage"] } : d);
  const filtered        = filter === "all" ? effectiveDeals : effectiveDeals.filter(d => d.stage === filter);
  const expandedDeal    = effectiveDeals.find(d => d.id === expandedId) ?? null;
  const markingDeal     = markingClosed ? effectiveDeals.find(d => d.id === markingClosed) : null;

  const handleClosed = (info: ClosedInfo) => {
    if (!markingClosed) return;
    setStageOverrides(p => ({ ...p, [markingClosed]: "closed" }));
    setClosedInfoMap(p  => ({ ...p, [markingClosed]: info }));
    setMarkingClosed(null);
  };

  return (
    <div className="min-h-screen bg-background text-foreground overflow-x-hidden">
      <Navbar />

      <main className="pt-28 pb-24 px-4">
        <div className="max-w-5xl mx-auto">

          {expandedDeal ? (
            <DealWorkspace
              deal={expandedDeal}
              closedInfo={closedInfoMap[expandedDeal.id]}
              onMarkClosed={() => setMarkingClosed(expandedDeal.id)}
              onClose={() => setExpandedId(null)}
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
                      {id === "all" ? effectiveDeals.length : effectiveDeals.filter(d => d.stage === id).length}
                    </span>
                  </button>
                ))}
              </motion.div>

              <div className="flex flex-col gap-3">
                <AnimatePresence>
                  {filtered.map(deal => (
                    <DealCard key={deal.id} deal={deal} onExpand={() => setExpandedId(deal.id)} />
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
        {markingDeal && (
          <MarkClosedModal
            deal={markingDeal}
            onClose={() => setMarkingClosed(null)}
            onConfirm={handleClosed}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
