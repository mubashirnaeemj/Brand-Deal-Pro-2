import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useLocation } from "wouter";
import { type CreatorProfile, type DescriptionJob, type DescriptionPlatform, isDescriptionPending, isProfileComplete, useAuth } from "@/contexts/AuthContext";
import { api } from "@/lib/api";
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

  const submit = async () => {
    if (submitting.current) return;
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
      const basePayload = {
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
      };
      if (!data.creator.contentDescription.trim() && !instagramDescription && !youtubeDescription) {
        const platform: DescriptionPlatform | null = data.instagramDescriptionMode === "generate"
          ? "instagram"
          : data.creator.platforms.includes("youtube") && data.youtubeDescriptionMode === "generate"
            ? "youtube"
            : null;
        if (platform) {
          const current = await api.get<CreatorProfile>("/creator-profile/me");
          const username = platform === "instagram" ? data.instagram.username.trim().replace(/^@/, "") : data.youtube.channelName.trim();
          const savedUsername = platform === "instagram" ? current.instagram_handle?.trim().replace(/^@/, "") : current.youtube_channel_name?.trim();
          const status = current[`${platform}_description_status`];
          let description = "";
          if (isDescriptionPending(status)) {
            setGenerationProgress(`${platform === "instagram" ? "Instagram" : "YouTube"} description is ${status}. Waiting for the existing job…`);
            description = await waitForDescription(platform, setGenerationProgress);
          } else if (status === "completed" && savedUsername === username && current[`${platform}_description`]?.trim()) {
            description = current[`${platform}_description`]!.trim();
          } else {
            // The generation endpoint needs the creator details saved first.
            await updateProfile({
              ...basePayload,
              content_description: current.content_description,
              instagram_description: current.instagram_description,
              youtube_description: current.youtube_description,
            });
            let result: DescriptionJob | null = null;
            try {
              result = await api.post<DescriptionJob>("/creator-profile/me/generate-description", {
                platform, username,
                niche: platform === "instagram" ? data.instagram.niches[0] : data.youtube.niches[0],
              });
            } catch (cause) {
              // The remote request may have started a job before the proxy timed out.
              const latest = await api.get<CreatorProfile>("/creator-profile/me").catch(() => null);
              if (latest && isDescriptionPending(latest[`${platform}_description_status`])) {
                setGenerationProgress("Generation started; waiting for MAVLIT to finish…");
                description = await waitForDescription(platform, setGenerationProgress);
              } else if (latest && latest[`${platform}_description_status`] === "completed" &&
                  latest[`${platform}_description_job_id`] &&
                  latest[`${platform}_description_job_id`] !== current[`${platform}_description_job_id`] &&
                  latest[`${platform}_description`]?.trim()) {
                description = latest[`${platform}_description`]!.trim();
              } else {
                throw cause;
              }
            }
            if (result) {
              if (result.platform !== platform || !["queued", "running", "completed", "failed"].includes(result.status)) {
                throw new Error("MAVLIT returned an unexpected generation response.");
              }
              if (result.status === "failed") throw new Error(result.error || "Description generation failed.");
              if (result.status === "completed") {
                description = result.description?.trim() ?? "";
              } else {
                setGenerationProgress(`${platform === "instagram" ? "Instagram" : "YouTube"} description is ${result.status}. Waiting for MAVLIT…`);
                description = await waitForDescription(platform, setGenerationProgress);
              }
            }
          }
          if (platform === "instagram") instagramDescription = description;
          else youtubeDescription = description;
          if (instagramDescription || youtubeDescription) {
            setData((current) => ({
              ...current,
              instagram: { ...current.instagram, contentDescription: instagramDescription },
              youtube: { ...current.youtube, contentDescription: youtubeDescription },
            }));
          }
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
          const description = await waitForDescription(platform, setGenerationProgress);
          if (platform === "instagram") instagramDescription = description;
          else youtubeDescription = description;
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
    if (currentStep === "review" && (isDescriptionPending(user?.instagram_description_status) ||
        isDescriptionPending(user?.youtube_description_status))) void submit();
    // A pending job loaded from the server after a refresh is resumed once on review.
  }, [currentStep, user?.instagram_description_status, user?.youtube_description_status]);

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
      />
    ),
    youtube: (
      <YouTubeStep
        value={data.youtube}
        onChange={(youtube) => setData((current) => ({ ...current, youtube }))}
        descriptionMode={data.youtubeDescriptionMode}
        onDescriptionModeChange={(youtubeDescriptionMode) => setData((current) => ({ ...current, youtubeDescriptionMode }))}
        errors={errors}
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
      saving={saving}
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

async function waitForDescription(platform: DescriptionPlatform, onProgress: (message: string) => void): Promise<string> {
  while (true) {
    await new Promise((resolve) => setTimeout(resolve, 1000));
    const profile = await api.get<CreatorProfile>("/creator-profile/me");
    const status = profile[`${platform}_description_status`];
    if (status === "completed") {
      const description = profile[`${platform}_description`]?.trim();
      if (!description) throw new Error("MAVLIT completed generation without a description.");
      return description;
    }
    if (status === "failed") throw new Error(profile[`${platform}_description_error`] || "Description generation failed. Write it yourself or retry.");
    if (!isDescriptionPending(status)) throw new Error("Description generation stopped unexpectedly. Please try again.");
    onProgress(`${platform === "instagram" ? "Instagram" : "YouTube"} description is ${status}. Waiting for MAVLIT…`);
  }
}

function loadDraft(profile: CreatorProfile | null): SavedDraft {
  try {
    const raw = profile && localStorage.getItem(draftKey(profile.id));
    if (raw) {
      const parsed = JSON.parse(raw) as SavedDraft;
      if (parsed.data?.creator && parsed.data.instagram && parsed.data.youtube) {
        return { data: currentFields(parsed.data), step: parsed.step === "welcome" ? "creator" : parsed.step };
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
      },
      youtube: {
        ...EMPTY_ONBOARDING.youtube,
        channelName: profile.youtube_channel_name ?? "",
        subscribers: profile.youtube_subscribers != null ? String(profile.youtube_subscribers) : "",
        niches: parsePrimaryNiches(profile.youtube_primary_niche),
        subNiches: profile.youtube_sub_niches ?? [],
        contentDescription: profile.youtube_description ?? "",
        excludedCategories: profile.youtube_excluded_categories ?? [],
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
    },
    youtube: {
      channelName: data.youtube.channelName ?? "",
      subscribers: data.youtube.subscribers ?? "",
      niches: data.youtube.niches ?? [],
      subNiches: data.youtube.subNiches ?? [],
      contentDescription: data.youtube.contentDescription ?? "",
      excludedCategories: categoriesArray(data.youtube.excludedCategories),
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
    if (!data.instagram.username.trim()) errors.username = "Instagram username is required.";
    if (data.instagram.followers === "" || !Number.isInteger(Number(data.instagram.followers)) || Number(data.instagram.followers) < 0) errors.followers = "Enter a valid follower count.";
    if (!data.instagram.niches.length || data.instagram.niches.some((niche) => !NICHE_OPTIONS.includes(niche as typeof NICHE_OPTIONS[number]))) errors.niches = "Select a listed primary niche.";
    return errors;
  }
  if (step === "youtube") {
    const errors: FieldErrors = {};
    if (!data.youtube.channelName.trim()) errors.channelName = "Channel name is required.";
    if (data.youtube.subscribers === "" || Number(data.youtube.subscribers) < 0) errors.subscribers = "Enter a valid subscriber count.";
    if (!data.youtube.niches.length || data.youtube.niches.some((niche) => !NICHE_OPTIONS.includes(niche as typeof NICHE_OPTIONS[number]))) errors.niches = "Select a listed primary niche.";
    return errors;
  }
  return {};
}
