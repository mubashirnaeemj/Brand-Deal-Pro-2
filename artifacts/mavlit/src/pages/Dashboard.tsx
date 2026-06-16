import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useLocation } from "wouter";
import {
  Users, Zap, TrendingUp, ShieldCheck,
  Headphones, Music, Cpu, ChevronRight,
} from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import ReplyLoggerModal from "@/components/ReplyLoggerModal";

// ── Stats ─────────────────────────────────────────────────────────────────────

const STATS = [
  { label: "Brand Matches",     value: "6",   sub: "+3 this week",          icon: Users,       color: "#7c3aed" },
  { label: "Active Deals",      value: "3",   sub: "2 in progress",         icon: Zap,         color: "#0ea5e9" },
  { label: "Response Rate",     value: "34%", sub: "+8% vs last month",     icon: TrendingUp,  color: "#10b981" },
  { label: "Verified Contacts", value: "6",   sub: "Across matched brands", icon: ShieldCheck, color: "#f59e0b" },
];

// ── Deals ─────────────────────────────────────────────────────────────────────

type DealAction = "navigate" | "modal";

interface Deal {
  id: number;
  brand: string;
  pipelineId?: string;
  Icon: React.ElementType;
  color: string;
  contact: string;
  stage: string;
  stageBg: string;
  stageText: string;
  time: string;
  actionLabel: string;
  actionType: DealAction;
  actionHref?: string;
}

const DEALS: Deal[] = [
  {
    id: 1,
    brand: "Sennheiser",
    pipelineId: "sennheiser",
    Icon: Headphones,
    color: "#7c3aed",
    contact: "Sarah Chen",
    stage: "Sent",
    stageBg: "bg-violet-500/15",
    stageText: "text-violet-400",
    time: "6 days ago",
    actionLabel: "Generate follow-up →",
    actionType: "navigate",
    actionHref: "/pitch?mode=followup&brand=Sennheiser",
  },
  {
    id: 2,
    brand: "Spotify for Artists",
    pipelineId: "spotify",
    Icon: Music,
    color: "#1db954",
    contact: "Marcus Williams",
    stage: "Replied",
    stageBg: "bg-sky-500/15",
    stageText: "text-sky-400",
    time: "2 days ago",
    actionLabel: "Log their reply →",
    actionType: "modal",
  },
  {
    id: 3,
    brand: "Native Instruments",
    pipelineId: "native-instruments",
    Icon: Cpu,
    color: "#f59e0b",
    contact: "Priya Sharma",
    stage: "Negotiating",
    stageBg: "bg-amber-500/15",
    stageText: "text-amber-400",
    time: "1 day ago",
    actionLabel: "Open deal →",
    actionType: "navigate",
    actionHref: "/deals",
  },
];

// ── Page ──────────────────────────────────────────────────────────────────────

export default function Dashboard() {
  const [, setLocation] = useLocation();
  const [replyDeal, setReplyDeal] = useState<Deal | null>(null);

  return (
    <div className="min-h-screen bg-background text-foreground overflow-x-hidden">
      <Navbar />

      <main className="pt-28 pb-24 px-4">
        <div className="max-w-5xl mx-auto flex flex-col gap-8">

          {/* Stats row */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {STATS.map((s, i) => {
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
                    <p className="text-3xl font-extrabold text-white tracking-tight">{s.value}</p>
                    <p className="text-xs text-muted-foreground mt-1">{s.sub}</p>
                  </div>
                </motion.div>
              );
            })}
          </div>

          {/* Quick Actions */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.15 }}
            className="bg-card border border-border rounded-2xl p-6"
          >
            <h2 className="text-sm font-bold text-white mb-4">Quick Actions</h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
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

              <button onClick={() => setLocation("/pitch?mode=inbound")}
                className="group flex flex-col items-start gap-3 p-4 rounded-xl border border-border hover:border-primary/40 bg-secondary/40 hover:bg-secondary transition-all text-left">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: "#10b98120" }}>
                  <TrendingUp size={16} style={{ color: "#10b981" }} />
                </div>
                <div>
                  <p className="text-sm font-bold text-white leading-tight">A brand contacted me →</p>
                  <p className="text-xs text-muted-foreground mt-1 leading-snug">A brand reached out — figure out how to respond</p>
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
              <h2 className="text-sm font-bold text-white">My Deals</h2>
              <button onClick={() => setLocation("/deals")}
                className="text-xs text-primary hover:text-primary/80 font-semibold flex items-center gap-1 transition-colors">
                View all <ChevronRight size={12} />
              </button>
            </div>

            <div className="flex flex-col gap-2">
              {DEALS.map((deal, i) => {
                const Icon = deal.Icon;
                return (
                  <motion.div
                    key={deal.id}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.3, delay: 0.28 + i * 0.06 }}
                    className="flex items-center gap-3 p-3.5 rounded-xl bg-secondary/40 border border-border"
                  >
                    <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0" style={{ background: `${deal.color}25` }}>
                      <Icon size={15} style={{ color: deal.color }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-white leading-tight truncate">{deal.brand}</p>
                      <p className="text-xs text-muted-foreground truncate">{deal.contact}</p>
                    </div>
                    <span className={`shrink-0 px-2.5 py-0.5 rounded-full text-xs font-semibold ${deal.stageBg} ${deal.stageText}`}>
                      {deal.stage}
                    </span>
                    <span className="shrink-0 text-xs text-muted-foreground hidden sm:block">{deal.time}</span>
                    <button
                      onClick={() => {
                        if (deal.actionType === "modal") {
                          setReplyDeal(deal);
                        } else if (deal.actionHref) {
                          setLocation(deal.actionHref);
                        }
                      }}
                      className="shrink-0 px-3 py-1.5 rounded-lg text-xs font-semibold border border-border text-white/70 hover:text-white hover:border-primary/50 hover:bg-primary/10 transition-all whitespace-nowrap"
                    >
                      {deal.actionLabel}
                    </button>
                  </motion.div>
                );
              })}
            </div>
          </motion.div>

        </div>
      </main>

      <Footer />

      <AnimatePresence>
        {replyDeal && (
          <ReplyLoggerModal
            brandName={replyDeal.brand}
            dealId={replyDeal.pipelineId}
            onClose={() => setReplyDeal(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
