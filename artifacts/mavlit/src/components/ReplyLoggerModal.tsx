import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Sparkles, AlertTriangle, ArrowRight } from "lucide-react";
import { useLocation } from "wouter";

type Category = "interested" | "offered_number" | "asked_call" | "declined";

interface AnalysisResult {
  category: Category;
  recommendation: string;
  offeredAmount?: string;
}

interface Props {
  brandName: string;
  dealId?: string;
  onClose: () => void;
  onDismiss?: () => void;
  onOpenCounterOffer?: (dealId: string, offer: string) => void;
}

const CATEGORY_CONFIG: Record<Category, { label: string; bg: string; text: string; border: string }> = {
  interested:     { label: "Interested or needs more info", bg: "bg-emerald-500/15", text: "text-emerald-400", border: "border-emerald-500/30" },
  offered_number: { label: "Offered a specific number",    bg: "bg-violet-500/15",   text: "text-violet-400", border: "border-violet-500/30"  },
  asked_call:     { label: "Asked for a call or meeting",  bg: "bg-sky-500/15",      text: "text-sky-400",    border: "border-sky-500/30"     },
  declined:       { label: "Declined",                     bg: "bg-zinc-500/15",     text: "text-zinc-400",   border: "border-zinc-500/30"    },
};

export default function ReplyLoggerModal({ brandName, dealId, onClose, onDismiss, onOpenCounterOffer }: Props) {
  const [, setLocation] = useLocation();
  const [message, setMessage]     = useState("");
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult]       = useState<AnalysisResult | null>(null);
  const [error, setError]         = useState<string | null>(null);

  const analyze = async () => {
    if (!message.trim()) return;
    // Placeholder: the AI reply analysis is not connected yet.
    setResult(null);
    setError("This feature isn't available yet.");
  };

  const handleCounterOffer = () => {
    const offer = result?.offeredAmount ?? "";
    if (onOpenCounterOffer && dealId) {
      onOpenCounterOffer(dealId, offer);
    } else {
      if (dealId) sessionStorage.setItem("mavlit_expand_deal", dealId);
      if (offer)  sessionStorage.setItem("mavlit_prefill_offer", offer);
      onClose();
      setLocation("/deals");
    }
  };

  const cat = result ? CATEGORY_CONFIG[result.category] : null;

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 8 }}
        transition={{ duration: 0.2 }}
        onClick={e => e.stopPropagation()}
        className="relative w-full max-w-md bg-card border border-border rounded-2xl p-6 shadow-2xl"
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-sm font-bold text-white">Log reply from {brandName}</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-white transition-colors p-1">
            <X size={16} />
          </button>
        </div>

        {/* Message textarea */}
        <textarea
          value={message}
          onChange={e => setMessage(e.target.value)}
          rows={5}
          placeholder="Paste their message here"
          className="w-full px-3.5 py-2.5 rounded-xl bg-black/40 border border-border text-white text-sm placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary/60 focus:ring-1 focus:ring-primary/30 transition-all resize-none mb-4"
        />

        {/* Analyze button — only shown before result */}
        <AnimatePresence>
          {!result && (
            <motion.button
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={analyze}
              disabled={!message.trim() || analyzing}
              className="w-full py-3 rounded-xl text-sm font-bold bg-primary hover:bg-primary/90 disabled:opacity-40 text-white transition-all flex items-center justify-center gap-2 mb-3"
            >
              {analyzing ? (
                <>
                  <motion.div animate={{ rotate: 360 }} transition={{ duration: 1.2, repeat: Infinity, ease: "linear" }}
                    className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full" />
                  Analyzing…
                </>
              ) : (
                <><Sparkles size={14} />✦ Analyze reply</>
              )}
            </motion.button>
          )}
        </AnimatePresence>

        {error && <p className="text-xs text-red-400 mb-3">{error}</p>}

        {/* Analysis result */}
        <AnimatePresence>
          {result && cat && (
            <motion.div
              initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              className="space-y-4"
            >
              {/* Category badge */}
              <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold border ${cat.bg} ${cat.text} ${cat.border}`}>
                {cat.label}
              </span>

              {/* Recommendation */}
              <p className="text-sm text-white/85 leading-relaxed">{result.recommendation}</p>

              {/* Per-category action */}
              {result.category === "interested" && (
                <button
                  onClick={() => { setLocation("/pitch"); onClose(); }}
                  className="w-full py-3 rounded-xl text-sm font-bold border border-primary/50 text-primary hover:bg-primary hover:text-white transition-all flex items-center justify-center gap-2"
                >
                  Generate response <ArrowRight size={14} />
                </button>
              )}

              {result.category === "offered_number" && (
                <button
                  onClick={handleCounterOffer}
                  className="w-full py-3 rounded-xl text-sm font-bold border border-violet-500/50 text-violet-400 hover:bg-violet-500/15 transition-all flex items-center justify-center gap-2"
                >
                  Open counter-offer generator <ArrowRight size={14} />
                </button>
              )}

              {result.category === "asked_call" && (
                <div className="flex items-start gap-3 px-4 py-3.5 rounded-xl bg-sky-500/10 border border-sky-500/30">
                  <AlertTriangle size={14} className="text-sky-400 mt-0.5 shrink-0" />
                  <p className="text-xs text-sky-200/90 leading-relaxed">
                    You do not need to take a call to move forward. Reply with your key stats and ask what else they need from you in writing.
                  </p>
                </div>
              )}

              {result.category === "declined" && (
                <div className="space-y-3">
                  <div className="px-4 py-3.5 rounded-xl bg-zinc-500/10 border border-zinc-500/30">
                    <p className="text-xs text-zinc-300 leading-relaxed">
                      A no now is not a no forever. Move this brand to your long-term pipeline and revisit next quarter.
                    </p>
                  </div>
                  <button
                    onClick={() => { onDismiss?.(); onClose(); }}
                    className="w-full py-2.5 rounded-xl text-sm font-semibold border border-zinc-500/40 text-zinc-400 hover:bg-zinc-500/15 transition-all"
                  >
                    Dismiss deal
                  </button>
                </div>
              )}

              {/* Re-analyze link */}
              <button
                onClick={() => setResult(null)}
                className="w-full text-xs text-muted-foreground hover:text-white transition-colors text-center pt-1"
              >
                Edit message and re-analyze
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </motion.div>
  );
}
