import { useEffect, useRef, useState } from "react";
import { useLocation } from "wouter";
import Navbar from "@/components/Navbar";
import { formatPrimaryNiches, NICHE_OPTIONS, parsePlatforms, samePrimaryNiches } from "@/components/onboarding/types";
import { isDescriptionPending, isProfileComplete, type CreatorProfile, type DescriptionJob, type DescriptionPlatform, useAuth } from "@/contexts/AuthContext";
import { api } from "@/lib/api";
import { fillEmptyAudience, audienceAgeRangeError, audienceError, formatAudienceAgeRange } from "@/lib/audience";
import ProfileWizard from "@/components/profile/ProfileWizard";
import { profilePatch, profileToForm, validateProfile, type ProfileForm } from "./profileForm";
import { applyProfileGeneration, creatorInfoError, generationKey, profileGenerationKey, restoreWizardForm, serializeWizardDraft, type ProfileStep } from "./profileWizardModel";
import { useProfileGenerationProgress } from "./useProfileGenerationProgress";

export default function ProfileSettings() {
  const { user, updateProfile, logout } = useAuth();
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
  const [step, setStep] = useState<ProfileStep>(1);
  const [generatedFor, setGeneratedFor] = useState<string | null>(null);
  const generationStarting = useRef(false);
  // After a successful generation, creators may correct any field, including
  // username and niche, without having those edits hidden or forcing a new job.
  const generationComplete = !!form && profile?.instagram_description_status === "completed" && generatedFor !== null;
  const generationProgress = useProfileGenerationProgress(
    generatingCount > 0 || isDescriptionPending(profile?.instagram_description_status), generationComplete,
  );
  const { setStartedAt } = generationProgress;

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
    api.get<CreatorProfile>("/creator-profile/me")
      .then((response) => {
        if (!active) return;
        setProfile(response);
        const initial = restoreWizardForm(response, null);
        try {
          const key = `mavlit_profile_draft:${response.id}`;
          const draft = JSON.parse(sessionStorage.getItem(key) ?? localStorage.getItem(key) ??
            localStorage.getItem(`mavlit_onboarding_draft_${response.id}`) ?? "null");
          let restored = restoreWizardForm(response, draft);
          const completed = response.instagram_description_status === "completed" && response.instagram_description_mode === "generate" &&
            !!response.instagram_description?.trim();
          const matches = generationKey(restored.instagram.username, restored.instagram.primaryNiches) === profileGenerationKey(response);
          const usable = !draft || !("generatedFor" in draft) || draft.generatedFor === profileGenerationKey(response) || draft.generationPending === true;
          if (completed && matches && usable && restored.instagram.descriptionMode === "generate" &&
              (!draft || !draft.generatedFor || draft.generationPending === true)) {
            restored = applyProfileGeneration(restored, response, "instagram");
          }
          if (isDescriptionPending(response.instagram_description_status) || (completed && usable)) {
            const timestamp = draft?.generationStartedAt;
            setStartedAt(typeof timestamp === "number" && Number.isFinite(timestamp) && timestamp > 0 && timestamp <= Date.now()
              ? timestamp : isDescriptionPending(response.instagram_description_status) ? Date.now() : null);
          }
          setGeneratedFor(completed && usable ? profileGenerationKey(response) : null);
          if ([1, 2, 3].includes(draft?.wizardStep)) setStep(draft.wizardStep);
          if (isDescriptionPending(response.instagram_description_status)) setStep(3);
          setForm(restored);
        } catch { setForm(initial); }
      })
      .catch((cause) => {
        if (active) setError(cause instanceof Error ? cause.message : "Could not load your profile.");
      })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [retry]);

  useEffect(() => {
    if (!form || !profile || saved) return;
    try {
      const key = `mavlit_profile_draft:${profile.id}`;
      const draft = serializeWizardDraft(form, step, generatedFor, generationProgress.startedAt,
        isDescriptionPending(profile.instagram_description_status));
      sessionStorage.setItem(key, draft);
      if (!user || !isProfileComplete(user)) localStorage.setItem(key, draft);
    } catch { /* The in-memory draft remains available. */ }
  }, [form, profile, user, step, generatedFor, generationProgress.startedAt, saved]);

  useEffect(() => { document.title = "Your Profile | MAVLIT"; }, []);

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
        if (latest.instagram_description_status === "completed" && !latest.instagram_description?.trim()) {
          latest.instagram_description_status = "failed";
          latest.instagram_description_error = "Generation finished without a content description. Please try again.";
        }
        setForm((current) => {
          if (!current) return current;
          let next = current;
          for (const platform of ["instagram", "youtube"] as const) {
            const wasPending = platform === "instagram" ? isDescriptionPending(instagramStatus) : isDescriptionPending(youtubeStatus);
            if (wasPending && latest[`${platform}_description_status`] === "completed") {
              if (latest[`${platform}_description`]?.trim()) next = applyProfileGeneration(next, latest, platform);
            }
          }
          return next;
        });
        if (isDescriptionPending(instagramStatus) && latest.instagram_description_status === "completed") {
          setGeneratedFor(profileGenerationKey(latest));
        }
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
    if (next.instagram.descriptionMode === "generate" && form?.instagram.descriptionMode !== "generate") {
      if (profile?.instagram_description_status === "completed" && profile.instagram_description_mode === "generate" &&
          generationKey(next.instagram.username, next.instagram.primaryNiches) === profileGenerationKey(profile)) {
        setForm(generatedFor ? next : applyProfileGeneration(next, profile, "instagram"));
        setGeneratedFor(profileGenerationKey(profile));
      } else {
        setForm(next);
        setGeneratedFor(null);
      }
    } else setForm(next);
    setSaved(false);
    setError(null);
  };

  const generated = (platform: "instagram" | "youtube", completed: CreatorProfile) => {
    setForm((current) => current ? applyProfileGeneration(current, completed, platform) : current);
    if (platform === "instagram") setGeneratedFor(profileGenerationKey(completed));
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
    if (!form || creatorInfoError(form)) throw new Error("Complete your creator information before generating a description.");
    const creatorHandle = platform === "instagram"
      ? enteredUsername
      : current.creator_handle?.trim() || current.instagram_handle?.trim().replace(/^@/, "");
    if (!creatorHandle) throw new Error("Save your Instagram username before generating a YouTube description.");

    // Use persisted values, not the other unsaved fields in the editor, when saving a name before generation.
    const updated = await updateProfile({
      full_name: form.fullName.trim(),
      age: Number(form.age),
      gender: form.gender,
      primary_platform: "instagram",
      instagram_primary_niche: formatPrimaryNiches(form.instagram.primaryNiches),
      content_niche: formatPrimaryNiches(form.instagram.primaryNiches),
      creator_handle: creatorHandle,
      [platform === "instagram" ? "instagram_handle" : "youtube_channel_name"]: enteredUsername,
      [`${platform}_description_mode`]: "generate",
    }, { commit: false });
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

  const generateInstagram = async () => {
    if (!form || generationStarting.current || generatingCount > 0 || saving || jobPending) return;
    const infoError = creatorInfoError(form);
    if (infoError) { setError(infoError); setStep(1); return; }
    const username = form.instagram.username.trim().replace(/^@/, "");
    const niche = form.instagram.primaryNiches[0];
    if (!username || !NICHE_OPTIONS.includes(niche as typeof NICHE_OPTIONS[number])) {
      setError("Enter your Instagram username and select a primary niche before generating.");
      return;
    }
    generationStarting.current = true;
    setGeneratingCount(1);
    setStartedAt(Date.now());
    setGeneratedFor(null);
    setError(null);
    try {
      const savedUsername = await saveUsernameForGeneration("instagram", username);
      await startGeneration("instagram", savedUsername, niche);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not generate your profile.");
    } finally { generationStarting.current = false; setGeneratingCount(0); }
  };

  const continueStep = () => {
    if (!form || saving) return;
    const infoError = creatorInfoError(form);
    if (step === 1 && infoError) { setError(infoError); return; }
    setError(null);
    setStep(step === 1 ? 2 : 3);
    window.scrollTo({ top: 0 });
  };

  const exit = () => {
    if (!profile || saving) return;
    if (!user || !isProfileComplete(user)) {
      if (window.confirm("Exit setup and sign out? Your draft will be kept on this device.")) logout();
    } else navigate("/dashboard");
  };

  const save = async () => {
    if (!form || !profile || saving || generatingCount > 0 || jobPending) return;
    setError(null);
    if (form.instagram.descriptionMode === "generate" && (!generationComplete || generationProgress.showProgress)) {
      setError("Generate your Instagram profile and wait for it to finish before saving.");
      return;
    }
    const validationError = validateProfile(form, profile);
    if (validationError) {
      setError(validationError);
      return;
    }
    setSaving(true);
    try {
      try {
        sessionStorage.setItem(`mavlit_profile_draft:${profile.id}`,
          serializeWizardDraft(form, step, generatedFor, generationProgress.startedAt, jobPending));
      } catch { /* Storage may be unavailable. */ }
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
        fields.audienceAgeRange = form[platform].audienceAgeRange || formatAudienceAgeRange(fields);
        if (!fields.audienceDescription.trim() && fields.audienceDescription === baseline[platform].audienceDescription) {
          fields.audienceDescription = fresh[platform].audienceDescription;
        }
        saveForm = { ...saveForm, [platform]: fields };
        if (latest[`${platform}_description_status`] === "completed" &&
            (profile[`${platform}_description_status`] !== "completed" ||
             latest[`${platform}_description_job_id`] !== profile[`${platform}_description_job_id`]) &&
            form[platform].descriptionMode === "generate") {
          saveForm = applyProfileGeneration(saveForm, latest, platform);
        }
      }
      setForm(saveForm);
      const recoveredError = validateProfile(saveForm, latest);
      if (recoveredError) {
        setError(recoveredError);
        return;
      }
      // Retain failed submissions even if an expired session navigates to sign-in.
      try {
        sessionStorage.setItem(`mavlit_profile_draft:${profile.id}`,
          serializeWizardDraft(saveForm, step, generatedFor, generationProgress.startedAt, jobPending));
      } catch { /* Storage may be unavailable. */ }
      const patch = { ...profilePatch(saveForm, profile), primary_platform: "instagram" };
      const updated = await updateProfile(patch);
      if (parsePlatforms(updated.primary_platform).length !== 1 || !parsePlatforms(updated.primary_platform).includes("instagram")) {
        setProfile(updated);
        setError("The profile API did not keep all selected platforms. Please try again.");
        return;
      }
      if (!samePrimaryNiches(updated.instagram_primary_niche, form.instagram.primaryNiches)) {
        setProfile(updated);
        setError("The profile API did not keep all selected primary niches. Please try again.");
        return;
      }
      if ((updated.brand_preferences?.trim() || "") !== form.brandPreferences.trim()) {
        setProfile(updated);
        setError("The profile API did not keep your brand preferences. Please try again.");
        return;
      }
      if ("pitch_style_preferences" in patch &&
          (updated.pitch_style_preferences?.trim() || "") !== saveForm.pitchStylePreferences.trim()) {
        setProfile(updated);
        setError("The profile API did not keep your pitch style preferences. Please try again.");
        return;
      }
      for (const platform of ["instagram", "youtube"] as const) {
        const audience = saveForm[platform];
        if ((`${platform}_audience_gender` in patch &&
              (updated[`${platform}_audience_gender`] || "") !== audience.audienceGender) ||
            (`${platform}_audience_description` in patch &&
              (updated[`${platform}_audience_description`]?.trim() || "") !== audience.audienceDescription.trim()) ||
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
      setForm(restoreWizardForm(updated, null));
      try {
        sessionStorage.removeItem(`mavlit_profile_draft:${profile.id}`);
        localStorage.removeItem(`mavlit_profile_draft:${profile.id}`);
        localStorage.removeItem(`mavlit_onboarding_draft_${profile.id}`);
      } catch { /* Storage may be unavailable. */ }
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
      <div className="pb-20 pt-20">
        {loading ? (
          <p className="mx-auto max-w-2xl rounded-2xl border border-border bg-card p-6 text-sm text-muted-foreground" role="status">Loading your profile…</p>
        ) : !form || !profile ? (
          <div className="mx-auto max-w-2xl rounded-2xl border border-border bg-card p-6">
            <p role="alert" className="text-sm text-red-400">{error ?? "Could not load your profile."}</p>
            <button type="button" onClick={() => setRetry((value) => value + 1)}
              className="mt-4 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white">Retry</button>
          </div>
        ) : (
          <ProfileWizard step={step} form={form} onChange={change}
            onContinue={continueStep} onBack={() => { setError(null); setStep(step === 3 ? 2 : 1); }}
            onExit={exit} onGenerate={() => void generateInstagram()} onSave={() => void save()}
            saving={saving} generating={generatingCount > 0 || jobPending}
            canSave={!audienceError(form.instagram) && !audienceAgeRangeError(form.instagram.audienceAgeRange) &&
              form.instagram.audienceDescription.length <= 1500 && form.brandPreferences.length <= 1000 &&
              form.pitchStylePreferences.length <= 1000 &&
              (form.instagram.descriptionMode === "manual" || generationComplete)}
            generationComplete={generationComplete} status={instagramStatus}
            generationProgress={generationProgress.progress} showGenerationProgress={generationProgress.showProgress}
            error={error} pollError={pollError || profile.instagram_description_error || null} saved={saved} />
        )}
      </div>
    </div>
  );
}