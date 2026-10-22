import { useMemo } from "react";
import { motion } from "framer-motion";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import {
  Users, Zap, Bookmark, ShieldCheck,
  Headphones, Music, Cpu, Camera, ShoppingBag,
  ChevronRight, Wrench, UserCircle, Loader2,
} from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { api, ApiRequestError, getAllPitches, type DashboardStats } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";

// ── Mini brand lookup for icons/colors ────────────────────────────────────────

const BRAND_ICONS: Record<string, { Icon: React.ElementType; color: string }> = {
  "Sennheiser":          { Icon: Headphones,  color: "#7c3aed" },
  "Spotify for Artists": { Icon: Music,        color: "#1db954" },
  "Native Instruments":  { Icon: Cpu,          color: "#f59e0b" },
  "GoPro":               { Icon: Camera,       color: "#0ea5e9" },
  "Sweetwater":          { Icon: ShoppingBag,  color: "#ec4899" },
  "Red Bull":            { Icon: Zap,          color: "#ef4444" },
};

function statusLabel(status: string) {
  if (status === "generated")                              return { label: "Draft",      bg: "bg-zinc-500/15", text: "text-zinc-400" };
  if (status === "sent")                                   return { label: "Sent",       bg: "bg-violet-500/15", text: "text-violet-400" };
  if (status === "conversation")                           return { label: "Replied",    bg: "bg-sky-500/15", text: "text-sky-400" };
  if (status === "negotiating")                            return { label: "Negotiating",bg: "bg-sky-500/15", text: "text-sky-400" };
  if (status === "closed_won")                            return { label: "Won",        bg: "bg-emerald-500/15",text: "text-emerald-400" };
  if (status === "closed_lost" || status === "declined")   return { label: "Lost",       bg: "bg-zinc-500/15", text: "text-zinc-400" };
  if (status === "proposal_sent" || status === "waiting") return { label: "Sent (unconfirmed)", bg: "bg-zinc-500/15", text: "text-zinc-400" };
  return { label: status, bg: "bg-zinc-500/15", text: "text-zinc-400" };
}

function relativeDate(iso: string) {
  const diff = Date.now() - new Date(iso.length === 10 ? `${iso}T00:00:00` : iso).getTime();
  const days = Math.floor(diff / 86_400_000);
  if (!Number.isFinite(days)) return "Date unavailable";
  if (days < 0) return "Upcoming";
  if (days === 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 7)  return `${days} days ago`;
  if (days < 30) return `${Math.floor(days / 7)} week${Math.floor(days / 7) > 1 ? "s" : ""} ago`;
  return `${Math.floor(days / 30)} month${Math.floor(days / 30) > 1 ? "s" : ""} ago`;
}

