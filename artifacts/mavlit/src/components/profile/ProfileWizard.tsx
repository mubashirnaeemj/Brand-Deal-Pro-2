import type { ReactNode } from "react";
import { Loader2, Sparkles, PenLine, Check } from "lucide-react";
import { isDescriptionPending, type DescriptionStatus } from "@/contexts/AuthContext";
import type { ProfileForm } from "@/pages/profileForm";
import BrandCategoriesToAvoid from "@/components/onboarding/BrandCategoriesToAvoid";
import MultiSelectDropdown from "@/components/onboarding/MultiSelectDropdown";
import ProfileAudience from "./ProfileAudience";
import ProfileGenerationProgress from "./ProfileGenerationProgress";
import { normalizeSubNiche, normalizeSubNiches } from "@/lib/subNiches";
import { INPUT_CLASS, NICHE_OPTIONS, subNicheOptions, type DescriptionMode } from "@/components/onboarding/types";

export interface ProfileWizardProps {
  step: 1 | 2 | 3;
  form: ProfileForm;
  onChange: (form: ProfileForm) => void;
  onContinue: () => void;
  onBack: () => void;
  onExit: () => void;
  onGenerate: () => void;
  onSave: () => void;
  saving: boolean;
  generating: boolean;
  canSave: boolean;
  generationComplete: boolean;
  generationProgress: number;
  showGenerationProgress: boolean;
  status?: DescriptionStatus | null;
  error: string | null;
  pollError: string | null;
  saved: boolean;
  /** Rendered at the end of the last step, just above the action buttons. */
  postsCard?: ReactNode;
}

const STEPS = ["Creator", "Method", "Instagram"];
const card = "rounded-2xl border border-border bg-card p-5 sm:p-6";
const labelCls = "block text-xs font-semibold uppercase tracking-wider text-muted-foreground";
const btnPrimary = "rounded-xl bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary";
const btnGhost = "rounded-xl border border-border px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-white/5 disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary";

