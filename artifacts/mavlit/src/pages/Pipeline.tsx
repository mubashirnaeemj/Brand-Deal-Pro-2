import { useState, useEffect, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api, ApiRequestError, getAllPitches, type ApiPitch, type PitchUpdateRequest } from "@/lib/api";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import {
  Headphones, Music, Cpu, Camera, ShoppingBag, Zap,
  ChevronDown, ChevronUp, Copy, Check, Sparkles, AlertTriangle, Building2, Users, BookOpen, Plus, Trash2, Search, X,
} from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { useAuth } from "@/contexts/AuthContext";

// ── Types ──────────────────────────────────────────────────────────────────────

interface PitchRecord {
  id: number;
  brand: string;
  pitchText?: string | null;
  date: string;
  status: string;
  agreedRate?: string;
  sentAt: string | null;
  brandId?: number | null;   // brands_raw id of the pitched brand, when it is in MAVLIT's database
}

interface DealContext {
  deliverable: string;
  exclusivity: "" | "None" | "Narrow" | "Broad";
  exclusivityMonths: string;
  usage: "" | "Organic only" | "Includes paid usage or whitelisting";
}

// ── Brand database ─────────────────────────────────────────────────────────────

const BRAND_DB: Record<string, {
  Icon: React.ElementType; color: string; category: string;
  type: "agency" | "in-house"; signal: string;
}> = {
  "Sennheiser":          { Icon: Headphones,  color: "#7c3aed", category: "Audio",     type: "agency",   signal: "Q4 focus on studio and gaming headphones across creator channels"   },
  "Spotify for Artists": { Icon: Music,        color: "#1db954", category: "Streaming", type: "in-house", signal: "Creator economy partnership push — looking for music production voices" },
  "Native Instruments":  { Icon: Cpu,          color: "#f59e0b", category: "Software",  type: "agency",   signal: "Back-to-school promotion for MASCHINE and Komplete bundles"          },
  "GoPro":               { Icon: Camera,       color: "#0ea5e9", category: "Lifestyle", type: "in-house", signal: "Creator ambassador program — studio and live performance content"      },
  "Sweetwater":          { Icon: ShoppingBag,  color: "#ec4899", category: "Retail",    type: "in-house", signal: "Holiday season gear bundle promotion — gear review content preferred"  },
  "Red Bull":            { Icon: Zap,          color: "#ef4444", category: "Beverage",  type: "agency",   signal: "Music culture content series — studio sessions and live events"        },
};

// ── Deal context data ──────────────────────────────────────────────────────────

// Every deal is for Instagram, so there is no platform choice.
const DEAL_PLATFORM = "Instagram";

const DELIVERABLE_TYPES = ["Reel", "Story", "Static post", "Instagram Live"];

const EMPTY_DEAL_CONTEXT: DealContext = {
  deliverable: "", exclusivity: "", exclusivityMonths: "", usage: "",
};

function readCreatorRate(platform: string, deliverable: string): { amount: string; includesExclusivity: boolean; includesPaidUsage: boolean } | null {
  try {
    const raw = localStorage.getItem("mavlit_creator_profile");
    if (!raw) return null;
    const profile = JSON.parse(raw) as { rates?: Record<string, { amount?: string; includesExclusivity?: boolean; includesPaidUsage?: boolean }> };
    const entry = profile.rates?.[`${platform}|${deliverable}`];
    if (!entry?.amount?.trim()) return null;
    return { amount: entry.amount.trim(), includesExclusivity: !!entry.includesExclusivity, includesPaidUsage: !!entry.includesPaidUsage };
  } catch { return null; }
}

// ── Creator profile (demo) ─────────────────────────────────────────────────────

const CREATOR_PROFILE = {
  name: "Alex Morgan", handle: "alexmorganmusic", platform: "YouTube",
  followers: "82K", engagementRate: "5.2",
  niche: "Music Production & Gear Reviews", pastPartnerships: "AudioTechnica, Ableton, Sweetwater",
};

function formatRate(rate: string): string {
  return `$${Number(rate).toLocaleString("en-US", { maximumFractionDigits: 2 })}`;
}

function todayLocal(): string {
  const now = new Date();
  return new Date(now.getTime() - now.getTimezoneOffset() * 60_000).toISOString().slice(0, 10);
}

type LegacyPitch = { id: string; brand: string; date: string; status: string; agreedRate?: string; serverId?: number };

function readLegacyPitches(): LegacyPitch[] {
  try {
    const stored = JSON.parse(localStorage.getItem("mavlit_pitches") ?? "[]");
    return Array.isArray(stored)
      ? stored.filter((item): item is LegacyPitch => typeof item?.id === "string" && item.id.startsWith("pitch-") && typeof item.brand === "string")
      : [];
  } catch { return []; }
}

function readLegacyOverrides(): Record<string, { status?: string; agreedRate?: string }> {
  try {
    const stored = JSON.parse(localStorage.getItem("mavlit_pitch_overrides") ?? "{}");
    return stored && typeof stored === "object" && !Array.isArray(stored) ? stored : {};
  } catch { return {}; }
}

// ── Shared UI ──────────────────────────────────────────────────────────────────

function CopyBtn({ text }: { text: string }) {
  const [c, setC] = useState(false);
  return (
    <button onClick={() => { navigator.clipboard.writeText(text).then(() => { setC(true); setTimeout(() => setC(false), 2000); }); }}
      className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold border border-border text-muted-foreground hover:text-white hover:border-white/30 transition-all">
      {c ? <Check size={11} className="text-emerald-400" /> : <Copy size={11} />}{c ? "Copied!" : "Copy"}
    </button>
  );
}

function Spin() {
  return <motion.div animate={{ rotate: 360 }} transition={{ duration: 1.2, repeat: Infinity, ease: "linear" }} className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full shrink-0" />;
}

// ── Brand icon/initial helper ──────────────────────────────────────────────────

function BrandAvatar({ brand }: { brand: string }) {
  const db = BRAND_DB[brand];
  if (db) {
    const Icon = db.Icon;
    return (
      <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: `${db.color}25` }}>
        <Icon size={16} style={{ color: db.color }} />
      </div>
    );
  }
  return (
    <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 bg-secondary border border-border">
      <span className="text-sm font-bold text-white">{brand.charAt(0).toUpperCase()}</span>
    </div>
  );
}

// ── My Pitches Tab ─────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: PitchRecord["status"] }) {
  const labels: Record<string, string> = {
    generated: "Draft — not sent", sent: "Waiting for reply", conversation: "In conversation",
    negotiating: "Negotiating", closed_won: "Closed — won", closed_lost: "Closed — lost",
    proposal_sent: "Sent date unconfirmed", waiting: "Sent date unconfirmed",
  };
  const color = status === "closed_won" ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/25"
    : status === "conversation" || status === "negotiating" ? "bg-primary/15 text-primary border-primary/25"
    : "bg-zinc-500/15 text-zinc-400 border-zinc-500/20";
  return <span className={`px-2.5 py-1 rounded-full text-xs font-semibold border whitespace-nowrap ${color}`}>{labels[status] ?? status}</span>;
}

// ── Close Deal Modal ────────────────────────────────────────────────────────────

type CloseOutcome = "yes" | "no" | "no_response";

