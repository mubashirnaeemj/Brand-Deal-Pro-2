import { useCallback, useEffect, useState } from "react";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  CheckCircle2, SlidersHorizontal, Music, Building2, Bookmark,
  ChevronDown, ChevronUp, Clock, X, Copy, Check,
} from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { api, ApiRequestError, getAllMatches, type ApiBrand, type ApiMatch, type SavedBrand } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";

const ACCENT = "#7c3aed";
const TIMING_COPY = "Brand campaign calendars are often planned months in advance. Research upcoming campaigns and reach out early.";

function nicheOf(match: ApiMatch) {
  return match.niche?.trim() || "Uncategorized";
}

function ScoreRing({ match, size = 56 }: { match: ApiMatch; size?: number }) {
  const [hovered, setHovered] = useState(false);
  const radius = size / 2 - 6;
  const circumference = 2 * Math.PI * radius;
  const score = Number.isFinite(match.total_score) ? match.total_score : 0;
  const dimensions = Object.entries(match.dimensions ?? {});

  return (
    <div className="relative flex items-center justify-center cursor-default"
      style={{ width: size, height: size }}
      onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}>
      <svg className="absolute inset-0 -rotate-90" width={size} height={size}>
        <circle cx={size / 2} cy={size / 2} r={radius} stroke="hsl(240 5% 15%)" strokeWidth="4" fill="none" />
        <circle cx={size / 2} cy={size / 2} r={radius} stroke="hsl(262 83% 58%)" strokeWidth="4" fill="none"
          strokeDasharray={`${Math.min(100, Math.max(0, score)) / 100 * circumference} ${circumference}`} strokeLinecap="round" />
      </svg>
      <span className="text-xs font-bold text-white z-10">{Math.round(score)}%</span>
      {hovered && dimensions.length > 0 && (
        <div className="absolute bottom-[calc(100%+8px)] right-0 z-[100] w-52 rounded-xl border border-border bg-[hsl(240_10%_6%)] shadow-2xl p-3 pointer-events-none">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-2.5">Score Breakdown</p>
          <div className="flex flex-col gap-2">
            {dimensions.map(([key, detail]) => (
              <div key={key}>
                <div className="flex justify-between items-center mb-1">
                  <span className="text-[11px] text-muted-foreground">{key.replace(/[_-]/g, " ").replace(/([a-z])([A-Z])/g, "$1 $2")}</span>
                  <span className="text-[11px] font-bold text-white">{detail.score == null ? "N/A" : Math.round(detail.score)}</span>
                </div>
                <div className="h-1 rounded-full bg-white/10 overflow-hidden">
                  <div className="h-full rounded-full bg-primary transition-all duration-300"
                    style={{ width: `${Math.min(100, Math.max(0, detail.score ?? 0))}%` }} />
                </div>
              </div>
            ))}
          </div>
          <div className="absolute bottom-[-5px] right-3 w-2.5 h-2.5 rotate-45 bg-[hsl(240_10%_6%)] border-r border-b border-border" />
        </div>
      )}
    </div>
  );
}

function CopyEmailButton({ email }: { email: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button type="button" onClick={() => navigator.clipboard.writeText(email).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    })} className="flex items-center gap-1.5 px-4 py-2 rounded-lg border border-border text-xs font-semibold text-muted-foreground hover:text-white hover:border-white/30">
      {copied ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
      {copied ? "Copied!" : "Copy email"}
    </button>
  );
}

