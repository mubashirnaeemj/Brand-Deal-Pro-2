import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useLocation } from "wouter";
import { type CreatorProfile, isProfileComplete, useAuth } from "@/contexts/AuthContext";
import { api } from "@/lib/api";
import OnboardingLayout from "@/components/onboarding/OnboardingLayout";
import WelcomeStep from "@/components/onboarding/WelcomeStep";
import CreatorInfoStep from "@/components/onboarding/CreatorInfoStep";
import InstagramStep from "@/components/onboarding/InstagramStep";
import YouTubeStep from "@/components/onboarding/YouTubeStep";
import ReviewStep from "@/components/onboarding/ReviewStep";
import {
  EMPTY_ONBOARDING,
  audienceTotal,
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
    setSubmitError(null);
    setSaving(true);
    try {
      let instagramDescription = data.instagram.contentDescription.trim();
      let youtubeDescription = data.youtube.contentDescription.trim();
      if (!data.creator.contentDescription.trim() && !instagramDescription && !youtubeDescription) {
        const platform = data.instagramDescriptionMode === "generate"
          ? "instagram"
          : data.creator.platforms.includes("youtube") && data.youtubeDescriptionMode === "generate"
            ? "youtube"
            : null;
        if (platform) {
          const generated = await api.post<{ description: string }>("/creator-profile/me/generate-description", {
            platform,
            username: platform === "instagram" ? data.instagram.username.trim() : data.youtube.channelName.trim(),
            niche: platform === "instagram" ? data.instagram.niches[0] : data.youtube.niches[0],
          });
          if (platform === "instagram") instagramDescription = generated.description?.trim() ?? "";
          else youtubeDescription = generated.description?.trim() ?? "";
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
      const updated = await updateProfile({
        full_name: data.creator.fullName.trim(),
        creator_handle: data.instagram.username.trim().replace(/^@/, ""),
        age: Number(data.creator.age),
        gender: data.creator.gender,
        primary_platform: data.creator.platforms[0],
        instagram_handle: data.instagram.username.trim().replace(/^@/, ""),
        instagram_followers: Number(data.instagram.followers),
        follower_count: data.creator.platforms[0] === "youtube" ? Number(data.youtube.subscribers) : Number(data.instagram.followers),
        content_niche: data.instagram.niches[0],
        instagram_primary_niche: data.instagram.niches[0],
        content_description: data.creator.contentDescription.trim() || null,
        instagram_description: instagramDescription || null,
        youtube_description: youtubeDescription || null,
        instagram_sub_niches: data.instagram.subNiches,
        youtube_channel_name: data.youtube.channelName.trim() || null,
        youtube_subscribers: data.youtube.subscribers ? Number(data.youtube.subscribers) : null,
        youtube_primary_niche: data.youtube.niches[0] || null,
      });
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
    }
  };

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
        platforms: profile.primary_platform === "youtube" ? ["youtube"] : profile.primary_platform === "instagram" ? ["instagram"] : [],
        contentDescription: profile.content_description ?? "",
      },
      instagram: {
        ...EMPTY_ONBOARDING.instagram,
        username: profile.instagram_handle ?? profile.creator_handle ?? "",
        followers: profile.follower_count != null ? String(profile.follower_count) : "",
        niches: profile.instagram_primary_niche ? [profile.instagram_primary_niche] : profile.content_niche ? [profile.content_niche] : [],
        contentDescription: profile.instagram_description ?? "",
      },
      youtube: {
        ...EMPTY_ONBOARDING.youtube,
        channelName: profile.youtube_channel_name ?? "",
        subscribers: profile.youtube_subscribers != null ? String(profile.youtube_subscribers) : "",
        niches: profile.youtube_primary_niche ? [profile.youtube_primary_niche] : [],
        contentDescription: profile.youtube_description ?? "",
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
      excludedCategories: data.instagram.excludedCategories ?? "",
      audience: {
        malePct: data.instagram.audience?.malePct ?? "",
        femalePct: data.instagram.audience?.femalePct ?? "",
      },
    },
    youtube: {
      channelName: data.youtube.channelName ?? "",
      subscribers: data.youtube.subscribers ?? "",
      niches: data.youtube.niches ?? [],
      subNiches: data.youtube.subNiches ?? [],
      contentDescription: data.youtube.contentDescription ?? "",
      excludedCategories: data.youtube.excludedCategories ?? "",
      audience: {
        malePct: data.youtube.audience?.malePct ?? "",
        femalePct: data.youtube.audience?.femalePct ?? "",
      },
    },
  };
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
    if (!data.instagram.niches.length) errors.niches = "Select at least one primary niche.";
    if (audienceTotal(data.instagram.audience) > 100) errors.audience = "Male and female percentages cannot exceed 100% combined.";
    return errors;
  }
  if (step === "youtube") {
    const errors: FieldErrors = {};
    if (!data.youtube.channelName.trim()) errors.channelName = "Channel name is required.";
    if (data.youtube.subscribers === "" || Number(data.youtube.subscribers) < 0) errors.subscribers = "Enter a valid subscriber count.";
    if (!data.youtube.niches.length) errors.niches = "Select at least one primary niche.";
    if (audienceTotal(data.youtube.audience) > 100) errors.audience = "Male and female percentages cannot exceed 100% combined.";
    return errors;
  }
  return {};
}
