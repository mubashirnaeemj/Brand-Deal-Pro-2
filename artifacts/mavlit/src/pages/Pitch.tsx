import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Link, useLocation, useSearch } from "wouter";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Sparkles, Copy, Check, ChevronDown, AlertTriangle, Lightbulb,
  User, ArrowRight, Building2, CheckCircle2,
} from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import PitchDraftEditor from "@/components/PitchDraftEditor";
import { api, getAllMatches, type ApiBrand, type ApiPitch } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";

// ── Constants ─────────────────────────────────────────────────────────────────

const NICHES    = ["Music Production","Music Performance","Audio Engineering","Gear Reviews","Lifestyle & Music","Electronic Music","Hip-Hop / Beats","Singer-Songwriter","Studio Vlogging","DJ / Live Sets","Music Education","Other"];
const PLATFORMS = ["Instagram","TikTok","YouTube","Substack"];

const TIPS = [
  { title: "Story beats stats",           body: "Brands get hundreds of pitches with follower counts. A real story about why you use their product cuts through."       },
  { title: "No rates in the opener",      body: "The opener is to get a reply, not close a deal. Rates kill conversations before they start."                          },
  { title: "Make their job easy",         body: "Say exactly what you need from them. Vague asks = silence. Ask one specific question."                                },
  { title: "Email, not deck",             body: "A pitch deck is for when they ask. Leading with a deck before they're warm signals you don't know the game."          },
  { title: "Wrong person = wasted pitch", body: "Find the partnerships or creator marketing team — not PR, not general info@. LinkedIn is your friend."                },
  { title: "It's June — pitch for Q4",    body: "Brands plan campaigns 90 days out. Pitch now for Q4/Holiday campaigns while budgets are still being allocated."       },
];

// ── Types ──────────────────────────────────────────────────────────────────────

interface OutboundForm {
  brandSource: "matched" | "found";
  selectedBrand: string;
  customBrand: string;
  story: string;
  recentProductLaunch: string;
  pastDeals: string;
  contentLink: string;
}