function CloseDealModal({
  brand,
  onConfirm,
  onCancel,
  busy,
  error,
}: {
  brand: string;
  onConfirm: (outcome: CloseOutcome, rate: string) => void;
  onCancel: () => void;
  busy: boolean;
  error: string | null;
}) {
  const [outcome, setOutcome] = useState<CloseOutcome | null>(null);
  const [rate, setRate] = useState("");

  const OUTCOMES: { value: CloseOutcome; label: string }[] = [
    { value: "yes",         label: "Yes — deal closed" },
    { value: "no",          label: "No — didn't happen" },
    { value: "no_response", label: "No response" },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onCancel}
      />

      {/* Modal card */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 8 }}
        transition={{ duration: 0.18 }}
        className="relative w-full max-w-sm bg-card border border-border rounded-2xl p-6 shadow-2xl space-y-5"
      >
        <div>
          <p className="text-xs text-muted-foreground font-medium mb-1">{brand}</p>
          <h3 className="text-white font-bold text-base leading-snug">
            Did this deal close successfully?
          </h3>
          <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
            This helps MAVLIT learn which matches actually convert.
          </p>
        </div>

        {/* Outcome buttons */}
        <div className="flex flex-col gap-2">
          {OUTCOMES.map(o => (
            <button
              key={o.value}
              onClick={() => setOutcome(o.value)}
              className={`w-full px-4 py-2.5 rounded-xl text-sm font-semibold border text-left transition-all ${
                outcome === o.value
                  ? o.value === "yes"
                    ? "bg-emerald-500/20 border-emerald-500/50 text-emerald-300"
                    : "bg-zinc-500/15 border-zinc-500/40 text-zinc-300"
                  : "border-border text-muted-foreground hover:text-white hover:border-white/20"
              }`}
            >
              {o.label}
            </button>
          ))}
        </div>

        {/* Rate field — only when "yes" */}
        <AnimatePresence>
          {outcome === "yes" && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              <label className="block text-xs font-semibold text-white/70 mb-1.5">
                What was the final rate? <span className="text-muted-foreground font-normal">(optional)</span>
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">$</span>
                <input
                  value={rate}
                  onChange={e => setRate(e.target.value)}
                  placeholder="1,200"
                  className="w-full pl-7 pr-3 py-2.5 rounded-xl bg-black/40 border border-border text-white text-sm placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary/60 transition-all"
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Actions */}
        {error && <p className="text-xs text-red-400">{error}</p>}
        <div className="flex gap-2 pt-1">
          <button
            onClick={onCancel}
            className="flex-1 px-4 py-2.5 rounded-xl border border-border text-sm font-semibold text-muted-foreground hover:text-white transition-all"
          >
            Cancel
          </button>
          <button
            onClick={() => outcome && onConfirm(outcome, rate)}
            disabled={outcome === null || busy}
            className="flex-1 px-4 py-2.5 rounded-xl bg-primary text-white text-sm font-bold hover:bg-primary/90 disabled:opacity-40 transition-all"
          >
            {busy ? "Saving…" : "Save outcome"}
          </button>
        </div>
      </motion.div>
    </div>
  );
}

// ── Delete confirmation ────────────────────────────────────────────────────────

function DeletePitchModal({ brand, onConfirm, onCancel, busy, error }: {
  brand: string;
  onConfirm: () => void;
  onCancel: () => void;
  busy: boolean;
  error: string | null;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="alertdialog" aria-modal="true" aria-labelledby="delete-pitch-title">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={busy ? undefined : onCancel} />
      <div className="relative w-full max-w-sm bg-card border border-border rounded-2xl p-6 shadow-2xl space-y-5">
        <div>
          <h3 id="delete-pitch-title" className="text-white font-bold text-base">Delete this pitch?</h3>
          <p className="text-xs text-muted-foreground mt-1">
            Are you sure you want to delete your pitch to {brand}? The saved email and its status will be removed from your Pipeline. This can't be undone.
          </p>
        </div>
        {error && <p role="alert" className="text-xs text-red-400">{error}</p>}
        <div className="flex gap-2">
          <button onClick={onCancel} disabled={busy} className="flex-1 px-4 py-2.5 rounded-xl border border-border text-sm font-semibold text-muted-foreground hover:text-white">Cancel</button>
          <button onClick={onConfirm} disabled={busy} data-testid="button-confirm-delete-pitch"
            className="flex-1 px-4 py-2.5 rounded-xl bg-red-500 text-white text-sm font-bold hover:bg-red-500/90 disabled:opacity-40">
            {busy ? "Deleting…" : "Delete"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Add Pitch Modal ────────────────────────────────────────────────────────────

function MarkSentModal({ brand, onConfirm, onCancel, busy, error }: {
  brand: string;
  onConfirm: (date: string) => void;
  onCancel: () => void;
  busy: boolean;
  error: string | null;
}) {
  const [date, setDate] = useState(todayLocal);
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onCancel} />
      <div className="relative w-full max-w-sm bg-card border border-border rounded-2xl p-6 shadow-2xl space-y-5">
        <div>
          <h3 className="text-white font-bold text-base">Mark as sent</h3>
          <p className="text-xs text-muted-foreground mt-1">When did you send your pitch to {brand}?</p>
        </div>
        <div>
          <label className="block text-xs font-semibold text-white/70 mb-1.5">Date sent</label>
          <input type="date" value={date} max={todayLocal()} onChange={e => setDate(e.target.value)}
            className="w-full px-3 py-2.5 rounded-xl bg-black/40 border border-border text-white text-sm focus:outline-none focus:border-primary/60" />
        </div>
        {error && <p role="alert" className="text-xs text-red-400">{error}</p>}
        <div className="flex gap-2">
          <button onClick={onCancel} disabled={busy} className="flex-1 px-4 py-2.5 rounded-xl border border-border text-sm font-semibold text-muted-foreground hover:text-white">Cancel</button>
          <button onClick={() => onConfirm(date)} disabled={!date || busy} className="flex-1 px-4 py-2.5 rounded-xl bg-primary text-white text-sm font-bold disabled:opacity-40">
            {busy ? "Saving…" : "Mark as sent"}
          </button>
        </div>
      </div>
    </div>
  );
}

function AddPitchModal({ onAdd, onCancel, busy, error }: {
  onAdd: (brand: string, sentAt: string) => void;
  onCancel: () => void;
  busy: boolean;
  error: string | null;
}) {
  const [brand, setBrand] = useState("");
  const [sentAt, setSentAt] = useState(todayLocal);
  const [, setLocation] = useLocation();

  const handleSubmit = () => { if (brand.trim() && sentAt) onAdd(brand.trim(), sentAt); };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onCancel} />
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 8 }}
        transition={{ duration: 0.18 }}
        className="relative w-full max-w-sm bg-card border border-border rounded-2xl p-6 shadow-2xl space-y-5"
      >
        <div>
          <h3 className="text-white font-bold text-base">Add a pitch</h3>
          <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
            Enter the brand name to track it in your pipeline.
          </p>
        </div>
        <div>
          <label className="block text-xs font-semibold text-white/70 mb-1.5">Brand name</label>
          <input
            autoFocus
            value={brand}
            onChange={e => setBrand(e.target.value)}
            onKeyDown={e => e.key === "Enter" && handleSubmit()}
            placeholder="e.g. Sennheiser"
            className="w-full px-3 py-2.5 rounded-xl bg-black/40 border border-border text-white text-sm placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary/60 transition-all"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-white/70 mb-1.5">Date you sent the pitch</label>
          <input type="date" value={sentAt} max={todayLocal()} onChange={e => setSentAt(e.target.value)}
            className="w-full px-3 py-2.5 rounded-xl bg-black/40 border border-border text-white text-sm focus:outline-none focus:border-primary/60" />
        </div>
        <p className="text-xs text-muted-foreground leading-relaxed">
          Want to generate the email too?{" "}
          <button
            onClick={() => { onCancel(); setLocation("/pitch?brand=" + encodeURIComponent(brand)); }}
            className="text-primary hover:underline font-medium"
          >
            Go to Pitch page →
          </button>
        </p>
        <div className="flex gap-2 pt-1">
          {error && <p className="text-xs text-red-400">{error}</p>}
          <button onClick={onCancel} className="flex-1 px-4 py-2.5 rounded-xl border border-border text-sm font-semibold text-muted-foreground hover:text-white transition-all">
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={!brand.trim() || !sentAt || busy}
            className="flex-1 px-4 py-2.5 rounded-xl bg-primary text-white text-sm font-bold hover:bg-primary/90 disabled:opacity-40 transition-all"
          >
            {busy ? "Saving…" : "Add pitch"}
          </button>
        </div>
      </motion.div>
    </div>
  );
}

