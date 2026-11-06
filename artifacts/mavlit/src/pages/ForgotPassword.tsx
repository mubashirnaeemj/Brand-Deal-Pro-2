import { useState } from "react";
import { motion } from "framer-motion";
import { Mail, AlertCircle, Loader2, CheckCircle2 } from "lucide-react";
import { Link } from "wouter";
import { api, ApiRequestError } from "@/lib/api";

const inputCls =
  "w-full px-4 py-3 rounded-xl bg-secondary border border-border text-white placeholder:text-muted-foreground/50 text-sm font-medium focus:outline-none focus:border-primary/60 focus:ring-1 focus:ring-primary/30 transition-all";

/** "Forgot your password?": asks for the email and has the server mail a reset link. The answer is the same for every address. */
export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    const address = email.trim();
    if (!address || loading) return;
    setError(null);
    setLoading(true);
    try {
      await api.post("/auth/forgot-password", { email: address });
      setSent(address);
    } catch (cause) {
      setError(cause instanceof ApiRequestError && cause.status === 429 ? cause.message : "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-4">
      <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} className="flex items-center gap-2 mb-10">
        <div className="w-9 h-9 rounded-lg bg-primary flex items-center justify-center shadow-[0_0_20px_rgba(124,58,237,0.4)]">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5 text-primary-foreground">
            <path d="M4 14l8-10 8 10M4 20h16" />
          </svg>
        </div>
        <span className="font-bold text-2xl tracking-tight text-white">MAVLIT</span>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45, delay: 0.08 }}
        className="w-full max-w-sm bg-card border border-border rounded-2xl p-8 shadow-2xl">
        <div className="mb-7">
          <h1 className="text-2xl font-extrabold text-white tracking-tight mb-1">Forgot your password?</h1>
          <p className="text-sm text-muted-foreground">Enter your email and we'll send you a link to choose a new one.</p>
        </div>

        {sent ? (
          <div role="status" data-testid="forgot-sent" className="flex items-start gap-2.5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300">
            <CheckCircle2 size={15} className="mt-0.5 shrink-0" />
            <span>If there is a MAVLIT account for <strong className="break-all">{sent}</strong>, we've sent a link to reset the password. It works once and expires in 1 hour.</span>
          </div>
        ) : (
          <form onSubmit={submit} noValidate className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="forgot-email" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Email</label>
              <div className="relative">
                <Mail size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground/60" />
                <input id="forgot-email" data-testid="input-forgot-email" type="email" autoComplete="email" value={email}
                  onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" required disabled={loading} className={`${inputCls} pl-10`} />
              </div>
            </div>
            {error && (
              <div role="alert" className="flex items-start gap-2.5 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
                <AlertCircle size={14} className="shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}
            <button type="submit" data-testid="button-send-reset" disabled={loading || !email.trim()}
              className="mt-1 flex items-center justify-center gap-2 w-full py-3 rounded-xl bg-primary hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold text-sm shadow-lg shadow-primary/30 transition-all hover:-translate-y-0.5 active:translate-y-0">
              {loading ? <><Loader2 size={15} className="animate-spin" />Sending…</> : "Send reset link"}
            </button>
          </form>
        )}

        <p className="mt-6 border-t border-border pt-5 text-center text-sm text-muted-foreground">
          <Link href="/signin" data-testid="link-back-to-signin" className="font-semibold text-primary hover:underline">← Back to sign in</Link>
        </p>
      </motion.div>
    </div>
  );
}
