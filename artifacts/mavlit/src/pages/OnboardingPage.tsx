import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useLocation } from "wouter";
import { type CreatorProfile, type DescriptionJob, type DescriptionPlatform, isDescriptionPending, isProfileComplete, useAuth } from "@/contexts/AuthContext";
import { api } from "@/lib/api";
import { audienceError, audienceFromProfile, audiencePayload, fillEmptyAudience } from "@/lib/audience";
import OnboardingLayout from "@/components/onboarding/OnboardingLayout";
import WelcomeStep from "@/components/onboarding/WelcomeStep";
import CreatorInfoStep from "@/components/onboarding/CreatorInfoStep";
import InstagramStep from "@/components/onboarding/InstagramStep";
import YouTubeStep from "@/components/onboarding/YouTubeStep";
import ReviewStep from "@/components/onboarding/ReviewStep";
import {
  EMPTY_ONBOARDING,
  formatPlatforms,
  formatPrimaryNiches,
  NICHE_OPTIONS,
  parsePlatforms,
  parsePrimaryNiches,
  samePrimaryNiches,
  type FieldErrors,
  type OnboardingData,
  type StepKey,
} from "@/components/onboarding/types";

const draftKey = (id: number) => `mavlit_onboarding_draft_${id}`;

type SavedDraft = { data: OnboardingData; step: StepKey };

