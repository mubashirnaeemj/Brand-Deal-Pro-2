import { Youtube } from "lucide-react";
import BrandCategoriesToAvoid from "./BrandCategoriesToAvoid";
import DescriptionModeSelector from "./DescriptionModeSelector";
import YourAudience from "./YourAudience";
import MultiSelectDropdown from "./MultiSelectDropdown";
import type { DescriptionMode, FieldErrors, YouTubeProfile } from "./types";
import { INPUT_CLASS, NICHE_OPTIONS, subNicheOptions } from "./types";

export default function YouTubeStep({
  value,
  onChange,
  descriptionMode,
  onDescriptionModeChange,
  errors,
  onGenerate,
  generating = false,
  generateError,
  estimated = false,
}: {
  value: YouTubeProfile;
  onChange: (value: YouTubeProfile) => void;
  descriptionMode: DescriptionMode;
  onDescriptionModeChange: (mode: DescriptionMode) => void;
  errors: FieldErrors;
  onGenerate?: () => void;
  generating?: boolean;
  generateError?: string | null;
  estimated?: boolean;
}) {
  const set = <K extends keyof YouTubeProfile>(key: K, next: YouTubeProfile[K]) => onChange({ ...value, [key]: next });
  return (
    <div>
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-500/10 text-red-400"><Youtube size={20} /></div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">Platform profile</p>
          <h1 className="text-2xl font-extrabold text-white sm:text-3xl">YouTube</h1>
        </div>
      </div>
      <p className="mt-3 text-sm leading-6 text-muted-foreground">Tell us about your channel and the audience watching it.</p>

      <div className="mt-7 grid gap-5 sm:grid-cols-2">
        <Field label="Channel name" error={errors.channelName}>
          <input value={value.channelName} onChange={(event) => set("channelName", event.target.value)} placeholder="Your channel" className={`${INPUT_CLASS} ${errors.channelName ? "border-red-500/60" : ""}`} />
        </Field>
        <Field label="Subscriber count" error={errors.subscribers}>
          <input type="number" min="0" value={value.subscribers} onChange={(event) => set("subscribers", event.target.value)} placeholder="12000" className={`${INPUT_CLASS} ${errors.subscribers ? "border-red-500/60" : ""}`} />
        </Field>
      </div>
      <div className="mt-5 grid gap-5 sm:grid-cols-2">
        <MultiSelectDropdown label="Primary niche" options={NICHE_OPTIONS} selected={value.niches}
          onChange={(items) => onChange({ ...value, niches: items, subNiches: value.subNiches.filter((item) => subNicheOptions(items).includes(item)) })}
          placeholder="Select one or more" error={errors.niches} />
        <MultiSelectDropdown label="Sub-niches" options={subNicheOptions(value.niches)} selected={value.subNiches}
          onChange={(items) => set("subNiches", items)} placeholder="Select sub-niches" searchable />
      </div>

      <div className="mt-5">
        <DescriptionModeSelector platform="youtube" mode={descriptionMode} onChange={onDescriptionModeChange}
          onGenerate={onGenerate} generating={generating} generateError={generateError}
          showGenerated={estimated && !!value.contentDescription.trim()}>
          <Field label="Describe your YouTube content" error={errors.contentDescription}>
            <textarea rows={4} value={value.contentDescription} onChange={(event) => set("contentDescription", event.target.value)} placeholder="Describe the content you publish on YouTube." className={`${INPUT_CLASS} resize-none leading-6 ${errors.contentDescription ? "border-red-500/60" : ""}`} />
          </Field>
        </DescriptionModeSelector>
      </div>
      <div className="mt-5">
        <YourAudience platform="youtube" value={value} onChange={(audience) => onChange({ ...value, ...audience })} estimated={estimated} />
      </div>
      <div className="mt-5">
        <BrandCategoriesToAvoid selected={value.excludedCategories} primaryNiches={value.niches}
          onChange={(excludedCategories) => set("excludedCategories", excludedCategories)} />
      </div>
    </div>
  );
}

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground">{label}<div className="mt-1.5">{children}</div>{error && <span className="mt-1.5 block text-xs normal-case tracking-normal text-red-400">{error}</span>}</label>;
}