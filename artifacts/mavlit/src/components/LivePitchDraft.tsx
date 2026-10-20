import { useEffect, useRef } from "react";
import { Loader2 } from "lucide-react";

export default function LivePitchDraft({ text }: { text: string }) {
  const ref = useRef<HTMLTextAreaElement>(null);
  useEffect(() => {
    if (ref.current) ref.current.scrollTop = ref.current.scrollHeight;
  }, [text]);
  return (
    <section className="rounded-2xl border border-border bg-card p-5 space-y-4" aria-label="Live pitch draft" aria-busy="true">
      <p role="status" className="flex items-center gap-2 text-sm font-semibold text-primary">
        <Loader2 size={16} className="animate-spin" />Writing your pitch…
      </p>
      <label htmlFor="live-pitch-text" className="block text-sm font-semibold text-white">Pitch email draft</label>
      <textarea ref={ref} id="live-pitch-text" readOnly value={text} rows={16}
        placeholder="MAVLIT is writing your pitch…"
        className="w-full resize-y rounded-xl border border-border bg-black/40 p-4 font-mono text-sm leading-relaxed text-white/90 focus:outline-none focus:ring-2 focus:ring-primary" />
    </section>
  );
}