// ── My Pitches Tab ─────────────────────────────────────────────────────────────

function MyPitchesTab({
  pitches, onUpdate, onAdd, onDelete, onUseDealMaker,
}: {
  pitches: PitchRecord[];
  onUpdate: (id: number, body: PitchUpdateRequest) => Promise<void>;
  onAdd: (brand: string, sentAt: string) => Promise<void>;
  onDelete: (id: number) => Promise<void>;
  onUseDealMaker: (brand: string) => void;
}) {
  const [closingId, setClosingId]     = useState<number | null>(null);
  const [sendingId, setSendingId]     = useState<number | null>(null);
  const [deletingId, setDeletingId]   = useState<number | null>(null);
  const [statusEditId, setStatusEditId] = useState<number | null>(null);
  const [addingPitch, setAddingPitch] = useState(false);
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const cancelClose = () => { setClosingId(null); setActionError(null); };

  const markSent = async (date: string) => {
    if (sendingId === null) return;
    setBusy(true);
    setActionError(null);
    try {
      await onUpdate(sendingId, { status: "sent", sent_at: date, agreed_rate: null });
      setSendingId(null);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Couldn't mark the pitch as sent.");
    } finally { setBusy(false); }
  };

  const confirmClose = async (outcome: CloseOutcome, rate: string) => {
    if (!closingId) return;
    const cleanRate = rate.replace(/[$,\s]/g, "");
    if (outcome === "yes" && rate.trim() && (!/^\d+(\.\d{1,2})?$/.test(cleanRate) || !Number.isFinite(Number(cleanRate)))) {
      setActionError("Enter a valid non-negative amount (up to two decimal places).");
      return;
    }
    setBusy(true);
    setActionError(null);
    try {
      await onUpdate(closingId, {
        status: outcome === "yes" ? "closed_won" : "closed_lost",
        agreed_rate: outcome === "yes" && rate.trim() ? Number(cleanRate) : null,
      });
      cancelClose();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Couldn't save the outcome.");
    } finally { setBusy(false); }
  };

  const changeStatus = async (deal: PitchRecord, newStatus: string) => {
    setStatusEditId(null);
    if (newStatus === "close") { setActionError(null); setClosingId(deal.id); return; }
    if (newStatus === "sent" && !deal.sentAt) { setActionError(null); setSendingId(deal.id); return; }
    setBusy(true);
    setActionError(null);
    try {
      await onUpdate(deal.id, {
        status: newStatus,
        agreed_rate: null,
      });
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Couldn't update the pitch.");
    } finally { setBusy(false); }
  };

  const confirmDelete = async () => {
    if (deletingId === null) return;
    setBusy(true);
    setActionError(null);
    try {
      await onDelete(deletingId);
      setDeletingId(null);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Couldn't delete the pitch.");
    } finally { setBusy(false); }
  };

  const addPitch = async (brand: string, sentAt: string) => {
    setBusy(true);
    setActionError(null);
    try {
      await onAdd(brand, sentAt);
      setAddingPitch(false);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Couldn't add the pitch.");
    } finally { setBusy(false); }
  };

  const closingBrand = pitches.find(p => p.id === closingId)?.brand ?? "";
  const sendingBrand = pitches.find(p => p.id === sendingId)?.brand ?? "";
  const deletingBrand = pitches.find(p => p.id === deletingId)?.brand ?? "";

  return (
    <>
      <AnimatePresence>
        {closingId !== null && <CloseDealModal brand={closingBrand} onConfirm={confirmClose} onCancel={cancelClose} busy={busy} error={actionError} />}
        {sendingId !== null && <MarkSentModal brand={sendingBrand} onConfirm={markSent} onCancel={() => { setSendingId(null); setActionError(null); }} busy={busy} error={actionError} />}
        {deletingId !== null && <DeletePitchModal brand={deletingBrand} onConfirm={confirmDelete} onCancel={() => { setDeletingId(null); setActionError(null); }} busy={busy} error={actionError} />}
        {addingPitch && <AddPitchModal onAdd={addPitch} onCancel={() => { setAddingPitch(false); setActionError(null); }} busy={busy} error={actionError} />}
      </AnimatePresence>

      {/* Header row */}
      <div className="flex justify-end mb-4">
        <button
          onClick={() => { setActionError(null); setAddingPitch(true); }}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-primary text-white text-xs font-bold hover:bg-primary/90 transition-all shadow-sm shadow-primary/20"
        >
          <Plus size={13} />
          Add pitch
        </button>
      </div>
      {actionError && !addingPitch && closingId === null && sendingId === null && deletingId === null && <p role="alert" className="text-sm text-red-400 mb-4">{actionError}</p>}

      {pitches.length === 0 ? (
        <div className="text-center py-20">
          <p className="text-muted-foreground text-sm">No pitches yet. Generate a draft on the Pitch page, or add outreach you've already sent.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {pitches.map(deal => (
            <div key={deal.id} className="flex flex-wrap items-center gap-3 px-4 py-3.5 rounded-2xl bg-card border border-border">
              <BrandAvatar brand={deal.brand} />

              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-white truncate">{deal.brand}</p>
                 <p className="text-xs text-muted-foreground">{deal.sentAt ? "Sent" : "Created"} {deal.date}</p>
              </div>

              {/* Clickable status badge with dropdown */}
              <div className="relative">
                <button
                   onClick={() => setStatusEditId(statusEditId === deal.id ? null : deal.id)}
                   disabled={busy}
                  className="flex items-center gap-1"
                >
                  <StatusBadge status={deal.status} />
                  <ChevronDown size={11} className="text-muted-foreground" />
                </button>
                <AnimatePresence>
                  {statusEditId === deal.id && (
                    <>
                      <div className="fixed inset-0 z-10" onClick={() => setStatusEditId(null)} />
                      <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: -4 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: -4 }}
                        transition={{ duration: 0.12 }}
                        className="absolute right-0 top-full mt-1.5 z-20 bg-card border border-border rounded-xl overflow-hidden shadow-2xl min-w-[170px]"
                      >
                         {([
                           { value: "sent", label: "Waiting for reply" },
                           ...(deal.sentAt ? [
                           { value: "conversation", label: "In conversation" },
                           { value: "negotiating", label: "Negotiating" },
                           { value: "close", label: "Close deal…" },
                           ] : []),
                         ]).map(s => (
                          <button
                             key={s.value}
                             onClick={() => changeStatus(deal, s.value)}
                             className={`w-full text-left px-3.5 py-2.5 text-xs font-medium transition-colors hover:bg-secondary/60 ${deal.status === s.value ? "text-white bg-secondary/40" : "text-muted-foreground"}`}
                          >
                             {s.value === "sent" && !deal.sentAt ? "Mark as sent" : s.label}
                          </button>
                        ))}
                      </motion.div>
                    </>
                  )}
                </AnimatePresence>
              </div>

               {!deal.status.startsWith("closed_") && (
                <button
                  onClick={() => onUseDealMaker(deal.brand)}
                  className="shrink-0 text-xs text-primary font-semibold hover:text-primary/80 transition-colors whitespace-nowrap"
                >
                  Use Deal Tools →
                </button>
              )}

               {deal.status === "closed_won" && deal.agreedRate && (
                <span className="shrink-0 text-xs text-emerald-400 font-semibold">
                  {formatRate(deal.agreedRate)}
                </span>
              )}
              <button
                onClick={() => { setActionError(null); setDeletingId(deal.id); }}
                disabled={busy}
                aria-label={`Delete pitch to ${deal.brand}`}
                title="Delete this pitch"
                data-testid={`button-delete-pitch-${deal.id}`}
                className="shrink-0 rounded-lg p-1.5 text-muted-foreground transition-colors hover:text-red-400 hover:bg-red-500/10 disabled:opacity-40"
              >
                <Trash2 size={14} />
              </button>
              {deal.pitchText && (
                <details className="basis-full min-w-0 border-t border-border pt-3">
                  <summary className="cursor-pointer text-sm font-semibold text-primary">View saved email</summary>
                  <div className="mt-3 space-y-3">
                    <CopyBtn text={deal.pitchText} />
                    <pre className="max-h-96 overflow-auto whitespace-pre-wrap break-words rounded-xl bg-black/30 p-4 font-mono text-sm leading-relaxed text-white/90">{deal.pitchText}</pre>
                  </div>
                </details>
              )}
            </div>
          ))}
        </div>
      )}
    </>
  );
}

