import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Link } from "wouter";
import {
  Sparkles, Copy, Check, ChevronDown, AlertTriangle, Lightbulb,
  Headphones, Music, Cpu, Camera, ShoppingBag, Zap, User, ArrowRight,
  Building2, Users, Mail,
} from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

const MATCHED_BRANDS = [
  { id: 1, name: "Sennheiser",          icon: Headphones, color: "#7c3aed", category: "Audio"     },
  { id: 2, name: "Spotify for Artists", icon: Music,      color: "#1db954", category: "Streaming"  },
  { id: 3, name: "Native Instruments",  icon: Cpu,        color: "#f59e0b", category: "Software"   },
  { id: 4, name: "GoPro",               icon: Camera,     color: "#0ea5e9", category: "Lifestyle"  },
  { id: 5, name: "Sweetwater",          icon: ShoppingBag,color: "#ec4899", category: "Retail"     },
  { id: 6, name: "Red Bull",            icon: Zap,        color: "#ef4444", category: "Beverage"   },
];

type ContactType = "agency" | "in-house";

interface BrandContact {
  name: string;
  title: string;
  company: string;
  type: ContactType;
  email: string;
}

const BRAND_CONTACTS: Record<string, BrandContact> = {
  "Sennheiser": {
    name: "Sarah Chen",
    title: "Director of Influencer Marketing",
    company: "Edelman",
    type: "agency",
    email: "sarah.chen@edelman.com",
  },
  "Spotify for Artists": {
    name: "Marcus Williams",
    title: "Creator Partnerships Manager",
    company: "Spotify",
    type: "in-house",
    email: "m.williams@spotify.com",
  },
  "Native Instruments": {
    name: "Priya Sharma",
    title: "Account Supervisor",
    company: "Fleischman Hillard",
    type: "agency",
    email: "p.sharma@fleishman.com",
  },
  "GoPro": {
    name: "Jake Torres",
    title: "Influencer Marketing Manager",
    company: "GoPro",
    type: "in-house",
    email: "j.torres@gopro.com",
  },
  "Sweetwater": {
    name: "Dana Kim",
    title: "Brand Partnerships Lead",
    company: "Sweetwater",
    type: "in-house",
    email: "d.kim@sweetwater.com",
  },
  "Red Bull": {
    name: "Alex Rivera",
    title: "Account Manager",
    company: "Edelman",
    type: "agency",
    email: "a.rivera@edelman.com",
  },
};

const NICHES = [
  "Music Production", "Music Performance", "Audio Engineering", "Gear Reviews",
  "Lifestyle & Music", "Electronic Music", "Hip-Hop / Beats", "Singer-Songwriter",
  "Studio Vlogging", "DJ / Live Sets", "Music Education", "Other",
];

const PLATFORMS = ["Instagram", "TikTok", "YouTube", "Substack"];

const TIPS = [
  { title: "Story beats stats",        body: "Brands get hundreds of pitches with follower counts. A real story about why you use their product cuts through."  },
  { title: "No rates in the opener",   body: "The opener is to get a reply, not close a deal. Rates kill conversations before they start."                      },
  { title: "Make their job easy",      body: "Say exactly what you need from them. Vague asks = silence. Ask one specific question."                             },
  { title: "Email, not deck",          body: "A pitch deck is for when they ask. Leading with a deck before they're warm signals you don't know the game."       },
  { title: "Wrong person = wasted pitch", body: "Find the partnerships or creator marketing team — not PR, not general info@. LinkedIn is your friend."         },
  { title: "It's June — pitch for Q4", body: "Brands plan campaigns 90 days out. Pitch now for Q4/Holiday campaigns while budgets are still being allocated."   },
];

interface FormState {
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

const EMPTY: FormState = {
  brandSource: "matched",
  selectedBrand: "",
  customBrand: "",
  creatorName: "",
  handle: "",
  platform: "Instagram",
  followers: "",
  engagementRate: "",
  niche: "Music Production",
  story: "",
  pastDeals: "",
  contentLink: "",
};

function Label({ children }: { children: React.ReactNode }) {
  return <label className="block text-sm font-semibold text-white/80 mb-1.5">{children}</label>;
}

function Input({ value, onChange, placeholder, className = "" }: {
  value: string; onChange: (v: string) => void; placeholder?: string; className?: string;
}) {
  return (
    <input
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      className={`w-full px-3.5 py-2.5 rounded-xl bg-black/40 border border-border text-white text-sm placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary/60 focus:ring-1 focus:ring-primary/30 transition-all ${className}`}
    />
  );
}

function Select({ value, onChange, options }: {
  value: string; onChange: (v: string) => void; options: string[];
}) {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        className="w-full px-3.5 py-2.5 rounded-xl bg-black/40 border border-border text-white text-sm appearance-none focus:outline-none focus:border-primary/60 focus:ring-1 focus:ring-primary/30 transition-all pr-9"
      >
        {options.map(o => <option key={o} value={o}>{o}</option>)}
      </select>
      <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
    </div>
  );
}

