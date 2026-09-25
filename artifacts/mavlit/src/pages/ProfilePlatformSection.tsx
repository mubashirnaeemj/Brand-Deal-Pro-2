import { Instagram, Youtube } from "lucide-react";
import MultiSelectDropdown from "@/components/onboarding/MultiSelectDropdown";
import { INPUT_CLASS, NICHE_OPTIONS, SUB_NICHE_OPTIONS } from "@/components/onboarding/types";
import type { PlatformDetails, ProfileForm } from "./profileForm";

type InstagramDetails = ProfileForm["instagram"];
type YoutubeDetails = ProfileForm["youtube"];

const cardClass = "rounded-2xl border border-border bg-card p-5 sm:p-6";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
      {label}
      <span className="mt-1.5 block">{children}</span>
    </label>
  );
}

function SharedDetails({
  platform,
  value,
  onChange,
}: {
  platform: "instagram" | "youtube";
  value: PlatformDetails;
  onChange: (value: PlatformDetails) => void;
}) {
  const options = [...new Set([...NICHE_OPTIONS, ...(value.primaryNiche ? [value.primaryNiche] : [])])];
  const subNicheOptions = [...new Set([...SUB_NICHE_OPTIONS, ...value.subNiches])];
  const set = <K extends keyof PlatformDetails>(key: K, next: PlatformDetails[K]) =>
    onChange({ ...value, [key]: next });

  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Primary niche">
          <select value={value.primaryNiche} onChange={(event) => set("primaryNiche", event.target.value)} className={INPUT_CLASS}>
            <option value="">Select a niche</option>
            {options.map((option) => <option key={option} value={option}>{option}</option>)}
          </select>
        </Field>
        <MultiSelectDropdown
          label="Sub-niches"
          selected={value.subNiches}
          onChange={(subNiches) => set("subNiches", subNiches)}
          options={subNicheOptions}
          placeholder="Select sub-niches"
          searchable
        />
      </div>
      <Field label="Brand categories to avoid">
        <input
          value={value.excludedCategories}
          onChange={(event) => set("excludedCategories", event.target.value)}
          placeholder="Alcohol, Gambling, Crypto"
          className={INPUT_CLASS}
        />
      </Field>
      <Field label={`${platform} description`}>
        <textarea
          rows={4}
          value={value.description}
          onChange={(event) => set("description", event.target.value)}
          placeholder={`Describe your ${platform === "instagram" ? "Instagram" : "YouTube"} content.`}
          className={`${INPUT_CLASS} resize-none`}
        />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Audience male (%)">
          <input type="number" min="0" max="100" step="0.1" value={value.audience.malePct}
            onChange={(event) => set("audience", { ...value.audience, malePct: event.target.value })} className={INPUT_CLASS} />
        </Field>
        <Field label="Audience female (%)">
          <input type="number" min="0" max="100" step="0.1" value={value.audience.femalePct}
            onChange={(event) => set("audience", { ...value.audience, femalePct: event.target.value })} className={INPUT_CLASS} />
        </Field>
      </div>
    </>
  );
}

export function InstagramSection({ value, onChange }: {
  value: InstagramDetails;
  onChange: (value: InstagramDetails) => void;
}) {
  return (
    <section className={cardClass}>
      <h2 className="mb-5 flex items-center gap-2 text-lg font-bold text-white"><Instagram size={20} className="text-pink-400" />Instagram</h2>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Instagram username">
          <input value={value.username} onChange={(event) => onChange({ ...value, username: event.target.value.replace(/^@/, "") })}
            placeholder="yourhandle" className={INPUT_CLASS} />
        </Field>
        <Field label="Follower count">
          <input type="number" min="0" step="1" value={value.followers}
            onChange={(event) => onChange({ ...value, followers: event.target.value })}
            placeholder="45000" className={INPUT_CLASS} />
        </Field>
      </div>
      <div className="mt-4 grid gap-4">
        <SharedDetails platform="instagram" value={value} onChange={(details) => onChange({ ...value, ...details })} />
      </div>
    </section>
  );
}

export function YoutubeSection({ value, onChange }: {
  value: YoutubeDetails;
  onChange: (value: YoutubeDetails) => void;
}) {
  return (
    <section className={cardClass}>
      <h2 className="mb-5 flex items-center gap-2 text-lg font-bold text-white"><Youtube size={20} className="text-red-400" />YouTube</h2>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Channel name">
          <input value={value.channelName} onChange={(event) => onChange({ ...value, channelName: event.target.value })}
            placeholder="Your channel" className={INPUT_CLASS} />
        </Field>
        <Field label="Subscriber count">
          <input type="number" min="0" step="1" value={value.subscribers}
            onChange={(event) => onChange({ ...value, subscribers: event.target.value })}
            placeholder="12000" className={INPUT_CLASS} />
        </Field>
      </div>
      <div className="mt-4 grid gap-4">
        <SharedDetails platform="youtube" value={value} onChange={(details) => onChange({ ...value, ...details })} />
      </div>
    </section>
  );
}