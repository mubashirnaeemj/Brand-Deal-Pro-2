import { useEffect, useState } from "react";
import { useLocation, useSearch } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import {
  CheckCircle2, Music, Building2, X, Copy, Check, AlertTriangle, Linkedin, ExternalLink,
} from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import BrandPartnershipPosts from "@/components/BrandPartnershipPosts";
import BrandMatchSearch from "@/components/BrandMatchSearch";
import { matchNiches } from "@/lib/matchSearch";
import MatchScoreBreakdown from "@/components/MatchScoreBreakdown";
import AiMatchesSection from "@/components/AiMatchesSection";
import useAiMatches from "@/hooks/useAiMatches";
import useAiRankingMessage from "@/hooks/useAiRankingMessage";
import { isAiRanking, type AiRankedMatch } from "@/lib/aiMatches";
import { nicheTextClass } from "@/lib/nicheColors";
import { api, type ApiBrand, type ApiContact, type ApiMatch } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";

const ACCENT = "#7c3aed";

function nicheOf(match: ApiMatch) {
  return match.niche?.trim() || "Uncategorized";
}

function percent(score: number) {
  return Math.round(Math.min(1, Math.max(0, score)) * 100);
}

function ScoreRing({ match, size = 56 }: { match: ApiMatch; size?: number }) {
  const [hovered, setHovered] = useState(false);
  const radius = size / 2 - 6;
  const circumference = 2 * Math.PI * radius;
  const score = percent(Number.isFinite(match.total_score) ? match.total_score : 0);
  const dimensions = match.dimensions ?? {};

  return (
    <div className="relative flex items-center justify-center cursor-default"
      style={{ width: size, height: size }}
      onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}>
      <svg className="absolute inset-0 -rotate-90" width={size} height={size}>
        <circle cx={size / 2} cy={size / 2} r={radius} stroke="hsl(240 5% 15%)" strokeWidth="4" fill="none" />
        <circle cx={size / 2} cy={size / 2} r={radius} stroke="hsl(262 83% 58%)" strokeWidth="4" fill="none"
          strokeDasharray={`${score / 100 * circumference} ${circumference}`} strokeLinecap="round" />
      </svg>
      <span className="text-xs font-bold text-white z-10">{score}%</span>
      {hovered && Object.keys(dimensions).length > 0 && (
        <MatchScoreBreakdown dimensions={dimensions} />
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

// The contact's LinkedIn profile, always visible like the email, with an "Open LinkedIn" button. Only http(s)
// URLs get the button, so a malformed stored value can never become a clickable script URL.
function LinkedInRow({ url, name }: { url?: string | null; name?: string | null }) {
  const value = url?.trim();
  if (!value) return null;
  const safe = /^https?:\/\//i.test(value);
  return (
    <div className="flex items-center gap-2" data-testid="linkedin-row">
      <Linkedin size={13} className="shrink-0 text-muted-foreground" aria-hidden />
      <span className="min-w-0 flex-1 truncate font-mono text-xs text-muted-foreground" data-testid="text-linkedin">{value}</span>
      {safe && (
        <a href={value} target="_blank" rel="noopener noreferrer" data-testid="link-linkedin"
          aria-label={`Open LinkedIn for ${name || "this contact"}`}
          className="flex shrink-0 items-center gap-1.5 rounded-lg border border-border px-4 py-2 text-xs font-semibold text-muted-foreground hover:border-white/30 hover:text-white">
          <ExternalLink size={12} aria-hidden />
          Open LinkedIn
        </a>
      )}
    </div>
  );
}

const UNVERIFIED_EMAIL_TEXT = "MAVLIT could not verify this email, so it may not reach this person. Check it before you send.";
// MAVLIT calls an email verified only when BOTH Apollo and Hunter confirmed it; any less is "could not verify".
// Both flags come from the API; absent (an older backend) means we do not know, so nothing is claimed either way.
const isVerified = (contact: ApiContact) => contact.apollo_verified === true && contact.hunter_verified === true;
const isUnverified = (contact: ApiContact) => contact.apollo_verified !== undefined && !isVerified(contact);

function VerifiedBadge({ contact }: { contact: ApiContact }) {
  if (!isVerified(contact)) return null;
  return (
    <p data-testid="badge-verified-email" className="flex items-center gap-1.5 text-xs font-semibold text-emerald-400">
      <CheckCircle2 size={13} className="shrink-0" aria-hidden />
      Email verified by MAVLIT
    </p>
  );
}

function UnverifiedNote({ className = "" }: { className?: string }) {
  return (
    <p role="note" data-testid="note-unverified-email"
      className={`flex items-start gap-1.5 text-[11px] leading-snug text-amber-400 ${className}`}>
      <AlertTriangle size={12} className="mt-px shrink-0" aria-hidden />
      <span>{UNVERIFIED_EMAIL_TEXT}</span>
    </p>
  );
}

function ContactPanel({ match, onClose, fitConfidence }: { match: ApiMatch; onClose: () => void; fitConfidence?: number }) {
  const [, navigate] = useLocation();
  const { data: detail, isLoading } = useQuery<ApiBrand>({
    queryKey: ["brand", match.brand_raw_id],
    queryFn: () => api.get(`/brands/${match.brand_raw_id}`),
    retry: 1,
    staleTime: 60_000,
  });
  const contact = detail?.top_contact;
  // "View more": the emails MAVLIT verified come first; within each group the API's rank order is kept.
  const otherContacts = (detail?.other_contacts ?? []).filter(other => other.email)
    .map((other, index) => ({ other, index }))
    .sort((a, b) => Number(isVerified(b.other)) - Number(isVerified(a.other)) || a.index - b.index)
    .map(({ other }) => other);
  const [showOthers, setShowOthers] = useState(false);

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
              <span className={`text-xs font-semibold ${nicheTextClass(match.niche)}`} data-testid="text-panel-niche">{nicheOf(match)}</span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {fitConfidence === undefined ? <ScoreRing match={match} size={44} /> : (
              <span className="rounded-full border border-primary/30 bg-primary/15 px-3 py-1 text-xs font-bold text-white cursor-default">{fitConfidence}% fit</span>
            )}
            <button type="button" onClick={onClose} aria-label="Close"
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
                      <VerifiedBadge contact={contact} />
                      {isUnverified(contact) && <UnverifiedNote />}
                      <LinkedInRow url={contact.linkedin_url} name={contact.name} />
                    </>
                  ) : null}
                  {otherContacts.length > 0 && (
                    <>
                      <button type="button" onClick={() => setShowOthers(value => !value)} aria-expanded={showOthers}
                        className="text-xs font-semibold text-primary hover:underline" data-testid="button-view-more-contacts">
                        {showOthers ? "Hide other contacts" : `View more (${otherContacts.length})`}
                      </button>
                      {showOthers && (
                        <ul className="max-h-64 space-y-3 overflow-y-auto pr-1" data-testid="list-other-contacts">
                          {otherContacts.map((other, index) => (
                            <li key={`${other.email}-${index}`} className="rounded-lg border border-border bg-background p-3">
                              <p className="text-sm font-semibold text-white">{other.name || "Unnamed contact"}</p>
                              {other.title && <p className="text-xs text-muted-foreground">{other.title}</p>}
                              <div className="mt-2 flex items-center gap-2">
                                <span className="flex-1 truncate font-mono text-xs text-muted-foreground">{other.email}</span>
                                {other.email && <CopyEmailButton email={other.email} />}
                              </div>
                              {isUnverified(other) ? <UnverifiedNote className="mt-1.5" /> : (
                                isVerified(other) && <div className="mt-1.5"><VerifiedBadge contact={other} /></div>
                              )}
                              <div className="mt-2"><LinkedInRow url={other.linkedin_url} name={other.name} /></div>
                            </li>
                          ))}
                        </ul>
                      )}
                    </>
                  )}
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
          <BrandPartnershipPosts brandId={match.brand_raw_id} brandName={match.brand_name} />
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

export default function BrandMatches() {
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const searchParams = useSearch();
  const [search, setSearch] = useState("");
  const [nicheChoices, setNicheChoices] = useState<string[]>([]);
  useEffect(() => {
    const requested = new URLSearchParams(searchParams).get("version");
    try { localStorage.setItem("mavlit_matches_version", "v3"); } catch { /* Storage can be unavailable in embedded previews. */ }
    if (requested === "v1" || requested === "v2") {
      navigate("/brand-matches?version=v3", { replace: true });
    }
  }, [searchParams, navigate]);
  const v3Matches = useAiMatches("v3", true);
  const progressMessage = useAiRankingMessage(
    v3Matches.refreshing || isAiRanking(v3Matches.data),
  );
  // Chosen niches that a refreshed ranking no longer contains are dropped, so the page never shows an empty filter.
  const matchedBrands = v3Matches.data?.matches ?? [];
  const availableNiches = matchNiches(matchedBrands).map((entry) => entry.niche);
  const niches = nicheChoices.filter((choice) => availableNiches.includes(choice));
  const [expandedAiReasons, setExpandedAiReasons] = useState<Record<number, boolean>>({});
  const toggleAiReasons = (brandId: number) => {
    setExpandedAiReasons((previous) => ({
      ...previous,
      [brandId]: !previous[brandId],
    }));
  };
  const [selectedAiMatch, setSelectedAiMatch] = useState<AiRankedMatch | null>(null);

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
            <div className="mb-2 flex flex-wrap items-center justify-between gap-4">
              <h1 className="text-4xl font-extrabold text-white tracking-tight">Your Brand Matches</h1>
            </div>
            <p className="text-muted-foreground text-base max-w-xl">
              Explore brands ranked by AI for your creator profile.
            </p>
          </motion.div>

          <div className="mb-6 flex flex-wrap items-start gap-3">
            <BrandMatchSearch id="matches-search-v3" label="Search brand matches" className="min-w-[16rem] max-w-lg flex-1"
              value={search} onChange={setSearch} />
          </div>
          <section id="matches-panel-v3" aria-label="Brand matches">
            <AiMatchesSection version="v3" data={v3Matches.data} loading={v3Matches.loading} error={v3Matches.error}
              refreshing={v3Matches.refreshing} onRefresh={v3Matches.refresh} onOpen={setSelectedAiMatch}
              timedOut={v3Matches.timedOut} onCheckStatus={v3Matches.checkStatus} preferences={user?.brand_preferences}
              progressMessage={progressMessage} expandedByBrand={expandedAiReasons}
              search={search} niches={niches} onNichesChange={setNicheChoices} onToggleReasons={toggleAiReasons} />
          </section>
        </div>
      </main>
      <Footer />
      <AnimatePresence>
        {selectedAiMatch && <ContactPanel fitConfidence={selectedAiMatch.confidence}
          match={{ brand_raw_id: selectedAiMatch.brand_raw_id, brand_name: selectedAiMatch.brand_name,
            niche: selectedAiMatch.niche, total_score: selectedAiMatch.confidence / 100, dimensions: {},
            reasons: selectedAiMatch.reason ? [selectedAiMatch.reason] : [] }}
          onClose={() => setSelectedAiMatch(null)} />}
      </AnimatePresence>
    </div>
  );
}
