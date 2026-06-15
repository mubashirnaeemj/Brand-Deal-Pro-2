import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useLocation } from "wouter";
import {
  Zap, Mail, TrendingUp, Users, DollarSign, BarChart3, ArrowRight,
  CheckCircle2, Clock, Sparkles, ChevronRight, Activity, Headphones,
  Music, ShieldCheck, Info, Cpu, Camera, ShoppingBag,
} from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

// ── Data ──────────────────────────────────────────────────────────────────────

const STATS = [
  {
    label: "Brand Matches",
    value: "6",
    delta: "+3 this week",
    icon: Users,
    color: "#7c3aed",
    testId: "stat-matches",
  },
  {
    label: "Active Pitches",
    value: "2",
    delta: "1 awaiting reply",
    icon: Zap,
    color: "#0ea5e9",
    testId: "stat-pitches",
  },
  {
    label: "Verified Contacts",
    value: "6",
    delta: "Across your matched brands.",
    icon: ShieldCheck,
    color: "#10b981",
    testId: "stat-contacts",
  },
  {
    label: "Response Rate",
    value: "34%",
    delta: "+8% vs last month",
    icon: TrendingUp,
    color: "#f59e0b",
    testId: "stat-response-rate",
  },
];

type PitchStatus = "draft" | "sent" | "replied";

const PITCHES_INIT: {
  id: number;
  brand: string;
  icon: React.ElementType;
  color: string;
  contact: string;
  date: string;
  status: PitchStatus;
}[] = [
  { id: 1, brand: "Sennheiser",          icon: Headphones,  color: "#7c3aed", contact: "Sarah Chen",     date: "Jun 10, 2026", status: "sent"  },
  { id: 2, brand: "Spotify for Artists", icon: Music,       color: "#1db954", contact: "Marcus Williams", date: "Jun 8, 2026",  status: "replied" },
  { id: 3, brand: "Native Instruments",  icon: Cpu,         color: "#f59e0b", contact: "Priya Sharma",    date: "Jun 13, 2026", status: "draft" },
  { id: 4, brand: "GoPro",               icon: Camera,      color: "#0ea5e9", contact: "Jake Torres",     date: "Jun 12, 2026", status: "sent"  },
  { id: 5, brand: "Sweetwater",          icon: ShoppingBag, color: "#ec4899", contact: "Dana Kim",        date: "Jun 14, 2026", status: "draft" },
  { id: 6, brand: "Red Bull",            icon: Zap,         color: "#ef4444", contact: "Alex Rivera",     date: "Jun 11, 2026", status: "draft" },
];

const ACTIVITY = [
  { id: 1, icon: CheckCircle2, color: "#10b981", text: "Pitch email drafted for Sennheiser",       sub: "Ready to send",                          time: "Just now"    },
  { id: 2, icon: Sparkles,     color: "#7c3aed", text: "6 new brand matches found",                sub: "Music niche · Updated daily",            time: "2 hours ago" },
  { id: 3, icon: Mail,         color: "#0ea5e9", text: "Spotify replied to your pitch",            sub: "Interested — follow-up requested",       time: "Today"       },
  { id: 4, icon: CheckCircle2, color: "#10b981", text: "Sennheiser responded to your pitch",       sub: "Interested — follow-up requested",       time: "Yesterday"   },
  { id: 5, icon: BarChart3,    color: "#f59e0b", text: "Platform stats sync completed",            sub: "Instagram · TikTok · YouTube · Facebook", time: "2 days ago"  },
];

const TOP_MATCHES = [
  { name: "Sennheiser",         score: 97, color: "#7c3aed", Icon: Headphones, category: "Audio",     slug: "sennheiser" },
  { name: "Spotify for Artists",score: 94, color: "#1db954", Icon: Music,      category: "Streaming", slug: "spotify"    },
  { name: "Native Instruments", score: 91, color: "#f59e0b", Icon: Cpu,        category: "Software",  slug: "native-instruments" },
];

const QUICK_ACTIONS = [
  { label: "Browse Brand Matches", description: "See all 6 brands matched to your profile",      icon: Users,      href: "/brand-matches",   color: "#7c3aed", testId: "action-brand-matches" },
  { label: "Create a pitch",       description: "Write a casual, story-driven outreach email",   icon: Zap,        href: "/pitch",            color: "#0ea5e9", testId: "action-pitch-deck"    },
  { label: "Negotiator",           description: "Negotiate the finances and terms of your deal.", icon: TrendingUp, href: "/rate-calculator",  color: "#ec4899", testId: "action-negotiator"    },
];