function ContactTypeBadge({ type }: { type: ContactType }) {
  if (type === "agency") {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-primary/15 text-primary border border-primary/30">
        <Building2 size={10} />
        Agency-side
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
      <Users size={10} />
      In-house
    </span>
  );
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const handle = () => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };
  return (
    <button
      onClick={handle}
      className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold border border-border text-muted-foreground hover:text-white hover:border-white/30 transition-all duration-200"
    >
      {copied ? <Check size={11} className="text-emerald-400" /> : <Copy size={11} />}
      {copied ? "Copied!" : "Copy"}
    </button>
  );
}

export default function Pitch() {
  const [form, setForm] = useState<FormState>(() => {
    const params = new URLSearchParams(window.location.search);
    const brand = params.get("brand");
    if (brand && MATCHED_BRANDS.some(b => b.name === brand)) {
      return { ...EMPTY, brandSource: "matched", selectedBrand: brand };
    }
    return EMPTY;
  });
  const [generating, setGenerating] = useState(false);
  const [email, setEmail] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const emailRef = useRef<HTMLDivElement>(null);

  const set = <K extends keyof FormState>(key: K, val: FormState[K]) =>
    setForm(prev => ({ ...prev, [key]: val }));

  const brandName =
    form.brandSource === "matched" ? form.selectedBrand : form.customBrand;

  const activeContact: BrandContact | null =
    form.brandSource === "matched" && form.selectedBrand
      ? (BRAND_CONTACTS[form.selectedBrand] ?? null)
      : null;

  const canGenerate =
    brandName.trim() &&
    form.creatorName.trim() &&
    form.handle.trim() &&
    form.followers.trim() &&
    form.engagementRate.trim() &&
    form.story.trim();

  const generate = async () => {
    if (!canGenerate) return;
    setGenerating(true);
    setEmail(null);
    setError(null);

    try {
      const res = await fetch("/api/pitch/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          brandName,
          creatorName: form.creatorName,
          handle: form.handle,
          platform: form.platform,
          followers: form.followers,
          engagementRate: form.engagementRate,
          niche: form.niche,
          story: form.story,
          pastDeals: form.pastDeals,
          contentLink: form.contentLink,
          contactName: activeContact?.name ?? undefined,
          contactEmail: activeContact?.email ?? undefined,
        }),
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
            if (parsed.content) {
              full += parsed.content;
              setEmail(full);
            }
          } catch {}
        }
      }

      setTimeout(() => emailRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 100);
    } catch {
      setError("Something went wrong generating your email. Please try again.");
    } finally {
      setGenerating(false);
    }
  };

  const copyEmail = async () => {
    if (!email) return;
    await navigator.clipboard.writeText(email);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen bg-background text-foreground overflow-x-hidden">
      <Navbar />

      <main className="pt-28 pb-24 px-4">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} className="mb-10">
            <h1 className="text-4xl font-extrabold text-white tracking-tight mb-2">Pitch</h1>
            <p className="text-muted-foreground text-base max-w-xl">
              Build your outreach email to a brand. Keep it casual, personal, and story-driven. No rates. No deck.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-8 items-start">
            {/* Left: Form */}
            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.1 }} className="space-y-8">

              {/* Section 1 — Brand */}
              <div className="bg-card border border-border rounded-2xl p-6 space-y-5">
                <h2 className="text-lg font-bold text-white">1 — Which brand are you pitching?</h2>

                <div className="flex gap-3">
                  {(["matched", "found"] as const).map(src => (
                    <button
                      key={src}
                      onClick={() => set("brandSource", src)}
                      className={`flex-1 py-2.5 rounded-xl text-sm font-semibold border transition-all ${
                        form.brandSource === src
                          ? "bg-primary border-primary text-white shadow-md shadow-primary/30"
                          : "border-border text-muted-foreground hover:border-primary/40 hover:text-white"
                      }`}
                    >
                      {src === "matched" ? "A brand MAVLIT matched me with" : "A brand I found myself"}
                    </button>
                  ))}
                </div>

                <AnimatePresence mode="wait">
                  {form.brandSource === "matched" ? (
                    <motion.div key="matched" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.25 }}>
                      <Label>Select a matched brand</Label>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-2">
                        {MATCHED_BRANDS.map(b => {
                          const Icon = b.icon;
                          const selected = form.selectedBrand === b.name;
                          return (
                            <button
                              key={b.id}
                              onClick={() => set("selectedBrand", selected ? "" : b.name)}
                              className={`flex items-center gap-2.5 p-3 rounded-xl border text-left transition-all ${
                                selected
                                  ? "border-primary bg-primary/10 text-white"
                                  : "border-border text-muted-foreground hover:border-primary/40 hover:text-white"
                              }`}
                            >
                              <div
                                className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                                style={{ background: `${b.color}30` }}
                              >
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
                  <div>
                    <Label>Your name</Label>
                    <Input value={form.creatorName} onChange={v => set("creatorName", v)} placeholder="Alex Rivera" />
                  </div>
                  <div>
                    <Label>Creator handle</Label>
                    <Input value={form.handle} onChange={v => set("handle", v)} placeholder="@alexproduces" />
                  </div>
                  <div>
                    <Label>Primary platform</Label>
                    <Select value={form.platform} onChange={v => set("platform", v)} options={PLATFORMS} />
                  </div>
                  <div>
                    <Label>Followers / subscribers</Label>
                    <Input value={form.followers} onChange={v => set("followers", v)} placeholder="52,000" />
                  </div>
                  <div>
                    <Label>Avg. engagement rate (%)</Label>
                    <Input value={form.engagementRate} onChange={v => set("engagementRate", v)} placeholder="5.8" />
                  </div>
                  <div>
                    <Label>Content niche</Label>
                    <Select value={form.niche} onChange={v => set("niche", v)} options={NICHES} />
                  </div>
                </div>

                {/* Profile prompt */}
                <div className="flex items-start justify-between gap-4 pt-1 px-4 py-3.5 rounded-xl bg-primary/5 border border-primary/20">
                  <div className="flex items-start gap-3 min-w-0">
                    <div className="w-7 h-7 rounded-lg bg-primary/15 flex items-center justify-center shrink-0 mt-0.5">
                      <User size={13} className="text-primary" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-white leading-snug mb-0.5">Music producer &amp; gear reviewer · 52K on Instagram</p>
                      <p className="text-xs text-muted-foreground leading-relaxed">Keep your profile complete and up to date — MAVLIT uses your stats and story to generate the most accurate pitch possible.</p>
                    </div>
                  </div>
                  <Link href="/profile" className="shrink-0 flex items-center gap-1 text-xs font-semibold text-primary hover:text-primary/80 transition-colors whitespace-nowrap pt-0.5">
                    Update profile <ArrowRight size={11} />
                  </Link>
                </div>
              </div>

              {/* Section 3 — Story & social proof */}
              <div className="bg-card border border-border rounded-2xl p-6 space-y-5">
                <h2 className="text-lg font-bold text-white">3 — Your story & social proof</h2>

                <div>
                  <Label>
                    Your authentic connection to {brandName || "[brand]"} — the story
                  </Label>
                  <textarea
                    value={form.story}
                    onChange={e => set("story", e.target.value)}
                    rows={4}
                    placeholder={`e.g. I've used ${brandName || "[brand]"} gear since I was 16 learning in my bedroom studio. My audience of 18–34 producers knows I only mention what I actually use.`}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-black/40 border border-border text-white text-sm placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary/60 focus:ring-1 focus:ring-primary/30 transition-all resize-none"
                  />
                </div>

                <div>
                  <Label>Past brand partnerships (optional)</Label>
                  <Input
                    value={form.pastDeals}
                    onChange={v => set("pastDeals", v)}
                    placeholder="e.g. Focusrite, Splice, Roland — or leave blank if none yet"
                  />
                </div>

                <div>
                  <Label>Link to your most relevant content</Label>
                  <Input
                    value={form.contentLink}
                    onChange={v => set("contentLink", v)}
                    placeholder="https://instagram.com/p/your-best-post"
                  />
                  <p className="mt-1.5 text-xs text-muted-foreground/70 leading-relaxed">
                    Link to content that shows your connection to this brand. Saves, comments, and DMs are data brands can't see publicly — link to content that shows real engagement.
                  </p>
                </div>
              </div>

              {/* Generate button */}
              <button
                onClick={generate}
                disabled={!canGenerate || generating}
                className="w-full py-4 rounded-2xl text-base font-bold bg-primary hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed text-white shadow-lg shadow-primary/30 transition-all flex items-center justify-center gap-2"
              >
                {generating ? (
                  <>
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1.2, repeat: Infinity, ease: "linear" }}
                      className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full"
                    />
                    Generating your pitch email…
                  </>
                ) : (
                  <>
                    <Sparkles size={16} />
                    ✦ Generate pitch email rough draft
                  </>
                )}
              </button>

              {/* Error */}
              {error && (
                <div className="px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
                  {error}
                </div>
              )}

              {/* Generated email */}
              <AnimatePresence>
                {email && (
                  <motion.div
                    ref={emailRef}
                    key="email-output"
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.4 }}
                    className="space-y-4"
                  >
                    {/* To: header when contact is known */}
                    {activeContact && (
                      <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-card border border-border">
                        <Mail size={13} className="text-muted-foreground shrink-0" />
                        <span className="text-xs text-muted-foreground font-semibold mr-1">To:</span>
                        <span className="text-xs text-white font-mono flex-1 truncate">
                          {activeContact.name} &lt;{activeContact.email}&gt;
                        </span>
                        <CopyButton text={`${activeContact.name} <${activeContact.email}>`} />
                      </div>
                    )}

                    <div className="relative bg-black/60 border border-border rounded-2xl p-5">
                      <pre className="font-mono text-sm text-white/90 whitespace-pre-wrap leading-relaxed">{email}</pre>
                      <button
                        onClick={copyEmail}
                        className="absolute top-4 right-4 flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-card border border-border text-xs font-semibold text-muted-foreground hover:text-white hover:border-primary/50 transition-all"
                      >
                        {copied ? <Check size={12} className="text-green-400" /> : <Copy size={12} />}
                        {copied ? "Copied!" : "Copy"}
                      </button>
                    </div>

                    {/* Warning */}
                    <div className="flex items-start gap-3 px-4 py-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30">
                      <AlertTriangle size={15} className="text-amber-400 mt-0.5 shrink-0" />
                      <p className="text-sm text-amber-200/90 leading-relaxed">
                        <span className="font-bold text-amber-300">Before you send:</span> Do not mention rates. Get in the door first. When they respond, head to the{" "}
                        <Link href="/rate-calculator" className="underline underline-offset-2 text-amber-300 hover:text-amber-100 font-semibold">
                          Deal Negotiator
                        </Link>.
                      </p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>

            {/* Right: Sidebar */}
            <motion.aside
              initial={{ opacity: 0, x: 16 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.45, delay: 0.2 }}
              className="lg:sticky lg:top-24 space-y-4"
            >
              {/* Sending to — shown when a matched brand with known contact is selected */}
              <AnimatePresence>
                {activeContact && (
                  <motion.div
                    key="sending-to"
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.25 }}
                    className="bg-card border border-border rounded-2xl p-5 space-y-3"
                  >
                    <p className="text-xs font-bold text-white uppercase tracking-wider">Sending to</p>

                    <div className="space-y-1">
                      <p className="text-sm font-bold text-white leading-snug">{activeContact.name}</p>
                      <p className="text-xs text-muted-foreground">{activeContact.title}</p>
                      <p className="text-xs text-muted-foreground">{activeContact.company}</p>
                    </div>

                    <ContactTypeBadge type={activeContact.type} />

                    <div className="h-px bg-border" />

                    {/* To: field */}
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

              {/* Pitch Tips */}
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

              {/* Sidebar callout */}
              <div className="bg-primary/10 border border-primary/25 rounded-2xl p-5 space-y-2">
                <Sparkles size={15} className="text-primary" />
                <p className="text-sm text-white/90 leading-relaxed">
                  Got a response? Head to the{" "}
                  <Link href="/rate-calculator" className="text-primary font-semibold underline underline-offset-2 hover:text-primary/80">
                    Deal Negotiator
                  </Link>{" "}
                  for follow-ups, rate talks, and contract terms.
                </p>
              </div>
            </motion.aside>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