const EMPTY_OUTBOUND: OutboundForm = {
  brandSource: "matched", selectedBrand: "", customBrand: "",
  story: "", recentProductLaunch: "", pastDeals: "", contentLink: "",
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

// ── Outbound Mode ──────────────────────────────────────────────────────────────

function OutboundMode() {
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const search = useSearch();
  const queryClient = useQueryClient();
  const { data: matches, isLoading: matchesLoading, isError: matchesError, refetch: refetchMatches } = useQuery({
    queryKey: ["pitch-matches"],
    queryFn: getAllMatches,
    staleTime: 60_000,
    retry: 1,
  });
  const [prefillBrand] = useState(() => new URLSearchParams(search).get("brand") ?? "");
  const [form, setFormState] = useState<OutboundForm>(() => prefillBrand
    ? { ...EMPTY_OUTBOUND, brandSource: "found", customBrand: prefillBrand }
    : EMPTY_OUTBOUND);
  const [generating, setGenerating] = useState(false);
  const [draft, setDraft] = useState<ApiPitch | null>(null);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [error, setError]           = useState<string | null>(null);
  const emailRef = useRef<HTMLDivElement>(null);
  const generationInFlight = useRef(false);
  const productReferenceEdited = useRef(false);

  useEffect(() => {
    const prefilledMatch = matches?.find(b => b.brand_name === prefillBrand);
    if (prefilledMatch) {
      setFormState(previous => previous.brandSource === "found" && previous.customBrand === prefillBrand
        ? { ...previous, brandSource: "matched", selectedBrand: String(prefilledMatch.brand_raw_id), customBrand: "",
            recentProductLaunch: productReferenceEdited.current ? previous.recentProductLaunch : prefilledMatch.latest_product?.trim() || "" }
        : previous);
    }
  }, [matches, prefillBrand]);

  const set = <K extends keyof OutboundForm>(k: K, v: OutboundForm[K]) => {
    if (k === "recentProductLaunch") productReferenceEdited.current = true;
    if (k === "brandSource") productReferenceEdited.current = false;
    setFormState(p => ({
      ...p, [k]: v,
      ...(k === "brandSource" ? {
        recentProductLaunch: v === "matched"
          ? matches?.find(b => String(b.brand_raw_id) === p.selectedBrand)?.latest_product?.trim() || ""
          : "",
      } : {}),
    }));
  };

  const selectedMatch = matches?.find(b => String(b.brand_raw_id) === form.selectedBrand);
  const brandName = form.brandSource === "matched" ? selectedMatch?.brand_name ?? "" : form.customBrand;
  const { data: brandDetail } = useQuery<ApiBrand>({
    queryKey: ["brand", selectedMatch?.brand_raw_id],
    queryFn: () => api.get(`/brands/${selectedMatch!.brand_raw_id}`),
    enabled: form.brandSource === "matched" && !!selectedMatch,
    staleTime: 60_000,
  });
  const activeContact = form.brandSource === "matched" ? brandDetail?.top_contact : null;
  // Creator details come from the saved account profile, not hidden legacy inputs.
  const canGenerate = !!brandName.trim() && !!form.story.trim();

  const generate = async () => {
    if (!canGenerate || saving || generationInFlight.current) return;
    if (dirty && !window.confirm("Generate a new pitch and discard your unsaved email edits? The previous generated draft remains in Pipeline.")) return;
    generationInFlight.current = true;
    setGenerating(true); setError(null);
    try {
      const body = form.brandSource === "matched" && selectedMatch
        ? {
            is_custom: false,
            brand_id: selectedMatch.brand_raw_id,
            story: form.story,
            product_reference: form.recentProductLaunch || undefined,
            past_brand_partnership: form.pastDeals || undefined,
            content_link: form.contentLink || undefined,
          }
        : {
            is_custom: true,
            custom_brand_name: brandName,
            story: form.story,
            product_reference: form.recentProductLaunch || undefined,
            past_brand_partnership: form.pastDeals || undefined,
            content_link: form.contentLink || undefined,
          };
      const data = await api.post<ApiPitch>("/pitches", body);
      setDraft(data);
      setDirty(false);
      if (!data.pitch_text) setError("The API returned no email text. You can write your email in the draft editor below and save it to the same pitch.");
      // Invalidate cached pitches and dashboard stats so Pipeline + Dashboard reflect the new pitch immediately
      queryClient.invalidateQueries({ queryKey: ["pitches"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      setTimeout(() => emailRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 100);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong generating your email. Please try again.");
    }
    finally { generationInFlight.current = false; setGenerating(false); }
  };

  const saved = () => {
    queryClient.invalidateQueries({ queryKey: ["pitches"] });
    queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    setLocation("/deals");
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
                {prefillBrand && selectedMatch?.brand_name === prefillBrand && (
                  <div className="flex items-center gap-2 mb-3 px-3 py-2 rounded-xl bg-primary/10 border border-primary/25 text-xs font-semibold text-primary">
                    <CheckCircle2 size={12} />
                    Pre-filled from your matches — just add your story below
                  </div>
                )}
                <Label>Select a matched brand</Label>
                {matchesLoading && <p className="text-sm text-muted-foreground py-3">Loading your matches…</p>}
                {matchesError && <p className="text-sm text-red-400 py-3">Couldn't load matches. <button className="underline" onClick={() => refetchMatches()}>Retry</button> or use “A brand I found myself”.</p>}
                {!matchesLoading && !matchesError && matches?.length === 0 && <p className="text-sm text-muted-foreground py-3">No matches yet. You can pitch a brand you found yourself.</p>}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-2">
                  {matches?.map(b => {
                    const selected = form.selectedBrand === String(b.brand_raw_id);
                    return (
                      <button key={b.brand_raw_id} onClick={() => {
                          productReferenceEdited.current = false;
                          setFormState(p => ({ ...p, selectedBrand: selected ? "" : String(b.brand_raw_id),
                            recentProductLaunch: selected ? "" : b.latest_product?.trim() || "" }));
                        }}
                        className={`flex items-center gap-2.5 p-3 rounded-xl border text-left transition-all ${selected ? "border-primary bg-primary/10 text-white" : "border-border text-muted-foreground hover:border-primary/40 hover:text-white"}`}>
                        <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 bg-primary/15">
                          <Building2 size={15} className="text-primary" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-semibold truncate">{b.brand_name}</p>
                          <p className="text-xs text-muted-foreground/70">{b.niche ?? "Brand"}</p>
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

        {/* Section 2 — Story */}
        <div className="bg-card border border-border rounded-2xl p-6 space-y-5">
          <h2 className="text-lg font-bold text-white">2 — Your story &amp; social proof</h2>
          <div>
            <Label>Your authentic connection to {brandName || "[brand]"} — the story</Label>
            <textarea value={form.story} onChange={e => set("story", e.target.value)} rows={4}
              placeholder={`e.g. I've used ${brandName || "[brand]"} gear since I was 16 learning in my bedroom studio. My audience of 18–34 producers knows I only mention what I actually use.`}
              className="w-full px-3.5 py-2.5 rounded-xl bg-black/40 border border-border text-white text-sm placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary/60 focus:ring-1 focus:ring-primary/30 transition-all resize-none" />
          </div>
          {brandName && (
            <div>
              <Label>Reference a recent product launch <span className="font-normal text-muted-foreground/50">— optional</span></Label>
              <Input
                value={form.recentProductLaunch}
                onChange={v => set("recentProductLaunch", v)}
                placeholder="Enter a product launch, or leave blank to skip"
              />
              <p className="mt-1.5 text-xs text-muted-foreground/60 leading-relaxed">We prefill the brand’s latest product when available. Edit or clear it anytime. If filled in, it’ll be woven into your pitch as a natural reason for the timing.</p>
            </div>
          )}
          <div><Label>Past brand partnerships (optional)</Label><Input value={form.pastDeals} onChange={v => set("pastDeals", v)} placeholder="e.g. Focusrite, Splice, Roland — or leave blank if none yet" /></div>
          <div>
            <Label>Link to your most relevant content</Label>
            <Input value={form.contentLink} onChange={v => set("contentLink", v)} placeholder="https://instagram.com/p/your-best-post" />
            <p className="mt-1.5 text-xs text-muted-foreground/70 leading-relaxed">Link to content that shows your connection to this brand.</p>
          </div>
          <div className="flex items-start justify-between gap-4 pt-1 px-4 py-3.5 rounded-xl bg-primary/5 border border-primary/20">
            <div className="flex items-start gap-3 min-w-0">
              <div className="w-7 h-7 rounded-lg bg-primary/15 flex items-center justify-center shrink-0 mt-0.5"><User size={13} className="text-primary" /></div>
              <div className="min-w-0">
                 <p className="text-sm font-semibold text-white leading-snug mb-0.5">
                   {user?.content_niche || "Your creator profile"}{user?.follower_count ? ` · ${user.follower_count.toLocaleString()} followers` : ""}
                 </p>
                <p className="text-xs text-muted-foreground leading-relaxed">Keep your profile complete — MAVLIT uses your stats and story to generate the most accurate pitch possible.</p>
              </div>
            </div>
            <Link href="/profile" className="shrink-0 flex items-center gap-1 text-xs font-semibold text-primary hover:text-primary/80 transition-colors whitespace-nowrap pt-0.5">
              Update profile <ArrowRight size={11} />
            </Link>
          </div>
        </div>

        {/* Generate */}
        <button onClick={generate} disabled={!canGenerate || generating || saving}
          className="w-full py-4 rounded-2xl text-base font-bold bg-primary hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed text-white shadow-lg shadow-primary/30 transition-all flex items-center justify-center gap-2">
          {generating
            ? (<><motion.div animate={{ rotate: 360 }} transition={{ duration: 1.2, repeat: Infinity, ease: "linear" }} className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full" />Generating your pitch email…</>)
            : (<><Sparkles size={16} />✦ Generate pitch email rough draft</>)}
        </button>

        {error && <div role="alert" className="px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-sm">{error}
        </div>}

        {/* Email output */}
        <AnimatePresence>
          {draft && (
            <motion.div ref={emailRef} key={draft.id} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.4 }} className={generating ? "pointer-events-none opacity-50" : ""}>
              <PitchDraftEditor pitch={draft} disabled={generating} onSaved={saved} onSavingChange={setSaving} onDirtyChange={setDirty} />
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
              </div>
              <div className="h-px bg-border" />
              <div>
                <p className="text-xs font-semibold text-muted-foreground mb-1.5">To:</p>
                <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-background border border-border">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-white/90 font-semibold leading-tight">{activeContact.name}</p>
                    <p className="text-xs text-white/50 font-mono leading-tight">{activeContact.email}</p>
                  </div>
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

// ── Page ───────────────────────────────────────────────────────────────────────

export default function Pitch() {
  return (
    <div className="min-h-screen bg-background text-foreground overflow-x-hidden">
      <Navbar />

      <main className="pt-28 pb-24 px-4">
        <div className="max-w-6xl mx-auto">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} className="mb-10">
            <h1 className="text-4xl font-extrabold text-white tracking-tight mb-2">Pitch</h1>
            <p className="text-muted-foreground text-base max-w-xl">Build your outreach email to a brand. Keep it casual, personal, and story-driven. No rates. No deck.</p>
          </motion.div>
          <OutboundMode />
        </div>
      </main>

      <Footer />
    </div>
  );
}
