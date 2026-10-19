import { useId } from "react";
import { audienceError, type AudienceFields } from "@/lib/audience";
import { INPUT_CLASS, type PlatformKey } from "./types";

export default function YourAudience({ platform, value, onChange, estimated = false }: {
  platform: PlatformKey;
  value: AudienceFields;
  onChange: (value: AudienceFields) => void;
  estimated?: boolean;
}) {
  const id = useId();
  const error = audienceError(value);
  return (
    <fieldset className="space-y-3" aria-label={`${platform} audience`}>
      <legend className="text-sm font-semibold text-white">Your audience</legend>
      <div className="grid gap-4 sm:grid-cols-3">
        <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Audience gender
          <select aria-label={`${platform} audience gender`} value={value.audienceGender}
            onChange={(event) => onChange({ ...value, audienceGender: event.target.value })}
            className={`${INPUT_CLASS} mt-1.5`}>
            <option value="">Select</option>
            <option value="male">Male</option><option value="female">Female</option><option value="both">Both</option>
          </select>
        </label>
        <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Audience age from
          <input aria-label={`${platform} audience age from`} type="number" min={13} max={100} step={1}
            value={value.audienceAgeMin} placeholder="13"
            aria-invalid={!!error} aria-describedby={error ? `${id}-error` : undefined}
            onChange={(event) => onChange({ ...value, audienceAgeMin: event.target.value })}
            className={`${INPUT_CLASS} mt-1.5`} />
        </label>
        <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          to
          <input aria-label={`${platform} audience age to`} type="number" min={13} max={100} step={1}
            value={value.audienceAgeMax} placeholder="100"
            aria-invalid={!!error} aria-describedby={error ? `${id}-error` : undefined}
            onChange={(event) => onChange({ ...value, audienceAgeMax: event.target.value })}
            className={`${INPUT_CLASS} mt-1.5`} />
        </label>
      </div>
      {error && <p id={`${id}-error`} role="alert" className="text-sm text-red-400">{error}</p>}
      {estimated && <p className="text-xs text-muted-foreground">Estimated by MAVLIT from your bio and recent content. You can edit it.</p>}
    </fieldset>
  );
}
