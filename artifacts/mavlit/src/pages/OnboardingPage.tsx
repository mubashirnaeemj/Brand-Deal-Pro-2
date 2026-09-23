import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useLocation } from "wouter";
import { useAuth, type CreatorProfile } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import OnboardingLayout from "@/components/onboarding/OnboardingLayout";
import WelcomeStep from "@/components/onboarding/WelcomeStep";
import CreatorInfoStep from "@/components/onboarding/CreatorInfoStep";
import InstagramStep from "@/components/onboarding/InstagramStep";
import YouTubeStep from "@/components/onboarding/YouTubeStep";
import ReviewStep from "@/components/onboarding/ReviewStep";
import {
  EMPTY_ONBOARDING,
  audienceTotal,
  isValidUrl,
  parseList,
  type FieldErrors,
  type OnboardingData,
  type StepKey,
} from "@/components/onboarding/types";

const DRAFT_KEY = "mavlit_onboarding_draft_v1";
const COMPLETED_KEY = "mavlit_onboarding_profile_v1";

type SavedDraft = { data: OnboardingData; step: StepKey };

export default function OnboardingPage() {
  const { user, updateProfile, logout } = useAuth();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const initial = useMemo(() => loadDraft(user), [user]);
  const [data, setData] = useState<OnboardingData>(initial.data);
  const [currentStep, setCurrentStep] = useState<StepKey>(initial.step);
  const [direction, setDirection] = useState(1);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [saving, setSaving] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const steps = useMemo<StepKey[]>(() => {
    const next: StepKey[] = ["welcome", "creator"];
    if (data.creator.platforms.includes("instagram")) next.push("instagram");
    if (data.creator.platforms.includes("youtube")) next.push("youtube");
    next.push("review");
    return next;
  }, [data.creator.platforms]);

  const currentIndex = Math.max(0, steps.indexOf(currentStep));

  useEffect(() => {
    if (!steps.includes(currentStep)) setCurrentStep("creator");
  }, [currentStep, steps]);

  useEffect(() => {
    const draft: SavedDraft = { data, step: currentStep };
    localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
  }, [currentStep, data]);

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
    const validationOrder = steps.filter((step) => step !== "welcome" && step !== "review");
    for (const step of validationOrder) {
      const stepErrors = validateStep(step, data);
      if (Object.keys(stepErrors).length) {
        setErrors(stepErrors);
        setCurrentStep(step);
        setDirection(-1);
        return;
      }
    }

    setSaving(true);
    setSubmitError(null);
    try {
      await updateProfile(buildProfilePatch(data));
      localStorage.removeItem(DRAFT_KEY);
      localStorage.setItem(COMPLETED_KEY, JSON.stringify({
        onboarding_complete: true,
        completed_at: new Date().toISOString(),
        data,
      }));
      toast({
        title: "Profile created successfully.",
        description: "Your creator dashboard is ready.",
      });
      navigate("/dashboard");
    } catch (reason) {
      setSubmitError(reason instanceof Error ? reason.message : "We couldn't save your profile. Please try again.");
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
        errors={errors}
      />
    ),
    youtube: (
      <YouTubeStep
        value={data.youtube}
        onChange={(youtube) => setData((current) => ({ ...current, youtube }))}
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
      onLogout={logout}
      continueLabel={currentStep === "review" ? "Submit Profile" : "Continue"}
      showPrevious={currentStep !== "welcome"}
      showContinue={currentStep !== "welcome"}
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

function loadDraft(user: CreatorProfile | null): SavedDraft {
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as SavedDraft;
      if (parsed.data?.creator && parsed.step) return parsed;
    }
  } catch {
    localStorage.removeItem(DRAFT_KEY);
  }

  const data: OnboardingData = {
    ...EMPTY_ONBOARDING,
    creator: {
      ...EMPTY_ONBOARDING.creator,
      fullName: user?.full_name ?? "",
      city: user?.location_city ?? "",
      country: user?.location_country ?? "",
      contentDescription: user?.content_description ?? user?.bio_tagline ?? "",
      platforms: [
        ...(user?.instagram_handle ? ["instagram" as const] : []),
        ...(user?.youtube_channel ? ["youtube" as const] : []),
      ],
    },
    instagram: {
      ...EMPTY_ONBOARDING.instagram,
      username: user?.instagram_handle ?? "",
      followers: user?.instagram_followers?.toString() ?? "",
      niches: user?.content_niche ? [titleCase(user.content_niche)] : [],
      subNiches: user?.sub_niches ?? [],
      contentDescription: user?.content_description ?? "",
      excludedCategories: user?.excluded_categories?.join(", ") ?? "",
      audience: {
        malePct: user?.audience_gender_male_pct?.toString() ?? "",
        femalePct: user?.audience_gender_female_pct?.toString() ?? "",
        topCountry: readTopCountry(user),
      },
    },
    youtube: {
      ...EMPTY_ONBOARDING.youtube,
      channelName: user?.youtube_channel ?? "",
      channelUrl: user?.youtube_channel?.startsWith("http") ? user.youtube_channel : "",
      subscribers: user?.youtube_followers?.toString() ?? "",
      niches: user?.content_niche ? [titleCase(user.content_niche)] : [],
      subNiches: user?.sub_niches ?? [],
      contentDescription: user?.content_description ?? "",
      excludedCategories: user?.excluded_categories?.join(", ") ?? "",
      audience: {
        malePct: user?.audience_gender_male_pct?.toString() ?? "",
        femalePct: user?.audience_gender_female_pct?.toString() ?? "",
        topCountry: readTopCountry(user),
      },
    },
  };
  return { data, step: "welcome" };
}

