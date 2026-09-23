import { Check } from "lucide-react";
import type { StepKey } from "./types";

const STEP_LABELS: Record<StepKey, string> = {
  welcome: "Welcome",
  creator: "About you",
  instagram: "Instagram",
  youtube: "YouTube",
  review: "Review",
};

export default function ProgressStepper({
  steps,
  currentIndex,
}: {
  steps: StepKey[];
  currentIndex: number;
}) {
  return (
    <div className="w-full">
      <div className="mb-3 flex items-center justify-between text-xs">
        <span className="font-semibold text-white">{STEP_LABELS[steps[currentIndex]]}</span>
        <span className="text-muted-foreground">Step {currentIndex + 1} of {steps.length}</span>
      </div>
      <div className="flex gap-2" aria-label={`Step ${currentIndex + 1} of ${steps.length}`}>
        {steps.map((step, index) => (
          <div key={step} className="flex min-w-0 flex-1 items-center gap-2">
            <div
              className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-[11px] font-bold transition-colors ${
                index < currentIndex
                  ? "border-primary bg-primary text-white"
                  : index === currentIndex
                    ? "border-primary bg-primary/15 text-primary"
                    : "border-border bg-secondary text-muted-foreground"
              }`}
            >
              {index < currentIndex ? <Check size={13} /> : index + 1}
            </div>
            {index < steps.length - 1 && (
              <div className={`h-px flex-1 transition-colors ${index < currentIndex ? "bg-primary" : "bg-border"}`} />
            )}
          </div>
        ))}
      </div>
      <div className="mt-2 hidden grid-cols-5 gap-2 md:grid">
        {steps.map((step, index) => (
          <span
            key={step}
            className={`truncate text-[10px] font-medium ${index <= currentIndex ? "text-muted-foreground" : "text-muted-foreground/40"}`}
          >
            {STEP_LABELS[step]}
          </span>
        ))}
      </div>
    </div>
  );
}