function BrandDot({ name }: { name: string }) {
  const db = BRAND_ICONS[name];
  if (db) {
    const Icon = db.Icon;
    return (
      <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0" style={{ background: `${db.color}25` }}>
        <Icon size={15} style={{ color: db.color }} />
      </div>
    );
  }
  return (
    <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0 bg-secondary border border-border">
      <span className="text-sm font-bold text-white">{name.charAt(0).toUpperCase()}</span>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function Dashboard() {
  const [, setLocation] = useLocation();
  const { logout } = useAuth();

  const { data: dashStats, isLoading: statsLoading, isError: statsError, refetch: refetchStats } = useQuery<DashboardStats>({
    queryKey: ["dashboard"],
    queryFn: () => api.get("/dashboard/me"),
    staleTime: 30_000,
    retry: 1,
    refetchOnMount: "always",
  });

  const { data: apiPitches, isLoading: pitchesLoading, isError: pitchesError, error: pitchesQueryError, refetch: refetchPitches } = useQuery({
    queryKey: ["pitches"],
    queryFn: getAllPitches,
    staleTime: 60_000,
    retry: (attempt, failure) => !(failure instanceof ApiRequestError && failure.status === 401) && attempt < 1,
    refetchOnMount: "always",
  });

  const statCards = useMemo(() => [
    { label: "Brand Matches",     value: statsLoading ? null : statsError ? "—" : dashStats?.brand_matches,     sub: "In your niche",            icon: Users,       color: "#7c3aed" },
    { label: "Active Deals",      value: statsLoading ? null : statsError ? "—" : dashStats?.active_deals,      sub: "In your pipeline",         icon: Zap,         color: "#0ea5e9" },
    { label: "Saved Brands",      value: statsLoading ? null : statsError ? "—" : dashStats?.saved_brands,      sub: "On your shortlist",        icon: Bookmark,    color: "#10b981" },
    { label: "Verified Contacts", value: statsLoading ? null : statsError ? "—" : dashStats?.verified_contacts, sub: "Across your matched brands", icon: ShieldCheck, color: "#f59e0b" },
  ], [dashStats, statsLoading, statsError]);

  const recentDeals = (apiPitches ?? []).slice(0, 3);

  return (
    <div className="min-h-screen bg-background text-foreground overflow-x-hidden">
      <Navbar />

      <main className="pt-28 pb-24 px-4">
        <div className="max-w-5xl mx-auto flex flex-col gap-8">

          {/* Stats row */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {statCards.map((s, i) => {
              const Icon = s.icon;
              return (
                <motion.div
                  key={s.label}
                  initial={{ opacity: 0, y: 18 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: i * 0.07 }}
                  className="bg-card border border-border rounded-2xl p-5 flex flex-col gap-3 hover:border-primary/30 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{s.label}</span>
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: `${s.color}20` }}>
                      <Icon size={15} style={{ color: s.color }} />
                    </div>
                  </div>
                  <div>
                    {s.value === null
                      ? <div className="h-8 w-12 bg-secondary/60 rounded-lg animate-pulse" />
                       : <p className="text-3xl font-extrabold text-white tracking-tight">{s.value ?? "—"}</p>
                    }
                    <p className="text-xs text-muted-foreground mt-1">{s.sub}</p>
                  </div>
                </motion.div>
              );
            })}
          </div>
          {statsError && <p className="text-sm text-red-400">Couldn't load your dashboard counts. <button className="underline" onClick={() => refetchStats()}>Retry</button></p>}

          {/* Quick Actions */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.15 }}
            className="bg-card border border-border rounded-2xl p-6"
          >
            <h2 className="text-sm font-bold text-white mb-4">Quick Actions</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button onClick={() => setLocation("/brand-matches")}
                className="group flex flex-col items-start gap-3 p-4 rounded-xl border border-border hover:border-primary/40 bg-secondary/40 hover:bg-secondary transition-all text-left">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: "#7c3aed20" }}>
                  <Users size={16} style={{ color: "#7c3aed" }} />
                </div>
                <div>
                  <p className="text-sm font-bold text-white leading-tight">Browse brand matches →</p>
                  <p className="text-xs text-muted-foreground mt-1 leading-snug">See brands actively running creator campaigns</p>
                </div>
              </button>

              <button onClick={() => setLocation("/pitch")}
                className="group flex flex-col items-start gap-3 p-4 rounded-xl border border-border hover:border-primary/40 bg-secondary/40 hover:bg-secondary transition-all text-left">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: "#0ea5e920" }}>
                  <Zap size={16} style={{ color: "#0ea5e9" }} />
                </div>
                <div>
                  <p className="text-sm font-bold text-white leading-tight">Start a new pitch →</p>
                  <p className="text-xs text-muted-foreground mt-1 leading-snug">Build your outreach email to a brand you found</p>
                </div>
              </button>

              <button onClick={() => setLocation("/deals")}
                className="group flex flex-col items-start gap-3 p-4 rounded-xl border border-border hover:border-primary/40 bg-secondary/40 hover:bg-secondary transition-all text-left">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: "#10b98120" }}>
                  <Wrench size={16} style={{ color: "#10b981" }} />
                </div>
                <div>
                  <p className="text-sm font-bold text-white leading-tight">Deal Tools →</p>
                  <p className="text-xs text-muted-foreground mt-1 leading-snug">Get help negotiating payments and contracts</p>
                </div>
              </button>

              <button onClick={() => setLocation("/profile")}
                className="group flex flex-col items-start gap-3 p-4 rounded-xl border border-border hover:border-primary/40 bg-secondary/40 hover:bg-secondary transition-all text-left">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: "#f59e0b20" }}>
                  <UserCircle size={16} style={{ color: "#f59e0b" }} />
                </div>
                <div>
                  <p className="text-sm font-bold text-white leading-tight">Profile →</p>
                  <p className="text-xs text-muted-foreground mt-1 leading-snug">Keep your profile updated to get new brand matches</p>
                </div>
              </button>
            </div>
          </motion.div>

          {/* My Deals */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.22 }}
            className="bg-card border border-border rounded-2xl p-6"
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-bold text-white">Recent pitches</h2>
              <button onClick={() => setLocation("/deals")}
                className="text-xs text-primary hover:text-primary/80 font-semibold flex items-center gap-1 transition-colors">
                View all <ChevronRight size={12} />
              </button>
            </div>

            {pitchesLoading && (
              <div className="flex items-center justify-center py-8">
                <Loader2 size={18} className="text-muted-foreground animate-spin" />
              </div>
            )}

            {!pitchesLoading && pitchesError && (
              <p className="text-xs text-red-400 py-6 text-center">
                {pitchesQueryError instanceof ApiRequestError && pitchesQueryError.status === 401
                  ? "Your session isn't being accepted by the pitch API. "
                  : `Couldn't load your pitches: ${pitchesQueryError instanceof Error ? pitchesQueryError.message : "Unknown error"}. `}
                {pitchesQueryError instanceof ApiRequestError && pitchesQueryError.status === 401
                  ? <button onClick={() => void logout()} className="underline">Sign in again</button>
                  : <button onClick={() => refetchPitches()} className="underline">Retry</button>}
              </p>
            )}

            {!pitchesLoading && !pitchesError && recentDeals.length === 0 && (
              <p className="text-xs text-muted-foreground py-6 text-center">
                No pitches yet.{" "}
                <button onClick={() => setLocation("/pitch")} className="text-primary hover:underline">
                  Create your first pitch →
                </button>
              </p>
            )}

            {!pitchesLoading && !pitchesError && recentDeals.length > 0 && (
              <div className="flex flex-col gap-2">
                {recentDeals.map((pitch, i) => {
                  const { label, bg, text } = statusLabel(pitch.status);
                  return (
                    <motion.div
                      key={pitch.id}
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.3, delay: 0.28 + i * 0.06 }}
                      className="flex items-center gap-3 p-3.5 rounded-xl bg-secondary/40 border border-border"
                    >
                      <BrandDot name={pitch.brand_name} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-white leading-tight truncate">{pitch.brand_name}</p>
                        {pitch.contact_name && (
                          <p className="text-xs text-muted-foreground truncate">{pitch.contact_name}</p>
                        )}
                      </div>
                      <span className={`shrink-0 px-2.5 py-0.5 rounded-full text-xs font-semibold ${bg} ${text}`}>
                        {label}
                      </span>
                      <span className="shrink-0 text-xs text-muted-foreground hidden sm:block">
                        {pitch.sent_at ? `Sent ${relativeDate(pitch.sent_at)}` : `Created ${relativeDate(pitch.created_at)}`}
                      </span>
                      <button
                        onClick={() => setLocation("/deals")}
                        className="shrink-0 px-3 py-1.5 rounded-lg text-xs font-semibold border border-border text-white/70 hover:text-white hover:border-primary/50 hover:bg-primary/10 transition-all whitespace-nowrap"
                      >
                        Open in Pipeline →
                      </button>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </motion.div>

        </div>
      </main>

      <Footer />
    </div>
  );
}
