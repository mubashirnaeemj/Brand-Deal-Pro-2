import { useState } from "react";
import { Instagram, Youtube } from "lucide-react";
import { api } from "@/lib/api";
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
  onGenerated,
  onSaveUsername,
  onGeneratingChange,
  generationBusy,
}: {
  platform: "instagram" | "youtube";
  username: string;
  value: PlatformDetails;
  onChange: (value: PlatformDetails) => void;
  onGenerated: (description: string) => void;
  onSaveUsername: (username: string) => Promise<string>;
  onGeneratingChange: (active: boolean) => void;
  generationBusy: boolean;
}) {
  const [descriptionMode, setDescriptionMode] = useState<DescriptionMode>("manual");
  const [generating, setGenerating] = useState(false);
  const [generateError, setGenerateError] = useState<string | null>(null);
  const set = <K extends keyof PlatformDetails>(key: K, next: PlatformDetails[K]) =>
    onChange({ ...value, [key]: next });
  const generate = async () => {
    const enteredUsername = platform === "instagram" ? username.trim().replace(/^@/, "") : username.trim();
    if (!enteredUsername || !NICHE_OPTIONS.includes(value.primaryNiche as typeof NICHE_OPTIONS[number])) {
      setGenerateError(`Add your ${platform === "instagram" ? "Instagram username" : "YouTube channel name"} and primary niche first.`);
      return;
    }
    setGenerateError(null);
    setGenerating(true);
    onGeneratingChange(true);
    try {
      const savedUsername = await onSaveUsername(enteredUsername);
      const result = await api.post<{ description: string }>("/creator-profile/me/generate-description", {
        platform,
        username: savedUsername,
        niche: value.primaryNiche,
      });
      if (!result.description?.trim()) throw new Error("MAVLIT did not return a description. Please try again.");
      onGenerated(result.description.trim());
      setDescriptionMode("manual");
    } catch (error) {
      setGenerateError(error instanceof Error ? error.message : "Could not generate a description.");
    } finally {
      setGenerating(false);
      onGeneratingChange(false);
    }
  };

  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Primary niche">
          <select value={NICHE_OPTIONS.includes(value.primaryNiche as typeof NICHE_OPTIONS[number]) ? value.primaryNiche : ""}
            onChange={(event) => onChange({ ...value, primaryNiche: event.target.value,
              subNiches: value.subNiches.filter((item) => subNicheOptions([event.target.value]).includes(item)) })}
            className={INPUT_CLASS}>
            <option value="">Select a niche</option>
            {NICHE_OPTIONS.map((option) => <option key={option} value={option}>{option}</option>)}
          </select>
          {value.primaryNiche && !NICHE_OPTIONS.includes(value.primaryNiche as typeof NICHE_OPTIONS[number]) && (
            <span className="mt-1 block text-xs normal-case tracking-normal text-amber-400">
              Your saved niche ({value.primaryNiche}) is no longer an option. Choose one above to update it.
            </span>
          )}
        </Field>
        <MultiSelectDropdown
          label="Sub-niches"
          selected={value.subNiches}
          onChange={(subNiches) => set("subNiches", subNiches)}
          options={subNicheOptions([value.primaryNiche])}
          placeholder="Select sub-niches"
          searchable
        />
      </div>
      <BrandCategoriesToAvoid selected={value.excludedCategories}
        onChange={(excludedCategories) => set("excludedCategories", excludedCategories)} />
      <DescriptionModeSelector platform={platform} mode={descriptionMode}
        onChange={(mode) => {
          setGenerateError(null);
          setDescriptionMode(mode);
        }}
        onGenerate={generate} generating={generating} generateDisabled={generationBusy}
        generateError={generateError}>
        <Field label={`${platform} description`}>
          <textarea rows={4} value={value.description} onChange={(event) => set("description", event.target.value)}
            placeholder={`Describe your ${platform === "instagram" ? "Instagram" : "YouTube"} content.`}
            className={`${INPUT_CLASS} resize-none`} />
        </Field>
      </DescriptionModeSelector>
    </>
  );
}

export function InstagramSection({ value, onChange, onGenerated, onSaveUsername, onGeneratingChange, generationBusy }: {
  value: InstagramDetails;
  onChange: (value: InstagramDetails) => void;
  onGenerated: (description: string) => void;
  onSaveUsername: (username: string) => Promise<string>;
  onGeneratingChange: (active: boolean) => void;
  generationBusy: boolean;
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
        <SharedDetails platform="instagram" username={value.username}
          value={value} onChange={(details) => onChange({ ...value, ...details })}
          onGenerated={onGenerated} onSaveUsername={onSaveUsername} onGeneratingChange={onGeneratingChange}
          generationBusy={generationBusy} />
      </div>
    </section>
  );
}

export function YoutubeSection({ value, onChange, onGenerated, onSaveUsername, onGeneratingChange, generationBusy }: {
  value: YoutubeDetails;
  onChange: (value: YoutubeDetails) => void;
  onGenerated: (description: string) => void;
  onSaveUsername: (username: string) => Promise<string>;
  onGeneratingChange: (active: boolean) => void;
  generationBusy: boolean;
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
        <SharedDetails platform="youtube" username={value.channelName}
          value={value} onChange={(details) => onChange({ ...value, ...details })}
          onGenerated={onGenerated} onSaveUsername={onSaveUsername} onGeneratingChange={onGeneratingChange}
          generationBusy={generationBusy} />
      </div>
    </section>
  );
}