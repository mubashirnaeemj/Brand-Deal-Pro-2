import type { ReactNode } from "react";
import { ArrowLeft, ArrowRight, Loader2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import ProgressStepper from "./ProgressStepper";
import type { StepKey } from "./types";

export default function OnboardingLayout({
  steps,
  currentIndex,
  children,
  onPrevious,
  onContinue,
  continueLabel = "Continue",
  showPrevious = true,
  showContinue = true,
  saving = false,
  continueDisabled = false,
}: {
  steps: StepKey[];
  currentIndex: number;
  children: ReactNode;
  onPrevious?: () => void;
  onContinue?: () => void;
  continueLabel?: string;
  showPrevious?: boolean;
  showContinue?: boolean;
  saving?: boolean;
  continueDisabled?: boolean;
}) {
  const { logout } = useAuth();
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-white/5 bg-background/85 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5 text-white">
                <path d="M4 14l8-10 8 10M4 20h16" />
              </svg>
            </div>
            <span className="text-lg font-bold tracking-tight text-white">MAVLIT</span>
          </div>
          <div className="flex items-center gap-4 text-xs">
            <span className="font-semibold text-primary">Creator Profile</span>
            <button type="button" onClick={logout} className="text-muted-foreground hover:text-white">Log out</button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-8 sm:px-6 sm:py-12">
        <ProgressStepper steps={steps} currentIndex={currentIndex} />
        <section className="mt-8 overflow-visible rounded-2xl border border-border bg-card p-5 shadow-2xl shadow-black/20 sm:p-8">
          {children}
        </section>
        {(showPrevious || showContinue) && (
          <div className="mt-5 flex items-center justify-between gap-3">
            {showPrevious ? (
              <button
                type="button"
                onClick={onPrevious}
                disabled={saving}
                className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-3 text-sm font-semibold text-slate-300 transition hover:bg-secondary hover:text-white disabled:opacity-50"
              >
                <ArrowLeft size={15} /> Previous
              </button>
            ) : <span />}
            {showContinue && (
              <button
                type="button"
                onClick={onContinue}
                disabled={saving || continueDisabled}
                className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-bold text-white shadow-lg shadow-primary/25 transition hover:-translate-y-0.5 hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0"
              >
                {saving ? <><Loader2 size={15} className="animate-spin" /> Saving profile…</> : <>{continueLabel} <ArrowRight size={15} /></>}
              </button>
            )}
          </div>
        )}
        <p className="mt-5 text-center text-xs text-muted-foreground/60">Your progress is saved automatically on this device.</p>
      </main>
    </div>
  );
}