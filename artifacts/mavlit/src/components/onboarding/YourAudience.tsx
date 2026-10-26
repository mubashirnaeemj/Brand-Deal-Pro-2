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
      <div className="grid gap-4">
        <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Audience gender
          <select aria-label={`${platform} audience gender`} value={value.audienceGender}
            onChange={(event) => onChange({ ...value, audienceGender: event.target.value })}
            className={`${INPUT_CLASS} mt-1.5`}>
            <option value="">Select</option>
            <option value="male">Male</option><option value="female">Female</option><option value="both">Both</option>
          </select>
        </label>
      </div>
      {error && <p id={`${id}-error`} role="alert" className="text-sm text-red-400">{error}</p>}
      {estimated && <p className="text-xs text-muted-foreground">Estimated by MAVLIT from your bio and recent content. You can edit it.</p>}
    </fieldset>
  );
}
