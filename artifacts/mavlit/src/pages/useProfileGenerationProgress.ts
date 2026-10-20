import { useEffect, useState } from "react";

/** An estimated two-minute animation, never evidence that the API job finished. */
export function useProfileGenerationProgress(active: boolean, complete: boolean) {
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [now, setNow] = useState(Date.now);

  useEffect(() => {
    if (!active) return;
    let timer: ReturnType<typeof setTimeout>;
    const tick = () => {
      setNow(Date.now());
      timer = setTimeout(tick, 500);
    };
    tick();
    return () => clearTimeout(timer);
  }, [active]);

  useEffect(() => {
    if (active || !complete || startedAt === null) return;
    // Render 100% briefly before replacing the loading screen with the editor.
    const timer = setTimeout(() => setStartedAt(null), 450);
    return () => clearTimeout(timer);
  }, [active, complete, startedAt]);

  const elapsed = Math.max(0, now - (startedAt ?? now));
  return {
    startedAt,
    setStartedAt,
    progress: complete ? 100 : Math.min(95, Math.floor(elapsed / 120000 * 95)),
    showProgress: active || (complete && startedAt !== null),
  };
}