const DEAL_VALUE_TOOLTIP = "Estimated based on median rates for your niche and deal type. Actual deal value varies significantly by brand, vertical, and negotiation.";

// ── Sub-components ────────────────────────────────────────────────────────────

function StatCard({ stat, index }: { stat: (typeof STATS)[0]; index: number }) {
  const Icon = stat.icon;
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.05 + index * 0.07 }}
      data-testid={stat.testId}
      className="bg-card border border-border rounded-2xl p-5 flex flex-col gap-3 hover:border-primary/30 transition-colors"
    >
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{stat.label}</span>
        <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: `${stat.color}20` }}>
          <Icon size={15} style={{ color: stat.color }} />
        </div>
      </div>
      <div>
        <p className="text-3xl font-extrabold text-white tracking-tight">{stat.value}</p>
        <p className="text-xs text-muted-foreground mt-1">{stat.delta}</p>
      </div>
    </motion.div>
  );
}

function DealValueTooltip() {
  const [open, setOpen] = useState(false);
  return (
    <span className="relative inline-flex items-center">
      <button
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        onClick={() => setOpen(o => !o)}
        className="ml-1 text-muted-foreground hover:text-white transition-colors"
        aria-label="Deal value info"
      >
        <Info size={12} />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 4, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 4, scale: 0.97 }}
            transition={{ duration: 0.15 }}
            className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 z-50 px-3 py-2.5 rounded-xl bg-[hsl(240_10%_10%)] border border-border text-xs text-muted-foreground leading-relaxed shadow-xl pointer-events-none"
          >
            {DEAL_VALUE_TOOLTIP}
            <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-border" />
          </motion.div>
        )}
      </AnimatePresence>
    </span>
  );
}

const STATUS_CONFIG: Record<PitchStatus, { label: string; dot: string; text: string }> = {
  draft:   { label: "Draft",   dot: "bg-white/30",     text: "text-white/50"     },
  sent:    { label: "Sent",    dot: "bg-primary",       text: "text-primary"      },
  replied: { label: "Replied", dot: "bg-emerald-400",   text: "text-emerald-400"  },
};

function PitchTrackerPanel() {
  const [statuses, setStatuses] = useState<Record<number, PitchStatus>>(
    Object.fromEntries(PITCHES_INIT.map(p => [p.id, p.status]))
  );
  const [, setLocation] = useLocation();

  const advance = (id: number) => {
    setStatuses(prev => {
      const cur = prev[id];
      if (cur === "draft") return { ...prev, [id]: "sent" };
      if (cur === "sent") return { ...prev, [id]: "replied" };
      return prev;
    });
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.22 }}
      className="bg-card border border-border rounded-2xl p-6"
    >
      <div className="flex items-center justify-between mb-1">
        <h2 className="text-sm font-bold text-white">Pitch Status Tracker</h2>
        <span className="text-xs text-muted-foreground">{PITCHES_INIT.length} brands</span>
      </div>
      <p className="text-xs text-muted-foreground mb-4">
        Est. pipeline value: <span className="text-white font-semibold">$3,400</span>
        <DealValueTooltip />
      </p>

      <div className="space-y-2">
        {PITCHES_INIT.map((pitch, i) => {
          const Icon = pitch.icon;
          const status = statuses[pitch.id];
          const cfg = STATUS_CONFIG[status];
          return (
            <motion.div
              key={pitch.id}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3, delay: 0.25 + i * 0.05 }}
              className="flex items-center gap-3 p-3 rounded-xl bg-secondary/40 border border-border"
            >
              {/* Brand icon */}
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                style={{ background: `${pitch.color}25` }}
              >
                <Icon size={14} style={{ color: pitch.color }} />
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-white leading-tight truncate">{pitch.brand}</p>
                <p className="text-xs text-muted-foreground truncate">{pitch.contact} · {pitch.date}</p>
              </div>

              {/* Status badge */}
              <div className="flex items-center gap-1.5 shrink-0">
                <div className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
                <span className={`text-xs font-semibold ${cfg.text}`}>{cfg.label}</span>
              </div>

              {/* Action button */}
              {status === "draft" && (
                <button
                  onClick={() => advance(pitch.id)}
                  className="shrink-0 px-2.5 py-1 rounded-lg text-xs font-semibold border border-primary/40 text-primary hover:bg-primary/10 transition-colors"
                >
                  Mark as sent
                </button>
              )}
              {status === "sent" && (
                <button
                  onClick={() => advance(pitch.id)}
                  className="shrink-0 px-2.5 py-1 rounded-lg text-xs font-semibold border border-emerald-500/40 text-emerald-400 hover:bg-emerald-500/10 transition-colors"
                >
                  Mark as replied
                </button>
              )}
              {status === "replied" && (
                <button
                  onClick={() => setLocation("/rate-calculator")}
                  className="shrink-0 px-2.5 py-1 rounded-lg text-xs font-semibold border border-border text-muted-foreground hover:text-white hover:border-white/30 transition-colors"
                >
                  Negotiate →
                </button>
              )}
            </motion.div>
          );
        })}
      </div>
    </motion.div>
  );
}