export default function OnboardingPage() {
  const { user, updateProfile } = useAuth();
  const [, navigate] = useLocation();
  const [initial] = useState(() => loadDraft(user));
  const [data, setData] = useState<OnboardingData>(initial.data);
  const [currentStep, setCurrentStep] = useState<StepKey>(initial.step);
  const [direction, setDirection] = useState(1);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [saving, setSaving] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [generationProgress, setGenerationProgress] = useState<string | null>(null);
  const submitting = useRef(false);
  const generationController = useRef<AbortController | null>(null);
  const [generatingPlatform, setGeneratingPlatform] = useState<DescriptionPlatform | null>(null);
  const [estimatedPlatforms, setEstimatedPlatforms] = useState<Partial<Record<DescriptionPlatform, boolean>>>({
    instagram: user?.instagram_description_status === "completed" && user.instagram_description_mode === "generate",
    youtube: user?.youtube_description_status === "completed" && user.youtube_description_mode === "generate",
  });
  useEffect(() => () => generationController.current?.abort(), []);

  const steps = useMemo<StepKey[]>(() => {
    const next: StepKey[] = ["creator", "instagram"];
    if (data.creator.platforms.includes("youtube")) next.push("youtube");
    next.push("review");
    return next;
  }, [data.creator.platforms]);

  const currentIndex = Math.max(0, steps.indexOf(currentStep));

  useEffect(() => {
    if (!steps.includes(currentStep)) setCurrentStep("creator");
  }, [currentStep, steps]);

  useEffect(() => {
    if (!user) return;
    const draft: SavedDraft = { data, step: currentStep };
    try {
      localStorage.setItem(draftKey(user.id), JSON.stringify(draft));
    } catch {
      setSubmitError("Your browser could not save this draft. Check your browser storage settings.");
    }
  }, [currentStep, data, user?.id]);

  useEffect(() => {
    document.title = "Creator Onboarding | MAVLIT";
  }, []);

  const goTo = (index: number, nextDirection: number) => {
    const next = steps[index];
    if (!next) return;
    setDirection(nextDirection);
    setErrors({});
    setSubmitError(null);
    setCurrentStep(next);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const continueFlow = () => {
    const nextErrors = validateStep(currentStep, data);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) return;
    goTo(currentIndex + 1, 1);
  };

  const previous = () => goTo(currentIndex - 1, -1);

  const generateDescription = async (platform: DescriptionPlatform) => {
    if (generationController.current) return;
    const creatorErrors = validateStep("creator", data);
    const platformErrors = validateStep(platform, data);
    if (Object.keys(creatorErrors).length) {
      setErrors(creatorErrors);
      setCurrentStep("creator");
      return;
    }
    // Audience inputs can remain incomplete during generation.
    delete platformErrors.audience;
    if (Object.keys(platformErrors).length) {
      setErrors(platformErrors);
      return;
    }
    const controller = new AbortController();
    generationController.current = controller;
    setGeneratingPlatform(platform);
    setSubmitError(null);
    try {
      const current = await api.get<CreatorProfile>("/creator-profile/me");
      let completed: CreatorProfile;
      if (isDescriptionPending(current[`${platform}_description_status`])) {
        completed = await waitForDescription(platform, current[`${platform}_description_job_id`]!, setGenerationProgress, controller.signal);
      } else {
        // Save prerequisite identity details, but not unreviewed form descriptions.
        await updateProfile({
          ...onboardingPayload(data),
          content_description: current.content_description,
          instagram_description: current.instagram_description,
          youtube_description: current.youtube_description,
          [`${platform}_description_mode`]: "generate",
        });
        if (controller.signal.aborted) return;
        const username = platform === "instagram" ? data.instagram.username.trim().replace(/^@/, "") : data.youtube.channelName.trim();
        let result: DescriptionJob;
        try {
          result = await api.post<DescriptionJob>("/creator-profile/me/generate-description", {
            platform, username, niche: data[platform].niches[0],
          });
        } catch (cause) {
          const latest = await api.get<CreatorProfile>("/creator-profile/me");
          const id = latest[`${platform}_description_job_id`];
          if (!id || id === current[`${platform}_description_job_id`] ||
              !(isDescriptionPending(latest[`${platform}_description_status`]) || latest[`${platform}_description_status`] === "completed")) throw cause;
          result = { platform, job_id: id, status: latest[`${platform}_description_status`]!, description: null, error: null };
        }
        if ((result.platform && result.platform !== platform) || !result.job_id ||
            !["queued", "running", "completed", "failed"].includes(result.status)) throw new Error("MAVLIT returned an unexpected generation response.");
        if (result.status === "failed") throw new Error(result.error || "Description generation failed.");
        completed = await waitForDescription(platform, result.job_id, setGenerationProgress, controller.signal);
      }
      if (controller.signal.aborted) return;
      setData((previous) => ({
        ...previous,
        [platform]: {
          ...fillEmptyAudience(previous[platform], completed, platform),
          contentDescription: previous[platform].contentDescription.trim() ? previous[platform].contentDescription : completed[`${platform}_description`]!.trim(),
        },
      }));
      setEstimatedPlatforms((previous) => ({ ...previous, [platform]: true }));
      setErrors({});
    } catch (cause) {
      if (!controller.signal.aborted) setSubmitError(cause instanceof Error ? cause.message : "Could not generate your description.");
    } finally {
      if (!controller.signal.aborted) {
        generationController.current = null;
        setGeneratingPlatform(null);
        setGenerationProgress(null);
      }
    }
  };

  const submit = async () => {
    if (submitting.current || generationController.current) return;
    const validationOrder = steps.filter((step) => step !== "review");
    for (const step of validationOrder) {
      const stepErrors = validateStep(step, data);
      if (Object.keys(stepErrors).length) {
        setErrors(stepErrors);
        setCurrentStep(step);
        setDirection(-1);
        return;
      }
    }
    submitting.current = true;
    setSubmitError(null);
    setSaving(true);
    try {
      let instagramDescription = data.instagram.contentDescription.trim();
      let youtubeDescription = data.youtube.contentDescription.trim();
      const basePayload = onboardingPayload(data);
      if (!data.creator.contentDescription.trim() && !instagramDescription && !youtubeDescription) {
        const platform: DescriptionPlatform | null = data.instagramDescriptionMode === "generate"
          ? "instagram"
          : data.creator.platforms.includes("youtube") && data.youtubeDescriptionMode === "generate"
            ? "youtube"
            : null;
        if (platform) {
          setCurrentStep(platform);
          await generateDescription(platform);
          // Allow the creator to review/edit estimates before the final save.
          return;
        }
        if (!instagramDescription && !youtubeDescription) {
          setErrors({ contentDescription: "Add at least one overall, Instagram, or YouTube description." });
          setCurrentStep("creator");
          return;
        }
      }
      // Another platform may still have a job in progress (including after a reload).
      // Never save the profile while either platform is queued or running.
      const latestBeforeSave = await api.get<CreatorProfile>("/creator-profile/me");
      for (const platform of ["instagram", "youtube"] as const) {
        if (isDescriptionPending(latestBeforeSave[`${platform}_description_status`])) {
          setGenerationProgress(`Waiting for the ${platform === "instagram" ? "Instagram" : "YouTube"} description…`);
          setCurrentStep(platform);
          await generateDescription(platform);
          return;
        }
      }
      const updated = await updateProfile({
        ...basePayload,
        content_description: data.creator.contentDescription.trim() || instagramDescription || youtubeDescription || null,
        instagram_description: instagramDescription || null,
        youtube_description: youtubeDescription || null,
      });
      if (!samePrimaryNiches(updated.instagram_primary_niche, data.instagram.niches) ||
          (data.creator.platforms.includes("youtube") && !samePrimaryNiches(updated.youtube_primary_niche, data.youtube.niches))) {
        setSubmitError("The profile API did not keep all selected primary niches. Your selections remain in this draft; please try again.");
        return;
      }
      if (!isProfileComplete(updated)) {
        setSubmitError("Your profile was saved, but onboarding is still incomplete. Check your details and try again.");
        return;
      }
      if (user) localStorage.removeItem(draftKey(user.id));
      navigate("/brand-matches");
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : "Couldn't save your profile. Please try again.");
    } finally {
      setSaving(false);
      setGenerationProgress(null);
      submitting.current = false;
    }
  };

  useEffect(() => {
    for (const platform of ["instagram", "youtube"] as const) {
      if (isDescriptionPending(user?.[`${platform}_description_status`])) {
        void generateDescription(platform);
        break;
      }
    }
    // Resume an existing server job after a reload, without posting a new job.
  }, []);

  const stepContent = {
    welcome: <WelcomeStep onStart={() => goTo(1, 1)} />,
    creator: (
      <CreatorInfoStep
        value={data.creator}
        onChange={(creator) => setData((current) => ({ ...current, creator }))}
        errors={errors}
      />
    ),
    instagram: (
      <InstagramStep
        value={data.instagram}
        onChange={(instagram) => setData((current) => ({ ...current, instagram }))}
        descriptionMode={data.instagramDescriptionMode}
        onDescriptionModeChange={(instagramDescriptionMode) => setData((current) => ({ ...current, instagramDescriptionMode }))}
        errors={errors}
        onGenerate={() => void generateDescription("instagram")}
        generating={generatingPlatform !== null}
        generateError={submitError}
        estimated={!!estimatedPlatforms.instagram}
      />
    ),
    youtube: (
      <YouTubeStep
        value={data.youtube}
        onChange={(youtube) => setData((current) => ({ ...current, youtube }))}
        descriptionMode={data.youtubeDescriptionMode}
        onDescriptionModeChange={(youtubeDescriptionMode) => setData((current) => ({ ...current, youtubeDescriptionMode }))}
        errors={errors}
        onGenerate={() => void generateDescription("youtube")}
        generating={generatingPlatform !== null}
        generateError={submitError}
        estimated={!!estimatedPlatforms.youtube}
      />
    ),
    review: <ReviewStep data={data} />,
  } satisfies Record<StepKey, React.ReactNode>;

  return (
    <OnboardingLayout
      steps={steps}
      currentIndex={currentIndex}
      onPrevious={previous}
      onContinue={currentStep === "review" ? submit : continueFlow}
      continueLabel={currentStep === "review" ? "Complete Profile" : "Continue"}
      showPrevious={currentStep !== "creator"}
      showContinue
      saving={saving || generatingPlatform !== null}
    >
      <AnimatePresence mode="wait" custom={direction}>
        <motion.div
          key={currentStep}
          custom={direction}
          initial={{ opacity: 0, x: direction > 0 ? 28 : -28 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: direction > 0 ? -28 : 28 }}
          transition={{ duration: 0.24, ease: "easeOut" }}
        >
          {stepContent[currentStep]}
          {generationProgress && <p role="status" className="mt-5 text-sm text-primary">{generationProgress}</p>}
          {submitError && (
            <div className="mt-5 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
              {submitError}
            </div>
          )}
        </motion.div>
      </AnimatePresence>
    </OnboardingLayout>
  );
}

