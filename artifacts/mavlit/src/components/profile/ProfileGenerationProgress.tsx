import { Sparkles } from "lucide-react";

export default function ProfileGenerationProgress({ progress, error }: { progress: number; error: string | null }) {
  const complete = progress === 100;
  return (
    <div className="flex min-h-80 flex-col items-center justify-center px-2 py-10 text-center" data-testid="generation-progress-screen">
      <span className="mb-5 rounded-2xl bg-primary/15 p-4 text-primary"><Sparkles size={30} aria-hidden /></span>
      <h2 className="text-xl font-bold text-white">{complete ? "Your profile is ready" : "MAVLIT is building your profile"}</h2>
      <p className="mt-3 text-5xl font-bold tabular-nums text-primary" data-testid="generation-percentage">{progress}%</p>
      <div role="progressbar" aria-label="Estimated profile generation progress" aria-valuemin={0} aria-valuemax={100}
        aria-valuenow={progress} className="mt-6 h-2 w-full max-w-sm overflow-hidden rounded-full bg-white/10">
        <div className="h-full rounded-full bg-primary transition-[width] duration-300 motion-reduce:transition-none" style={{ width: `${progress}%` }} />
      </div>
      <p role="status" className="mt-5 max-w-sm text-sm text-muted-foreground">
        {complete ? "Review and edit any details before saving."
          : progress >= 95 ? "This is taking a little longer. We’re still waiting for your generated profile."
          : "Usually takes about 1 minute. We’ll show your details as soon as they’re ready."}
      </p>
      {!complete && <p className="mt-3 text-xs text-muted-foreground">Progress is estimated. You can leave and return while MAVLIT works.</p>}
      {error && <p role="alert" className="mt-4 text-sm text-red-400">{error}</p>}
    </div>
  );
}
