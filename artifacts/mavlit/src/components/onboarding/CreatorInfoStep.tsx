import { Instagram, Youtube } from "lucide-react";
import type { FieldErrors, OnboardingData, PlatformKey } from "./types";
import { INPUT_CLASS } from "./types";

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
  const togglePlatform = (platform: PlatformKey) => {
    set("platforms", value.platforms.includes(platform)
      ? value.platforms.filter((item) => item !== platform)
      : [...value.platforms, platform]);
  };

  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">Tell us about yourself</p>
      <h1 className="mt-2 text-2xl font-extrabold text-white sm:text-3xl">Creator information</h1>
      <p className="mt-2 text-sm leading-6 text-muted-foreground">This gives MAVLIT the context it needs to evaluate brand fit.</p>

      <div className="mt-7 grid gap-5 sm:grid-cols-2">
        <Field label="Full name" error={errors.fullName}>
          <input value={value.fullName} onChange={(event) => set("fullName", event.target.value)} placeholder="Jordan Mitchell" className={`${INPUT_CLASS} ${errors.fullName ? "border-red-500/60" : ""}`} />
        </Field>
        <Field label="Age" error={errors.age}>
          <input type="number" min="13" max="120" value={value.age} onChange={(event) => set("age", event.target.value)} placeholder="25" className={`${INPUT_CLASS} ${errors.age ? "border-red-500/60" : ""}`} />
        </Field>
        <Field label="City" error={errors.city}>
          <input value={value.city} onChange={(event) => set("city", event.target.value)} placeholder="Los Angeles" className={`${INPUT_CLASS} ${errors.city ? "border-red-500/60" : ""}`} />
        </Field>
        <Field label="Country" error={errors.country}>
          <input value={value.country} onChange={(event) => set("country", event.target.value)} placeholder="United States" className={`${INPUT_CLASS} ${errors.country ? "border-red-500/60" : ""}`} />
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
        <Field label="Content description" error={errors.contentDescription}>
          <textarea
            rows={4}
            value={value.contentDescription}
            onChange={(event) => set("contentDescription", event.target.value)}
            placeholder="Describe the type of content you create and the audience you serve."
            className={`${INPUT_CLASS} resize-none leading-6 ${errors.contentDescription ? "border-red-500/60" : ""}`}
          />
        </Field>
      </div>

      <div className="mt-5">
        <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">Primary platforms</label>
        <div className="grid grid-cols-2 gap-3">
          {([
            ["instagram", "Instagram", Instagram],
            ["youtube", "YouTube", Youtube],
          ] as const).map(([key, label, Icon]) => {
            const active = value.platforms.includes(key);
            return (
              <button
                key={key}
                type="button"
                onClick={() => togglePlatform(key)}
                className={`flex items-center gap-3 rounded-xl border p-4 text-left transition ${
                  active ? "border-primary/70 bg-primary/10 text-white" : "border-border bg-secondary/40 text-muted-foreground hover:border-primary/30 hover:text-white"
                }`}
              >
                <Icon size={18} className={active ? "text-primary" : ""} />
                <span className="text-sm font-semibold">{label}</span>
              </button>
            );
          })}
        </div>
        {errors.platforms && <p className="mt-1.5 text-xs text-red-400">{errors.platforms}</p>}
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