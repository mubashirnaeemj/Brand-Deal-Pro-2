import { useState } from "react";
import { motion } from "framer-motion";
import { Mail, Lock, AlertCircle, Loader2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

const inputCls =
  "w-full px-4 py-3 rounded-xl bg-secondary border border-border text-white placeholder:text-muted-foreground/50 text-sm font-medium focus:outline-none focus:border-primary/60 focus:ring-1 focus:ring-primary/30 transition-all";

export default function Login() {
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password) return;
    setError(null);
    setLoading(true);
    try {
      await login(email.trim(), password);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-4">
      {/* Logo */}
      <motion.div
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="flex items-center gap-2 mb-10"
      >
        <div className="w-9 h-9 rounded-lg bg-primary flex items-center justify-center shadow-[0_0_20px_rgba(124,58,237,0.4)]">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5 text-primary-foreground">
            <path d="M4 14l8-10 8 10M4 20h16" />
          </svg>
        </div>
        <span className="font-bold text-2xl tracking-tight text-white">MAVLIT</span>
      </motion.div>

      {/* Card */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, delay: 0.08 }}
        className="w-full max-w-sm bg-card border border-border rounded-2xl p-8 shadow-2xl"
      >
        <div className="mb-7">
          <h1 className="text-2xl font-extrabold text-white tracking-tight mb-1">Welcome back</h1>
          <p className="text-sm text-muted-foreground">Sign in to your MAVLIT account</p>
        </div>

        <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
          {/* Email */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Email
            </label>
            <div className="relative">
              <Mail size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground/60" />
              <input
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
                className={`${inputCls} pl-10`}
              />
            </div>
          </div>

          {/* Password */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Password
            </label>
            <div className="relative">
              <Lock size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground/60" />
              <input
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                className={`${inputCls} pl-10`}
              />
            </div>
          </div>

          {/* Error */}
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-start gap-2.5 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-sm"
            >
              <AlertCircle size={14} className="shrink-0 mt-0.5" />
              <span>{error}</span>
            </motion.div>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={loading || !email.trim() || !password}
            className="mt-1 flex items-center justify-center gap-2 w-full py-3 rounded-xl bg-primary hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold text-sm shadow-lg shadow-primary/30 transition-all hover:-translate-y-0.5 active:translate-y-0"
          >
            {loading ? (
              <>
                <Loader2 size={15} className="animate-spin" />
                Signing in…
              </>
            ) : (
              "Sign In"
            )}
          </button>
        </form>
      </motion.div>

      <p className="mt-8 text-xs text-muted-foreground/50 text-center">
        MAVLIT · For music creators
      </p>
    </div>
  );
}
