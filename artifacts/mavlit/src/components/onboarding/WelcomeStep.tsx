import { BarChart3, Building2, Sparkles, Target } from "lucide-react";

const FEATURES = [
  { Icon: Sparkles, label: "Your content" },
  { Icon: Target, label: "Your niche" },
  { Icon: Building2, label: "Brand partnerships" },
  { Icon: BarChart3, label: "Audience fit" },
];

export default function WelcomeStep({ onStart }: { onStart: () => void }) {
  return (
    <div className="py-3 text-center sm:py-6">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary shadow-xl shadow-primary/25">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-8 w-8 text-white">
          <path d="M4 14l8-10 8 10M4 20h16" />
        </svg>
      </div>
      <p className="mt-6 text-xs font-semibold uppercase tracking-[0.2em] text-primary">Creator onboarding</p>
      <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-white sm:text-4xl">Welcome to MAVLIT</h1>
      <p className="mx-auto mt-4 max-w-xl text-sm leading-7 text-muted-foreground sm:text-base">
        MAVLIT helps creators discover brands that are actively working with creators in their niche.
      </p>
      <div className="mx-auto mt-7 grid max-w-xl grid-cols-2 gap-3">
        {FEATURES.map(({ Icon, label }) => (
          <div key={label} className="flex items-center gap-3 rounded-xl border border-border/70 bg-background/35 p-3 text-left">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Icon size={15} />
            </div>
            <span className="text-xs font-semibold text-slate-300 sm:text-sm">{label}</span>
          </div>
        ))}
      </div>
      <p className="mx-auto mt-6 max-w-lg text-sm leading-6 text-muted-foreground">
        We combine these signals to find sponsorship opportunities that match your profile—not generic lists.
      </p>
      <button
        type="button"
        onClick={onStart}
        className="mt-8 rounded-xl bg-primary px-7 py-3.5 text-sm font-bold text-white shadow-lg shadow-primary/30 transition hover:-translate-y-0.5 hover:bg-primary/90"
      >
        Get Started
      </button>
    </div>
  );
}