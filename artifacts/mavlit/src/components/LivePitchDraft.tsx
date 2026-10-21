import { useEffect, useRef } from "react";
import { Loader2 } from "lucide-react";

const STATUS = "Writing your pitch…";

/** Read-only while the pitch is being written; a click shows the whole text at once. */
export default function LivePitchDraft({ text, onClick }: { text: string; onClick?: () => void }) {
  const ref = useRef<HTMLTextAreaElement>(null);
  useEffect(() => {
    if (ref.current) ref.current.scrollTop = ref.current.scrollHeight;
  }, [text]);
  return (
    <section className="rounded-2xl border border-border bg-card p-5 space-y-4" aria-label="Live pitch draft" aria-busy="true">
      <p role="status" className="flex items-center gap-2 text-sm font-semibold text-primary">
        <Loader2 size={16} className="animate-spin" />{STATUS}
      </p>
      <label htmlFor="live-pitch-text" className="block text-sm font-semibold text-white">Pitch email draft</label>
      <textarea ref={ref} id="live-pitch-text" readOnly value={text} rows={16} onClick={onClick}
        placeholder="MAVLIT is writing your pitch…"
        className="w-full resize-y rounded-xl border border-border bg-black/40 p-4 font-mono text-sm leading-relaxed text-white/90 focus:outline-none focus:ring-2 focus:ring-primary" />
    </section>
  );
}
