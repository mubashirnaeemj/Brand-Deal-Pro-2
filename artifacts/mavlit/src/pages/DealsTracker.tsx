import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus,
  DollarSign,
  TrendingUp,
  Briefcase,
  CheckCircle2,
  X,
  ChevronRight,
  MoreHorizontal,
  Calendar,
  Tag,
  ArrowRight,
  Trash2,
} from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

// ── Types & constants ─────────────────────────────────────────────────────────

type Status = "Pitched" | "Negotiating" | "Signed" | "Completed";

const STATUSES: Status[] = ["Pitched", "Negotiating", "Signed", "Completed"];

const STATUS_META: Record<Status, { color: string; bg: string; border: string; dot: string }> = {
  Pitched:     { color: "#0ea5e9", bg: "bg-sky-500/10",     border: "border-sky-500/30",     dot: "bg-sky-500"     },
  Negotiating: { color: "#f59e0b", bg: "bg-amber-500/10",   border: "border-amber-500/30",   dot: "bg-amber-500"   },
  Signed:      { color: "#7c3aed", bg: "bg-violet-500/10",  border: "border-violet-500/30",  dot: "bg-violet-500"  },
  Completed:   { color: "#10b981", bg: "bg-emerald-500/10", border: "border-emerald-500/30", dot: "bg-emerald-500" },
};

interface Deal {
  id: string;
  brand: string;
  category: string;
  dealType: string;
  rate: number;
  status: Status;
  date: string;
  notes: string;
}

const INITIAL_DEALS: Deal[] = [
  { id: "1", brand: "Fender",            category: "Instruments", dealType: "Reel + Story",          rate: 1200, status: "Signed",      date: "Jun 1, 2026",  notes: "Awaiting final contract signature."         },
  { id: "2", brand: "Sennheiser",        category: "Audio",       dealType: "YouTube Integration",   rate: 950,  status: "Negotiating", date: "May 28, 2026", notes: "Discussing exclusivity window."              },
  { id: "3", brand: "Native Instruments",category: "Software",    dealType: "Sponsored Video",       rate: 800,  status: "Pitched",     date: "May 25, 2026", notes: "Sent pitch deck, awaiting reply."           },
  { id: "4", brand: "Spotify",           category: "Streaming",   dealType: "Sponsored Post",        rate: 600,  status: "Completed",   date: "May 10, 2026", notes: "Paid. Post published May 12."               },
  { id: "5", brand: "GoPro",            category: "Lifestyle",   dealType: "Short-form + Story",    rate: 750,  status: "Pitched",     date: "May 30, 2026", notes: "Following up Friday."                       },
  { id: "6", brand: "Red Bull",          category: "Beverage",    dealType: "Event Coverage Post",   rate: 500,  status: "Completed",   date: "Apr 22, 2026", notes: "Campaign closed. Great partnership."        },
];

const DEAL_TYPES = [
  "Sponsored Post (Feed)",
  "Reel + Story",
  "Short-form + Story",
  "YouTube Integration",
  "Sponsored Video",
  "Dedicated Video",
  "Story Bundle (3)",
  "Event Coverage Post",
  "Ambassador (Monthly)",
];

// ── Helpers ───────────────────────────────────────────────────────────────────

function uid() {
  return Math.random().toString(36).slice(2, 9);
}

function fmt(n: number) {
  return `$${n >= 1000 ? `${(n / 1000).toFixed(1)}K` : n}`;
}

const nextStatus: Record<Status, Status | null> = {
  Pitched:     "Negotiating",
  Negotiating: "Signed",
  Signed:      "Completed",
  Completed:   null,
};

// ── Deal Card ─────────────────────────────────────────────────────────────────