// ── Accordion card ─────────────────────────────────────────────────────────────

function AccordionCard({ title, description, isOpen, onToggle, children }: {
  title: string; description?: string; isOpen: boolean; onToggle: () => void; children: React.ReactNode;
}) {
  return (
    <div className="bg-card border border-border rounded-2xl overflow-hidden">
      <button onClick={onToggle}
        className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-secondary/30 transition-colors">
        <div>
          <span className="text-sm font-bold text-white">{title}</span>
          {description && (
            <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
          )}
        </div>
        {isOpen ? <ChevronUp size={16} className="text-muted-foreground shrink-0 ml-3" /> : <ChevronDown size={16} className="text-muted-foreground shrink-0 ml-3" />}
      </button>
      <AnimatePresence>
        {isOpen && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.22 }}
            className="overflow-hidden">
            <div className="px-5 pb-5 space-y-4 border-t border-border pt-4">
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Rate Intelligence ──────────────────────────────────────────────────────────

interface RateEstimateResult {
  id: number;
  brand_id: number | null;
  deliverable_type: string | null;
  exclusivity: string | null;
  usage: string | null;
  duration_months: number | null;
  created_at: string;
  brand_name: string | null;
  rate_min: number | null;
  rate_typical: number | null;
  rate_max: number | null;
  currency: string | null;
  confidence: "low" | "medium" | "high" | null;
  reasoning: string | null;
  basis: string | null;
  adjustments: { factor: string; effect: string }[];
  details: {
    creator_niche?: string | null; follower_bucket?: string | null; creator_followers?: number | null;
    data_row?: { creators: number; points: number; median: number } | null;
    brand_followers?: string | null; partner_creators?: { username: string }[];
  };
}

const money = (value: number | null, currency: string | null) =>
  value === null ? "—" : `${currency && currency !== "USD" ? `${currency} ` : "$"}${value.toLocaleString("en-US")}`;

const CONFIDENCE_STYLE = {
  high:   "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  medium: "bg-amber-500/15 text-amber-300 border-amber-500/30",
  low:    "bg-red-500/10 text-red-300 border-red-500/30",
} as const;

/**
 * Rate Intelligence: asks MAVLIT to estimate one Instagram deliverable for the chosen brand and Deal context. The
 * estimate rests on the rate data of creators in the same niche and follower bucket, the brand's size and the
 * creators the brand has paid (see pipeline/rate_intelligence.py).
 */
function RateEstimator({ dealContext, brand }: { dealContext: DealContext; brand: { id: number | null; name: string } | null }) {
  const queryClient = useQueryClient();
  const { deliverable, exclusivity, exclusivityMonths, usage } = dealContext;
  const [fresh, setFresh] = useState<RateEstimateResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // A different brand or deal term makes the shown estimate stale.
  const inputKey = JSON.stringify([brand?.id ?? null, brand?.name ?? "", deliverable, exclusivity, exclusivityMonths, usage]);
  useEffect(() => { setFresh(null); setError(null); }, [inputKey]);

  const creatorRate = deliverable ? readCreatorRate(DEAL_PLATFORM, deliverable) : null;
  const ready = !!brand?.name && !!deliverable;

  const inputs = {
    ...(brand?.id ? { brand_id: brand.id } : {}),
    brand_name: brand?.name ?? "",
    ...dealTerms(dealContext),
  };

  // The estimate already made for exactly these inputs is kept on the server, so it is still here after a reload.
  const saved = useQuery({
    queryKey: ["rate-estimate", inputKey],
    enabled: ready,
    retry: false,
    queryFn: () => api.get<RateEstimateResult | null>(`/rate-intelligence/latest?${new URLSearchParams(Object.entries(inputs).map(([k, v]) => [k, String(v)]))}`),
  });
  const result = fresh ?? saved.data ?? null;

  const estimate = async () => {
    if (!ready || !brand) return;
    setLoading(true);
    setError(null);
    try {
      const made = await api.post<RateEstimateResult>("/rate-intelligence", { ...inputs, platform: DEAL_PLATFORM });
      setFresh(made);
      queryClient.setQueryData(["rate-estimate", inputKey], made);
      void queryClient.invalidateQueries({ queryKey: ["rate-latest"] });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't estimate the rate.");
    } finally { setLoading(false); }
  };

  const details = result?.details ?? {};
  return (
    <div className="space-y-4">
      {/* Disclaimer */}
      <div className="px-4 py-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30">
        <div className="flex items-start gap-2.5">
          <AlertTriangle size={13} className="text-amber-400 mt-0.5 shrink-0" />
          <p className="text-xs text-amber-200/90 leading-relaxed">
            This is an estimate built from rates other creators list for the same niche and audience size, plus what we know about this brand. It is not a rate card and not what you should charge. Use it as context, and use your own judgment based on your conversations with the brand.
          </p>
        </div>
      </div>

      {!ready && (
        <div className="px-4 py-5 rounded-xl bg-secondary/40 border border-border text-center">
          <p className="text-xs text-muted-foreground">
            {!brand?.name ? <>Choose the <span className="text-white font-medium">brand</span> you are working on above</> : <>Set a <span className="text-white font-medium">Deliverable type</span> in the Deal context above</>}
            {" "}to estimate a rate.
          </p>
        </div>
      )}

      {ready && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <span className="px-2 py-0.5 rounded-md text-xs font-semibold bg-primary/15 text-primary border border-primary/30">{DEAL_PLATFORM}</span>
            <span className="px-2 py-0.5 rounded-md text-xs font-semibold bg-secondary text-muted-foreground border border-border">{deliverable}</span>
            <span className="px-2 py-0.5 rounded-md text-xs font-semibold bg-secondary text-muted-foreground border border-border">{brand!.name}</span>
          </div>

          {creatorRate && (
            <div className="px-4 py-3 rounded-xl bg-primary/8 border border-primary/20">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-primary/70 mb-0.5">Your typical rate</p>
              <p className="text-lg font-extrabold text-white">${creatorRate.amount.replace(/^\$/, "")}</p>
            </div>
          )}

          {!result && saved.isLoading && <p role="status" className="text-xs text-muted-foreground">Checking for a saved estimate…</p>}
          {!result && !saved.isLoading && (
            <button type="button" onClick={() => void estimate()} disabled={loading} data-testid="button-estimate-rate"
              className="w-full py-3 rounded-xl text-sm font-bold bg-primary text-white hover:bg-primary/85 transition-colors disabled:opacity-50">
              {loading ? "Estimating…" : "Estimate rate"}
            </button>
          )}
          {error && <p role="alert" className="text-xs text-red-400">{error}</p>}

          {result && (
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-4" data-testid="rate-estimate">
              <div className="grid grid-cols-3 gap-2">
                {[
                  { label: "Low end", value: result.rate_min, dim: true },
                  { label: "Typical", value: result.rate_typical, dim: false },
                  { label: "High end", value: result.rate_max, dim: true },
                ].map(c => (
                  <div key={c.label} className={`rounded-xl p-3 text-center border ${c.dim ? "bg-secondary/40 border-border" : "bg-primary/10 border-primary/30"}`}>
                    <p className="text-xs text-muted-foreground mb-1 leading-tight">{c.label}</p>
                    <p className={`text-sm font-extrabold ${c.dim ? "text-white/80" : "text-white"}`} data-testid={`rate-${c.label.split(" ")[0].toLowerCase()}`}>{money(c.value, result.currency)}</p>
                  </div>
                ))}
              </div>
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
                <span>Per {deliverable}</span>
                {result.confidence && (
                  <span data-testid="rate-confidence" className={`px-2 py-0.5 rounded-md font-semibold border ${CONFIDENCE_STYLE[result.confidence]}`}>
                    {result.confidence.charAt(0).toUpperCase() + result.confidence.slice(1)} confidence
                  </span>
                )}
              </div>

              {result.reasoning && <p className="text-xs text-white/80 leading-relaxed">{result.reasoning}</p>}

              {result.adjustments.length > 0 && (
                <div className="bg-card border border-border rounded-xl p-4 space-y-2">
                  <p className="text-xs font-bold text-white uppercase tracking-wider">What shaped it</p>
                  <ul className="space-y-2">
                    {result.adjustments.map((a, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <span className="mt-0.5 w-1.5 h-1.5 rounded-full bg-primary shrink-0" />
                        <span className="text-xs text-white/80 leading-relaxed"><span className="font-semibold capitalize">{a.factor}</span>: {a.effect}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="flex flex-wrap items-center justify-between gap-2">
                <button type="button" onClick={() => void estimate()} disabled={loading}
                  className="text-xs font-semibold text-primary hover:underline disabled:opacity-50">
                  {loading ? "Estimating…" : "Estimate again"}
                </button>
                {!fresh && result.created_at && (
                  <span data-testid="rate-saved-at" className="text-[11px] text-muted-foreground">
                    Saved estimate from {new Date(result.created_at).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })}
                  </span>
                )}
              </div>
            </motion.div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Contract Advice ────────────────────────────────────────────────────────────

interface ContractAdviceResult {
  id: number;
  looks_good: boolean | null;
  issues: string[];
  deal_comparison: string[];
  summary: string | null;
}

const CONTRACT_MAX_CHARS = 20000;

function ContractAdvice({ contactType, dealContext, brandName }: { contactType?: "agency" | "in-house"; dealContext: DealContext; brandName: string }) {
  const [text, setText]      = useState("");
  const [generating, setGen] = useState(false);
  const [result, setResult]  = useState<ContractAdviceResult | null>(null);
  const [error, setError]    = useState<string | null>(null);
  const terms = dealTerms(dealContext);
  const termsSet = Object.keys(terms).length > 0;

  const analyze = async () => {
    const contract = text.trim();
    if (!contract || generating) return;
    setGen(true);
    setError(null);
    try {
      setResult(await api.post<ContractAdviceResult>("/contract-advice", {
        contract_text: contract,
        ...(brandName ? { brand_name: brandName } : {}),
        ...terms,
      }));
    } catch (err) {
      setResult(null);
      setError(err instanceof ApiRequestError && err.status === 502
        ? "The review could not be completed. Please try again in a moment."
        : err instanceof Error ? err.message : "Couldn't review the contract.");
    } finally { setGen(false); }
  };

  return (
    <div className="space-y-4">
      <div className="px-4 py-4 rounded-xl bg-amber-500/10 border border-amber-500/30 space-y-2">
        <p className="text-sm text-amber-100 leading-relaxed">
          <span className="font-bold text-amber-300">MAVLIT is not a law firm or an attorney and does not provide legal advice.</span> This tool flags common contract issues for informational and educational purposes only. It does not review your full contract, it may be incomplete or inaccurate, and it is not a substitute for a lawyer. Always consult a licensed attorney before signing, relying on, or negotiating any contract.
        </p>
        {contactType === "agency" && (
          <p className="text-xs text-white/70 leading-relaxed border-t border-primary/15 pt-2">
            Agency contracts often include broader usage rights clauses — pay particular attention to the scope and duration of any license grants.
          </p>
        )}
      </div>

      <div>
        <p className="text-xs font-semibold text-white/70 mb-1.5">Paste your contract text</p>
        <textarea value={text} onChange={e => setText(e.target.value)} rows={7} maxLength={CONTRACT_MAX_CHARS}
          aria-label="Contract text"
          placeholder="Paste the contract or the specific clauses you want reviewed…"
          className="w-full px-3 py-2.5 rounded-xl bg-black/40 border border-border text-white text-xs placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary/60 resize-none transition-all" />
        <div className="mt-1 flex items-start justify-between gap-3 text-[11px] text-muted-foreground">
          <span data-testid="contract-terms-hint">
            {termsSet
              ? "The contract will also be compared with the deal terms you set above."
              : "Set a Deliverable type, Exclusivity and Usage in the Deal context above to compare the contract with your terms."}
          </span>
          <span className="shrink-0">{text.length.toLocaleString()}/{CONTRACT_MAX_CHARS.toLocaleString()}</span>
        </div>
      </div>

      <button onClick={analyze} disabled={!text.trim() || generating} data-testid="button-analyze-contract"
        className="w-full py-3 rounded-xl text-xs font-bold bg-primary hover:bg-primary/90 disabled:opacity-40 text-white transition-all flex items-center justify-center gap-2">
        {generating ? <><Spin />Analyzing…</> : <><Sparkles size={13} />✦ Analyze contract</>}
      </button>

      {error && <p role="alert" className="text-xs text-red-400">{error}</p>}

      {result && (
        <div className="space-y-4" data-testid="contract-result">
          <div data-testid="contract-verdict"
            className={`px-4 py-3 rounded-xl border text-sm font-semibold ${result.looks_good === false
              ? "bg-amber-500/10 border-amber-500/30 text-amber-200" : "bg-emerald-500/10 border-emerald-500/30 text-emerald-300"}`}>
            {result.looks_good === false ? "Worth a closer look before you sign" : "No major concerns found"}
          </div>
          {result.summary && <p className="text-xs text-white/80 leading-relaxed">{result.summary}</p>}
          {result.issues.length > 0 && (
            <div className="bg-card border border-border rounded-xl p-4 space-y-2" data-testid="contract-issues">
              <p className="text-xs font-bold text-white uppercase tracking-wider">Things to look at</p>
              <ul className="space-y-2">
                {result.issues.map((issue, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <AlertTriangle size={12} className="mt-0.5 shrink-0 text-amber-400" />
                    <span className="text-xs text-white/80 leading-relaxed">{issue}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {result.deal_comparison.length > 0 && (
            <div className="bg-card border border-border rounded-xl p-4 space-y-2" data-testid="contract-comparison">
              <p className="text-xs font-bold text-white uppercase tracking-wider">Compared with your deal terms</p>
              <ul className="space-y-2">
                {result.deal_comparison.map((line, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <span className="mt-1 w-1.5 h-1.5 rounded-full bg-primary shrink-0" />
                    <span className="text-xs text-white/80 leading-relaxed">{line}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Static educational checklist — always visible */}
      <div className="bg-card border border-border rounded-xl p-5 space-y-4">
        <div className="flex items-center gap-2">
          <BookOpen size={14} className="text-primary shrink-0" />
          <p className="text-xs font-bold text-white uppercase tracking-wider">What to check in any brand deal</p>
        </div>
        <ul className="space-y-3.5">
          {[
            { label: "Usage rights",            body: "How the brand can use your content and for how long. The more they can do with it — ads, other campaigns, your name and likeness — the more it should be worth. Make sure the fee reflects the usage." },
            { label: "Exclusivity",             body: "Whether you're barred from working with other brands in the same space. Keep any exclusivity as narrow in scope and as short in duration as possible." },
            { label: "Payment",                 body: "How much you'll be paid and when. Consider asking for a portion upfront so you're protected if payment is delayed or the deal falls through after you've delivered." },
            { label: "Kill / cancellation clauses", body: "Whether the brand can cancel the deal, on what notice, and what happens to your fee if they do — especially after you've already started or finished the work." },
            { label: "Ownership vs. license",   body: "Whether you keep ownership of your content or hand it over entirely, and what permissions the brand is receiving. These are meaningfully different things." },
            { label: "Scope and revisions",     body: "What exactly you must deliver and how many rounds of revisions the brand can request. Undefined scope and unlimited revisions are the same thing." },
          ].map(({ label, body }) => (
            <li key={label} className="flex items-start gap-3">
              <span className="mt-0.5 w-1.5 h-1.5 rounded-full bg-primary/50 shrink-0" />
              <div>
                <span className="text-xs font-semibold text-white">{label} — </span>
                <span className="text-xs text-muted-foreground leading-relaxed">{body}</span>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

// ── Deal Context Panel ─────────────────────────────────────────────────────────

function PillGroup<T extends string>({
  options, value, onChange, label,
}: { options: readonly T[] | T[]; value: T | ""; onChange: (v: T | "") => void; label: string }) {
  return (
    <div>
      <p className="text-xs font-semibold text-white/60 mb-2">{label}</p>
      <div className="flex flex-wrap gap-1.5">
        {options.map(opt => (
          <button key={opt} onClick={() => onChange(value === opt ? "" : opt)}
            className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition-all ${value === opt ? "bg-primary/15 border-primary/40 text-primary" : "border-border text-muted-foreground hover:border-white/30 hover:text-white"}`}>
            {opt}
          </button>
        ))}
      </div>
    </div>
  );
}

function DealContextPanel({ value, onChange }: { value: DealContext; onChange: (ctx: DealContext) => void }) {
  const set = <K extends keyof DealContext>(key: K, val: DealContext[K]) => {
    onChange({ ...value, [key]: val });
  };

  const showMonths = value.exclusivity === "Narrow" || value.exclusivity === "Broad";

  return (
    <div className="bg-card border border-border rounded-2xl p-5 space-y-4">
      <div>
        <p className="text-xs font-bold text-white uppercase tracking-wider">Deal context</p>
        <p className="text-xs text-muted-foreground mt-0.5">Used by Rate Intelligence and Contract Advice below — all optional.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <PillGroup
          label="Deliverable type"
          options={DELIVERABLE_TYPES}
          value={value.deliverable as DealContext["deliverable"]}
          onChange={v => set("deliverable", v)}
        />
        <div>
          <p className="text-xs font-semibold text-white/60 mb-2">Exclusivity</p>
          <div className="flex flex-wrap gap-1.5">
            {(["None", "Narrow", "Broad"] as const).map(opt => (
              <button key={opt} onClick={() => set("exclusivity", value.exclusivity === opt ? "" : opt)}
                className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition-all ${value.exclusivity === opt ? "bg-primary/15 border-primary/40 text-primary" : "border-border text-muted-foreground hover:border-white/30 hover:text-white"}`}>
                {opt === "Narrow" ? "Narrow — specific product" : opt === "Broad" ? "Broad — whole category" : opt}
              </button>
            ))}
          </div>
          <AnimatePresence>
            {showMonths && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
                <div className="mt-2 flex items-center gap-2">
                  <input
                    type="number" min={1} max={36} placeholder="Duration (months)"
                    value={value.exclusivityMonths}
                    onChange={e => set("exclusivityMonths", e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-black/40 border border-border text-white text-xs placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary/60 transition-all"
                  />
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
        <PillGroup
          label="Usage"
          options={["Organic only", "Includes paid usage or whitelisting"]}
          value={value.usage}
          onChange={v => set("usage", v as DealContext["usage"])}
        />
      </div>
    </div>
  );
}

// The Deal context as the API takes it. The months only count for Narrow / Broad exclusivity, as a whole number (the
// API takes an integer) from 1 to 36. Empty choices are left out.
function dealTerms(ctx: DealContext) {
  const months = Number(ctx.exclusivityMonths);
  return {
    ...(ctx.deliverable ? { deliverable_type: ctx.deliverable } : {}),
    ...(ctx.exclusivity ? { exclusivity: ctx.exclusivity } : {}),
    ...(ctx.usage ? { usage: ctx.usage } : {}),
    ...((ctx.exclusivity === "Narrow" || ctx.exclusivity === "Broad") && months > 0 ? { duration_months: Math.min(36, Math.max(1, Math.round(months))) } : {}),
  };
}

// ── Brand search ───────────────────────────────────────────────────────────────

const CUSTOM_BRAND = "A brand I found myself";

/**
 * "Which brand are you working on?": type to search the brands you have pitched, or use whatever you typed as a
 * brand you found yourself. `selected` is a pitched brand's name, CUSTOM_BRAND, or "" when nothing is chosen.
 */
function BrandSearch({ options, selected, custom, onSelect, onCustom }: {
  options: string[];
  selected: string;
  custom: string;
  onSelect: (brand: string) => void;
  onCustom: (text: string) => void;
}) {
  const shown = selected === CUSTOM_BRAND ? custom : selected;
  const [query, setQuery] = useState(shown);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  // A brand picked from outside (a pitch's "Use Deal Tools" link) fills the box. An emptied selection never wipes
  // what is being typed: editing a chosen brand clears the selection but keeps the text.
  useEffect(() => { if (shown) setQuery(shown); }, [shown]);

  const needle = query.trim().toLowerCase();
  const matches = options.filter(option => !needle || option.toLowerCase().includes(needle));
  const exact = options.some(option => option.toLowerCase() === needle);
  const offerCustom = !!needle && !exact;
  const rows = [...matches.map(name => ({ kind: "brand" as const, name })), ...(offerCustom ? [{ kind: "custom" as const, name: query.trim() }] : [])];

  const pick = (row: (typeof rows)[number] | undefined) => {
    if (!row) return;
    if (row.kind === "brand") { onSelect(row.name); onCustom(""); setQuery(row.name); }
    else { onSelect(CUSTOM_BRAND); onCustom(row.name); setQuery(row.name); }
    setOpen(false);
  };
  const change = (text: string) => {
    setQuery(text);
    setOpen(true);
    setActive(0);
    if (selected === CUSTOM_BRAND) { onCustom(text); if (!text.trim()) onSelect(""); }
    else if (selected && text !== selected) onSelect("");   // editing a chosen brand starts a new search
  };
  const clear = () => { setQuery(""); onSelect(""); onCustom(""); setOpen(false); };

  return (
    <div className="relative">
      <Search size={14} aria-hidden className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
      <input
        role="combobox" aria-expanded={open} aria-controls="deal-brand-list" aria-autocomplete="list"
        aria-label="Which brand are you working on?" data-testid="input-deal-brand"
        value={query} placeholder="Search your pitched brands, or type a brand you found yourself…"
        onChange={e => change(e.target.value)} onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 120)}
        onKeyDown={e => {
          if (e.key === "ArrowDown") { e.preventDefault(); setOpen(true); setActive(i => Math.min(i + 1, rows.length - 1)); }
          else if (e.key === "ArrowUp") { e.preventDefault(); setActive(i => Math.max(i - 1, 0)); }
          else if (e.key === "Enter") { e.preventDefault(); pick(rows[active]); }
          else if (e.key === "Escape") setOpen(false);
        }}
        className="w-full pl-9 pr-9 py-3 rounded-xl bg-black/40 border border-border text-white text-sm placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary/60 transition-all"
      />
      {query && (
        <button type="button" onClick={clear} aria-label="Clear brand" data-testid="button-clear-deal-brand"
          className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded p-1 text-muted-foreground hover:text-white">
          <X size={14} aria-hidden />
        </button>
      )}
      {open && rows.length > 0 && (
        <ul id="deal-brand-list" role="listbox" data-testid="list-deal-brands"
          className="absolute z-20 mt-1.5 max-h-60 w-full overflow-y-auto rounded-xl border border-border bg-card py-1 shadow-2xl">
          {rows.map((row, index) => (
            <li key={`${row.kind}-${row.name}`} role="option" aria-selected={index === active}
              onMouseDown={e => { e.preventDefault(); pick(row); }} onMouseEnter={() => setActive(index)}
              className={`cursor-pointer px-3.5 py-2.5 text-sm ${index === active ? "bg-primary/15 text-white" : "text-white/80"}`}>
              {row.kind === "brand" ? row.name : <>Use “<span className="font-semibold text-white">{row.name}</span>” — a brand I found myself</>}
            </li>
          ))}
        </ul>
      )}
      {open && !rows.length && (
        <p className="absolute z-20 mt-1.5 w-full rounded-xl border border-border bg-card px-3.5 py-2.5 text-xs text-muted-foreground shadow-2xl">
          No pitched brands yet. Type the brand you are working on.
        </p>
      )}
    </div>
  );
}

// ── Deal Maker Tab ─────────────────────────────────────────────────────────────

function DealMakerTab({
  pitches, selectedBrand, onSelectBrand,
}: {
  pitches: PitchRecord[];
  selectedBrand: string;
  onSelectBrand: (b: string) => void;
}) {
  const [custom, setCustom]         = useState("");
  const [openCard, setOpenCard]     = useState<string | null>(null);
  const [dealContext, setDealContext] = useState<DealContext>(EMPTY_DEAL_CONTEXT);

  const toggle = (id: string) => setOpenCard(prev => prev === id ? null : id);

  // After a reload the page is empty; bring back the brand and deal terms of the creator's latest estimate (kept on the
  // server), whose estimate then shows below. Skipped when the creator, or a pitch's "Use Deal Tools" link, chose first.
  const latest = useQuery({
    queryKey: ["rate-latest"],
    retry: false,
    queryFn: () => api.get<RateEstimateResult | null>("/rate-intelligence/latest"),
  });
  const restored = useRef(false);
  useEffect(() => {
    const last = latest.data;
    if (restored.current || !last) return;
    restored.current = true;
    if (selectedBrand || dealContext.deliverable || !last.deliverable_type || !DELIVERABLE_TYPES.includes(last.deliverable_type)) return;
    const pitched = pitches.find(p => (last.brand_id && p.brandId === last.brand_id) || p.brand.toLowerCase() === (last.brand_name ?? "").toLowerCase());
    if (pitched) { onSelectBrand(pitched.brand); }
    else if (last.brand_name) { onSelectBrand(CUSTOM_BRAND); setCustom(last.brand_name); }
    else return;
    setDealContext({
      deliverable: last.deliverable_type,
      exclusivity: last.exclusivity === "None" || last.exclusivity === "Narrow" || last.exclusivity === "Broad" ? last.exclusivity : "",
      exclusivityMonths: last.duration_months ? String(last.duration_months) : "",
      usage: last.usage === "Organic only" || last.usage === "Includes paid usage or whitelisting" ? last.usage : "",
    });
  }, [latest.data]);   // eslint-disable-line react-hooks/exhaustive-deps

  const uniqueOptions = [...new Set(pitches.filter(p => !p.status.startsWith("closed_") && p.status !== "closed").map(p => p.brand))];

  const isCustom  = selectedBrand === CUSTOM_BRAND;
  const brandName = isCustom ? custom.trim() : selectedBrand;
  const brandInfo = brandName && !isCustom ? BRAND_DB[brandName] : null;
  const pitchedBrandId = isCustom ? null : pitches.find(p => p.brand === brandName)?.brandId ?? null;

  return (
    <div className="space-y-5">
      {/* Brand search */}
      <div className="bg-card border border-border rounded-2xl p-5 space-y-4">
        <div>
          <p className="text-xs font-bold text-white uppercase tracking-wider mb-2">Which brand are you working on?</p>
          <BrandSearch options={uniqueOptions} selected={selectedBrand} custom={custom} onSelect={onSelectBrand} onCustom={setCustom} />
        </div>

        <AnimatePresence>
          {brandInfo && (
            <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              className="px-4 py-3.5 rounded-xl bg-secondary/60 border border-border space-y-2">
              <div className="flex items-center gap-3">
                <BrandAvatar brand={brandName} />
                <div>
                  <p className="text-sm font-bold text-white">{brandName}</p>
                  <p className="text-xs text-muted-foreground">{brandInfo.category}</p>
                </div>
                <div className="ml-auto">
                  {brandInfo.type === "agency"
                    ? <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-primary/15 text-primary border border-primary/30"><Building2 size={10} />Agency-side</span>
                    : <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"><Users size={10} />In-house</span>
                  }
                </div>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">{brandInfo.signal}</p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Deal context */}
      <DealContextPanel value={dealContext} onChange={setDealContext} />

      {/* Tool cards */}
      <AccordionCard
        title="Rate Intelligence"
        description="See observed deal ranges for your niche and deliverables, and what moves them."
        isOpen={openCard === "rate"}
        onToggle={() => toggle("rate")}
      >
        <RateEstimator dealContext={dealContext} brand={brandName ? { id: pitchedBrandId, name: brandName } : null} />
      </AccordionCard>

      <AccordionCard
        title="Contract Advice"
        description="Paste a message with contract terms to flag potential issues"
        isOpen={openCard === "contract"}
        onToggle={() => toggle("contract")}
      >
        <ContractAdvice contactType={brandInfo?.type} dealContext={dealContext} brandName={brandName} />
      </AccordionCard>

    </div>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────────

export default function Pipeline() {
  const [tab, setTab]               = useState<"pitches" | "dealmaker">("pitches");
  const [dealmakerBrand, setDealmakerBrand] = useState("");
  const [legacyPitches, setLegacyPitches] = useState(readLegacyPitches);
  const [legacyOverrides, setLegacyOverrides] = useState(readLegacyOverrides);
  const [importing, setImporting] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const queryClient = useQueryClient();
  const { logout } = useAuth();
  const { data: apiPitches, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["pitches"],
    queryFn: getAllPitches,
    staleTime: 60_000,
    retry: (attempt, failure) => !(failure instanceof ApiRequestError && failure.status === 401) && attempt < 1,
  });

  const pitches: PitchRecord[] = (apiPitches ?? []).map(p => ({
      id: p.id,
      brand: p.brand_name,
      pitchText: p.pitch_text,
      date: p.sent_at
        ? new Date(`${p.sent_at}T00:00:00`).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
        : new Date(p.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
      status: p.status,
      agreedRate: p.agreed_rate ?? undefined,
      sentAt: p.sent_at,
      brandId: p.brand_id,
  }));

  const updatePitch = async (id: number, body: PitchUpdateRequest) => {
    const updated = await api.patch<ApiPitch>(`/pitches/${id}`, body);
    queryClient.setQueryData<ApiPitch[]>(["pitches"], previous => previous?.map(p => p.id === id ? updated : p));
    if (legacyOverrides[`api-${id}`]) {
      const next = { ...legacyOverrides };
      delete next[`api-${id}`];
      localStorage.setItem("mavlit_pitch_overrides", JSON.stringify(next));
      setLegacyOverrides(next);
    }
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["pitches"] }),
      queryClient.invalidateQueries({ queryKey: ["dashboard"] }),
    ]);
  };

  const addPitch = async (brand: string, sentAt: string) => {
    const created = await api.post<ApiPitch>("/pitches/manual", {
      custom_brand_name: brand,
      status: "sent",
      sent_at: sentAt,
    });
    queryClient.setQueryData<ApiPitch[]>(["pitches"], previous => previous ? [created, ...previous] : [created]);
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["pitches"] }),
      queryClient.invalidateQueries({ queryKey: ["dashboard"] }),
    ]);
  };

  const importLegacy = async () => {
    if (!window.confirm(`Import ${legacyPitches.length} pitch${legacyPitches.length === 1 ? "" : "es"} saved only in this browser into the currently signed-in account? Closed entries without a recorded rate will be imported as sent for your review.`)) return;
    setImporting(true);
    setImportError(null);
    try {
      for (const old of legacyPitches) {
        const parsed = new Date(old.date);
        if (!old.brand.trim() || !Number.isFinite(parsed.getTime()) || parsed > new Date()) {
          throw new Error(`Couldn't import ${old.brand || "an entry"}: its brand or date needs correction.`);
        }
        const sentAt = new Date(parsed.getTime() - parsed.getTimezoneOffset() * 60_000).toISOString().slice(0, 10);
        let serverId = old.serverId;
        if (!serverId) {
          const created = await api.post<ApiPitch>("/pitches/manual", { custom_brand_name: old.brand.trim(), status: "sent", sent_at: sentAt });
          serverId = created.id;
          const all = JSON.parse(localStorage.getItem("mavlit_pitches") ?? "[]") as LegacyPitch[];
          localStorage.setItem("mavlit_pitches", JSON.stringify(all.map(item => item.id === old.id ? { ...item, serverId } : item)));
        }
        if (old.status === "conversation") {
          await api.patch<ApiPitch>(`/pitches/${serverId}`, { status: "conversation" });
        } else if (old.status === "closed" && old.agreedRate) {
          const amount = Number(old.agreedRate.replace(/[$,\s]/g, ""));
          if (!Number.isFinite(amount) || amount < 0) throw new Error(`Couldn't import the rate for ${old.brand}. The server entry is saved; correct the browser entry and retry.`);
          await api.patch<ApiPitch>(`/pitches/${serverId}`, { status: "closed_won", agreed_rate: amount });
        }
        // Keep the browser entry until all of its server updates have succeeded.
        const all = JSON.parse(localStorage.getItem("mavlit_pitches") ?? "[]") as LegacyPitch[];
        localStorage.setItem("mavlit_pitches", JSON.stringify(all.filter(item => item.id !== old.id)));
        setLegacyPitches(readLegacyPitches());
      }
    } catch (err) {
      setImportError(err instanceof Error ? err.message : "Couldn't finish importing. Already imported entries remain in your account.");
    } finally {
      setImporting(false);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["pitches"] }),
        queryClient.invalidateQueries({ queryKey: ["dashboard"] }),
      ]);
    }
  };

  const deletePitch = async (id: number) => {
    await api.delete(`/pitches/${id}`);
    queryClient.setQueryData<ApiPitch[]>(["pitches"], previous => previous?.filter(p => p.id !== id));
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["pitches"] }),
      queryClient.invalidateQueries({ queryKey: ["dashboard"] }),
    ]);
  };

  const goToDealMaker = (brand: string) => {
    setDealmakerBrand(brand);
    setTab("dealmaker");
  };

  return (
    <div className="min-h-screen bg-background text-foreground overflow-x-hidden">
      <Navbar />

      <main className="pt-28 pb-24 px-4">
        <div className="max-w-3xl mx-auto">

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} className="mb-8">
            <h1 className="text-4xl font-extrabold text-white tracking-tight mb-2">Pipeline</h1>
            <p className="text-muted-foreground text-base">Track your pitches and use Deal Tools to prepare for every conversation.</p>
          </motion.div>

          {legacyPitches.length > 0 && (
            <div className="mb-6 rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-100">
              <p>{legacyPitches.length} older manual pitch{legacyPitches.length === 1 ? " is" : "es are"} saved only in this browser. They won't appear in your account until you import them.</p>
              <p className="mt-1 text-xs text-amber-200/80">Review the signed-in account before importing. Closed entries without a recorded rate will be imported as sent so you can update the outcome.</p>
              <button onClick={importLegacy} disabled={importing} className="mt-2 underline disabled:opacity-50">{importing ? "Importing…" : "Import these pitches"}</button>
              {importError && <p role="alert" className="mt-2 text-red-400">{importError}</p>}
            </div>
          )}

          {Object.keys(legacyOverrides).length > 0 && (
            <details className="mb-6 rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-100">
              <summary className="cursor-pointer font-semibold">Earlier browser-only status changes need review</summary>
              <p className="mt-2 text-xs">These were never saved to the server and are not applied to the Pipeline. Check that each entry belongs to this account, then update its status and sent date. The old details remain on this device until you update an entry.</p>
              <ul className="mt-2 text-xs space-y-1">
                {Object.entries(legacyOverrides).map(([key, value]) => (
                  <li key={key}>{key}: {value.status ?? "unknown status"}{value.agreedRate ? ` · ${value.agreedRate}` : ""}</li>
                ))}
              </ul>
            </details>
          )}

          {/* Tabs */}
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, delay: 0.06 }}
            className="flex gap-2 mb-7 p-1 bg-card border border-border rounded-2xl w-fit">
            {[{ id: "pitches" as const, label: "My Pitches" }, { id: "dealmaker" as const, label: "Deal Tools" }].map(t => (
              <button key={t.id} onClick={() => setTab(t.id)}
                className={`px-5 py-2 rounded-xl text-sm font-bold transition-all ${tab === t.id ? "bg-primary text-white shadow-md shadow-primary/30" : "text-muted-foreground hover:text-white"}`}>
                {t.label}
                {t.id === "pitches" && !isError && !isLoading && (
                  <span className="ml-1.5 text-xs opacity-60">{pitches.length}</span>
                )}
              </button>
            ))}
          </motion.div>

          <AnimatePresence mode="wait">
            {tab === "pitches" && (
              <motion.div key="pitches" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
                {isLoading ? (
                  <p className="text-center text-muted-foreground py-16 text-sm">Loading your pitches…</p>
                 ) : isError ? (
                   <div role="alert" className="text-center text-red-400 py-16 text-sm space-y-2">
                     <p>{error instanceof ApiRequestError && error.status === 401
                       ? "Your session isn't being accepted by the pitch API. Please sign in again."
                       : `Couldn't load your pitches: ${error instanceof Error ? error.message : "Unknown error"}`}</p>
                     {error instanceof ApiRequestError && error.status === 401
                       ? <button onClick={() => void logout()} className="underline">Sign in again</button>
                       : <button onClick={() => refetch()} className="underline">Retry</button>}
                   </div>
                ) : (
                  <MyPitchesTab pitches={pitches} onUpdate={updatePitch} onAdd={addPitch} onDelete={deletePitch} onUseDealMaker={goToDealMaker} />
                )}
              </motion.div>
            )}
            {tab === "dealmaker" && (
              <motion.div key="dealmaker" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
                <DealMakerTab pitches={pitches} selectedBrand={dealmakerBrand} onSelectBrand={setDealmakerBrand} />
              </motion.div>
            )}
          </AnimatePresence>

        </div>
      </main>

      <Footer />
    </div>
  );
}
