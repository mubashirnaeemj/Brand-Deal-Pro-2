import { useEffect, useState } from "react";
import { Instagram, Youtube } from "lucide-react";
import { isDescriptionPending, type DescriptionStatus } from "@/contexts/AuthContext";
import BrandCategoriesToAvoid from "@/components/onboarding/BrandCategoriesToAvoid";
import DescriptionModeSelector from "@/components/onboarding/DescriptionModeSelector";
import MultiSelectDropdown from "@/components/onboarding/MultiSelectDropdown";
import { INPUT_CLASS, NICHE_OPTIONS, subNicheOptions, type DescriptionMode } from "@/components/onboarding/types";
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
  username,
  value,
  onChange,
  onSaveUsername,
  onStartGeneration,
  onGeneratingChange,
  generationBusy,
  status,
  statusError,
}: {
  platform: "instagram" | "youtube";
  username: string;
  value: PlatformDetails;
  onChange: (value: PlatformDetails) => void;
  onSaveUsername: (username: string) => Promise<string>;
  onStartGeneration: (username: string, niche: string) => Promise<void>;
  onGeneratingChange: (active: boolean) => void;
  generationBusy: boolean;
  status?: DescriptionStatus | null;
  statusError?: string | null;
}) {
  const [descriptionMode, setDescriptionMode] = useState<DescriptionMode>("manual");
  const [generating, setGenerating] = useState(false);
  const [generateError, setGenerateError] = useState<string | null>(null);
  const pending = isDescriptionPending(status);
  useEffect(() => {
    if (status === "completed" && value.description.trim()) setDescriptionMode("manual");
  }, [status, value.description]);
  const set = <K extends keyof PlatformDetails>(key: K, next: PlatformDetails[K]) =>
    onChange({ ...value, [key]: next });
  const generate = async () => {
    if (pending || generationBusy) return;
    const enteredUsername = platform === "instagram" ? username.trim().replace(/^@/, "") : username.trim();
    if (!enteredUsername || !NICHE_OPTIONS.includes(value.primaryNiches[0] as typeof NICHE_OPTIONS[number])) {
      setGenerateError(`Add your ${platform === "instagram" ? "Instagram username" : "YouTube channel name"} and primary niche first.`);
      return;
    }
    setGenerateError(null);
    setGenerating(true);
    onGeneratingChange(true);
    try {
      const savedUsername = await onSaveUsername(enteredUsername);
      await onStartGeneration(savedUsername, value.primaryNiches[0]);
    } catch (error) {
      setGenerateError(error instanceof Error ? error.message : "Could not generate a description.");
    } finally {
      setGenerating(false);
      onGeneratingChange(false);
    }
  };

  return (
    <>
      {pending && <p role="status" className="text-sm text-primary">
        {platform === "instagram" ? "Instagram" : "YouTube"} description {status === "queued" ? "queued" : "generating"}… You can leave this page; progress will resume when you return.
      </p>}
      {status === "failed" && <p role="alert" className="text-sm text-red-400">
        Generation failed: {statusError || "Please try again."}
      </p>}
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <MultiSelectDropdown label="Primary niche" options={NICHE_OPTIONS} selected={value.primaryNiches}
            onChange={(items) => onChange({ ...value, primaryNiches: items,
              subNiches: value.subNiches.filter((item) => subNicheOptions(items).includes(item)) })}
            placeholder="Select one or more" disabled={pending || generationBusy} />
          {value.primaryNiches.some((niche) => !NICHE_OPTIONS.includes(niche as typeof NICHE_OPTIONS[number])) && (
            <span className="mt-1 block text-xs text-amber-400">
              A saved niche is no longer an option. Remove it before saving.
            </span>
          )}
        </div>
        <MultiSelectDropdown
          label="Sub-niches"
          selected={value.subNiches}
          onChange={(subNiches) => set("subNiches", subNiches)}
          options={subNicheOptions(value.primaryNiches)}
          placeholder="Select sub-niches"
          searchable
        />
      </div>
      <BrandCategoriesToAvoid selected={value.excludedCategories} primaryNiches={value.primaryNiches}
        onChange={(excludedCategories) => set("excludedCategories", excludedCategories)} />
      <fieldset className="space-y-3">
        <legend className="text-sm font-semibold text-white">Audience demographics (optional)</legend>
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label={`${platform} audience gender`}>
            <select value={value.audienceGender} onChange={(event) => set("audienceGender", event.target.value)}
              className={INPUT_CLASS}>
              <option value="">Not specified</option>
              <option value="male">Male</option>
              <option value="female">Female</option>
              <option value="both">Both</option>
            </select>
          </Field>
          <Field label={`${platform} audience minimum age`}>
            <input type="number" min={0} step={1} value={value.audienceAgeMin}
              onChange={(event) => set("audienceAgeMin", event.target.value)}
              placeholder="Not specified" className={INPUT_CLASS} />
          </Field>
          <Field label={`${platform} audience maximum age`}>
            <input type="number" min={0} step={1} value={value.audienceAgeMax}
              onChange={(event) => set("audienceAgeMax", event.target.value)}
              placeholder="Not specified" className={INPUT_CLASS} />
          </Field>
        </div>
      </fieldset>
      <DescriptionModeSelector platform={platform} mode={descriptionMode}
        onChange={(mode) => {
          setGenerateError(null);
          setDescriptionMode(mode);
        }}
        onGenerate={generate} generating={generating || pending} generateDisabled={generationBusy || pending}
        generateError={generateError}>
        <Field label={`${platform} description`}>
          <textarea disabled={pending} rows={4} value={value.description} onChange={(event) => set("description", event.target.value)}
            placeholder={`Describe your ${platform === "instagram" ? "Instagram" : "YouTube"} content.`}
            className={`${INPUT_CLASS} resize-none`} />
        </Field>
      </DescriptionModeSelector>
    </>
  );
}