function DealCard({
  deal,
  onAdvance,
  onDelete,
  index,
}: {
  deal: Deal;
  onAdvance: (id: string) => void;
  onDelete: (id: string) => void;
  index: number;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const meta = STATUS_META[deal.status];
  const next = nextStatus[deal.status];

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.3, delay: index * 0.04 }}
      data-testid={`card-deal-${deal.id}`}
      className="bg-background border border-border rounded-xl p-4 flex flex-col gap-3 hover:border-primary/30 transition-colors group"
    >
      {/* Top row */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-white truncate">{deal.brand}</p>
          <span className="text-xs text-muted-foreground">{deal.category}</span>
        </div>
        <div className="relative">
          <button
            data-testid={`button-menu-${deal.id}`}
            onClick={() => setMenuOpen((o) => !o)}
            className="p-1.5 rounded-lg text-muted-foreground hover:text-white hover:bg-secondary transition-all opacity-0 group-hover:opacity-100"
          >
            <MoreHorizontal size={14} />
          </button>
          <AnimatePresence>
            {menuOpen && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: -4 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.15 }}
                className="absolute right-0 top-8 z-20 w-36 bg-card border border-border rounded-xl overflow-hidden shadow-2xl"
              >
                {next && (
                  <button
                    data-testid={`button-advance-${deal.id}`}
                    onClick={() => { onAdvance(deal.id); setMenuOpen(false); }}
                    className="w-full flex items-center gap-2 px-3 py-2.5 text-xs font-semibold text-white hover:bg-secondary transition-colors"
                  >
                    <ArrowRight size={12} className="text-primary" />
                    Move to {next}
                  </button>
                )}
                <button
                  data-testid={`button-delete-${deal.id}`}
                  onClick={() => { onDelete(deal.id); setMenuOpen(false); }}
                  className="w-full flex items-center gap-2 px-3 py-2.5 text-xs font-semibold text-red-400 hover:bg-secondary transition-colors"
                >
                  <Trash2 size={12} />
                  Delete
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Rate */}
      <div className="flex items-center gap-1.5">
        <DollarSign size={13} className="text-primary" />
        <span className="text-base font-black text-white">{fmt(deal.rate)}</span>
      </div>

      {/* Meta */}
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Tag size={11} />
          <span className="truncate">{deal.dealType}</span>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Calendar size={11} />
          <span>{deal.date}</span>
        </div>
      </div>

      {deal.notes && (
        <p className="text-xs text-muted-foreground/70 leading-relaxed border-t border-border pt-2.5 italic">
          {deal.notes}
        </p>
      )}

      {/* Advance button */}
      {next && (
        <button
          data-testid={`button-advance-inline-${deal.id}`}
          onClick={() => onAdvance(deal.id)}
          className="w-full flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-semibold border border-border text-muted-foreground hover:border-primary/50 hover:text-white transition-all mt-auto"
        >
          Move to {next}
          <ChevronRight size={11} />
        </button>
      )}
      {!next && (
        <div className="flex items-center gap-1.5 text-xs text-emerald-400 font-semibold pt-1 mt-auto">
          <CheckCircle2 size={12} />
          Deal Closed
        </div>
      )}
    </motion.div>
  );
}

// ── Add Deal Modal ────────────────────────────────────────────────────────────

const EMPTY_FORM = { brand: "", category: "", dealType: DEAL_TYPES[0], rate: "", status: "Pitched" as Status, notes: "" };
const inputCls = "w-full px-4 py-2.5 rounded-xl bg-secondary border border-border text-white placeholder:text-muted-foreground/50 text-sm font-medium focus:outline-none focus:border-primary/60 focus:ring-1 focus:ring-primary/30 transition-all";

