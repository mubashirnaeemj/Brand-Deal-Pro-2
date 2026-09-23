import type { AudienceDemographics } from "./types";
import { audienceTotal, INPUT_CLASS } from "./types";

export default function AudienceDemographicsForm({
  value,
  onChange,
  errors,
}: {
  value: AudienceDemographics;
  onChange: (value: AudienceDemographics) => void;
  errors: Record<string, string>;
}) {
  const total = audienceTotal(value);
  return (
    <div className="rounded-xl border border-border/70 bg-background/35 p-4">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-bold text-white">Audience demographics</h3>
          <p className="mt-0.5 text-xs text-muted-foreground">Use your latest platform analytics.</p>
        </div>
        <span className={`text-xs font-semibold ${total > 100 ? "text-red-400" : "text-muted-foreground"}`}>{total}% total</span>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Audience male (%)
          <input
            type="number"
            min="0"
            max="100"
            value={value.malePct}
            onChange={(event) => onChange({ ...value, malePct: event.target.value })}
            className={`${INPUT_CLASS} mt-1.5 ${errors.audience ? "border-red-500/60" : ""}`}
          />
        </label>
        <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Audience female (%)
          <input
            type="number"
            min="0"
            max="100"
            value={value.femalePct}
            onChange={(event) => onChange({ ...value, femalePct: event.target.value })}
            className={`${INPUT_CLASS} mt-1.5 ${errors.audience ? "border-red-500/60" : ""}`}
          />
        </label>
      </div>
      <label className="mt-4 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        Top audience country
        <input
          value={value.topCountry}
          onChange={(event) => onChange({ ...value, topCountry: event.target.value })}
          placeholder="e.g. United States"
          className={`${INPUT_CLASS} mt-1.5 ${errors.topCountry ? "border-red-500/60" : ""}`}
        />
      </label>
      {(errors.audience || errors.topCountry) && (
        <p className="mt-2 text-xs text-red-400">{errors.audience || errors.topCountry}</p>
      )}
    </div>
  );
}