function validateStep(step: StepKey, data: OnboardingData): FieldErrors {
  if (step === "creator") {
    const errors: FieldErrors = {};
    const age = Number(data.creator.age);
    if (!data.creator.fullName.trim()) errors.fullName = "Full name is required.";
    if (!data.creator.city.trim()) errors.city = "City is required.";
    if (!data.creator.country.trim()) errors.country = "Country is required.";
    if (!Number.isInteger(age) || age < 13 || age > 120) errors.age = "Enter an age between 13 and 120.";
    if (!data.creator.gender) errors.gender = "Select a gender option.";
    if (!data.creator.contentDescription.trim()) errors.contentDescription = "Tell us what content you create.";
    if (!data.creator.platforms.length) errors.platforms = "Select at least one primary platform.";
    return errors;
  }
  if (step === "instagram") {
    const errors: FieldErrors = {};
    if (!data.instagram.username.trim()) errors.username = "Instagram username is required.";
    if (!isValidUrl(data.instagram.profileUrl)) errors.profileUrl = "Enter a valid Instagram profile URL.";
    if (data.instagram.followers === "" || Number(data.instagram.followers) < 0) errors.followers = "Enter a valid follower count.";
    if (!data.instagram.niches.length) errors.niches = "Select at least one primary niche.";
    if (!data.instagram.contentDescription.trim()) errors.contentDescription = "Describe your Instagram content.";
    if (audienceTotal(data.instagram.audience) > 100) errors.audience = "Male and female percentages cannot exceed 100% combined.";
    if (!data.instagram.audience.topCountry.trim()) errors.topCountry = "Top audience country is required.";
    return errors;
  }
  if (step === "youtube") {
    const errors: FieldErrors = {};
    if (!data.youtube.channelName.trim()) errors.channelName = "Channel name is required.";
    if (!isValidUrl(data.youtube.channelUrl)) errors.channelUrl = "Enter a valid YouTube channel URL.";
    if (data.youtube.subscribers === "" || Number(data.youtube.subscribers) < 0) errors.subscribers = "Enter a valid subscriber count.";
    if (!data.youtube.niches.length) errors.niches = "Select at least one primary niche.";
    if (!data.youtube.contentDescription.trim()) errors.contentDescription = "Describe your YouTube content.";
    if (audienceTotal(data.youtube.audience) > 100) errors.audience = "Male and female percentages cannot exceed 100% combined.";
    if (!data.youtube.audience.topCountry.trim()) errors.topCountry = "Top audience country is required.";
    return errors;
  }
  return {};
}

function buildProfilePatch(data: OnboardingData): Partial<CreatorProfile> {
  const useInstagram = data.creator.platforms.includes("instagram");
  const primary = useInstagram ? data.instagram : data.youtube;
  const primaryFollowers = useInstagram ? Number(data.instagram.followers) : Number(data.youtube.subscribers);
  const allNiches = unique([
    ...data.instagram.niches,
    ...data.instagram.subNiches,
    ...data.youtube.niches,
    ...data.youtube.subNiches,
  ]);
  const excluded = unique([
    ...parseList(data.instagram.excludedCategories),
    ...parseList(data.youtube.excludedCategories),
  ]);
  const platformDescriptions = [
    data.creator.contentDescription,
    useInstagram && data.instagram.contentDescription ? `Instagram: ${data.instagram.contentDescription}` : "",
    data.creator.platforms.includes("youtube") && data.youtube.contentDescription ? `YouTube: ${data.youtube.contentDescription}` : "",
  ].filter(Boolean).join("\n\n");
  const audience = primary.audience;
  const handle = useInstagram ? data.instagram.username.trim() : data.youtube.channelName.trim();

  return {
    full_name: data.creator.fullName.trim(),
    creator_handle: handle,
    location_city: data.creator.city.trim(),
    location_country: data.creator.country.trim(),
    bio_tagline: data.creator.contentDescription.trim(),
    content_niche: (primary.niches[0] ?? "Lifestyle").toLowerCase(),
    sub_niches: allNiches.filter((item) => item !== primary.niches[0]),
    content_description: platformDescriptions,
    excluded_categories: excluded,
    instagram_handle: useInstagram ? data.instagram.username.trim() : null,
    youtube_channel: data.creator.platforms.includes("youtube") ? data.youtube.channelUrl.trim() : null,
    instagram_followers: useInstagram ? Number(data.instagram.followers) : null,
    youtube_followers: data.creator.platforms.includes("youtube") ? Number(data.youtube.subscribers) : null,
    primary_platform: useInstagram ? "instagram" : "youtube",
    follower_count: primaryFollowers,
    audience_gender_male_pct: audience.malePct ? Number(audience.malePct) : null,
    audience_gender_female_pct: audience.femalePct ? Number(audience.femalePct) : null,
    audience_top_countries: audience.topCountry ? [{ country: audience.topCountry.trim(), percentage: 100 }] : null,
  };
}

function unique(items: string[]) {
  return [...new Set(items.map((item) => item.trim()).filter(Boolean))];
}

function titleCase(value: string) {
  return value.replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function readTopCountry(user: CreatorProfile | null) {
  const first = user?.audience_top_countries?.[0];
  return typeof first?.country === "string" ? first.country : "";
}