function ContactPanel({ match, onClose }: { match: ApiMatch; onClose: () => void }) {
  const [, navigate] = useLocation();
  const { data: detail, isLoading } = useQuery<ApiBrand>({
    queryKey: ["brand", match.brand_raw_id],
    queryFn: () => api.get(`/brands/${match.brand_raw_id}`),
    retry: 1,
    staleTime: 60_000,
  });
  const contact = detail?.top_contact;

  useEffect(() => {
    const closeOnEscape = (event: KeyboardEvent) => { if (event.key === "Escape") onClose(); };
    document.addEventListener("keydown", closeOnEscape);
    return () => document.removeEventListener("keydown", closeOnEscape);
  }, [onClose]);

  return (
    <>
      <motion.div key="backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }} className="fixed inset-0 bg-black/60 z-40 backdrop-blur-sm" onClick={onClose} />
      <motion.div key="panel" initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }}
        transition={{ type: "spring", damping: 28, stiffness: 260 }}
        className="fixed top-0 right-0 h-full w-full max-w-md bg-[hsl(240_10%_5%)] border-l border-border z-50 flex flex-col overflow-hidden shadow-2xl">
        <div className="flex items-center justify-between px-6 py-5 border-b border-border shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white shrink-0"
              style={{ background: `linear-gradient(135deg, ${ACCENT}cc, ${ACCENT}66)` }}>
              <Building2 size={18} />
            </div>
            <div>
              <h2 className="text-white font-bold text-base leading-tight">{match.brand_name}</h2>
              <span className="text-xs" style={{ color: ACCENT }}>{nicheOf(match)}</span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <ScoreRing match={match} size={44} />
            <button type="button" onClick={onClose}
              className="w-8 h-8 flex items-center justify-center rounded-lg text-muted-foreground hover:text-white hover:bg-white/5">
              <X size={16} />
            </button>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Contact Intel</p>
            <div className="rounded-2xl bg-card border border-border p-5 space-y-4">
              {isLoading ? <p className="text-sm text-muted-foreground">Loading contact details…</p> : contact ? (
                <>
                  <div>
                    <p className="text-white font-bold text-base leading-snug">{contact.name}</p>
                    <p className="text-sm text-muted-foreground mt-0.5">{contact.title}</p>
                    <p className="text-sm text-muted-foreground">{match.brand_name}</p>
                  </div>
                  {contact.email ? (
                    <>
                      <div className="h-px bg-border" />
                      <CopyEmailButton email={contact.email} />
                      <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-background border border-border">
                        <span className="text-xs text-muted-foreground font-mono flex-1 truncate">{contact.email}</span>
                      </div>
                    </>
                  ) : null}
                </>
              ) : <p className="text-sm text-muted-foreground">Contact details are not available for this brand.</p>}
            </div>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Why it's a match</p>
            {match.reasons.length ? (
              <ul className="space-y-3">
                {match.reasons.map((reason, index) => (
                  <li key={index} className="flex items-start gap-2.5">
                    <CheckCircle2 size={14} className="mt-0.5 shrink-0 text-primary" />
                    <span className="text-sm text-muted-foreground leading-relaxed">{reason}</span>
                  </li>
                ))}
              </ul>
            ) : <p className="text-sm text-muted-foreground">No match reasons were provided.</p>}
          </div>
          <div className="px-4 py-3 rounded-xl bg-white/[0.03] border border-border">
            <p className="text-xs text-muted-foreground leading-relaxed">
              <span className="font-semibold text-white/50">Research tip:</span> Review {match.brand_name}'s previous creator partnerships before you pitch.
            </p>
          </div>
        </div>
        <div className="px-6 py-5 border-t border-border shrink-0">
          <button type="button" onClick={() => { onClose(); navigate(`/pitch?brand=${encodeURIComponent(match.brand_name)}`); }}
            className="w-full py-3 rounded-xl text-sm font-bold bg-primary text-white hover:bg-primary/85 transition-colors duration-200 shadow-lg shadow-primary/20">
            Create pitch email →
          </button>
        </div>
      </motion.div>
    </>
  );
}