export function InstagramSection({ value, onChange, onSaveUsername, onStartGeneration, onGeneratingChange, generationBusy, status, statusError }: {
  value: InstagramDetails;
  onChange: (value: InstagramDetails) => void;
  onSaveUsername: (username: string) => Promise<string>;
  onStartGeneration: (username: string, niche: string) => Promise<void>;
  onGeneratingChange: (active: boolean) => void;
  generationBusy: boolean;
  status?: DescriptionStatus | null;
  statusError?: string | null;
}) {
  return (
    <section className={cardClass}>
      <h2 className="mb-5 flex items-center gap-2 text-lg font-bold text-white"><Instagram size={20} className="text-pink-400" />Instagram</h2>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Instagram username">
          <input disabled={isDescriptionPending(status) || generationBusy} value={value.username} onChange={(event) => onChange({ ...value, username: event.target.value.replace(/^@/, "") })}
            placeholder="yourhandle" className={INPUT_CLASS} />
        </Field>
        <Field label="Follower count">
          <input type="number" min="0" step="1" value={value.followers}
            onChange={(event) => onChange({ ...value, followers: event.target.value })}
            placeholder="45000" className={INPUT_CLASS} />
        </Field>
      </div>
      <div className="mt-4 grid gap-4">
        <SharedDetails platform="instagram" username={value.username}
          value={value} onChange={(details) => onChange({ ...value, ...details })}
          onSaveUsername={onSaveUsername} onStartGeneration={onStartGeneration} onGeneratingChange={onGeneratingChange}
          generationBusy={generationBusy} status={status} statusError={statusError} />
      </div>
    </section>
  );
}

export function YoutubeSection({ value, onChange, onSaveUsername, onStartGeneration, onGeneratingChange, generationBusy, status, statusError }: {
  value: YoutubeDetails;
  onChange: (value: YoutubeDetails) => void;
  onSaveUsername: (username: string) => Promise<string>;
  onStartGeneration: (username: string, niche: string) => Promise<void>;
  onGeneratingChange: (active: boolean) => void;
  generationBusy: boolean;
  status?: DescriptionStatus | null;
  statusError?: string | null;
}) {
  return (
    <section className={cardClass}>
      <h2 className="mb-5 flex items-center gap-2 text-lg font-bold text-white"><Youtube size={20} className="text-red-400" />YouTube</h2>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Channel name">
          <input disabled={isDescriptionPending(status) || generationBusy} value={value.channelName} onChange={(event) => onChange({ ...value, channelName: event.target.value })}
            placeholder="Your channel" className={INPUT_CLASS} />
        </Field>
        <Field label="Subscriber count">
          <input type="number" min="0" step="1" value={value.subscribers}
            onChange={(event) => onChange({ ...value, subscribers: event.target.value })}
            placeholder="12000" className={INPUT_CLASS} />
        </Field>
      </div>
      <div className="mt-4 grid gap-4">
        <SharedDetails platform="youtube" username={value.channelName}
          value={value} onChange={(details) => onChange({ ...value, ...details })}
          onSaveUsername={onSaveUsername} onStartGeneration={onStartGeneration} onGeneratingChange={onGeneratingChange}
          generationBusy={generationBusy} status={status} statusError={statusError} />
      </div>
    </section>
  );
}