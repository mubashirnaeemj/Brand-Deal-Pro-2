import { Loader2 } from "lucide-react";
import { audienceText, brandDisplayName, type OwnBrandLookup } from "@/hooks/useOwnBrandLookup";

export default function OwnBrandLookupField({ lookup }: { lookup: OwnBrandLookup }) {
  const { input, setInput, state, busy, find } = lookup;
  const { brand } = state;
  return (
    <div className="space-y-3">
      <label htmlFor="own-brand-input" className="block text-sm font-semibold text-white/80">The brand's Instagram URL or handle</label>
      <div className="flex gap-2">
        <input id="own-brand-input" value={input} onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); find(); } }}
          placeholder="https://www.instagram.com/brandname or @brandname"
          aria-invalid={!!state.inputError} aria-describedby="own-brand-hint"
          className="w-full px-3.5 py-2.5 rounded-xl bg-black/40 border border-border text-white text-sm placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary/60 focus:ring-1 focus:ring-primary/30 transition-all" />
        <button type="button" onClick={find} disabled={busy || !input.trim()}
          className="shrink-0 px-4 py-2.5 rounded-xl text-sm font-semibold bg-primary hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed text-white transition-all">
          Find this brand
        </button>
      </div>
      {state.inputError && <p role="alert" className="text-sm text-red-400">{state.inputError}</p>}
      <p id="own-brand-hint" className="text-xs text-muted-foreground/70 leading-relaxed">
        Any brand, even one that is not in your matches. MAVLIT reads its Instagram to learn what it sells and who it is for, then writes your pitch from that.
      </p>
      {busy && (
        <p role="status" className="flex items-center gap-2 text-sm font-semibold text-primary">
          <Loader2 size={16} className="animate-spin shrink-0" />
          <span>MAVLIT is gathering info for this brand…{state.stage ? ` ${state.stage}` : ""}</span>
        </p>
      )}
      {state.phase === "failed" && state.error && <p role="alert" className="text-sm text-red-400">{state.error}</p>}
      {brand && (
        <div data-testid="own-brand-card" className="rounded-xl border border-primary/25 bg-primary/5 p-4 space-y-1.5">
          <p className="text-sm font-bold text-white">{brandDisplayName(brand)}</p>
          <p className="text-xs text-muted-foreground"><span className="text-white/70 font-semibold">Niche:</span> {brand.niche || "Not known"}</p>
          {brand.description && <p className="text-xs text-muted-foreground line-clamp-1" title={brand.description}>{brand.description}</p>}
          <p className="text-xs text-muted-foreground"><span className="text-white/70 font-semibold">Target audience:</span> {audienceText(brand)}</p>
          <p className="text-xs text-muted-foreground"><span className="text-white/70 font-semibold">Latest product:</span> {brand.latest_product?.trim() || "None found"}</p>
          <p className="text-[11px] text-muted-foreground/60 pt-1">Gathered from the brand's Instagram. The audience age is an estimate, not confirmed.</p>
        </div>
      )}
    </div>
  );
}