function BrandCard({ match, index, onOpen, saved, onToggleSave }: {
  match: ApiMatch; index: number; onOpen: () => void;
  saved: boolean; onToggleSave: (event: React.MouseEvent) => void;
}) {
  const [timingOpen, setTimingOpen] = useState(false);
  const [, navigate] = useLocation();
  const id = match.brand_raw_id;

  return (
    <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -12, scale: 0.97 }}
      transition={{ duration: 0.35, delay: Math.min(index, 8) * 0.06, ease: "easeOut" }}
      whileHover={{ y: -4, transition: { duration: 0.2 } }}
      data-testid={`card-brand-${id}`} onClick={onOpen} role="button" tabIndex={0}
      onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); onOpen(); } }}
      className="group relative flex flex-col bg-card border border-border rounded-2xl overflow-visible hover:z-20 hover:border-primary/50 transition-colors duration-300 cursor-pointer">
      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none rounded-2xl"
        style={{ boxShadow: `inset 0 0 40px 0 ${ACCENT}18` }} />
      <div className="p-6 flex items-start gap-4">
        <div className="w-14 h-14 rounded-xl flex items-center justify-center text-white font-bold text-lg shrink-0 shadow-lg"
          style={{ background: `linear-gradient(135deg, ${ACCENT}cc, ${ACCENT}66)` }}
          data-testid={`img-logo-${id}`}><Building2 size={24} /></div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-white font-bold text-sm leading-snug" data-testid={`text-brandname-${id}`}>{match.brand_name}</h3>
            <div className="flex items-center gap-1.5 shrink-0">
              <button type="button" onClick={onToggleSave} title={saved ? "Remove from shortlist" : "Save to shortlist"}
                className={`w-7 h-7 flex items-center justify-center rounded-lg transition-all ${saved ? "text-primary bg-primary/15" : "text-muted-foreground hover:text-white hover:bg-white/5"}`}>
                <Bookmark size={14} className={saved ? "fill-primary" : ""} />
              </button>
              <ScoreRing match={match} />
            </div>
          </div>
          <span className="inline-flex items-center mt-1 px-2 py-0.5 rounded-md text-xs font-semibold"
            style={{ background: `${ACCENT}22`, color: ACCENT }} data-testid={`text-category-${id}`}>{nicheOf(match)}</span>
          <button type="button" onClick={(event) => { event.stopPropagation(); setTimingOpen((open) => !open); }}
            className="mt-2 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/25 text-emerald-400 text-xs font-semibold hover:bg-emerald-500/15 transition-colors duration-200">
            <Clock size={11} />Plan outreach early
            {timingOpen ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
          </button>
          <AnimatePresence>
            {timingOpen && <motion.p initial={{ opacity: 0, height: 0, marginTop: 0 }}
              animate={{ opacity: 1, height: "auto", marginTop: 8 }}
              exit={{ opacity: 0, height: 0, marginTop: 0 }} transition={{ duration: 0.25 }}
              className="text-xs text-muted-foreground leading-relaxed overflow-hidden">{TIMING_COPY}</motion.p>}
          </AnimatePresence>
        </div>
      </div>
      <div className="px-6 pb-4 flex flex-col gap-3 flex-1">
        <div className="h-px bg-border" />
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Why it's a match</p>
        {match.reasons.length ? (
          <ul className="flex flex-col gap-3">
            {match.reasons.map((reason, index) => (
              <li key={index} className="flex items-start gap-2.5">
                <CheckCircle2 size={15} className="mt-0.5 shrink-0 text-primary" />
                <span className="text-sm text-muted-foreground leading-relaxed">{reason}</span>
              </li>
            ))}
          </ul>
        ) : <p className="text-sm text-muted-foreground">No match reasons were provided.</p>}
        <div className="mt-1 px-4 py-3 rounded-xl bg-[hsl(240_10%_8%)] border border-border flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-sm font-bold text-white leading-snug">Contact Intel</p>
            <p className="text-xs text-muted-foreground leading-snug">Open match for available details</p>
          </div>
          <Building2 size={15} className="text-muted-foreground" />
        </div>
      </div>
      <div className="px-6 pb-5 pt-1">
        <button type="button" data-testid={`button-pitch-${id}`}
          onClick={(event) => { event.stopPropagation(); navigate(`/pitch?brand=${encodeURIComponent(match.brand_name)}`); }}
          className="w-full py-2.5 rounded-xl text-sm font-semibold border border-border text-white/70 hover:bg-primary hover:border-primary hover:text-white transition-all duration-200">
          Create pitch email →
        </button>
      </div>
    </motion.div>
  );
}

