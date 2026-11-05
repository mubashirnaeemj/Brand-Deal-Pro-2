import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Mail, Lock, AlertCircle, Loader2 } from "lucide-react";
import { Redirect } from "wouter";
import { useAuth } from "@/contexts/AuthContext";
import { api, ApiRequestError } from "@/lib/api";

const MIN_PASSWORD_LENGTH = 12;
const inputCls =
  "w-full px-4 py-3 rounded-xl bg-secondary border border-border text-white placeholder:text-muted-foreground/50 text-sm font-medium focus:outline-none focus:border-primary/60 focus:ring-1 focus:ring-primary/30 transition-all";

type InviteStatus = { status: "valid" | "used" | "expired" | "invalid"; email: string | null };

/**
 * The page behind the link in the early-access email (/set-password?token=...). It shows the invited email (not editable) and asks for the
 * password the person wants. Saving creates the account, signs them in and uses the link up. A link that was already used, has expired or
 * is not valid sends the visitor to the app: straight in when they are signed in, otherwise to the sign-in page.
 */
export default function SetPassword() {
  const { user, login } = useAuth();
  const token = new URLSearchParams(window.location.search).get("token") ?? "";
  const [invite, setInvite] = useState<InviteStatus | null>(null);
  const [leave, setLeave] = useState(!token);
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (user || !token) return;
    let active = true;
    api.get<InviteStatus>(`/auth/invite/${encodeURIComponent(token)}`)
      .then((result) => {
        if (!active) return;
        if (result.status === "valid" && result.email) setInvite(result);
        else setLeave(true);
      })
      .catch((cause) => {
        if (!active) return;
        if (cause instanceof ApiRequestError && cause.status === 429) setError(cause.message);
        else setLeave(true);
      });
    return () => { active = false; };
  }, [token, user]);

  // Signed in already, or a link that cannot be used: the app decides where this person goes.
  if (user || leave) return <Redirect to="/" replace />;

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!invite?.email || saving) return;
    if (password.length < MIN_PASSWORD_LENGTH) { setError(`Choose a password of at least ${MIN_PASSWORD_LENGTH} characters.`); return; }
    setError(null);
    setSaving(true);
    try {
      await api.post("/auth/invite/accept", { token, password });
    } catch (cause) {
      setSaving(false);
      if (cause instanceof ApiRequestError && cause.status === 410) { setLeave(true); return; }   // used or expired meanwhile
      setError(cause instanceof Error ? cause.message : "Something went wrong. Please try again.");
      return;
    }
    try {
      await login(invite.email, password);   // signs in and opens the app; the link is already used up
    } catch {
      setSaving(false);
      setError("Your password is saved. Please sign in with it.");
      window.location.assign("/signin");
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
          <h1 className="text-2xl font-extrabold text-white tracking-tight mb-1">Welcome to MAVLIT</h1>
          <p className="text-sm text-muted-foreground">Choose a password to open your account</p>
        </div>

        {!invite ? (
          error
            ? <p role="alert" className="text-sm text-red-400">{error}</p>
            : <p role="status" className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 size={15} className="animate-spin" />Checking your link…</p>
        ) : (
          <form onSubmit={submit} noValidate className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="invite-email" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Email</label>
              <div className="relative">
                <Mail size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground/60" />
                <input id="invite-email" data-testid="input-invite-email" type="email" value={invite.email ?? ""} readOnly disabled
                  autoComplete="username" className={`${inputCls} pl-10 opacity-70 cursor-not-allowed`} />
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="invite-password" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Password</label>
              <div className="relative">
                <Lock size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground/60" />
                <input id="invite-password" data-testid="input-invite-password" type="password" autoComplete="new-password" value={password}
                  onChange={(e) => setPassword(e.target.value)} placeholder={`At least ${MIN_PASSWORD_LENGTH} characters`} required disabled={saving}
                  className={`${inputCls} pl-10`} />
              </div>
            </div>

            {error && (
              <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} role="alert"
                className="flex items-start gap-2.5 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
                <AlertCircle size={14} className="shrink-0 mt-0.5" />
                <span>{error}</span>
              </motion.div>
            )}

            <button type="submit" data-testid="button-set-password" disabled={saving || !password}
              className="mt-1 flex items-center justify-center gap-2 w-full py-3 rounded-xl bg-primary hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold text-sm shadow-lg shadow-primary/30 transition-all hover:-translate-y-0.5 active:translate-y-0">
              {saving ? <><Loader2 size={15} className="animate-spin" />Creating your account…</> : "Create account and sign in"}
            </button>
          </form>
        )}
      </motion.div>

      <p className="mt-8 text-xs text-muted-foreground/50 text-center">MAVLIT · For active creators</p>
    </div>
  );
}
