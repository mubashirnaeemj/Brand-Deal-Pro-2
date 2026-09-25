import type { ReactNode } from "react";
import { Clock3, PenLine, Sparkles } from "lucide-react";
import type { DescriptionMode, PlatformKey } from "./types";

export default function DescriptionModeSelector({
  platform,
  mode,
  onChange,
  children,
}: {
  platform: PlatformKey;
  mode: DescriptionMode;
  onChange: (mode: DescriptionMode) => void;
  children: ReactNode;
}) {
  const source = platform === "instagram" ? "Instagram posts/captions" : "YouTube videos/titles/descriptions";

  return (
    <fieldset>
      <legend className="text-sm font-bold text-white">How would you like to create your description?</legend>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <label className="block cursor-pointer">
          <input
            type="radio"
            name={`${platform}-description-mode`}
            value="manual"
            checked={mode === "manual"}
            onChange={() => onChange("manual")}
            className="peer sr-only"
          />
          <span className={`flex min-h-24 items-start gap-3 rounded-xl border p-4 transition peer-focus-visible:ring-2 peer-focus-visible:ring-primary ${
            mode === "manual"
              ? "border-primary bg-primary/10 shadow-lg shadow-primary/10"
              : "border-border bg-secondary/40 hover:border-primary/40 hover:bg-secondary/70"
          }`}>
            <span className={`mt-0.5 rounded-lg p-2 ${mode === "manual" ? "bg-primary/20 text-primary" : "bg-background text-muted-foreground"}`}>
              <PenLine size={17} />
            </span>
            <span className="pt-1 text-sm font-semibold text-white">Write it myself</span>
          </span>
        </label>
        <label className="block cursor-pointer">
          <input
            type="radio"
            name={`${platform}-description-mode`}
            value="generate"
            checked={mode === "generate"}
            onChange={() => onChange("generate")}
            className="peer sr-only"
          />
          <span className={`flex min-h-24 items-start gap-3 rounded-xl border p-4 transition peer-focus-visible:ring-2 peer-focus-visible:ring-primary ${
            mode === "generate"
              ? "border-primary bg-primary/10 shadow-lg shadow-primary/10"
              : "border-border bg-secondary/40 hover:border-primary/40 hover:bg-secondary/70"
          }`}>
            <span className={`mt-0.5 rounded-lg p-2 ${mode === "generate" ? "bg-primary/20 text-primary" : "bg-background text-muted-foreground"}`}>
              <Sparkles size={17} />
            </span>
            <span className="flex flex-wrap items-center gap-2 pt-0.5">
              <span className="text-sm font-semibold leading-5 text-white">Let MAVLIT generate it from my content</span>
              <span className="rounded-full border border-primary/30 bg-primary/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-primary">Recommended</span>
            </span>
          </span>
        </label>
      </div>
      {mode === "manual" ? (
        <div className="mt-4">{children}</div>
      ) : (
        <div role="note" className="mt-4 rounded-xl border border-primary/25 bg-primary/5 p-4 sm:p-5">
          <div className="flex items-start gap-3">
            <Sparkles size={18} className="mt-0.5 shrink-0 text-primary" />
            <div className="space-y-3 text-sm leading-6 text-slate-300">
              <p>MAVLIT will analyze your {source} and generate a creator description optimized for brand matching.</p>
              <p className="flex items-center gap-2 font-semibold text-white"><Clock3 size={15} className="text-primary" /> MAVLIT will try to generate this when you complete your profile.</p>
              <p>If generation fails, add a description yourself to finish onboarding.</p>
            </div>
          </div>
        </div>
      )}
    </fieldset>
  );
}