import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { CheckCircle2 } from "lucide-react";
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
  type FieldErrors,
  type OnboardingData,
  type StepKey,
} from "@/components/onboarding/types";

const DRAFT_KEY = "mavlit_onboarding_draft_v1";
const COMPLETED_KEY = "mavlit_onboarding_profile_v1";

type SavedDraft = { data: OnboardingData; step: StepKey };

export default function OnboardingPage() {
  const { toast } = useToast();
  const [initial] = useState(loadDraft);
  const [data, setData] = useState<OnboardingData>(initial.data);
  const [currentStep, setCurrentStep] = useState<StepKey>(initial.step);
  const [direction, setDirection] = useState(1);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [completed, setCompleted] = useState(false);
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
    if (completed) return;
    const draft: SavedDraft = { data, step: currentStep };
    try {
      localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
    } catch {
      setSubmitError("Your browser could not save this draft. Check your browser storage settings.");
    }
  }, [currentStep, data, completed]);

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

  const submit = () => {
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

    setSubmitError(null);
    try {
      localStorage.setItem(COMPLETED_KEY, JSON.stringify({
        onboarding_complete: true,
        completed_at: new Date().toISOString(),
        data,
      }));
      localStorage.removeItem(DRAFT_KEY);
      setCompleted(true);
      toast({
        title: "Saved on this device.",
        description: "No data was sent to the MAVLIT API.",
      });
    } catch (reason) {
      setSubmitError("Your browser could not save these details. Check your storage settings and try again.");
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
      continueLabel={currentStep === "review" ? "Save on this device" : "Continue"}
      showPrevious={!completed && currentStep !== "welcome"}
      showContinue={!completed && currentStep !== "welcome"}
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
          {completed ? (
            <div className="py-8 text-center">
              <CheckCircle2 className="mx-auto h-14 w-14 text-primary" />
              <h1 className="mt-5 text-2xl font-extrabold text-white sm:text-3xl">Preview complete</h1>
              <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-muted-foreground">
                Your answers were saved in this browser only. Nothing was sent to the MAVLIT API or added to your account.
              </p>
              <button type="button" onClick={() => { setCompleted(false); goTo(steps.length - 1, -1); }} className="mt-7 rounded-xl border border-border bg-secondary px-5 py-3 text-sm font-semibold text-white hover:bg-secondary/70">
                Edit your answers
              </button>
            </div>
          ) : stepContent[currentStep]}
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

function loadDraft(): SavedDraft {
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as SavedDraft;
      if (parsed.data?.creator && parsed.data.instagram && parsed.data.youtube && ["welcome", "creator", "instagram", "youtube", "review"].includes(parsed.step)) return parsed;
    }
    const completed = localStorage.getItem(COMPLETED_KEY);
    if (completed) {
      const parsed = JSON.parse(completed) as { data?: OnboardingData };
      if (parsed.data?.creator && parsed.data.instagram && parsed.data.youtube) return { data: parsed.data, step: "welcome" };
    }
  } catch {
    localStorage.removeItem(DRAFT_KEY);
  }

  return { data: EMPTY_ONBOARDING, step: "welcome" };
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
