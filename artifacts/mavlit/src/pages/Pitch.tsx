import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Link, useLocation, useSearch } from "wouter";
import {
  Sparkles, Copy, Check, ChevronDown, ChevronUp, AlertTriangle, Lightbulb,
  Headphones, Music, Cpu, Camera, ShoppingBag, Zap, User, ArrowRight,
  Building2, Users, Mail, CheckCircle2, AlertCircle,
} from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { useAuth } from "@workspace/replit-auth-web";

// ── Constants ─────────────────────────────────────────────────────────────────

const MATCHED_BRANDS = [
  { id: 1, name: "Sennheiser",          icon: Headphones,  color: "#7c3aed", category: "Audio"     },
  { id: 2, name: "Spotify for Artists", icon: Music,       color: "#1db954", category: "Streaming"  },
  { id: 3, name: "Native Instruments",  icon: Cpu,         color: "#f59e0b", category: "Software"   },
  { id: 4, name: "GoPro",               icon: Camera,      color: "#0ea5e9", category: "Lifestyle"  },
  { id: 5, name: "Sweetwater",          icon: ShoppingBag, color: "#ec4899", category: "Retail"     },
  { id: 6, name: "Red Bull",            icon: Zap,         color: "#ef4444", category: "Beverage"   },
];

const BRAND_CONTACTS: Record<string, { name: string; title: string; company: string; type: "agency"|"in-house"; email: string }> = {
  "Sennheiser":          { name: "Sarah Chen",     title: "Director of Influencer Marketing", company: "Edelman",             type: "agency",   email: "sarah.chen@edelman.com"   },
  "Spotify for Artists": { name: "Marcus Williams", title: "Creator Partnerships Manager",    company: "Spotify",             type: "in-house", email: "m.williams@spotify.com"   },
  "Native Instruments":  { name: "Priya Sharma",    title: "Account Supervisor",               company: "Fleischman Hillard",  type: "agency",   email: "p.sharma@fleishman.com"   },
  "GoPro":               { name: "Jake Torres",     title: "Influencer Marketing Manager",     company: "GoPro",               type: "in-house", email: "j.torres@gopro.com"       },
  "Sweetwater":          { name: "Dana Kim",        title: "Brand Partnerships Lead",          company: "Sweetwater",          type: "in-house", email: "d.kim@sweetwater.com"     },
  "Red Bull":            { name: "Alex Rivera",     title: "Account Manager",                  company: "Edelman",             type: "agency",   email: "a.rivera@edelman.com"     },
};

const NICHES    = ["Music Production","Music Performance","Audio Engineering","Gear Reviews","Lifestyle & Music","Electronic Music","Hip-Hop / Beats","Singer-Songwriter","Studio Vlogging","DJ / Live Sets","Music Education","Other"];
const PLATFORMS = ["Instagram","TikTok","YouTube","Substack"];
const CONTACT_METHODS = ["Email","Instagram DM","TikTok DM","LinkedIn","Other"];
const SENT_DEALS = [{ name: "Sennheiser", daysSince: 6 }];

const TIPS = [
  { title: "Story beats stats",           body: "Brands get hundreds of pitches with follower counts. A real story about why you use their product cuts through."       },
  { title: "No rates in the opener",      body: "The opener is to get a reply, not close a deal. Rates kill conversations before they start."                          },
  { title: "Make their job easy",         body: "Say exactly what you need from them. Vague asks = silence. Ask one specific question."                                },
  { title: "Email, not deck",             body: "A pitch deck is for when they ask. Leading with a deck before they're warm signals you don't know the game."          },
  { title: "Wrong person = wasted pitch", body: "Find the partnerships or creator marketing team — not PR, not general info@. LinkedIn is your friend."                },
  { title: "It's June — pitch for Q4",    body: "Brands plan campaigns 90 days out. Pitch now for Q4/Holiday campaigns while budgets are still being allocated."       },
];

// ── Types ──────────────────────────────────────────────────────────────────────

type Mode = "outbound" | "inbound" | "followup";

interface OutboundForm {
  brandSource: "matched" | "found";
  selectedBrand: string;
  customBrand: string;
  creatorName: string;
  handle: string;
  platform: string;
  followers: string;
  engagementRate: string;
  niche: string;
  story: string;
  pastDeals: string;
  contentLink: string;
}

interface InboundAnalysis {
  whatAsking: string;
  budget: "yes" | "no" | "vague";
  redFlags: string[];
}

