import { Instagram } from "lucide-react";
import AudienceDemographicsForm from "./AudienceDemographicsForm";
import DescriptionModeSelector from "./DescriptionModeSelector";
import MultiSelectDropdown from "./MultiSelectDropdown";
import type { DescriptionMode, FieldErrors, InstagramProfile } from "./types";
import { INPUT_CLASS, NICHE_OPTIONS, SUB_NICHE_OPTIONS } from "./types";

export default function InstagramStep({
  value,
  onChange,
  descriptionMode,
  onDescriptionModeChange,
  errors,
}: {
  value: InstagramProfile;
  onChange: (value: InstagramProfile) => void;
  descriptionMode: DescriptionMode;
  onDescriptionModeChange: (mode: DescriptionMode) => void;
  errors: FieldErrors;
}) {
  const set = <K extends keyof InstagramProfile>(key: K, next: InstagramProfile[K]) => onChange({ ...value, [key]: next });
  return (
    <div>
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-pink-500/10 text-pink-400"><Instagram size={20} /></div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">Platform profile</p>
          <h1 className="text-2xl font-extrabold text-white sm:text-3xl">Instagram</h1>
        </div>
      </div>
      <p className="mt-3 text-sm leading-6 text-muted-foreground">Add current details so brand recommendations reflect your actual audience.</p>

      <div className="mt-7 grid gap-5 sm:grid-cols-2">
        <Field label="Instagram username" error={errors.username}>
          <input value={value.username} onChange={(event) => set("username", event.target.value.replace(/^@/, ""))} placeholder="yourhandle" className={`${INPUT_CLASS} ${errors.username ? "border-red-500/60" : ""}`} />
        </Field>
        <Field label="Follower count" error={errors.followers}>
          <input type="number" min="0" value={value.followers} onChange={(event) => set("followers", event.target.value)} placeholder="45000" className={`${INPUT_CLASS} ${errors.followers ? "border-red-500/60" : ""}`} />
        </Field>
      </div>
      <div className="mt-5 grid gap-5 sm:grid-cols-2">
        <MultiSelectDropdown label="Primary niche" options={NICHE_OPTIONS} selected={value.niches} onChange={(items) => set("niches", items)} placeholder="Select one or more" error={errors.niches} />
        <MultiSelectDropdown label="Sub-niches" options={SUB_NICHE_OPTIONS} selected={value.subNiches} onChange={(items) => set("subNiches", items)} placeholder="Select sub-niches" searchable />
      </div>

      <div className="mt-5">
        <DescriptionModeSelector platform="instagram" mode={descriptionMode} onChange={onDescriptionModeChange}>
          <Field label="Describe your Instagram content" error={errors.contentDescription}>
            <textarea rows={4} value={value.contentDescription} onChange={(event) => set("contentDescription", event.target.value)} placeholder="Describe the content you publish on Instagram." className={`${INPUT_CLASS} resize-none leading-6 ${errors.contentDescription ? "border-red-500/60" : ""}`} />
          </Field>
        </DescriptionModeSelector>
      </div>
      <div className="mt-5">
        <Field label="Brand categories to avoid">
          <input value={value.excludedCategories} onChange={(event) => set("excludedCategories", event.target.value)} placeholder="Alcohol, Gambling, Crypto, Politics" className={INPUT_CLASS} />
        </Field>
      </div>
      <div className="mt-5">
        <AudienceDemographicsForm value={value.audience} onChange={(audience) => set("audience", audience)} errors={errors} />
      </div>
    </div>
  );
}

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground">{label}<div className="mt-1.5">{children}</div>{error && <span className="mt-1.5 block text-xs normal-case tracking-normal text-red-400">{error}</span>}</label>;
}