export default function ProfileWizard(p: ProfileWizardProps) {
  const { step, form, onChange, status } = p;
  const ig = form.instagram;
  const mode = ig.descriptionMode;
  const gen = mode === "generate";
  const pending = isDescriptionPending(status);
  const busy = p.saving || p.generating || pending;
  const setIg = (next: Partial<ProfileForm["instagram"]>) => onChange({ ...form, instagram: { ...ig, ...next } });
  const setMode = (m: DescriptionMode) => setIg({ descriptionMode: m });
  const showAllFields = !gen || p.generationComplete;
  const showProgress = gen && p.showGenerationProgress;
  const headings = ["Creator information", "How would you like to create your description?", "Your Instagram profile"];

  return (
    <main className="mx-auto w-full max-w-2xl px-4 py-8 sm:py-12" data-testid="profile-wizard">
      <nav aria-label="Progress" className="mb-6">
        <ol className="flex items-center gap-2">
          {STEPS.map((s, i) => {
            const n = i + 1;
            const done = n < step;
            return (
              <li key={s} className="flex flex-1 items-center gap-2" aria-current={n === step ? "step" : undefined}>
                <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold ${n <= step ? "bg-primary text-primary-foreground" : "border border-border text-muted-foreground"}`}>
                  {done ? <Check size={14} aria-hidden /> : n}
                </span>
                <span className={`hidden text-xs font-semibold sm:inline ${n === step ? "text-white" : "text-muted-foreground"}`}>{s}</span>
                <span className={`h-px flex-1 ${n < step ? "bg-primary" : "bg-border"}`} aria-hidden />
              </li>
            );
          })}
        </ol>
        <p className="mt-3 text-xs text-muted-foreground">Step {step} of 3</p>
      </nav>

      <h1 className="mb-5 text-2xl font-bold text-white sm:text-3xl">{headings[step - 1]}</h1>
      {p.error && <p role="alert" className="mb-4 rounded-xl border border-red-400/30 bg-red-400/10 p-4 text-sm text-red-300" data-testid="text-error">{p.error}</p>}

      <section className={`${card} space-y-4`}>
        {step === 1 && (
          <>
            <label className={labelCls}>Full name
              <input data-testid="input-full-name" className={`${INPUT_CLASS} mt-1.5`} value={form.fullName}
                onChange={(e) => onChange({ ...form, fullName: e.target.value })} autoComplete="name" />
            </label>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className={labelCls}>Age
                <input data-testid="input-age" type="number" min={13} max={120} step={1} className={`${INPUT_CLASS} mt-1.5`} value={form.age}
                  onChange={(e) => onChange({ ...form, age: e.target.value })} />
              </label>
              <label className={labelCls}>Gender
                <select data-testid="select-gender" className={`${INPUT_CLASS} mt-1.5`} value={form.gender}
                  onChange={(e) => onChange({ ...form, gender: e.target.value })}>
                  <option value="">Select</option>
                  {form.gender && !["Male", "Female", "Non-binary", "Prefer not to say", "Other"].includes(form.gender) &&
                    <option value={form.gender}>{form.gender}</option>}
                  <option>Male</option><option>Female</option><option>Non-binary</option>
                  <option>Prefer not to say</option><option>Other</option>
                </select>
              </label>
            </div>
          </>
        )}

        {step === 2 && (
          <fieldset>
            <legend className="mb-3 text-sm text-muted-foreground">Choose one. You can change it by coming back here.</legend>
            <div className="grid gap-3 sm:grid-cols-2" role="tablist" aria-label="Description method">
              {([
                ["manual", "Write it myself", "Describe your content in your own words and fill in every detail.", PenLine],
                ["generate", "Let MAVLIT generate it from my content", "Enter your username and niche. We fill in the details, then you can edit anything.", Sparkles],
              ] as const).map(([value, title, text, Icon]) => {
                const on = mode === value;
                return (
                  <button type="button" key={value} role="tab" aria-selected={on} aria-label={title}
                    onClick={() => setMode(value)} data-testid={`radio-mode-${value}`}
                    onKeyDown={(event) => {
                      if (["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) {
                        event.preventDefault();
                        const next = event.key === "Home" ? "manual" : event.key === "End" ? "generate" : mode === "manual" ? "generate" : "manual";
                        setMode(next);
                        event.currentTarget.parentElement?.querySelector<HTMLButtonElement>(`[data-testid="radio-mode-${next}"]`)?.focus();
                      }
                    }}
                    className={`cursor-pointer rounded-xl border p-4 text-left transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary ${on ? "border-primary bg-primary/10" : "border-border hover:bg-white/5"}`}>
                    <Icon size={20} className="mb-2 text-primary" aria-hidden />
                    <span className="block text-sm font-bold text-white">{title}</span>
                    <span className="mt-1 block text-xs text-muted-foreground">{text}</span>
                  </button>
                );
              })}
            </div>
          </fieldset>
        )}

        {step === 3 && (
          <>
            {showProgress ? <ProfileGenerationProgress progress={p.generationProgress} error={p.pollError} /> : <>
            <p className="rounded-lg bg-primary/10 px-3 py-2 text-sm text-white" data-testid="text-method-summary">
              Method: <strong>{gen ? "MAVLIT generates from my content" : "I write it myself"}</strong>. Use Back to change.
            </p>
            {gen && !showAllFields && <p className="text-xs text-muted-foreground">Enter your Instagram username and primary niche, then fetch your profile details with MAVLIT.</p>}
            {pending && <p role="status" className="text-sm text-primary" data-testid="status-pending">
              Description {status === "queued" ? "queued" : "generating"}. You can leave this page; progress resumes when you return.
            </p>}
            {status === "completed" && p.generationComplete && <p role="status" className="text-sm text-emerald-400" data-testid="status-completed">
              Generation complete. Review the details below, then save.
            </p>}
            {status === "failed" && <p role="alert" className="text-sm text-red-400" data-testid="status-failed">
              Generation failed{p.pollError ? `: ${p.pollError}` : ". Please try again."}
            </p>}
            {status !== "failed" && p.pollError && <p role="alert" className="text-sm text-red-400">{p.pollError}</p>}
            {p.saved && <p role="status" className="text-sm text-emerald-400" data-testid="text-saved">Profile saved.</p>}

            <div className="grid gap-4 sm:grid-cols-2">
              <label className={labelCls}>Instagram username
                <input data-testid="input-username" className={`${INPUT_CLASS} mt-1.5`} value={ig.username} disabled={pending || p.generating || p.saving}
                  placeholder="yourhandle" onChange={(e) => setIg({ username: e.target.value.replace(/^@/, "") })} />
              </label>
              {showAllFields && <label className={labelCls}>Follower count
                <input data-testid="input-followers" type="number" min={0} step={1} className={`${INPUT_CLASS} mt-1.5`} value={ig.followers}
                  disabled={p.saving}
                  onChange={(e) => setIg({ followers: e.target.value })} />
              </label>}
              {showAllFields && <label className={labelCls}>Highest Instagram reel / post views
                <input data-testid="input-highest-views" type="number" min={0} step={1} className={`${INPUT_CLASS} mt-1.5`} value={ig.highestViews}
                  disabled={p.saving} placeholder="120000"
                  onChange={(e) => setIg({ highestViews: e.target.value })} />
                <span className="mt-1 block text-[11px] normal-case tracking-normal text-muted-foreground">
                  The most views on any of your reels or videos.
                </span>
              </label>}
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <MultiSelectDropdown label="Primary niches" options={NICHE_OPTIONS} selected={ig.primaryNiches}
                disabled={pending || p.generating || p.saving} placeholder="Select one or more"
                onChange={(items) => setIg({ primaryNiches: items })} />
              {showAllFields && <MultiSelectDropdown label="Sub-niches" options={normalizeSubNiches(subNicheOptions(ig.primaryNiches))} selected={ig.subNiches}
                searchable allowCustom normalizeCustomValue={normalizeSubNiche} searchPlaceholder="Search or add your own sub-niche"
                disabled={p.saving} placeholder="Select or add sub-niches"
                onChange={(subNiches) => setIg({ subNiches: normalizeSubNiches(subNiches) })} />}
            </div>

            {showAllFields && <>
            <BrandCategoriesToAvoid selected={ig.excludedCategories} primaryNiches={ig.primaryNiches}
              onChange={(excludedCategories) => setIg({ excludedCategories })} />

            <label className={labelCls}>Brand preferences
              <textarea data-testid="input-brand-preferences" rows={3} maxLength={1000} className={`${INPUT_CLASS} mt-1.5 resize-none`}
                value={form.brandPreferences} onChange={(e) => onChange({ ...form, brandPreferences: e.target.value })}
                placeholder="Brands or partnership styles you want." />
              <span aria-live="polite" className="mt-1 block text-right text-[11px] normal-case tracking-normal">{form.brandPreferences.length}/1000</span>
            </label>
            <label className={labelCls}>Instagram content description
              <textarea data-testid="input-description" rows={4} className={`${INPUT_CLASS} mt-1.5 resize-none`} value={ig.description}
                disabled={p.saving}
                placeholder={gen ? "MAVLIT will write this from your content." : "Describe your Instagram content."}
                onChange={(e) => setIg({ description: e.target.value })} />
            </label>

            <ProfileAudience value={ig} onChange={setIg} readOnly={false}
              showMissingDescriptionWarning={gen && p.generationComplete} />

            <label className={labelCls}>Pitch style preferences (optional)
              <textarea data-testid="input-pitch-style-preferences" rows={3} maxLength={1000}
                className={`${INPUT_CLASS} mt-1.5 resize-none`} disabled={p.saving}
                aria-describedby="pitch-style-preferences-help"
                value={form.pitchStylePreferences}
                onChange={(event) => onChange({ ...form, pitchStylePreferences: event.target.value })}
                placeholder="For example: friendly, concise, and confident." />
              <span id="pitch-style-preferences-help" className="mt-1 block text-xs font-normal normal-case tracking-normal">
                Leave empty to use MAVLIT’s default.
              </span>
              <span aria-live="polite" className="mt-1 block text-right text-[11px] normal-case tracking-normal">{form.pitchStylePreferences.length}/1000</span>
            </label>
            </>}
            </>}
          </>
        )}
      </section>

      {step === 3 && !showProgress && p.postsCard}

      <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
        <button type="button" className={btnGhost} onClick={p.onExit} disabled={p.saving} data-testid="button-exit">Exit</button>
        <div className="flex flex-wrap justify-end gap-3">
          <button type="button" className={btnGhost} onClick={p.onBack} disabled={step === 1 || p.saving} data-testid="button-back">Back</button>
          {step < 3 ? (
            <button type="button" className={btnPrimary} onClick={p.onContinue} data-testid="button-continue">Continue</button>
          ) : (
            <>
            {gen && (
            <button type="button" data-testid="button-generate" className={`${btnPrimary} inline-flex items-center gap-2`}
              onClick={p.onGenerate} disabled={busy || showProgress}>
              {busy || showProgress ? <Loader2 size={16} className="animate-spin" aria-hidden /> : <Sparkles size={16} aria-hidden />}
              {busy || showProgress ? "Generating" : "Fetch profile details with MAVLIT"}
            </button>
            )}
            <button type="button" className={btnPrimary} onClick={p.onSave} disabled={!p.canSave || busy || showProgress} data-testid="button-save">
              {p.saving ? "Saving" : "Save Profile"}
            </button>
            </>
          )}
        </div>
      </div>
      {step === 3 && gen && p.generationComplete && !showProgress &&
        <p className="mt-3 text-right text-xs text-muted-foreground">Fetching profile details again replaces the current generated details. Save Profile keeps your edits.</p>}
    </main>
  );
}