async function waitForDescription(platform: DescriptionPlatform, jobId: string, onProgress: (message: string) => void, signal: AbortSignal): Promise<CreatorProfile> {
  if (!jobId) throw new Error("MAVLIT did not return a generation job ID.");
  while (true) {
    await new Promise((resolve) => setTimeout(resolve, 1500));
    if (signal.aborted) throw new Error("Generation progress checks stopped.");
    const profile = await api.get<CreatorProfile>("/creator-profile/me", { signal });
    if (profile[`${platform}_description_job_id`] !== jobId) throw new Error("The generation job changed. Progress checks stopped. Please try again.");
    const status = profile[`${platform}_description_status`];
    if (status === "completed") {
      const description = profile[`${platform}_description`]?.trim();
      if (!description) throw new Error("MAVLIT completed generation without a description.");
      return profile;
    }
    if (status === "failed") throw new Error(profile[`${platform}_description_error`] || "Description generation failed. Write it yourself or retry.");
    if (!isDescriptionPending(status)) throw new Error("Description generation stopped unexpectedly. Please try again.");
    onProgress(`${platform === "instagram" ? "Instagram" : "YouTube"} description is ${status}. Waiting for MAVLIT…`);
  }
}

function onboardingPayload(data: OnboardingData): Partial<CreatorProfile> {
  return {
    full_name: data.creator.fullName.trim(),
    creator_handle: data.instagram.username.trim().replace(/^@/, ""),
    age: Number(data.creator.age),
    gender: data.creator.gender,
    primary_platform: formatPlatforms(data.creator.platforms),
    instagram_handle: data.instagram.username.trim().replace(/^@/, ""),
    instagram_followers: Number(data.instagram.followers),
    follower_count: data.creator.platforms[0] === "youtube" ? Number(data.youtube.subscribers) : Number(data.instagram.followers),
    content_niche: formatPrimaryNiches(data.instagram.niches),
    instagram_primary_niche: formatPrimaryNiches(data.instagram.niches),
    instagram_sub_niches: data.instagram.subNiches,
    instagram_excluded_categories: data.instagram.excludedCategories,
    youtube_channel_name: data.youtube.channelName.trim() || null,
    youtube_subscribers: data.youtube.subscribers ? Number(data.youtube.subscribers) : null,
    youtube_primary_niche: formatPrimaryNiches(data.youtube.niches),
    youtube_sub_niches: data.youtube.subNiches,
    youtube_excluded_categories: data.youtube.excludedCategories,
    instagram_description_mode: data.instagramDescriptionMode,
    youtube_description_mode: data.youtubeDescriptionMode,
    ...audiencePayload(data.instagram, "instagram"),
    ...audiencePayload(data.youtube, "youtube"),
  };
}

