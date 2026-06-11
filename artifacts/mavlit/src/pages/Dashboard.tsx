import { motion } from "framer-motion";
import { useLocation } from "wouter";
import {
  Zap,
  Mail,
  TrendingUp,
  Users,
  DollarSign,
  BarChart3,
  ArrowRight,
  CheckCircle2,
  Clock,
  Sparkles,
  ChevronRight,
  Activity,
  Headphones,
  Music,
} from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

// ── Data ──────────────────────────────────────────────────────────────────────

const STATS = [
  {
    label: "Brand Matches",
    value: "6",
    delta: "+3 this week",
    positive: true,
    icon: Users,
    color: "#7c3aed",
    testId: "stat-matches",
  },
  {
    label: "Active Pitches",
    value: "2",
    delta: "1 awaiting reply",
    positive: true,
    icon: Zap,
    color: "#0ea5e9",
    testId: "stat-pitches",
  },
  {
    label: "Response Rate",
    value: "34%",
    delta: "+8% vs last month",
    positive: true,
    icon: TrendingUp,
    color: "#10b981",
    testId: "stat-response-rate",
  },
  {
    label: "Est. Deal Value",
    value: "$3,400",
    delta: "Across open pitches",
    positive: true,
    icon: DollarSign,
    color: "#f59e0b",
    testId: "stat-deal-value",
  },
];

const ACTIVITY = [
  {
    id: 1,
    icon: CheckCircle2,
    color: "#10b981",
    text: "Pitch email drafted for Fender",
    sub: "Ready to send",
    time: "Just now",
  },
  {
    id: 2,
    icon: Sparkles,
    color: "#7c3aed",
    text: "6 new brand matches found",
    sub: "Music niche · Updated daily",
    time: "2 hours ago",
  },
  {
    id: 3,
    icon: Mail,
    color: "#0ea5e9",
    text: "Outreach email drafted for Fender",
    sub: "Pending send",
    time: "Today",
  },
  {
    id: 4,
    icon: CheckCircle2,
    color: "#10b981",
    text: "Sennheiser responded to your pitch",
    sub: "Interested — follow-up requested",
    time: "Yesterday",
  },
  {
    id: 5,
    icon: BarChart3,
    color: "#f59e0b",
    text: "Platform stats sync completed",
    sub: "Instagram · TikTok · YouTube · Facebook",
    time: "2 days ago",
  },
];

const TOP_MATCHES = [
  { name: "Fender",       score: 93, color: "#ef4444", Icon: Music,      category: "Musical Instruments", slug: "fender" },
  { name: "Sennheiser",   score: 97, color: "#7c3aed", Icon: Headphones, category: "Audio",               slug: "sennheiser" },
  { name: "Spotify",      score: 94, color: "#1db954", Icon: Music,      category: "Streaming",           slug: "spotify" },
];

const QUICK_ACTIONS = [
  {
    label: "Browse Brand Matches",
    description: "See all 6 brands matched to your profile",
    icon: Users,
    href: "/brand-matches",
    color: "#7c3aed",
    testId: "action-brand-matches",
  },
  {
    label: "Create a pitch",
    description: "Write a casual, story-driven outreach email",
    icon: Zap,
    href: "/pitch",
    color: "#0ea5e9",
    testId: "action-pitch-deck",
  },
  {
    label: "Negotiator",
    description: "Negotiate the finances and terms of your brand deal.",
    icon: TrendingUp,
    href: "/rate-calculator",
    color: "#ec4899",
    testId: "action-negotiator",
  },
];

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
        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          {stat.label}
        </span>
        <div
          className="w-8 h-8 rounded-lg flex items-center justify-center"
          style={{ background: `${stat.color}20` }}
        >
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
      <div
        className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5"
        style={{ background: `${item.color}18` }}
      >
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
              <h1 className="text-4xl font-extrabold text-white tracking-tight mb-1.5">
                Welcome back, Creator
              </h1>
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

            {/* ── Left: activity + quick actions ── */}
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
                        <div
                          className="w-9 h-9 rounded-xl flex items-center justify-center"
                          style={{ background: `${action.color}20` }}
                        >
                          <Icon size={16} style={{ color: action.color }} />
                        </div>
                        <div>
                          <p className="text-sm font-bold text-white leading-tight">{action.label}</p>
                          <p className="text-xs text-muted-foreground mt-1 leading-snug">{action.description}</p>
                        </div>
                        <ArrowRight
                          size={13}
                          className="text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 transition-all mt-auto"
                        />
                      </button>
                    );
                  })}
                </div>
              </motion.div>

              {/* Recent activity */}
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.24 }}
                className="bg-card border border-border rounded-2xl p-6"
              >
                <div className="flex items-center justify-between mb-2">
                  <h2 className="text-sm font-bold text-white">Recent Activity</h2>
                  <span className="text-xs text-muted-foreground">{ACTIVITY.length} events</span>
                </div>
                <div>
                  {ACTIVITY.map((item, i) => (
                    <ActivityRow key={item.id} item={item} index={i} />
                  ))}
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
                        <div
                          className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                          style={{ background: `${brand.color}25` }}
                        >
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

              {/* Pitch health */}
              <motion.div
                initial={{ opacity: 0, x: 16 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.4, delay: 0.2 }}
                className="bg-card border border-border rounded-2xl p-5"
              >
                <h2 className="text-sm font-bold text-white mb-4">Pitch Pipeline</h2>
                <div className="flex flex-col gap-3">
                  {[
                    { brand: "Fender",     status: "Deck Ready",       color: "#7c3aed", dot: "bg-violet-500" },
                    { brand: "Sennheiser", status: "Response Received", color: "#10b981", dot: "bg-emerald-500" },
                  ].map((p) => (
                    <div key={p.brand} className="flex items-center gap-3 p-3 rounded-xl bg-secondary border border-border">
                      <div className={`w-2 h-2 rounded-full shrink-0 ${p.dot}`} />
                      <div className="flex-1">
                        <p className="text-sm font-bold text-white">{p.brand}</p>
                        <p className="text-xs" style={{ color: p.color }}>{p.status}</p>
                      </div>
                    </div>
                  ))}
                  <p className="text-xs text-muted-foreground text-center pt-1">
                    2 of 6 matches pitched
                  </p>
                </div>
              </motion.div>

              {/* Pro tip */}
              <motion.div
                initial={{ opacity: 0, x: 16 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.4, delay: 0.28 }}
                className="rounded-2xl p-5 border border-primary/25"
                style={{ background: "linear-gradient(135deg, hsl(262 83% 10%), hsl(262 83% 6%))" }}
              >
                <div className="flex items-center gap-2 mb-2">
                  <Sparkles size={13} className="text-primary" />
                  <span className="text-xs font-bold text-primary uppercase tracking-wider">Pro Tip</span>
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Creators who pitch within <span className="text-white font-semibold">48 hours</span> of a brand match are{" "}
                  <span className="text-white font-semibold">3.2× more likely</span> to get a response. You have 2 matches waiting.
                </p>
                <button
                  data-testid="button-pitch-now"
                  onClick={() => setLocation("/pitch")}
                  className="mt-3 flex items-center gap-1.5 text-xs font-bold text-primary hover:text-primary/80 transition-colors"
                >
                  Pitch now <ArrowRight size={11} />
                </button>
              </motion.div>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
