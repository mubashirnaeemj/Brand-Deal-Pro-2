import { audienceAgeRangeError, audienceError, formatAudienceAgeRange, parseAudienceAgeRange } from "@/lib/audience";
import { INPUT_CLASS } from "@/components/onboarding/types";
import type { PlatformDetails } from "@/pages/profileForm";

export default function ProfileAudience({ value, onChange, readOnly }: {
  value: PlatformDetails;
  onChange: (value: Partial<PlatformDetails>) => void;
  readOnly: boolean;
}) {
  const range = value.audienceAgeRange ?? formatAudienceAgeRange(value);
  const rangeError = audienceAgeRangeError(range) || audienceError(value);
  const descriptionError = value.audienceDescription.length > 1500;
  return (
    <fieldset disabled={readOnly} className={`space-y-4 ${readOnly ? "opacity-70" : ""}`}>
      <legend className="mb-3 text-sm font-semibold text-white">Your audience</legend>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Audience gender
          <select aria-label="instagram audience gender" value={value.audienceGender}
            onChange={(event) => onChange({ audienceGender: event.target.value })}
            className={`${INPUT_CLASS} mt-1.5`}>
            <option value="">Select</option>
            <option value="male">Male</option><option value="female">Female</option><option value="both">Both</option>
          </select>
        </label>
        <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Audience age range
          <input aria-label="instagram audience age range" data-testid="input-audience-age-range"
            value={range} placeholder="25-44" aria-invalid={!!rangeError}
            aria-describedby={rangeError ? "audience-range-error" : "audience-range-help"}
            onChange={(event) => onChange({ audienceAgeRange: event.target.value, ...parseAudienceAgeRange(event.target.value) })}
            className={`${INPUT_CLASS} mt-1.5`} />
        </label>
      </div>
      {rangeError
        ? <p id="audience-range-error" role="alert" className="text-sm text-red-400">{rangeError}</p>
        : <p id="audience-range-help" className="text-xs text-muted-foreground">Use an age range such as 25-44. Ages must be between 13 and 100.</p>}
      <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        Instagram audience description
        <textarea aria-label="Instagram audience description" data-testid="input-audience-description" rows={3} maxLength={1500}
          value={value.audienceDescription} aria-invalid={descriptionError}
          onChange={(event) => onChange({ audienceDescription: event.target.value })}
          placeholder={readOnly ? "MAVLIT will describe your audience." : "Describe who follows your Instagram content."}
          className={`${INPUT_CLASS} mt-1.5 resize-y`} />
        <span aria-live="polite" className="mt-1 block text-right text-[11px] normal-case tracking-normal">{value.audienceDescription.length}/1500</span>
      </label>
      {descriptionError && <p role="alert" className="text-sm text-red-400">Audience description must be 1500 characters or fewer.</p>}
      {readOnly && <p className="text-xs text-muted-foreground">Audience details are estimated by MAVLIT and cannot be edited in this mode.</p>}
    </fieldset>
  );
}