function loadDraft(profile: CreatorProfile | null): SavedDraft {
  try {
    const raw = profile && localStorage.getItem(draftKey(profile.id));
    if (raw) {
      const parsed = JSON.parse(raw) as SavedDraft;
      if (parsed.data?.creator && parsed.data.instagram && parsed.data.youtube) {
        let data = currentFields(parsed.data);
        for (const platform of ["instagram", "youtube"] as const) {
          if (profile?.[`${platform}_description_status`] === "completed" &&
              data[`${platform}DescriptionMode`] === "generate") {
            data = { ...data, [platform]: {
              ...fillEmptyAudience(data[platform], profile, platform),
              contentDescription: data[platform].contentDescription.trim()
                ? data[platform].contentDescription : profile[`${platform}_description`] || "",
            } };
          }
        }
        return { data, step: parsed.step === "welcome" ? "creator" : parsed.step };
      }
    }
  } catch {
    if (profile) localStorage.removeItem(draftKey(profile.id));
  }
  if (!profile) return { data: EMPTY_ONBOARDING, step: "creator" };
  return {
    step: "creator",
    data: currentFields({
      ...EMPTY_ONBOARDING,
      instagramDescriptionMode: profile.instagram_description_mode === "generate" ? "generate" : "manual",
      youtubeDescriptionMode: profile.youtube_description_mode === "generate" ? "generate" : "manual",
      creator: {
        fullName: profile.full_name ?? "",
        age: profile.age != null ? String(profile.age) : "",
        gender: profile.gender ?? "",
        platforms: parsePlatforms(profile.primary_platform),
        contentDescription: profile.content_description ?? "",
      },
      instagram: {
        ...EMPTY_ONBOARDING.instagram,
        username: profile.instagram_handle ?? profile.creator_handle ?? "",
        followers: profile.instagram_followers != null ? String(profile.instagram_followers) :
          parsePlatforms(profile.primary_platform)[0] === "instagram" && profile.follower_count != null ? String(profile.follower_count) : "",
        niches: parsePrimaryNiches(profile.instagram_primary_niche ?? profile.content_niche),
        subNiches: profile.instagram_sub_niches ?? profile.sub_niches ?? [],
        contentDescription: profile.instagram_description ?? "",
        excludedCategories: profile.instagram_excluded_categories ?? profile.excluded_categories ?? [],
        ...audienceFromProfile(profile, "instagram"),
      },
      youtube: {
        ...EMPTY_ONBOARDING.youtube,
        channelName: profile.youtube_channel_name ?? "",
        subscribers: profile.youtube_subscribers != null ? String(profile.youtube_subscribers) : "",
        niches: parsePrimaryNiches(profile.youtube_primary_niche),
        subNiches: profile.youtube_sub_niches ?? [],
        contentDescription: profile.youtube_description ?? "",
        excludedCategories: profile.youtube_excluded_categories ?? [],
        ...audienceFromProfile(profile, "youtube"),
      },
    }),
  };
}

