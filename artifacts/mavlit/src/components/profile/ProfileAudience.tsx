import { audienceError } from "@/lib/audience";
import { INPUT_CLASS } from "@/components/onboarding/types";
import type { PlatformDetails } from "@/pages/profileForm";

export default function ProfileAudience({ value, onChange, readOnly, showMissingDescriptionWarning = false }: {
  value: PlatformDetails;
  onChange: (value: Partial<PlatformDetails>) => void;
  readOnly: boolean;
  showMissingDescriptionWarning?: boolean;
}) {
  const genderError = audienceError(value);
  const descriptionError = value.audienceDescription.length > 1500;
  const missingDescription = showMissingDescriptionWarning && !value.audienceDescription.trim();
  return (
    <fieldset disabled={readOnly} className={`space-y-4 ${readOnly ? "opacity-70" : ""}`}>
      <legend className="mb-3 text-sm font-semibold text-white">Your audience</legend>
      <div className="grid gap-4">
        <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Audience gender
          <select aria-label="instagram audience gender" value={value.audienceGender}
            onChange={(event) => onChange({ audienceGender: event.target.value })}
            className={`${INPUT_CLASS} mt-1.5`}>
            <option value="">Select</option>
            <option value="male">Male</option><option value="female">Female</option><option value="both">Both</option>
          </select>
        </label>
      </div>
      {genderError && <p role="alert" className="text-sm text-red-400">{genderError}</p>}
      <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        Instagram audience description
        <textarea aria-label="Instagram audience description" data-testid="input-audience-description" rows={3} maxLength={1500}
          value={value.audienceDescription} aria-invalid={descriptionError}
          aria-describedby={missingDescription ? "audience-description-missing" : undefined}
          onChange={(event) => onChange({ audienceDescription: event.target.value })}
          placeholder={readOnly ? "MAVLIT will describe your audience." : "Describe who follows your Instagram content, including their age (for example aged 18-34)."}
          className={`${INPUT_CLASS} mt-1.5 resize-y`} />
        <span aria-live="polite" className="mt-1 block text-right text-[11px] normal-case tracking-normal">{value.audienceDescription.length}/1500</span>
      </label>
      {missingDescription && <p id="audience-description-missing" data-testid="audience-description-missing" role="status" className="text-sm text-amber-300">
        MAVLIT returned no audience description. Enter one above or select “Fetch profile details with MAVLIT” to try again.
      </p>}
      {descriptionError && <p role="alert" className="text-sm text-red-400">Audience description must be 1500 characters or fewer.</p>}
      {readOnly && <p className="text-xs text-muted-foreground">Audience details are estimated by MAVLIT and cannot be edited in this mode.</p>}
    </fieldset>
  );
}
