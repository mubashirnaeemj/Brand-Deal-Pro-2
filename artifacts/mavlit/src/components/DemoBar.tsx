import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useLocation } from "wouter";
import { Sparkles, ChevronRight, X, ArrowLeft } from "lucide-react";

const STEPS = [
  {
    label: "Dashboard",
    href: "/dashboard",
    desc: "Your creator command center — matches, pitches, and deal activity at a glance.",
    match: (p: string) => p === "/dashboard",
  },
  {
    label: "Brand Matches",
    href: "/brand-matches",
    desc: "MAVLIT found 6 high-fit brands based on your music niche audience.",
    match: (p: string) => p === "/brand-matches",
  },
  {
    label: "Brand Detail",
    href: "/brands/sennheiser",
    desc: "Explore Sennheiser's deal range, contact bundle, and creator reviews.",
    match: (p: string) => p.startsWith("/brands/"),
  },
  {
    label: "Pitch",
    href: "/pitch",
    desc: "Build your outreach email — story-driven, no rates, no deck.",
    match: (p: string) => p === "/pitch" || p === "/pitch-deck" || p === "/outreach-email",
  },
  {
    label: "Pipeline",
    href: "/deals",
    desc: "Track your pitches and use Deal Tools to plan every next step.",
    match: (p: string) => p === "/deals",
  },
];

function activateDemo() {
  sessionStorage.setItem("demoMode", "1");
}

function deactivateDemo() {
  sessionStorage.removeItem("demoMode");
}

export function isDemoMode() {
  return typeof window !== "undefined" && sessionStorage.getItem("demoMode") === "1";
}

export default function DemoBar() {
  const [location, setLocation] = useLocation();
  const [active, setActive] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("demo") === "1") {
      activateDemo();
    }
    setActive(sessionStorage.getItem("demoMode") === "1");
  }, [location]);

  const pathname = location.split("?")[0];
  const currentIndex = STEPS.findIndex((s) => s.match(pathname));
  const currentStep = STEPS[currentIndex];
  const nextStep = STEPS[currentIndex + 1] ?? null;
  const prevStep = currentIndex > 0 ? STEPS[currentIndex - 1] : null;

  const handleExit = () => {
    deactivateDemo();
    setActive(false);
    window.location.assign("/");
  };

  const handleNext = () => {
    if (nextStep) window.location.assign(nextStep.href);
  };

  const handlePrev = () => {
    if (prevStep) window.location.assign(prevStep.href);
  };

  return (
    <AnimatePresence>
      {active && currentStep && (
        <motion.div
          key="demo-bar"
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 40 }}
          transition={{ duration: 0.35, ease: "easeOut" }}
          className="fixed bottom-5 left-1/2 -translate-x-1/2 z-50 w-full max-w-2xl px-4"
          data-testid="demo-bar"
        >
          <div className="bg-card/95 backdrop-blur-xl border border-primary/40 rounded-2xl shadow-2xl shadow-primary/20 overflow-hidden">
            {/* Step trail */}
            <div className="flex items-center gap-1 px-4 pt-3 pb-2 border-b border-border overflow-x-auto no-scrollbar">
              <div className="flex items-center gap-1 shrink-0 mr-2">
                <Sparkles size={11} className="text-primary" />
                <span className="text-xs font-bold text-primary uppercase tracking-wider whitespace-nowrap">Demo Tour</span>
              </div>
              {STEPS.map((step, i) => {
                const done = i < currentIndex;
                const current = i === currentIndex;
                return (
                  <div key={step.label} className="flex items-center gap-1 shrink-0">
                    {i > 0 && <ChevronRight size={10} className="text-border" />}
                    <button
                      onClick={() => window.location.assign(step.href)}
                      className={`px-2.5 py-0.5 rounded-full text-xs font-semibold transition-all whitespace-nowrap ${
                        current
                          ? "bg-primary text-white"
                          : done
                          ? "text-primary/70 hover:text-primary"
                          : "text-muted-foreground/50 cursor-default"
                      }`}
                    >
                      {i + 1}. {step.label}
                    </button>
                  </div>
                );
              })}
            </div>

            {/* Current step info + nav */}
            <div className="flex items-center gap-3 px-4 py-3">
              <div className="flex-1 min-w-0">
                <p className="text-xs text-muted-foreground leading-snug truncate">
                  <span className="text-white font-semibold">Step {currentIndex + 1} of {STEPS.length}:</span>{" "}
                  {currentStep.desc}
                </p>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                {prevStep && (
                  <button
                    data-testid="demo-prev"
                    onClick={handlePrev}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-border text-xs font-bold text-muted-foreground hover:text-white hover:border-primary/40 transition-all"
                  >
                    <ArrowLeft size={12} />
                    Back
                  </button>
                )}

                {nextStep ? (
                  <button
                    data-testid="demo-next"
                    onClick={handleNext}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-primary hover:bg-primary/90 text-white text-xs font-bold shadow-md shadow-primary/30 transition-all"
                  >
                    Next: {nextStep.label}
                    <ChevronRight size={12} />
                  </button>
                ) : (
                  <div className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-xs font-bold">
                    Tour Complete
                  </div>
                )}

                <button
                  data-testid="demo-exit"
                  onClick={handleExit}
                  title="Exit demo"
                  className="p-2 rounded-xl text-muted-foreground hover:text-white hover:bg-secondary transition-all"
                >
                  <X size={13} />
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