function ActivityRow({ item, index }: { item: (typeof ACTIVITY)[0]; index: number }) {
  const Icon = item.icon;
  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.35, delay: 0.3 + index * 0.06 }}
      data-testid={`activity-row-${item.id}`}
      className="flex items-start gap-3.5 py-3.5 border-b border-border last:border-0"
    >
      <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5" style={{ background: `${item.color}18` }}>
        <Icon size={13} style={{ color: item.color }} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-white">{item.text}</p>
        <p className="text-xs text-muted-foreground mt-0.5">{item.sub}</p>
      </div>
      <div className="flex items-center gap-1 shrink-0 text-xs text-muted-foreground">
        <Clock size={11} />
        {item.time}
      </div>
    </motion.div>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default function Dashboard() {
  const [, setLocation] = useLocation();

  return (
    <div className="min-h-screen bg-background text-foreground overflow-x-hidden">
      <Navbar />

      <main className="pt-28 pb-24 px-4">
        <div className="max-w-6xl mx-auto">

          {/* Welcome header */}
          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="mb-10 flex items-start justify-between flex-wrap gap-4"
          >
            <div>
              <div className="flex items-center gap-2 mb-3">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-primary/15 text-primary border border-primary/30">
                  <Activity size={11} />
                  Music Niche
                </span>
                <span className="text-xs text-muted-foreground">Last synced: today</span>
              </div>
              <h1 className="text-4xl font-extrabold text-white tracking-tight mb-1.5">Welcome back, Creator</h1>
              <p className="text-muted-foreground text-base">
                You have <span className="text-white font-semibold">2 pitches in progress</span> and{" "}
                <span className="text-white font-semibold">1 brand response</span> waiting. Let's close some deals.
              </p>
            </div>
            <button
              data-testid="button-find-matches"
              onClick={() => setLocation("/brand-matches")}
              className="flex items-center gap-2 px-5 py-3 rounded-xl bg-primary hover:bg-primary/90 text-white font-bold text-sm shadow-lg shadow-primary/30 transition-all hover:-translate-y-0.5"
            >
              <Sparkles size={15} />
              Find New Matches
            </button>
          </motion.div>

          {/* Stat cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            {STATS.map((s, i) => <StatCard key={s.label} stat={s} index={i} />)}
          </div>

          {/* Main grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

            {/* ── Left: quick actions + pitch tracker + activity ── */}
            <div className="lg:col-span-2 flex flex-col gap-6">

              {/* Quick actions */}
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.18 }}
                className="bg-card border border-border rounded-2xl p-6"
              >
                <h2 className="text-sm font-bold text-white mb-4">Quick Actions</h2>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {QUICK_ACTIONS.map((action) => {
                    const Icon = action.icon;
                    return (
                      <button
                        key={action.label}
                        data-testid={action.testId}
                        onClick={() => setLocation(action.href)}
                        className="group flex flex-col items-start gap-3 p-4 rounded-xl border border-border hover:border-primary/40 bg-secondary/40 hover:bg-secondary transition-all text-left"
                      >
                        <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: `${action.color}20` }}>
                          <Icon size={16} style={{ color: action.color }} />
                        </div>
                        <div>
                          <p className="text-sm font-bold text-white leading-tight">{action.label}</p>
                          <p className="text-xs text-muted-foreground mt-1 leading-snug">{action.description}</p>
                        </div>
                        <ArrowRight size={13} className="text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 transition-all mt-auto" />
                      </button>
                    );
                  })}
                </div>
              </motion.div>

              {/* Pitch status tracker */}
              <PitchTrackerPanel />

              {/* Recent activity */}
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.28 }}
                className="bg-card border border-border rounded-2xl p-6"
              >
                <div className="flex items-center justify-between mb-2">
                  <h2 className="text-sm font-bold text-white">Recent Activity</h2>
                  <span className="text-xs text-muted-foreground">{ACTIVITY.length} events</span>
                </div>
                <div>
                  {ACTIVITY.map((item, i) => <ActivityRow key={item.id} item={item} index={i} />)}
                </div>
              </motion.div>
            </div>

            {/* ── Right sidebar ── */}
            <div className="flex flex-col gap-5">

              {/* Top matches */}
              <motion.div
                initial={{ opacity: 0, x: 16 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.4, delay: 0.12 }}
                className="bg-card border border-border rounded-2xl p-5"
              >
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-sm font-bold text-white">Top Matches</h2>
                  <button
                    data-testid="button-view-all-matches"
                    onClick={() => setLocation("/brand-matches")}
                    className="text-xs text-primary hover:text-primary/80 font-semibold flex items-center gap-1 transition-colors"
                  >
                    View all <ChevronRight size={12} />
                  </button>
                </div>
                <div className="flex flex-col gap-2">
                  {TOP_MATCHES.map((brand, i) => {
                    const Icon = brand.Icon;
                    return (
                      <motion.button
                        key={brand.name}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3, delay: 0.2 + i * 0.07 }}
                        data-testid={`card-top-match-${brand.slug}`}
                        onClick={() => setLocation(`/brands/${brand.slug}`)}
                        className="group flex items-center gap-3 p-3 rounded-xl border border-border hover:border-primary/40 hover:bg-secondary transition-all text-left"
                      >
                        <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: `${brand.color}25` }}>
                          <Icon size={15} style={{ color: brand.color }} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-bold text-white">{brand.name}</p>
                          <p className="text-xs text-muted-foreground truncate">{brand.category}</p>
                        </div>
                        <div className="flex flex-col items-end gap-0.5">
                          <span className="text-sm font-black text-primary">{brand.score}%</span>
                          <span className="text-xs text-muted-foreground">match</span>
                        </div>
                      </motion.button>
                    );
                  })}
                </div>
              </motion.div>

              {/* Pro tip */}
              <motion.div
                initial={{ opacity: 0, x: 16 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.4, delay: 0.2 }}
                className="rounded-2xl p-5 border border-primary/25"
                style={{ background: "linear-gradient(135deg, hsl(262 83% 10%), hsl(262 83% 6%))" }}
              >
                <div className="flex items-center gap-2 mb-2">
                  <Sparkles size={13} className="text-primary" />
                  <span className="text-xs font-bold text-primary uppercase tracking-wider">Pro Tip</span>
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Creators who pitch within <span className="text-white font-semibold">48 hours</span> of a brand match are{" "}
                  <span className="text-white font-semibold">3.2× more likely</span> to get a response. You have 4 matches waiting.
                </p>
                <button
                  data-testid="button-pitch-now"
                  onClick={() => setLocation("/pitch")}
                  className="mt-3 flex items-center gap-1.5 text-xs font-bold text-primary hover:text-primary/80 transition-colors"
                >
                  Pitch now <ArrowRight size={11} />
                </button>
              </motion.div>

              {/* DollarSign / Deal value summary */}
              <motion.div
                initial={{ opacity: 0, x: 16 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.4, delay: 0.28 }}
                className="bg-card border border-border rounded-2xl p-5"
              >
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: "#f59e0b20" }}>
                    <DollarSign size={13} style={{ color: "#f59e0b" }} />
                  </div>
                  <span className="text-xs font-bold text-white uppercase tracking-wider">Est. Deal Value</span>
                </div>
                <div className="flex items-baseline gap-1">
                  <span className="text-2xl font-extrabold text-white">$3,400</span>
                  <DealValueTooltip />
                </div>
                <p className="text-xs text-muted-foreground mt-1">Across open pitches</p>
              </motion.div>

            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