function AddDealModal({ onAdd, onClose }: { onAdd: (d: Deal) => void; onClose: () => void }) {
  const [form, setForm] = useState(EMPTY_FORM);
  const [error, setError] = useState("");

  const set = (field: keyof typeof EMPTY_FORM, v: string) =>
    setForm((f) => ({ ...f, [field]: v }));

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.brand.trim()) { setError("Brand name is required."); return; }
    const rate = parseFloat(form.rate);
    if (!rate || rate <= 0) { setError("Enter a valid deal rate."); return; }
    onAdd({
      id: uid(),
      brand: form.brand.trim(),
      category: form.category.trim() || "Uncategorized",
      dealType: form.dealType,
      rate,
      status: form.status,
      notes: form.notes.trim(),
      date: new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
    });
    onClose();
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ duration: 0.25 }}
        className="bg-card border border-border rounded-2xl w-full max-w-md overflow-hidden"
      >
        {/* Modal header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <div className="flex items-center gap-2">
            <Plus size={15} className="text-primary" />
            <span className="text-sm font-bold text-white">Add New Deal</span>
          </div>
          <button
            data-testid="button-close-modal"
            onClick={onClose}
            className="p-1.5 rounded-lg text-muted-foreground hover:text-white hover:bg-secondary transition-all"
          >
            <X size={15} />
          </button>
        </div>

        <form onSubmit={submit} className="p-6 flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5 col-span-2">
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Brand Name</label>
              <input data-testid="input-modal-brand" type="text" value={form.brand} onChange={(e) => set("brand", e.target.value)} placeholder="e.g. Fender" className={inputCls} />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Category</label>
              <input data-testid="input-modal-category" type="text" value={form.category} onChange={(e) => set("category", e.target.value)} placeholder="e.g. Audio" className={inputCls} />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Deal Rate ($)</label>
              <input data-testid="input-modal-rate" type="number" min="0" value={form.rate} onChange={(e) => set("rate", e.target.value)} placeholder="e.g. 800" className={inputCls} />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Deal Type</label>
            <div className="relative">
              <select data-testid="select-modal-deal-type" value={form.dealType} onChange={(e) => set("dealType", e.target.value)} className={`${inputCls} appearance-none cursor-pointer`}>
                {DEAL_TYPES.map((t) => <option key={t} value={t} className="bg-background">{t}</option>)}
              </select>
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Status</label>
            <div className="grid grid-cols-2 gap-2">
              {STATUSES.map((s) => {
                const m = STATUS_META[s];
                return (
                  <button
                    key={s}
                    type="button"
                    data-testid={`modal-status-${s.toLowerCase()}`}
                    onClick={() => set("status", s)}
                    className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-xs font-semibold transition-all ${
                      form.status === s ? `${m.bg} ${m.border}` : "border-border text-muted-foreground hover:border-border/80"
                    }`}
                    style={{ color: form.status === s ? m.color : undefined }}
                  >
                    <div className={`w-1.5 h-1.5 rounded-full ${m.dot}`} />
                    {s}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Notes <span className="normal-case font-normal">(optional)</span></label>
            <textarea data-testid="textarea-modal-notes" value={form.notes} onChange={(e) => set("notes", e.target.value)} rows={2} placeholder="Any context about this deal..." className={`${inputCls} resize-none`} />
          </div>

          {error && <p className="text-xs text-destructive">{error}</p>}

          <button
            type="submit"
            data-testid="button-modal-save"
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-primary hover:bg-primary/90 text-white font-bold text-sm shadow-lg shadow-primary/30 transition-all mt-1"
          >
            <Plus size={15} />
            Add Deal
          </button>
        </form>
      </motion.div>
    </motion.div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function DealsTracker() {
  const [deals, setDeals]       = useState<Deal[]>(INITIAL_DEALS);
  const [modalOpen, setModal]   = useState(false);

  const totalEarned   = deals.filter((d) => d.status === "Completed").reduce((s, d) => s + d.rate, 0);
  const totalPipeline = deals.filter((d) => d.status !== "Completed").reduce((s, d) => s + d.rate, 0);
  const avgDeal       = deals.length ? Math.round(deals.reduce((s, d) => s + d.rate, 0) / deals.length) : 0;

  const advance = (id: string) =>
    setDeals((prev) =>
      prev.map((d) => {
        if (d.id !== id) return d;
        const n = nextStatus[d.status];
        return n ? { ...d, status: n } : d;
      })
    );

  const remove = (id: string) => setDeals((prev) => prev.filter((d) => d.id !== id));

  const addDeal = (deal: Deal) => setDeals((prev) => [deal, ...prev]);

  return (
    <div className="min-h-screen bg-background text-foreground overflow-x-hidden">
      <Navbar />

      <main className="pt-28 pb-24 px-4">
        <div className="max-w-7xl mx-auto">

          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="flex items-start justify-between gap-4 flex-wrap mb-8"
          >
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Briefcase size={14} className="text-primary" />
                <span className="text-xs font-semibold text-primary uppercase tracking-wider">Deals Tracker</span>
              </div>
              <h1 className="text-4xl font-extrabold text-white tracking-tight mb-1.5">
                Your Deal Pipeline
              </h1>
              <p className="text-muted-foreground text-base">
                Track every brand deal from first pitch to final payment.
              </p>
            </div>
            <button
              data-testid="button-add-deal"
              onClick={() => setModal(true)}
              className="flex items-center gap-2 px-5 py-3 rounded-xl bg-primary hover:bg-primary/90 text-white font-bold text-sm shadow-lg shadow-primary/30 transition-all hover:-translate-y-0.5"
            >
              <Plus size={16} />
              Add Deal
            </button>
          </motion.div>

          {/* Summary stats */}
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.06 }}
            className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8"
          >
            {[
              { label: "Total Earned",    value: `$${totalEarned.toLocaleString()}`, icon: DollarSign,  color: "#10b981", sub: "From completed deals"         },
              { label: "In Pipeline",     value: `$${totalPipeline.toLocaleString()}`,icon: TrendingUp, color: "#7c3aed", sub: "Across active stages"         },
              { label: "Avg. Deal Size",  value: `$${avgDeal.toLocaleString()}`,     icon: Briefcase,   color: "#0ea5e9", sub: "All deals"                    },
              { label: "Total Deals",     value: `${deals.length}`,                  icon: CheckCircle2,color: "#f59e0b", sub: `${deals.filter((d) => d.status === "Completed").length} completed` },
            ].map(({ label, value, icon: Icon, color, sub }, i) => (
              <motion.div
                key={label}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35, delay: 0.1 + i * 0.06 }}
                className="bg-card border border-border rounded-2xl p-5"
              >
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{label}</span>
                  <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: `${color}20` }}>
                    <Icon size={13} style={{ color }} />
                  </div>
                </div>
                <p className="text-2xl font-extrabold text-white">{value}</p>
                <p className="text-xs text-muted-foreground mt-1">{sub}</p>
              </motion.div>
            ))}
          </motion.div>

          {/* Kanban board */}
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
            {STATUSES.map((status, colIdx) => {
              const meta   = STATUS_META[status];
              const column = deals.filter((d) => d.status === status);
              const colTotal = column.reduce((s, d) => s + d.rate, 0);

              return (
                <motion.div
                  key={status}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: 0.18 + colIdx * 0.06 }}
                  className="flex flex-col"
                >
                  {/* Column header */}
                  <div className={`flex items-center justify-between px-4 py-3 rounded-xl mb-3 border ${meta.bg} ${meta.border}`}>
                    <div className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${meta.dot}`} />
                      <span className="text-sm font-bold" style={{ color: meta.color }}>{status}</span>
                      <span
                        className="w-5 h-5 rounded-full flex items-center justify-center text-xs font-black text-white"
                        style={{ background: meta.color + "33" }}
                      >
                        {column.length}
                      </span>
                    </div>
                    {colTotal > 0 && (
                      <span className="text-xs font-semibold" style={{ color: meta.color }}>
                        {fmt(colTotal)}
                      </span>
                    )}
                  </div>

                  {/* Cards */}
                  <div className="flex flex-col gap-3 flex-1">
                    <AnimatePresence>
                      {column.map((deal, i) => (
                        <DealCard
                          key={deal.id}
                          deal={deal}
                          onAdvance={advance}
                          onDelete={remove}
                          index={i}
                        />
                      ))}
                    </AnimatePresence>

                    {column.length === 0 && (
                      <div className="flex items-center justify-center py-10 rounded-xl border border-dashed border-border text-xs text-muted-foreground/50">
                        No deals here yet
                      </div>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      </main>

      {/* Add Deal Modal */}
      <AnimatePresence>
        {modalOpen && <AddDealModal onAdd={addDeal} onClose={() => setModal(false)} />}
      </AnimatePresence>

      <Footer />
    </div>
  );
}