const EMPTY_OUTBOUND: OutboundForm = {
  brandSource: "matched", selectedBrand: "", customBrand: "",
  creatorName: "", handle: "", platform: "Instagram",
  followers: "", engagementRate: "", niche: "Music Production",
  story: "", pastDeals: "", contentLink: "",
};

// ── Shared UI ──────────────────────────────────────────────────────────────────

function Label({ children }: { children: React.ReactNode }) {
  return <label className="block text-sm font-semibold text-white/80 mb-1.5">{children}</label>;
}

function Input({ value, onChange, placeholder, readOnly }: { value: string; onChange?: (v: string) => void; placeholder?: string; readOnly?: boolean }) {
  return (
    <input
      value={value}
      onChange={onChange ? e => onChange(e.target.value) : undefined}
      readOnly={readOnly}
      placeholder={placeholder}
      className={`w-full px-3.5 py-2.5 rounded-xl bg-black/40 border border-border text-white text-sm placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary/60 focus:ring-1 focus:ring-primary/30 transition-all ${readOnly ? "opacity-60 cursor-default" : ""}`}
    />
  );
}

function Select({ value, onChange, options }: { value: string; onChange: (v: string) => void; options: string[] }) {
  return (
    <div className="relative">
      <select value={value} onChange={e => onChange(e.target.value)}
        className="w-full px-3.5 py-2.5 rounded-xl bg-black/40 border border-border text-white text-sm appearance-none focus:outline-none focus:border-primary/60 focus:ring-1 focus:ring-primary/30 transition-all pr-9">
        {options.map(o => <option key={o} value={o}>{o}</option>)}
      </select>
      <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
    </div>
  );
}

function SelectPlaceholder({ value, onChange, options, placeholder }: { value: string; onChange: (v: string) => void; options: string[]; placeholder: string }) {
  return (
    <div className="relative">
      <select value={value} onChange={e => onChange(e.target.value)}
        className="w-full px-3.5 py-2.5 rounded-xl bg-black/40 border border-border text-sm appearance-none focus:outline-none focus:border-primary/60 focus:ring-1 focus:ring-primary/30 transition-all pr-9 text-white">
        <option value="" disabled className="text-muted-foreground">{placeholder}</option>
        {options.map(o => <option key={o} value={o}>{o}</option>)}
      </select>
      <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
    </div>
  );
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button onClick={() => { navigator.clipboard.writeText(text).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000); }); }}
      className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold border border-border text-muted-foreground hover:text-white hover:border-white/30 transition-all">
      {copied ? <Check size={11} className="text-emerald-400" /> : <Copy size={11} />}
      {copied ? "Copied!" : "Copy"}
    </button>
  );
}

function ContactTypeBadge({ type }: { type: "agency"|"in-house" }) {
  if (type === "agency") return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-primary/15 text-primary border border-primary/30">
      <Building2 size={10} />Agency-side
    </span>
  );
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
      <Users size={10} />In-house
    </span>
  );
}

