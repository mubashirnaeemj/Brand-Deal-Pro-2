import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { Save, User } from "lucide-react";
import Navbar from "@/components/Navbar";
import PlatformSelector from "@/components/onboarding/PlatformSelector";
import { INPUT_CLASS, parsePlatforms, samePrimaryNiches } from "@/components/onboarding/types";
import { isDescriptionPending, isProfileComplete, type CreatorProfile, type DescriptionJob, type DescriptionPlatform, useAuth } from "@/contexts/AuthContext";
import { api } from "@/lib/api";
import { fillEmptyAudience, audienceError } from "@/lib/audience";
import { InstagramSection, YoutubeSection } from "./ProfilePlatformSection";
import { profilePatch, profileToForm, validateProfile, type ProfileForm } from "./profileForm";

export default function ProfileSettings() {
  const { updateProfile } = useAuth();
  const [, navigate] = useLocation();
  const [profile, setProfile] = useState<CreatorProfile | null>(null);
  const [form, setForm] = useState<ProfileForm | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [generatingCount, setGeneratingCount] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [retry, setRetry] = useState(0);
  const [pollError, setPollError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
    api.get<CreatorProfile>("/creator-profile/me")
      .then((response) => {
        if (!active) return;
        setProfile(response);
        const initial = profileToForm(response);
        try {
          const draft = JSON.parse(sessionStorage.getItem(`mavlit_profile_draft:${response.id}`) ?? "null");
          const restored: ProfileForm = draft && typeof draft.fullName === "string" && typeof draft.brandPreferences === "string" &&
            Array.isArray(draft.primaryPlatforms) && draft.instagram && draft.youtube ? {
              ...initial, ...draft,
              instagram: { ...initial.instagram, ...draft.instagram },
              youtube: { ...initial.youtube, ...draft.youtube },
            } : initial;
          for (const platform of ["instagram", "youtube"] as const) {
            if (response[`${platform}_description_status`] === "completed" && restored[platform].descriptionMode === "generate") {
              Object.assign(restored[platform], fillEmptyAudience(restored[platform], response, platform), {
                description: restored[platform].description || response[`${platform}_description`] || "",
              });
            }
          }
          setForm(restored);
        } catch { setForm(initial); }
      })
      .catch((cause) => {
        if (active) setError(cause instanceof Error ? cause.message : "Could not load your profile.");
      })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [retry]);

  const instagramStatus = profile?.instagram_description_status;
  const youtubeStatus = profile?.youtube_description_status;
  const instagramJobId = profile?.instagram_description_job_id;
  const youtubeJobId = profile?.youtube_description_job_id;
  const jobPending = isDescriptionPending(instagramStatus) || isDescriptionPending(youtubeStatus);

  useEffect(() => {
    if (!jobPending) return;
    let stopped = false;
    let timer: ReturnType<typeof setTimeout>;
    const poll = async () => {
      try {
        const latest = await api.get<CreatorProfile>("/creator-profile/me");
        if (stopped) return;
        setPollError(null);
        for (const platform of ["instagram", "youtube"] as const) {
          const wasPending = platform === "instagram" ? isDescriptionPending(instagramStatus) : isDescriptionPending(youtubeStatus);
          const jobId = platform === "instagram" ? instagramJobId : youtubeJobId;
          if (wasPending && latest[`${platform}_description_job_id`] !== jobId) {
            // Do not adopt a replacement job, even if it completed before this poll.
            latest[`${platform}_description_status`] = "failed";
            latest[`${platform}_description_error`] = "The generation job changed. Progress checks stopped. Generate again or reload to view the current job.";
          }
        }
        setForm((current) => {
          if (!current) return current;
          let next = current;
          for (const platform of ["instagram", "youtube"] as const) {
            const wasPending = platform === "instagram" ? isDescriptionPending(instagramStatus) : isDescriptionPending(youtubeStatus);
            if (wasPending && latest[`${platform}_description_status`] === "completed") {
              const description = latest[`${platform}_description`]?.trim();
              if (description) next = { ...next, [platform]: {
                ...fillEmptyAudience(next[platform], latest, platform),
                description: next[platform].description.trim() ? next[platform].description : description,
              } };
            }
          }
          return next;
        });
        setProfile(latest);
        if (isDescriptionPending(latest.instagram_description_status) || isDescriptionPending(latest.youtube_description_status)) {
          timer = setTimeout(poll, 1500);
        }
      } catch {
        if (stopped) return;
        setPollError("Could not check description progress. Retrying…");
        timer = setTimeout(poll, 1500);
      }
    };
    timer = setTimeout(poll, 1500);
    return () => { stopped = true; clearTimeout(timer); };
  }, [jobPending, instagramStatus, youtubeStatus, instagramJobId, youtubeJobId]);

  const change = (next: ProfileForm) => {
    setForm(next);
    setSaved(false);
    setError(null);
  };

  const generated = (platform: "instagram" | "youtube", completed: CreatorProfile) => {
    setForm((current) => current ? { ...current, [platform]: {
      ...fillEmptyAudience(current[platform], completed, platform),
      description: current[platform].description.trim() ? current[platform].description : completed[`${platform}_description`]?.trim() || "",
    } } : current);
    setSaved(false);
    setError(null);
  };

  const startGeneration = async (platform: DescriptionPlatform, username: string, niche: string) => {
    let result: DescriptionJob;
    try {
      result = await api.post<DescriptionJob>("/creator-profile/me/generate-description", { platform, username, niche });
    } catch (cause) {
      // A timed-out POST may have queued the job. Check the persisted state before offering a retry.
      const current = await api.get<CreatorProfile>("/creator-profile/me").catch(() => null);
      if (current && isDescriptionPending(current[`${platform}_description_status`])) {
        setProfile(current);
        return;
      }
      if (current && current[`${platform}_description_status`] === "completed" &&
          current[`${platform}_description_job_id`] &&
          current[`${platform}_description_job_id`] !== profile?.[`${platform}_description_job_id`] &&
          current[`${platform}_description`]?.trim()) {
        setProfile(current);
        generated(platform, current);
        return;
      }
      throw cause;
    }
    if ((result.platform && result.platform !== platform) || !result.job_id ||
        !["queued", "running", "completed", "failed"].includes(result.status)) {
      throw new Error("MAVLIT returned an unexpected generation response. Please reload your profile.");
    }
    setProfile((current) => current ? {
      ...current,
      [`${platform}_description_status`]: result.status,
      [`${platform}_description_job_id`]: result.job_id,
      [`${platform}_description_error`]: result.error,
      ...(result.status === "completed" ? { [`${platform}_description`]: result.description } : {}),
    } : current);
    if (result.status === "failed") throw new Error(result.error || "Description generation failed.");
    if (result.status === "completed") {
      const completed = await api.get<CreatorProfile>("/creator-profile/me");
      if (completed[`${platform}_description_job_id`] !== result.job_id ||
          !completed[`${platform}_description`]?.trim()) {
        throw new Error("MAVLIT completed generation without a matching description. Please reload your profile.");
      }
      setProfile(completed);
      generated(platform, completed);
    }
  };

  const saveUsernameForGeneration = async (platform: "instagram" | "youtube", enteredUsername: string): Promise<string> => {
    const current = await api.get<CreatorProfile>("/creator-profile/me");
    if (isDescriptionPending(current[`${platform}_description_status`])) {
      setProfile(current);
      throw new Error(`${platform === "instagram" ? "Instagram" : "YouTube"} description generation is already in progress.`);
    }
    if (!current.full_name?.trim()) throw new Error("Save your full name before generating a description.");
    const creatorHandle = platform === "instagram"
      ? enteredUsername
      : current.creator_handle?.trim() || current.instagram_handle?.trim().replace(/^@/, "");
    if (!creatorHandle) throw new Error("Save your Instagram username before generating a YouTube description.");

    // Use persisted values, not the other unsaved fields in the editor, when saving a name before generation.
    const updated = await updateProfile({
      creator_handle: creatorHandle,
      [platform === "instagram" ? "instagram_handle" : "youtube_channel_name"]: enteredUsername,
      [`${platform}_description_mode`]: "generate",
    });
    setProfile(updated);
    const savedUsername = platform === "instagram"
      ? updated.instagram_handle?.trim().replace(/^@/, "")
      : updated.youtube_channel_name?.trim();
    if (!savedUsername || savedUsername.toLowerCase() !== enteredUsername.toLowerCase()) {
      throw new Error("The profile did not save your new username. Please try again.");
    }
    setForm((current) => {
      if (!current) return current;
      if (platform === "instagram" && current.instagram.username.trim().replace(/^@/, "") === enteredUsername) {
        return { ...current, instagram: { ...current.instagram, username: savedUsername } };
      }
      if (platform === "youtube" && current.youtube.channelName.trim() === enteredUsername) {
        return { ...current, youtube: { ...current.youtube, channelName: savedUsername } };
      }
      return current;
    });
    setSaved(false);
    return savedUsername;
  };

  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!form || !profile || saving || generatingCount > 0 || jobPending) return;
    setError(null);
    const validationError = validateProfile(form, profile);
    if (validationError) {
      setError(validationError);
      return;
    }
    setSaving(true);
    try {
      try { sessionStorage.setItem(`mavlit_profile_draft:${profile.id}`, JSON.stringify(form)); } catch { /* Storage may be unavailable. */ }
      const latest = await api.get<CreatorProfile>("/creator-profile/me");
      if (isDescriptionPending(latest.instagram_description_status) || isDescriptionPending(latest.youtube_description_status)) {
        setProfile(latest);
        setError("Description generation is still in progress. Wait for it to finish before saving.");
        return;
      }
      // A job may have finished in another tab or while this view was offline.
      // Recover its values before composing a replacement write.
      let saveForm = form;
      const baseline = profileToForm(profile);
      const fresh = profileToForm(latest);
      for (const platform of ["instagram", "youtube"] as const) {
        // An untouched empty input is not a request to clear a value that
        // arrived on the server since this editor loaded.
        const fields = { ...saveForm[platform] };
        for (const key of ["audienceGender", "audienceAgeMin", "audienceAgeMax"] as const) {
          if (!fields[key].trim() && fields[key] === baseline[platform][key]) fields[key] = fresh[platform][key];
        }
        saveForm = { ...saveForm, [platform]: fields };
        if (latest[`${platform}_description_status`] === "completed" &&
            (profile[`${platform}_description_status`] !== "completed" ||
             latest[`${platform}_description_job_id`] !== profile[`${platform}_description_job_id`]) &&
            form[platform].descriptionMode === "generate") {
          saveForm = { ...saveForm, [platform]: {
            ...fillEmptyAudience(saveForm[platform], latest, platform),
            description: saveForm[platform].description.trim() ? saveForm[platform].description : latest[`${platform}_description`] || "",
          } };
        }
      }
      setForm(saveForm);
      const recoveredError = validateProfile(saveForm, latest);
      if (recoveredError) {
        setError(recoveredError);
        return;
      }
      // Retain failed submissions even if an expired session navigates to sign-in.
      try { sessionStorage.setItem(`mavlit_profile_draft:${profile.id}`, JSON.stringify(saveForm)); } catch { /* Storage may be unavailable. */ }
      const patch = profilePatch(saveForm, profile);
      const updated = await updateProfile(patch);
      if (form.primaryPlatforms.some((platform) => !parsePlatforms(updated.primary_platform).includes(platform))) {
        setProfile(updated);
        setError("The profile API did not keep all selected platforms. Please try again.");
        return;
      }
      if (!samePrimaryNiches(updated.instagram_primary_niche, form.instagram.primaryNiches) ||
          !samePrimaryNiches(updated.youtube_primary_niche, form.youtube.primaryNiches)) {
        setProfile(updated);
        setError("The profile API did not keep all selected primary niches. Please try again.");
        return;
      }
      if ((updated.brand_preferences?.trim() || "") !== form.brandPreferences.trim()) {
        setProfile(updated);
        setError("The profile API did not keep your brand preferences. Please try again.");
        return;
      }
      for (const platform of ["instagram", "youtube"] as const) {
        const audience = saveForm[platform];
        if ((`${platform}_audience_gender` in patch &&
              (updated[`${platform}_audience_gender`] || "") !== audience.audienceGender) ||
            (`${platform}_audience_age_min` in patch &&
              (updated[`${platform}_audience_age_min`] ?? null) !== (audience.audienceAgeMin.trim() ? Number(audience.audienceAgeMin) : null)) ||
            (`${platform}_audience_age_max` in patch &&
              (updated[`${platform}_audience_age_max`] ?? null) !== (audience.audienceAgeMax.trim() ? Number(audience.audienceAgeMax) : null))) {
          setProfile(updated);
          setError(`The profile API did not keep your ${platform === "instagram" ? "Instagram" : "YouTube"} audience details. Please try again.`);
          return;
        }
      }
      if (!isProfileComplete(updated)) {
        setError("Your profile was saved, but it is still incomplete. Check the required creator details.");
        return;
      }
      setProfile(updated);
      setForm(profileToForm(updated));
      try { sessionStorage.removeItem(`mavlit_profile_draft:${profile.id}`); } catch { /* Storage may be unavailable. */ }
      setSaved(true);
      navigate("/brand-matches?version=v3");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not save your profile.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Navbar />
      <main className="mx-auto max-w-3xl px-4 pb-20 pt-28">
        <div className="mb-8">
          <p className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-primary">
            <User size={15} /> Creator Profile
          </p>
          <h1 className="text-3xl font-extrabold text-white">Your Profile</h1>
        </div>

        {loading ? (
          <p className="rounded-2xl border border-border bg-card p-6 text-sm text-muted-foreground" role="status">Loading your profile…</p>
        ) : !form || !profile ? (
          <div className="rounded-2xl border border-border bg-card p-6">
            <p role="alert" className="text-sm text-red-400">{error ?? "Could not load your profile."}</p>
            <button type="button" onClick={() => setRetry((value) => value + 1)}
              className="mt-4 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white">Retry</button>
          </div>
        ) : (
          <form onSubmit={save} noValidate className="space-y-5">
            <section className="rounded-2xl border border-border bg-card p-5 sm:p-6">
              <h2 className="mb-5 text-lg font-bold text-white">Creator information</h2>
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Full name <span className="text-primary">*</span>
                  <input value={form.fullName} onChange={(event) => change({ ...form, fullName: event.target.value })}
                    autoComplete="name" className={`${INPUT_CLASS} mt-1.5`} />
                </label>
                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Age
                  <input type="number" min="13" max="120" step="1" value={form.age}
                    onChange={(event) => change({ ...form, age: event.target.value })}
                    className={`${INPUT_CLASS} mt-1.5`} />
                </label>
                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground sm:col-span-2">
                  Gender
                  <select value={form.gender} onChange={(event) => change({ ...form, gender: event.target.value })}
                    className={`${INPUT_CLASS} mt-1.5`}>
                    <option value="">Select an option</option>
                    {!["Male", "Female", "Non-binary", "Prefer not to say", "Other"].includes(form.gender) && form.gender &&
                      <option value={form.gender}>{form.gender}</option>}
                    <option>Male</option><option>Female</option><option>Non-binary</option>
                    <option>Prefer not to say</option><option>Other</option>
                  </select>
                </label>
              </div>
              <div className="mt-5">
                <PlatformSelector value={form.primaryPlatforms}
                  onChange={(primaryPlatforms) => change({ ...form, primaryPlatforms })} />
              </div>
            </section>

            {form.primaryPlatforms.includes("instagram") && <InstagramSection value={form.instagram} onChange={(instagram) => change({ ...form, instagram })}
              onSaveUsername={(username) => saveUsernameForGeneration("instagram", username)}
              onStartGeneration={(username, niche) => startGeneration("instagram", username, niche)}
              generationBusy={generatingCount > 0 || saving} status={instagramStatus}
              statusError={profile.instagram_description_error}
              onGeneratingChange={(active) => setGeneratingCount((count) => count + (active ? 1 : -1))} />}
            {form.primaryPlatforms.includes("youtube") && <YoutubeSection value={form.youtube} onChange={(youtube) => change({ ...form, youtube })}
              onSaveUsername={(username) => saveUsernameForGeneration("youtube", username)}
              onStartGeneration={(username, niche) => startGeneration("youtube", username, niche)}
              generationBusy={generatingCount > 0 || saving} status={youtubeStatus}
              statusError={profile.youtube_description_error}
              onGeneratingChange={(active) => setGeneratingCount((count) => count + (active ? 1 : -1))} />}

            <section className="rounded-2xl border border-border bg-card p-5 sm:p-6">
              <h2 className="mb-2 text-lg font-bold text-white">
                <label htmlFor="brand-preferences">Brand preferences</label>
              </h2>
              <p id="brand-preferences-help" className="mb-4 text-sm leading-relaxed text-muted-foreground">
                Optional. Tell us which brands you'd like to see more of, and which you don't want.
                {" "}Brands you don't want are shown last.
              </p>
              <textarea id="brand-preferences" data-testid="input-brand-preferences" rows={4} maxLength={1000}
                value={form.brandPreferences} aria-describedby="brand-preferences-help brand-preferences-count"
                aria-invalid={form.brandPreferences.length > 1000}
                placeholder={"e.g. I want more guitar and amp brands. I'd love sunscreen brands.\nI don't want lipstick or makeup brands."}
                onChange={(event) => change({ ...form, brandPreferences: event.target.value })}
                className={`${INPUT_CLASS} resize-y normal-case`} />
              <p id="brand-preferences-count" aria-live="polite"
                className={`mt-2 text-right text-xs ${form.brandPreferences.length > 1000 ? "text-red-400" : "text-muted-foreground"}`}>
                {form.brandPreferences.length} / 1000
              </p>
            </section>

            {pollError && <p role="alert" className="text-sm text-amber-400">{pollError}</p>}
            {error && <p role="alert" className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">{error}</p>}
            {saved && <p role="status" className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300">Profile saved.</p>}
            <div className="flex justify-end">
              <button type="submit" disabled={saving || generatingCount > 0 || jobPending || form.brandPreferences.length > 1000 ||
                !!audienceError(form.instagram) || !!audienceError(form.youtube)}
                className="inline-flex items-center gap-2 rounded-xl bg-primary px-6 py-3 text-sm font-bold text-white transition hover:brightness-110 disabled:opacity-50">
                <Save size={16} /> {saving ? "Saving…" : generatingCount > 0 || jobPending ? "Generating…" : "Save Profile"}
              </button>
            </div>
          </form>
        )}
      </main>
    </div>
  );
}