export default function BrandMatches() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [activeCategory, setActiveCategory] = useState("All");
  const [selectedMatch, setSelectedMatch] = useState<ApiMatch | null>(null);
  const { data: matches, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["pitch-matches"],
    queryFn: getAllMatches,
    staleTime: 60_000,
    retry: (count, cause) => !(cause instanceof ApiRequestError && (cause.status === 401 || cause.status === 403)) && count < 1,
  });
  const { data: savedBrandsList = [] } = useQuery<SavedBrand[]>({
    queryKey: ["saved-brands"],
    queryFn: () => api.get("/saved-brands/me"),
    staleTime: 60_000,
    retry: 1,
  });

  useEffect(() => {
    if (error instanceof ApiRequestError && error.status === 403) {
      window.dispatchEvent(new Event("mavlit:profile-incomplete"));
    }
  }, [error]);

  const savedBrandIds = new Set(savedBrandsList.map((brand) => brand.brand_id));
  const toggleSave = useCallback(async (brandId: number, brandName: string) => {
    if (savedBrandIds.has(brandId)) {
      queryClient.setQueryData<SavedBrand[]>(["saved-brands"], (previous) =>
        (previous ?? []).filter((brand) => brand.brand_id !== brandId));
      try { await api.delete(`/saved-brands/${brandId}`); }
      catch {
        queryClient.invalidateQueries({ queryKey: ["saved-brands"] });
        toast({ title: "Couldn't remove bookmark", description: `Failed to unsave ${brandName}. Please try again.`, variant: "destructive" });
      }
    } else {
      queryClient.setQueryData<SavedBrand[]>(["saved-brands"], (previous) => [
        ...(previous ?? []),
        { brand_id: brandId, name: brandName, niche: "", short_bio: null, saved_at: new Date().toISOString() },
      ]);
      try { await api.post("/saved-brands", { brand_id: brandId }); }
      catch {
        queryClient.invalidateQueries({ queryKey: ["saved-brands"] });
        toast({ title: "Couldn't save brand", description: `Failed to bookmark ${brandName}. Please try again.`, variant: "destructive" });
      }
    }
  }, [savedBrandIds, queryClient, toast]);

  const categories = ["All", ...new Set((matches ?? []).map(nicheOf))];
  const filtered = activeCategory === "All" ? matches ?? [] : (matches ?? []).filter((match) => nicheOf(match) === activeCategory);

  return (
    <div className="min-h-screen bg-background text-foreground overflow-x-hidden">
      <Navbar />
      <main className="pt-28 pb-24 px-4">
        <div className="max-w-6xl mx-auto">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }} className="mb-6">
            <div className="flex items-center gap-2 mb-3">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-primary/15 text-primary border border-primary/30">
                <Music size={11} />Brand Matches
              </span>
              <span className="text-muted-foreground text-xs">Based on your creator profile</span>
            </div>
            <h1 className="text-4xl font-extrabold text-white tracking-tight mb-2">Your Brand Matches</h1>
            <p className="text-muted-foreground text-base max-w-xl">
              {isLoading ? "Finding your brand matches…" : isError ? "Unable to load your matches." : (
                <>MAVLIT found <span className="text-white font-semibold">{matches?.length ?? 0} high-fit brands</span> based on your audience data, content style, and engagement metrics.</>
              )}
            </p>
          </motion.div>

          {!isLoading && !isError && matches && (
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.15 }} className="flex items-center gap-3 mb-8 flex-wrap">
              <div className="flex items-center gap-1.5 text-muted-foreground mr-1">
                <SlidersHorizontal size={15} /><span className="text-sm font-medium">Filter:</span>
              </div>
              {categories.map((category) => (
                <button key={category} type="button" data-testid={`button-filter-${category.toLowerCase()}`}
                  onClick={() => setActiveCategory(category)}
                  className={`px-4 py-1.5 rounded-full text-sm font-semibold border transition-all duration-200 ${
                    activeCategory === category ? "bg-primary border-primary text-white shadow-lg shadow-primary/30" :
                      "border-border text-muted-foreground hover:border-primary/50 hover:text-white"
                  }`}>{category}</button>
              ))}
              <span className="ml-auto text-xs text-muted-foreground hidden sm:block">
                {filtered.length} result{filtered.length !== 1 ? "s" : ""}
              </span>
            </motion.div>
          )}

          {isLoading ? (
            <p role="status" className="py-24 text-center text-muted-foreground">Loading matches…</p>
          ) : isError ? (
            <div role="alert" className="py-24 text-center">
              <p className="text-muted-foreground text-lg font-medium">Could not load your brand matches.</p>
              <button type="button" onClick={() => refetch()}
                className="mt-4 rounded-xl border border-border px-4 py-2 text-sm font-semibold text-white hover:border-primary/50">
                Try again
              </button>
            </div>
          ) : (
            <AnimatePresence mode="popLayout">
              {filtered.length > 0 ? (
                <motion.div key="grid" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                  {filtered.map((match, index) => (
                    <BrandCard key={match.brand_raw_id} match={match} index={index}
                      onOpen={() => setSelectedMatch(match)}
                      saved={savedBrandIds.has(match.brand_raw_id)}
                      onToggleSave={(event) => { event.stopPropagation(); toggleSave(match.brand_raw_id, match.brand_name); }} />
                  ))}
                </motion.div>
              ) : (
                <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                  className="flex flex-col items-center justify-center py-24 text-center">
                  <p className="text-muted-foreground text-lg font-medium">
                    {matches?.length ? "No matches in this category yet." : "No brand matches yet."}
                  </p>
                  <p className="text-muted-foreground text-sm mt-1">Try a different filter or check back after your next content upload.</p>
                </motion.div>
              )}
            </AnimatePresence>
          )}
        </div>
      </main>
      <Footer />
      <AnimatePresence>
        {selectedMatch && <ContactPanel match={selectedMatch} onClose={() => setSelectedMatch(null)} />}
      </AnimatePresence>
    </div>
  );
}