function currentFields(data: OnboardingData): OnboardingData {
  return {
    instagramDescriptionMode: data.instagramDescriptionMode === "generate" ? "generate" : "manual",
    youtubeDescriptionMode: data.youtubeDescriptionMode === "generate" ? "generate" : "manual",
    creator: {
      fullName: data.creator.fullName ?? "",
      age: data.creator.age ?? "",
      gender: data.creator.gender ?? "",
      platforms: data.creator.platforms ?? [],
      contentDescription: data.creator.contentDescription ?? "",
    },
    instagram: {
      username: data.instagram.username ?? "",
      followers: data.instagram.followers ?? "",
      niches: data.instagram.niches ?? [],
      subNiches: data.instagram.subNiches ?? [],
      contentDescription: data.instagram.contentDescription ?? "",
      excludedCategories: categoriesArray(data.instagram.excludedCategories),
      audienceGender: data.instagram.audienceGender ?? "",
      audienceAgeMin: data.instagram.audienceAgeMin ?? "",
      audienceAgeMax: data.instagram.audienceAgeMax ?? "",
    },
    youtube: {
      channelName: data.youtube.channelName ?? "",
      subscribers: data.youtube.subscribers ?? "",
      niches: data.youtube.niches ?? [],
      subNiches: data.youtube.subNiches ?? [],
      contentDescription: data.youtube.contentDescription ?? "",
      excludedCategories: categoriesArray(data.youtube.excludedCategories),
      audienceGender: data.youtube.audienceGender ?? "",
      audienceAgeMin: data.youtube.audienceAgeMin ?? "",
      audienceAgeMax: data.youtube.audienceAgeMax ?? "",
    },
  };
}

function categoriesArray(value: string[] | string | null | undefined): string[] {
  return Array.isArray(value) ? value : typeof value === "string" ? value.split(",").map((part) => part.trim()).filter(Boolean) : [];
}

function validateStep(step: StepKey, data: OnboardingData): FieldErrors {
  if (step === "creator") {
    const errors: FieldErrors = {};
    const age = Number(data.creator.age);
    if (!data.creator.fullName.trim()) errors.fullName = "Full name is required.";
    if (!Number.isInteger(age) || age < 13 || age > 120) errors.age = "Enter an age between 13 and 120.";
    if (!data.creator.gender) errors.gender = "Select a gender option.";
    if (!data.creator.platforms.length) errors.platforms = "Select at least one primary platform.";
    return errors;
  }
  if (step === "instagram") {
    const errors: FieldErrors = {};
    const audience = audienceError(data.instagram);
    if (audience) errors.audience = audience;
    if (!data.instagram.username.trim()) errors.username = "Instagram username is required.";
    if (data.instagram.followers === "" || !Number.isInteger(Number(data.instagram.followers)) || Number(data.instagram.followers) < 0) errors.followers = "Enter a valid follower count.";
    if (!data.instagram.niches.length || data.instagram.niches.some((niche) => !NICHE_OPTIONS.includes(niche as typeof NICHE_OPTIONS[number]))) errors.niches = "Select a listed primary niche.";
    return errors;
  }
  if (step === "youtube") {
    const errors: FieldErrors = {};
    const audience = audienceError(data.youtube);
    if (audience) errors.audience = audience;
    if (!data.youtube.channelName.trim()) errors.channelName = "Channel name is required.";
    if (data.youtube.subscribers === "" || Number(data.youtube.subscribers) < 0) errors.subscribers = "Enter a valid subscriber count.";
    if (!data.youtube.niches.length || data.youtube.niches.some((niche) => !NICHE_OPTIONS.includes(niche as typeof NICHE_OPTIONS[number]))) errors.niches = "Select a listed primary niche.";
    return errors;
  }
  return {};
}
