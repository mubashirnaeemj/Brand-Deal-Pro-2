import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Mail, Lock, AlertCircle, Loader2 } from "lucide-react";
import { Link } from "wouter";
import { useAuth } from "@/contexts/AuthContext";
import { api, ApiRequestError } from "@/lib/api";

const MIN_PASSWORD_LENGTH = 6;
const inputCls =
  "w-full px-4 py-3 rounded-xl bg-secondary border border-border text-white placeholder:text-muted-foreground/50 text-sm font-medium focus:outline-none focus:border-primary/60 focus:ring-1 focus:ring-primary/30 transition-all";

type ResetStatus = { status: "valid" | "used" | "expired" | "invalid"; email: string | null };

/**
 * The page behind the link in the "reset your password" email (/reset-password?token=...): the account's email (not editable) and the new
 * password. Saving sets it, ends the account's other sessions and signs the person in. A link that was already used, has expired or is not
 * valid says so and offers to ask for a new one.
 */
export default function ResetPassword() {
  const { login } = useAuth();
  const token = new URLSearchParams(window.location.search).get("token") ?? "";
  const [reset, setReset] = useState<ResetStatus | null>(null);
  const [dead, setDead] = useState(!token);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!token) return;
    let active = true;
    api.get<ResetStatus>(`/auth/password-reset/${encodeURIComponent(token)}`)
      .then((result) => {
        if (!active) return;
        if (result.status === "valid" && result.email) setReset(result);
        else setDead(true);
      })
      .catch((cause) => {
        if (!active) return;
        if (cause instanceof ApiRequestError && cause.status === 429) setError(cause.message);
        else setDead(true);
      });
    return () => { active = false; };
  }, [token]);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!reset?.email || saving) return;
    if (password.length < MIN_PASSWORD_LENGTH) { setError(`Choose a password of at least ${MIN_PASSWORD_LENGTH} characters.`); return; }
    if (password !== confirm) { setError("The two passwords do not match."); return; }
    setError(null);
    setSaving(true);
    try {
      await api.post("/auth/password-reset", { token, password });
    } catch (cause) {
      setSaving(false);
      if (cause instanceof ApiRequestError && cause.status === 410) { setDead(true); return; }   // used or expired meanwhile
      setError(cause instanceof Error ? cause.message : "Something went wrong. Please try again.");
      return;
    }
    try {
      await login(reset.email, password);   // signs in and opens the app; the link is already used up
    } catch {
      setSaving(false);
      window.location.assign("/signin");   // the password is changed: the normal sign-in takes over
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
        {dead ? (
          <div data-testid="reset-dead">
            <h1 className="text-2xl font-extrabold text-white tracking-tight mb-2">This link can't be used</h1>
            <p className="text-sm text-muted-foreground mb-6">It has expired or was already used. Ask for a new reset link and we'll email it to you.</p>
            <Link href="/forgot-password" data-testid="link-ask-new-reset"
              className="flex w-full items-center justify-center rounded-xl bg-primary py-3 text-sm font-bold text-white shadow-lg shadow-primary/30 hover:bg-primary/90">
              Send me a new link
            </Link>
            <p className="mt-5 text-center text-sm text-muted-foreground">
              <Link href="/signin" className="font-semibold text-primary hover:underline">← Back to sign in</Link>
            </p>
          </div>
        ) : (
          <>
            <div className="mb-7">
              <h1 className="text-2xl font-extrabold text-white tracking-tight mb-1">Choose a new password</h1>
              <p className="text-sm text-muted-foreground">Then you'll be signed in to your MAVLIT account.</p>
            </div>
            {!reset ? (
              error
                ? <p role="alert" className="text-sm text-red-400">{error}</p>
                : <p role="status" className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 size={15} className="animate-spin" />Checking your link…</p>
            ) : (
              <form onSubmit={submit} noValidate className="flex flex-col gap-4">
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="reset-email" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Email</label>
                  <div className="relative">
                    <Mail size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground/60" />
                    <input id="reset-email" data-testid="input-reset-email" type="email" value={reset.email ?? ""} readOnly disabled
                      autoComplete="username" className={`${inputCls} pl-10 opacity-70 cursor-not-allowed`} />
                  </div>
                </div>
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="reset-password" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">New password</label>
                  <div className="relative">
                    <Lock size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground/60" />
                    <input id="reset-password" data-testid="input-reset-password" type="password" autoComplete="new-password" value={password}
                      onChange={(e) => setPassword(e.target.value)} placeholder={`At least ${MIN_PASSWORD_LENGTH} characters`} required disabled={saving}
                      className={`${inputCls} pl-10`} />
                  </div>
                </div>
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="reset-confirm" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Confirm password</label>
                  <div className="relative">
                    <Lock size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground/60" />
                    <input id="reset-confirm" data-testid="input-reset-confirm" type="password" autoComplete="new-password" value={confirm}
                      onChange={(e) => setConfirm(e.target.value)} placeholder="Type it again" required disabled={saving} className={`${inputCls} pl-10`} />
                  </div>
                </div>
                {error && (
                  <div role="alert" className="flex items-start gap-2.5 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
                    <AlertCircle size={14} className="shrink-0 mt-0.5" />
                    <span>{error}</span>
                  </div>
                )}
                <button type="submit" data-testid="button-reset-password" disabled={saving || !password || !confirm}
                  className="mt-1 flex items-center justify-center gap-2 w-full py-3 rounded-xl bg-primary hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold text-sm shadow-lg shadow-primary/30 transition-all hover:-translate-y-0.5 active:translate-y-0">
                  {saving ? <><Loader2 size={15} className="animate-spin" />Saving…</> : "Save password and sign in"}
                </button>
              </form>
            )}
          </>
        )}
      </motion.div>
    </div>
  );
}
