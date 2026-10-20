import { useEffect, useRef, useState } from "react";
import { Check, Copy, Loader2 } from "lucide-react";
import { api, type ApiPitch } from "@/lib/api";

interface Props {
  pitch: ApiPitch;
  disabled?: boolean;
  onSaved: (pitch: ApiPitch) => void;
  onSavingChange: (saving: boolean) => void;
  onDirtyChange: (dirty: boolean) => void;
}

export default function PitchDraftEditor({ pitch, disabled = false, onSaved, onSavingChange, onDirtyChange }: Props) {
  const [text, setText] = useState(pitch.pitch_text ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const savingRef = useRef(false);
  const dirty = text !== (pitch.pitch_text ?? "");

  useEffect(() => { onDirtyChange(dirty); }, [dirty, onDirtyChange]);
  useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  const save = async () => {
    if (disabled || savingRef.current || !text.trim() || text.length > 20000) return;
    savingRef.current = true;
    setSaving(true);
    onSavingChange(true);
    setError(null);
    try {
      // Only update the generated row's email, never its status or sent date.
      const updated = await api.patch<ApiPitch>(`/pitches/${pitch.id}`, { pitch_text: text });
      if (updated.id !== pitch.id || updated.pitch_text !== text) {
        throw new Error("The API did not confirm your edited email. Your edits are still here; please try saving again.");
      }
      onDirtyChange(false);
      onSaved(updated);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not save your email. Your edits are still here. Please try again.");
    } finally {
      savingRef.current = false;
      setSaving(false);
      onSavingChange(false);
    }
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
    } catch {
      setError("Could not copy the email. You can select and copy the text below.");
    }
  };

  return (
    <section className="rounded-2xl border border-border bg-card p-5 space-y-4" aria-label="Review pitch draft">
      <div>
        <h3 className="text-lg font-bold text-white">Review your pitch to {pitch.brand_name}</h3>
        <p id="pitch-draft-help" className="mt-1 text-sm text-muted-foreground">
          Edit your email below, then save your changes to Pipeline. The original generated draft is already there. Saving does not send an email.
        </p>
      </div>
      {pitch.contact_email && (
        <p className="break-words text-sm text-muted-foreground">To: {pitch.contact_name ? `${pitch.contact_name} — ` : ""}{pitch.contact_email}</p>
      )}
      <div className="flex items-center justify-between gap-3">
        <label htmlFor="pitch-draft-text" className="text-sm font-semibold text-white">Pitch email draft</label>
        <button type="button" onClick={() => void copy()} disabled={!text}
          className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-semibold text-muted-foreground hover:text-white disabled:opacity-40">
          {copied ? <Check size={12} /> : <Copy size={12} />}{copied ? "Copied!" : "Copy"}
        </button>
      </div>
      <textarea id="pitch-draft-text" value={text} rows={16} maxLength={20000} disabled={saving || disabled}
        aria-describedby="pitch-draft-help pitch-draft-count"
        onChange={(event) => { setText(event.target.value); setCopied(false); }}
        className="w-full resize-y rounded-xl border border-border bg-black/40 p-4 font-mono text-sm leading-relaxed text-white/90 focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-60" />
      <p id="pitch-draft-count" className="text-right text-xs text-muted-foreground">{text.length}/20000</p>
      {error && <p role="alert" className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-400">{error}</p>}
      <button type="button" onClick={() => void save()} disabled={disabled || saving || !text.trim() || text.length > 20000}
        className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-bold text-white transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-40">
        {saving && <Loader2 size={16} className="animate-spin" />}
        {saving ? "Saving…" : "Save to Pipeline"}
      </button>
      <p className="text-xs text-muted-foreground">After sending the email yourself, mark it sent in Pipeline.</p>
    </section>
  );
}
