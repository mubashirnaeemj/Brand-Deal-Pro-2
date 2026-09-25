import type { FieldErrors, OnboardingData } from "./types";
import { INPUT_CLASS } from "./types";
import PlatformSelector from "./PlatformSelector";

export default function CreatorInfoStep({
  value,
  onChange,
  errors,
}: {
  value: OnboardingData["creator"];
  onChange: (value: OnboardingData["creator"]) => void;
  errors: FieldErrors;
}) {
  const set = <K extends keyof typeof value>(key: K, next: (typeof value)[K]) => onChange({ ...value, [key]: next });

  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">Tell us about yourself</p>
      <h1 className="mt-2 text-2xl font-extrabold text-white sm:text-3xl">Creator information</h1>
      <p className="mt-2 text-sm leading-6 text-muted-foreground">Complete your profile to unlock MAVLIT. Your draft saves on this device automatically.</p>

      <div className="mt-7 grid gap-5 sm:grid-cols-2">
        <Field label="Full name" error={errors.fullName}>
          <input value={value.fullName} onChange={(event) => set("fullName", event.target.value)} placeholder="Jordan Mitchell" className={`${INPUT_CLASS} ${errors.fullName ? "border-red-500/60" : ""}`} />
        </Field>
        <Field label="Age" error={errors.age}>
          <input type="number" min="13" max="120" value={value.age} onChange={(event) => set("age", event.target.value)} placeholder="25" className={`${INPUT_CLASS} ${errors.age ? "border-red-500/60" : ""}`} />
        </Field>
      </div>

      <div className="mt-5">
        <Field label="Gender" error={errors.gender}>
          <select value={value.gender} onChange={(event) => set("gender", event.target.value)} className={`${INPUT_CLASS} ${errors.gender ? "border-red-500/60" : ""}`}>
            <option value="">Select an option</option>
            <option>Male</option>
            <option>Female</option>
            <option>Non-binary</option>
            <option>Prefer not to say</option>
            <option>Other</option>
          </select>
        </Field>
      </div>

      <div className="mt-5">
        <PlatformSelector value={value.platforms} onChange={(platforms) => set("platforms", platforms)} error={errors.platforms} />
      </div>
      <div className="mt-5">
        <Field label="Overall content description" error={errors.contentDescription}>
          <textarea
            rows={4}
            value={value.contentDescription}
            onChange={(event) => set("contentDescription", event.target.value)}
            placeholder="Describe the content you create (or add a description on a platform step)."
            className={`${INPUT_CLASS} resize-none ${errors.contentDescription ? "border-red-500/60" : ""}`}
          />
        </Field>
        <p className="mt-1.5 text-xs text-muted-foreground">At least one overall, Instagram, or YouTube description is required.</p>
      </div>
    </div>
  );
}

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
      {label}
      <div className="mt-1.5">{children}</div>
      {error && <span className="mt-1.5 block text-xs normal-case tracking-normal text-red-400">{error}</span>}
    </label>
  );
}