async function readStream(endpoint: string, body: Record<string, unknown>, onChunk: (t: string) => void) {
  const res = await fetch(endpoint, { method: "POST", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  if (!res.ok) throw new Error("Server error");
  const reader = res.body?.getReader();
  if (!reader) throw new Error("No stream");
  const decoder = new TextDecoder();
  let buffer = "";
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";
    for (const line of lines) {
      if (!line.startsWith("data: ")) continue;
      try {
        const p = JSON.parse(line.slice(6));
        if (p.done) return;
        if (p.error) throw new Error(p.error);
        if (p.content) onChunk(p.content);
      } catch { /* skip bad frames */ }
    }
  }
}

// ── Outbound Mode ──────────────────────────────────────────────────────────────

function OutboundMode() {
  const [, setLocation] = useLocation();
  const search = useSearch();
  // Capture prefill brand once on mount (useState initializer runs once)
  const [prefillBrand] = useState(() => new URLSearchParams(search).get("brand") ?? "");
  const [form, setFormState] = useState<OutboundForm>(() => {
    if (prefillBrand && MATCHED_BRANDS.some(b => b.name === prefillBrand)) {
      return { ...EMPTY_OUTBOUND, brandSource: "matched", selectedBrand: prefillBrand };
    }
    return EMPTY_OUTBOUND;
  });
  const [generating, setGenerating] = useState(false);
  const [email, setEmail] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [hasCopied, setHasCopied] = useState(false);
  const [pitchLogged, setPitchLogged] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const emailRef = useRef<HTMLDivElement>(null);

  const set = <K extends keyof OutboundForm>(k: K, v: OutboundForm[K]) => setFormState(p => ({ ...p, [k]: v }));

  const brandName = form.brandSource === "matched" ? form.selectedBrand : form.customBrand;
  const activeContact = form.brandSource === "matched" && form.selectedBrand ? (BRAND_CONTACTS[form.selectedBrand] ?? null) : null;

  const canGenerate = brandName.trim() && form.creatorName.trim() && form.handle.trim() && form.followers.trim() && form.engagementRate.trim() && form.story.trim();

  const generate = async () => {
    if (!canGenerate) return;
    setGenerating(true); setEmail(null); setError(null); setHasCopied(false); setPitchLogged(false);
    try {
      let full = "";
      await readStream("/api/pitch/generate", {
        brandName, creatorName: form.creatorName, handle: form.handle, platform: form.platform,
        followers: form.followers, engagementRate: form.engagementRate, niche: form.niche,
        story: form.story, pastDeals: form.pastDeals, contentLink: form.contentLink,
        contactName: activeContact?.name, contactEmail: activeContact?.email,
      }, chunk => { full += chunk; setEmail(full); });
      setTimeout(() => emailRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 100);
    } catch { setError("Something went wrong generating your email. Please try again."); }
    finally { setGenerating(false); }
  };

  const copyEmail = () => {
    if (!email) return;
    navigator.clipboard.writeText(email).then(() => {
      setCopied(true); setHasCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const markSent = () => {
    setPitchLogged(true);
    setTimeout(() => setLocation("/deals"), 2000);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-8 items-start">
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.1 }} className="space-y-8">

        {/* Section 1 — Brand */}
        <div className="bg-card border border-border rounded-2xl p-6 space-y-5">
          <h2 className="text-lg font-bold text-white">1 — Which brand are you pitching?</h2>
          <div className="flex gap-3">
            {(["matched", "found"] as const).map(src => (
              <button key={src} onClick={() => set("brandSource", src)}
                className={`flex-1 py-2.5 rounded-xl text-sm font-semibold border transition-all ${form.brandSource === src ? "bg-primary border-primary text-white shadow-md shadow-primary/30" : "border-border text-muted-foreground hover:border-primary/40 hover:text-white"}`}>
                {src === "matched" ? "A brand MAVLIT matched me with" : "A brand I found myself"}
              </button>
            ))}
          </div>
          <AnimatePresence mode="wait">
            {form.brandSource === "matched" ? (
              <motion.div key="matched" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.25 }}>
                {prefillBrand && form.selectedBrand === prefillBrand && (
                  <div className="flex items-center gap-2 mb-3 px-3 py-2 rounded-xl bg-primary/10 border border-primary/25 text-xs font-semibold text-primary">
                    <CheckCircle2 size={12} />
                    Pre-filled from your matches — just add your story below
                  </div>
                )}
                <Label>Select a matched brand</Label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-2">
                  {MATCHED_BRANDS.map(b => {
                    const Icon = b.icon;
                    const selected = form.selectedBrand === b.name;
                    return (
                      <button key={b.id} onClick={() => set("selectedBrand", selected ? "" : b.name)}
                        className={`flex items-center gap-2.5 p-3 rounded-xl border text-left transition-all ${selected ? "border-primary bg-primary/10 text-white" : "border-border text-muted-foreground hover:border-primary/40 hover:text-white"}`}>
                        <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: `${b.color}30` }}>
                          <Icon size={15} style={{ color: b.color }} />
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-semibold truncate">{b.name}</p>
                          <p className="text-xs text-muted-foreground/70">{b.category}</p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </motion.div>
            ) : (
              <motion.div key="found" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.25 }}>
                <Label>Brand name</Label>
                <Input value={form.customBrand} onChange={v => set("customBrand", v)} placeholder="e.g. Focusrite, Rode, Ableton" />
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Section 2 — Creator profile */}
        <div className="bg-card border border-border rounded-2xl p-6 space-y-5">
          <h2 className="text-lg font-bold text-white">2 — Your creator profile</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div><Label>Your name</Label><Input value={form.creatorName} onChange={v => set("creatorName", v)} placeholder="Alex Rivera" /></div>
            <div><Label>Creator handle</Label><Input value={form.handle} onChange={v => set("handle", v)} placeholder="@alexproduces" /></div>
            <div><Label>Primary platform</Label><Select value={form.platform} onChange={v => set("platform", v)} options={PLATFORMS} /></div>
            <div><Label>Followers / subscribers</Label><Input value={form.followers} onChange={v => set("followers", v)} placeholder="52,000" /></div>
            <div><Label>Avg. engagement rate (%)</Label><Input value={form.engagementRate} onChange={v => set("engagementRate", v)} placeholder="5.8" /></div>
            <div><Label>Content niche</Label><Select value={form.niche} onChange={v => set("niche", v)} options={NICHES} /></div>
          </div>
          <div className="flex items-start justify-between gap-4 pt-1 px-4 py-3.5 rounded-xl bg-primary/5 border border-primary/20">
            <div className="flex items-start gap-3 min-w-0">
              <div className="w-7 h-7 rounded-lg bg-primary/15 flex items-center justify-center shrink-0 mt-0.5"><User size={13} className="text-primary" /></div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-white leading-snug mb-0.5">Music producer &amp; gear reviewer · 52K on Instagram</p>
                <p className="text-xs text-muted-foreground leading-relaxed">Keep your profile complete — MAVLIT uses your stats and story to generate the most accurate pitch possible.</p>
              </div>
            </div>
            <Link href="/profile" className="shrink-0 flex items-center gap-1 text-xs font-semibold text-primary hover:text-primary/80 transition-colors whitespace-nowrap pt-0.5">
              Update profile <ArrowRight size={11} />
            </Link>
          </div>
        </div>

        {/* Section 3 — Story */}
        <div className="bg-card border border-border rounded-2xl p-6 space-y-5">
          <h2 className="text-lg font-bold text-white">3 — Your story &amp; social proof</h2>
          <div>
            <Label>Your authentic connection to {brandName || "[brand]"} — the story</Label>
            <textarea value={form.story} onChange={e => set("story", e.target.value)} rows={4}
              placeholder={`e.g. I've used ${brandName || "[brand]"} gear since I was 16 learning in my bedroom studio. My audience of 18–34 producers knows I only mention what I actually use.`}
              className="w-full px-3.5 py-2.5 rounded-xl bg-black/40 border border-border text-white text-sm placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary/60 focus:ring-1 focus:ring-primary/30 transition-all resize-none" />
          </div>
          <div><Label>Past brand partnerships (optional)</Label><Input value={form.pastDeals} onChange={v => set("pastDeals", v)} placeholder="e.g. Focusrite, Splice, Roland — or leave blank if none yet" /></div>
          <div>
            <Label>Link to your most relevant content</Label>
            <Input value={form.contentLink} onChange={v => set("contentLink", v)} placeholder="https://instagram.com/p/your-best-post" />
            <p className="mt-1.5 text-xs text-muted-foreground/70 leading-relaxed">Link to content that shows your connection to this brand.</p>
          </div>
        </div>

        {/* Generate */}
        <button onClick={generate} disabled={!canGenerate || generating}
          className="w-full py-4 rounded-2xl text-base font-bold bg-primary hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed text-white shadow-lg shadow-primary/30 transition-all flex items-center justify-center gap-2">
          {generating ? (<><motion.div animate={{ rotate: 360 }} transition={{ duration: 1.2, repeat: Infinity, ease: "linear" }} className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full" />Generating your pitch email…</>) : (<><Sparkles size={16} />✦ Generate pitch email rough draft</>)}
        </button>

        {error && <div className="px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-sm">{error}</div>}

        {/* Email output */}
        <AnimatePresence>
          {email && (
            <motion.div ref={emailRef} key="email-output" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.4 }} className="space-y-4">
              {activeContact && (
                <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-card border border-border">
                  <Mail size={13} className="text-muted-foreground shrink-0" />
                  <span className="text-xs text-muted-foreground font-semibold mr-1">To:</span>
                  <span className="text-xs text-white font-mono flex-1 truncate">{activeContact.name} &lt;{activeContact.email}&gt;</span>
                  <CopyButton text={`${activeContact.name} <${activeContact.email}>`} />
                </div>
              )}
              <div className="relative bg-black/60 border border-border rounded-2xl p-5">
                <pre className="font-mono text-sm text-white/90 whitespace-pre-wrap leading-relaxed">{email}</pre>
                <button onClick={copyEmail}
                  className="absolute top-4 right-4 flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-card border border-border text-xs font-semibold text-muted-foreground hover:text-white hover:border-primary/50 transition-all">
                  {copied ? <Check size={12} className="text-green-400" /> : <Copy size={12} />}
                  {copied ? "Copied!" : "Copy"}
                </button>
              </div>

              <div className="flex items-start gap-3 px-4 py-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30">
                <AlertTriangle size={15} className="text-amber-400 mt-0.5 shrink-0" />
                <p className="text-sm text-amber-200/90 leading-relaxed">
                  <span className="font-bold text-amber-300">Before you send:</span> Do not mention rates. Get in the door first. When they respond, head to the{" "}
                  <Link href="/rate-calculator" className="underline underline-offset-2 text-amber-300 hover:text-amber-100 font-semibold">Deal Negotiator</Link>.
                </p>
              </div>

              {/* Mark as sent — appears after copying */}
              <AnimatePresence>
                {hasCopied && !pitchLogged && (
                  <motion.button initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                    onClick={markSent}
                    className="w-full py-3.5 rounded-2xl text-sm font-bold border border-primary/50 text-primary hover:bg-primary hover:text-white transition-all flex items-center justify-center gap-2">
                    <CheckCircle2 size={15} />
                    Mark pitch as sent →
                  </motion.button>
                )}
              </AnimatePresence>

              <AnimatePresence>
                {pitchLogged && (
                  <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                    className="flex items-start gap-3 px-4 py-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30">
                    <CheckCircle2 size={15} className="text-emerald-400 mt-0.5 shrink-0" />
                    <p className="text-sm text-emerald-300 leading-relaxed">Pitch logged. We'll remind you when your follow-up window opens in 5 days.</p>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Right sidebar */}
      <motion.aside initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.45, delay: 0.2 }} className="lg:sticky lg:top-24 space-y-4">
        <AnimatePresence>
          {activeContact && (
            <motion.div key="sending-to" initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.25 }}
              className="bg-card border border-border rounded-2xl p-5 space-y-3">
              <p className="text-xs font-bold text-white uppercase tracking-wider">Sending to</p>
              <div className="space-y-1">
                <p className="text-sm font-bold text-white">{activeContact.name}</p>
                <p className="text-xs text-muted-foreground">{activeContact.title}</p>
                <p className="text-xs text-muted-foreground">{activeContact.company}</p>
              </div>
              <ContactTypeBadge type={activeContact.type} />
              <div className="h-px bg-border" />
              <div>
                <p className="text-xs font-semibold text-muted-foreground mb-1.5">To:</p>
                <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-background border border-border">
                  <span className="text-xs text-white/80 font-mono flex-1 truncate">{activeContact.name} &lt;{activeContact.email}&gt;</span>
                  <CopyButton text={`${activeContact.name} <${activeContact.email}>`} />
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="bg-card border border-border rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <Lightbulb size={15} className="text-primary" />
            <span className="text-sm font-bold text-white uppercase tracking-wider">Pitch Tips</span>
          </div>
          <ul className="space-y-4">
            {TIPS.map((tip, i) => (
              <li key={i} className="flex flex-col gap-0.5">
                <span className="text-sm font-semibold text-white">{tip.title}</span>
                <span className="text-xs text-muted-foreground leading-relaxed">{tip.body}</span>
                {i < TIPS.length - 1 && <div className="mt-3 h-px bg-border/60" />}
              </li>
            ))}
          </ul>
        </div>
      </motion.aside>
    </div>
  );
}

// ── Inbound Mode ───────────────────────────────────────────────────────────────

function parseInbound(raw: string): { analysis: InboundAnalysis | null; email: string } {
  const sep = raw.indexOf("\n---\n");
  if (sep === -1) return { analysis: null, email: raw };
  const head = raw.slice(0, sep);
  const body = raw.slice(sep + 5).trim();
  const whatMatch  = head.match(/^WHAT_ASKING:\s*(.+)$/m);
  const budgetMatch = head.match(/^BUDGET:\s*(yes|no|vague)/im);
  const flagsMatch  = head.match(/^RED_FLAGS:\s*(.+)$/m);
  const flagsRaw = flagsMatch?.[1]?.trim() ?? "None";
  return {
    analysis: {
      whatAsking: whatMatch?.[1]?.trim() ?? "",
      budget: (budgetMatch?.[1]?.toLowerCase() ?? "vague") as "yes" | "no" | "vague",
      redFlags: flagsRaw.toLowerCase() === "none" ? [] : flagsRaw.split(",").map(s => s.trim()).filter(Boolean),
    },
    email: body,
  };
}

function InboundMode() {
  const [, setLocation] = useLocation();
  const [brandName, setBrandName] = useState("");
  const [contactMethod, setContactMethod] = useState("");
  const [message, setMessage] = useState("");
  const [profileOpen, setProfileOpen] = useState(false);
  const [creatorName, setCreatorName] = useState("");
  const [handle, setHandle] = useState("");
  const [followers, setFollowers] = useState("");
  const [engagementRate, setEngagementRate] = useState("");
  const [platform, setPlatform] = useState("Instagram");
  const [niche, setNiche] = useState("Music Production");
  const [generating, setGenerating] = useState(false);
  const [rawResult, setRawResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [marked, setMarked] = useState(false);
  const outputRef = useRef<HTMLDivElement>(null);

  const canGenerate = brandName.trim() && contactMethod && message.trim();

  const generate = async () => {
    if (!canGenerate) return;
    setGenerating(true); setRawResult(null); setError(null); setMarked(false);
    try {
      let full = "";
      await readStream("/api/pitch/inbound", {
        brandName, contactMethod, message,
        ...(profileOpen ? { creatorName, handle, followers, engagementRate, platform, niche } : {}),
      }, chunk => { full += chunk; setRawResult(full); });
      setTimeout(() => outputRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 100);
    } catch { setError("Something went wrong. Please try again."); }
    finally { setGenerating(false); }
  };

  const parsed = rawResult ? parseInbound(rawResult) : null;
  const showOutput = parsed && parsed.email.length > 10;

  const markReplied = () => {
    setMarked(true);
    setTimeout(() => setLocation("/deals"), 2000);
  };

  return (
    <motion.div key="inbound" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.35 }}
      className="max-w-2xl mx-auto space-y-6">

      {/* Purple tip */}
      <div className="flex items-start gap-3 px-4 py-4 rounded-xl bg-primary/10 border border-primary/30">
        <Sparkles size={15} className="text-primary mt-0.5 shrink-0" />
        <p className="text-sm text-white/90 leading-relaxed">
          <span className="font-bold text-white">When a brand contacts you first, you have leverage.</span> They already want to work with you. Do not give your rate in your first reply. Ask what they have in mind before you name a number.
        </p>
      </div>

      {/* Section 1 — About the brand */}
      <div className="bg-card border border-border rounded-2xl p-6 space-y-4">
        <h2 className="text-lg font-bold text-white">1 — About the brand</h2>
        <div><Label>Brand name</Label><Input value={brandName} onChange={setBrandName} placeholder="e.g. Red Bull" /></div>
        <div>
          <Label>How did they contact you?</Label>
          <SelectPlaceholder value={contactMethod} onChange={setContactMethod} options={CONTACT_METHODS} placeholder="Select a channel…" />
        </div>
      </div>

      {/* Section 2 — Their message */}
      <div className="bg-card border border-border rounded-2xl p-6 space-y-4">
        <h2 className="text-lg font-bold text-white">2 — Their message</h2>
        <div>
          <Label>Paste their message here</Label>
          <textarea value={message} onChange={e => setMessage(e.target.value)} rows={5}
            placeholder="Paste exactly what they sent you."
            className="w-full px-3.5 py-2.5 rounded-xl bg-black/40 border border-border text-white text-sm placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary/60 focus:ring-1 focus:ring-primary/30 transition-all resize-none" />
        </div>
      </div>

      {/* Section 3 — Your profile (collapsible) */}
      <div className="bg-card border border-border rounded-2xl overflow-hidden">
        <button onClick={() => setProfileOpen(o => !o)}
          className="w-full flex items-center justify-between px-6 py-4 text-left hover:bg-secondary/40 transition-colors">
          <div>
            <p className="text-sm font-bold text-white">3 — Your profile <span className="text-muted-foreground font-normal">(optional)</span></p>
            <p className="text-xs text-muted-foreground mt-0.5">Helps MAVLIT personalise your response</p>
          </div>
          {profileOpen ? <ChevronUp size={16} className="text-muted-foreground" /> : <ChevronDown size={16} className="text-muted-foreground" />}
        </button>
        <AnimatePresence>
          {profileOpen && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.25 }}
              className="overflow-hidden">
              <div className="px-6 pb-6 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div><Label>Your name</Label><Input value={creatorName} onChange={setCreatorName} placeholder="Alex Rivera" /></div>
                  <div><Label>Handle</Label><Input value={handle} onChange={setHandle} placeholder="@alexproduces" /></div>
                  <div><Label>Followers</Label><Input value={followers} onChange={setFollowers} placeholder="52,000" /></div>
                  <div><Label>Engagement rate (%)</Label><Input value={engagementRate} onChange={setEngagementRate} placeholder="5.8" /></div>
                  <div><Label>Platform</Label><Select value={platform} onChange={setPlatform} options={PLATFORMS} /></div>
                  <div><Label>Niche</Label><Select value={niche} onChange={setNiche} options={NICHES} /></div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Generate */}
      <button onClick={generate} disabled={!canGenerate || generating}
        className="w-full py-4 rounded-2xl text-base font-bold bg-primary hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed text-white shadow-lg shadow-primary/30 transition-all flex items-center justify-center gap-2">
        {generating ? (<><motion.div animate={{ rotate: 360 }} transition={{ duration: 1.2, repeat: Infinity, ease: "linear" }} className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full" />Analyzing message…</>) : (<><Sparkles size={16} />✦ Analyze message and generate response</>)}
      </button>

      {error && <div className="px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-sm">{error}</div>}

      {/* Output */}
      <AnimatePresence>
        {parsed && (
          <motion.div ref={outputRef} key="inbound-output" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.4 }} className="space-y-4">

            {/* Analysis card */}
            {parsed.analysis && (
              <div className="bg-card border border-border rounded-2xl p-5 space-y-3">
                <p className="text-xs font-bold text-white uppercase tracking-wider">Message analysis</p>
                <div className="space-y-2.5">
                  <div className="flex items-start gap-2">
                    <span className="text-xs font-semibold text-muted-foreground w-28 shrink-0 pt-0.5">What they want</span>
                    <span className="text-sm text-white leading-snug">{parsed.analysis.whatAsking}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-muted-foreground w-28 shrink-0">Budget mentioned</span>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                      parsed.analysis.budget === "yes" ? "bg-emerald-500/15 text-emerald-400" :
                      parsed.analysis.budget === "vague" ? "bg-amber-500/15 text-amber-400" :
                      "bg-red-500/15 text-red-400"
                    }`}>
                      {parsed.analysis.budget === "yes" ? "Yes" : parsed.analysis.budget === "vague" ? "Vague" : "Not mentioned"}
                    </span>
                  </div>
                  {parsed.analysis.redFlags.length > 0 && (
                    <div className="flex items-start gap-2">
                      <span className="text-xs font-semibold text-muted-foreground w-28 shrink-0 pt-0.5">Red flags</span>
                      <div className="flex flex-wrap gap-1.5">
                        {parsed.analysis.redFlags.map((f, i) => (
                          <span key={i} className="flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-orange-500/15 text-orange-400 border border-orange-500/20">
                            <AlertCircle size={10} />{f}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Generated response */}
            {showOutput && (
              <>
                <div className="relative bg-black/60 border border-border rounded-2xl p-5">
                  <pre className="font-mono text-sm text-white/90 whitespace-pre-wrap leading-relaxed">{parsed.email}</pre>
                  <div className="absolute top-4 right-4"><CopyButton text={parsed.email} /></div>
                </div>

                {!marked ? (
                  <button onClick={markReplied}
                    className="w-full py-3.5 rounded-2xl text-sm font-bold border border-primary/50 text-primary hover:bg-primary hover:text-white transition-all flex items-center justify-center gap-2">
                    <CheckCircle2 size={15} />
                    Mark as replied and add to pipeline →
                  </button>
                ) : (
                  <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                    className="flex items-start gap-3 px-4 py-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30">
                    <CheckCircle2 size={15} className="text-emerald-400 mt-0.5 shrink-0" />
                    <p className="text-sm text-emerald-300 leading-relaxed">Deal added to your Pipeline. Track it from your Dashboard.</p>
                  </motion.div>
                )}
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ── Follow-up Mode ─────────────────────────────────────────────────────────────

function FollowUpMode() {
  const search = useSearch();
  const [selectedDeal, setSelectedDeal] = useState(() => {
    const brand = new URLSearchParams(search).get("brand") ?? "";
    return SENT_DEALS.find(d => d.name === brand) ?? SENT_DEALS[0];
  });
  const [generating, setGenerating] = useState(false);
  const [email, setEmail] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const outputRef = useRef<HTMLDivElement>(null);

  const generate = async () => {
    setGenerating(true); setEmail(null); setError(null);
    try {
      let full = "";
      await readStream("/api/pitch/followup", { brandName: selectedDeal.name, daysSince: selectedDeal.daysSince },
        chunk => { full += chunk; setEmail(full); });
      setTimeout(() => outputRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 100);
    } catch { setError("Something went wrong. Please try again."); }
    finally { setGenerating(false); }
  };

  return (
    <motion.div key="followup" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.35 }}
      className="max-w-2xl mx-auto space-y-6">

      <div className="bg-card border border-border rounded-2xl p-6 space-y-4">
        <div>
          <Label>Which brand are you following up with?</Label>
          <SelectPlaceholder value={selectedDeal.name} onChange={v => setSelectedDeal(SENT_DEALS.find(d => d.name === v) ?? SENT_DEALS[0])}
            options={SENT_DEALS.map(d => d.name)} placeholder="Select a brand…" />
        </div>
        <div>
          <Label>Pitch sent</Label>
          <Input value={`${selectedDeal.daysSince} days ago`} readOnly />
        </div>
      </div>

      {/* Yellow tip */}
      <div className="flex items-start gap-3 px-4 py-4 rounded-xl bg-amber-500/10 border border-amber-500/30">
        <AlertTriangle size={15} className="text-amber-400 mt-0.5 shrink-0" />
        <p className="text-sm text-amber-200/90 leading-relaxed">
          <span className="font-bold text-amber-300">Send one follow-up only.</span> Keep it short. Add one new piece of value. Do not mention rates.
        </p>
      </div>

      <button onClick={generate} disabled={generating}
        className="w-full py-4 rounded-2xl text-base font-bold bg-primary hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed text-white shadow-lg shadow-primary/30 transition-all flex items-center justify-center gap-2">
        {generating ? (<><motion.div animate={{ rotate: 360 }} transition={{ duration: 1.2, repeat: Infinity, ease: "linear" }} className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full" />Generating follow-up…</>) : (<><Sparkles size={16} />✦ Generate follow-up email</>)}
      </button>

      {error && <div className="px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-sm">{error}</div>}

      <AnimatePresence>
        {email && (
          <motion.div ref={outputRef} key="followup-output" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.4 }} className="space-y-4">
            <div className="relative bg-black/60 border border-border rounded-2xl p-5">
              <pre className="font-mono text-sm text-white/90 whitespace-pre-wrap leading-relaxed">{email}</pre>
              <div className="absolute top-4 right-4"><CopyButton text={email} /></div>
            </div>
            <div className="flex items-start gap-3 px-4 py-3.5 rounded-xl bg-secondary border border-border">
              <Lightbulb size={15} className="text-primary mt-0.5 shrink-0" />
              <p className="text-sm text-muted-foreground leading-relaxed">After sending, give it <span className="text-white font-semibold">2 more weeks</span>. If no reply, move this brand to your long-term pipeline and revisit next quarter.</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────────

const MODE_LABELS: { id: Mode; label: string }[] = [
  { id: "outbound", label: "Outbound" },
  { id: "inbound",  label: "Inbound"  },
  { id: "followup", label: "Follow-up" },
];

export default function Pitch() {
  const search = useSearch();
  const [mode, setMode] = useState<Mode>(() => {
    const m = new URLSearchParams(search).get("mode");
    if (m === "inbound")  return "inbound";
    if (m === "followup") return "followup";
    return "outbound";
  });

  const subtitles: Record<Mode, string> = {
    outbound: "Build your outreach email to a brand. Keep it casual, personal, and story-driven. No rates. No deck.",
    inbound:  "A brand reached out to you. Paste their message below and MAVLIT will help you respond — without giving away your rate.",
    followup: "Send a short, value-adding follow-up to a brand you already pitched.",
  };

  if (!isLoading && !isAuthenticated) {
    return (
      <div className="min-h-screen bg-background text-foreground overflow-x-hidden">
        <Navbar />
        <main className="pt-28 pb-24 px-4 flex items-center justify-center">
          <div className="text-center space-y-4 max-w-sm">
            <h2 className="text-2xl font-bold text-white">Sign in to use Pitch</h2>
            <p className="text-muted-foreground text-sm">You need to be signed in to generate pitch emails.</p>
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
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} className="mb-8">
            <h1 className="text-4xl font-extrabold text-white tracking-tight mb-2">Pitch</h1>
            <p className="text-muted-foreground text-base max-w-xl">{subtitles[mode]}</p>
          </motion.div>

          {/* Mode toggle */}
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, delay: 0.06 }}
            className="flex gap-2 mb-10 p-1 bg-card border border-border rounded-2xl w-fit">
            {MODE_LABELS.map(({ id, label }) => (
              <button key={id} onClick={() => setMode(id)}
                className={`px-5 py-2 rounded-xl text-sm font-bold transition-all ${mode === id ? "bg-primary text-white shadow-md shadow-primary/30" : "text-muted-foreground hover:text-white"}`}>
                {label}
              </button>
            ))}
          </motion.div>

          {/* Mode content */}
          <AnimatePresence mode="wait">
            {mode === "outbound" && <OutboundMode key="outbound" />}
            {mode === "inbound"  && <InboundMode  key="inbound"  />}
            {mode === "followup" && <FollowUpMode  key="followup" />}
          </AnimatePresence>

        </div>
      </main>

      <Footer />
    </div>
  );
}
