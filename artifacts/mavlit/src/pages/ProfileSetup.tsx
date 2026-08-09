import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  User,
  Save,
  CheckCircle2,
  Music,
  Mic2,
  Camera,
  Gamepad2,
  BookOpen,
  Dumbbell,
  ChefHat,
  TrendingUp,
  Newspaper,
  Loader2,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useLocation } from "wouter";

const NICHES = [
  { value: "music",       label: "Music",                 Icon: Music      },
  { value: "podcast",     label: "Podcast / Audio",       Icon: Mic2       },
  { value: "photography", label: "Photography",           Icon: Camera     },
  { value: "gaming",      label: "Gaming",                Icon: Gamepad2   },
  { value: "education",   label: "Education",             Icon: BookOpen   },
  { value: "fitness",     label: "Fitness",               Icon: Dumbbell   },
  { value: "food",        label: "Food & Cooking",        Icon: ChefHat    },
  { value: "finance",     label: "Finance",               Icon: TrendingUp },
  { value: "newsletter",  label: "Substack / Newsletter", Icon: Newspaper  },
];

type SetupForm = {
  name: string;
  handle: string;
  location: string;
  bio: string;
  niche: string;
};

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-baseline justify-between">
        <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{label}</label>
        {hint && <span className="text-xs text-muted-foreground/60">{hint}</span>}
      </div>
      {children}
    </div>
  );
}

const inputCls =
  "w-full px-4 py-2.5 rounded-xl bg-secondary border border-border text-white placeholder:text-muted-foreground/50 text-sm font-medium focus:outline-none focus:border-primary/60 focus:ring-1 focus:ring-primary/30 transition-all";

const errorCls = "border-red-500/60 focus:border-red-500/60 focus:ring-red-500/20";

export default function ProfileSetup() {
  const { user, updateProfile, logout } = useAuth();
  const [, navigate] = useLocation();

  const [form, setForm] = useState<SetupForm>({
    name: user?.full_name ?? "",
    handle: user?.creator_handle ?? "",
    location: [user?.location_city, user?.location_country].filter(Boolean).join(", "),
    bio: user?.bio_tagline ?? "",
    niche: user?.content_niche ?? "",
  });

  const [errors, setErrors] = useState<{ name?: string; handle?: string; niche?: string }>({});
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const set = (field: keyof SetupForm, value: string) => {
    setForm((f) => ({ ...f, [field]: value }));
    if (errors[field as keyof typeof errors]) {
      setErrors((e) => ({ ...e, [field]: undefined }));
    }
  };

  const validate = () => {
    const next: typeof errors = {};
    if (!form.name.trim()) next.name = "Full name is required";
    if (!form.handle.trim()) next.handle = "Creator handle is required";
    if (!form.niche) next.niche = "Please select a content niche";
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setSaving(true);

    // Parse location into city/country
    const parts = form.location.split(",").map((s) => s.trim());
    const city = parts[0] ?? null;
    const country = parts[1] ?? null;

    updateProfile({
      full_name: form.name.trim() || null,
      creator_handle: form.handle.trim() || null,
      location_city: city || null,
      location_country: country || null,
      bio_tagline: form.bio.trim() || null,
      content_niche: form.niche || null,
    });

    setSaved(true);
    setSaving(false);

    setTimeout(() => {
      navigate("/dashboard");
    }, 900);
  };

  const selectedNiche = NICHES.find((n) => n.value === form.niche);

  return (
    <div className="min-h-screen bg-background text-foreground overflow-x-hidden">
      {/* Minimal header — logo only, no nav links */}
      <div className="fixed top-0 left-0 right-0 z-50 border-b border-white/5 bg-background/80 backdrop-blur-xl supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded bg-primary flex items-center justify-center">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5 text-primary-foreground">
                <path d="M4 14l8-10 8 10M4 20h16" />
              </svg>
            </div>
            <span className="font-bold text-xl tracking-tight text-white">MAVLIT</span>
          </div>
          <button
            onClick={logout}
            className="text-xs text-muted-foreground hover:text-white transition-colors"
          >
            Sign out
          </button>
        </div>
      </div>

      <main className="pt-28 pb-24 px-4">
        <div className="max-w-3xl mx-auto">

          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="mb-8"
          >
            <div className="flex items-center gap-2 mb-3">
              <User size={14} className="text-primary" />
              <span className="text-xs font-semibold text-primary uppercase tracking-wider">Getting Started</span>
            </div>
            <h1 className="text-3xl font-extrabold text-white tracking-tight mb-2">
              Set up your creator profile
            </h1>
            <p className="text-muted-foreground text-base leading-relaxed">
              Tell us who you are and what you create. This powers your brand matches, pitch decks, and outreach — the more specific, the better.
            </p>
          </motion.div>

          <form onSubmit={handleSave} noValidate>
            <div className="flex flex-col gap-6">

              {/* Identity */}
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.06 }}
                className="bg-card border border-border rounded-2xl p-6"
              >
                <div className="flex items-center gap-2 mb-5">
                  <User size={14} className="text-primary" />
                  <h2 className="text-sm font-bold text-white">Identity</h2>
                  <span className="ml-auto text-xs text-muted-foreground/60">Name &amp; handle required</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Field label="Full Name" hint="Used in pitch decks">
                    <input
                      type="text"
                      value={form.name}
                      onChange={(e) => set("name", e.target.value)}
                      placeholder="e.g. Jordan Mitchell"
                      className={`${inputCls} ${errors.name ? errorCls : ""}`}
                    />
                    {errors.name && <p className="text-xs text-red-400 mt-0.5">{errors.name}</p>}
                  </Field>
                  <Field label="Creator Handle" hint="Primary username">
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">@</span>
                      <input
                        type="text"
                        value={form.handle}
                        onChange={(e) => set("handle", e.target.value)}
                        placeholder="yourhandle"
                        className={`${inputCls} pl-8 ${errors.handle ? errorCls : ""}`}
                      />
                    </div>
                    {errors.handle && <p className="text-xs text-red-400 mt-0.5">{errors.handle}</p>}
                  </Field>
                  <Field label="Location" hint="City, Country">
                    <input
                      type="text"
                      value={form.location}
                      onChange={(e) => set("location", e.target.value)}
                      placeholder="e.g. Los Angeles, USA"
                      className={inputCls}
                    />
                  </Field>
                </div>
                <div className="mt-4">
                  <Field label="Bio / Pitch Tagline" hint={`${form.bio.length}/200`}>
                    <textarea
                      value={form.bio}
                      onChange={(e) => set("bio", e.target.value.slice(0, 200))}
                      rows={3}
                      placeholder="Describe what you create, who you create it for, and what makes your connection to your niche authentic."
                      className={`${inputCls} resize-none leading-relaxed`}
                    />
                  </Field>
                </div>
              </motion.div>

              {/* Niche */}
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.12 }}
                className={`bg-card border rounded-2xl p-6 ${errors.niche ? "border-red-500/40" : "border-border"}`}
              >
                <div className="flex items-center gap-2 mb-5">
                  {selectedNiche ? (
                    <selectedNiche.Icon size={14} className="text-primary" />
                  ) : (
                    <Music size={14} className="text-muted-foreground" />
                  )}
                  <h2 className="text-sm font-bold text-white">Content Niche</h2>
                  <span className="ml-auto text-xs text-muted-foreground/60">Required</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {NICHES.map(({ value, label, Icon }) => {
                    const active = form.niche === value;
                    return (
                      <button
                        key={value}
                        type="button"
                        onClick={() => { set("niche", value); setErrors((e) => ({ ...e, niche: undefined })); }}
                        className={`flex flex-col items-start gap-2 p-3.5 rounded-xl border text-left transition-all ${
                          active
                            ? "bg-primary/15 border-primary/60 text-primary"
                            : "border-border text-muted-foreground hover:border-primary/30 hover:text-white"
                        }`}
                      >
                        <Icon size={16} />
                        <span className="text-xs font-semibold leading-tight">{label}</span>
                      </button>
                    );
                  })}
                </div>
                {errors.niche && <p className="text-xs text-red-400 mt-3">{errors.niche}</p>}
              </motion.div>

              {/* Save */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35, delay: 0.18 }}
                className="flex items-center justify-end"
              >
                <button
                  type="submit"
                  disabled={saving || saved}
                  className="flex items-center gap-2 px-7 py-3 rounded-xl bg-primary hover:bg-primary/90 disabled:opacity-70 disabled:cursor-not-allowed text-white font-bold text-sm shadow-lg shadow-primary/30 transition-all hover:-translate-y-0.5 active:translate-y-0"
                >
                  {saving ? (
                    <><Loader2 size={15} className="animate-spin" />Saving…</>
                  ) : saved ? (
                    <><CheckCircle2 size={15} className="text-green-300" />Saved! Redirecting…</>
                  ) : (
                    <><Save size={15} />Complete Setup</>
                  )}
                </button>
              </motion.div>

            </div>
          </form>
        </div>
      </main>

      {/* Toast */}
      <AnimatePresence>
        {saved && (
          <motion.div
            key="toast"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-secondary border border-border rounded-xl px-5 py-3 text-sm font-semibold text-white shadow-2xl z-50 flex items-center gap-2 whitespace-nowrap"
          >
            <CheckCircle2 size={15} className="text-green-400" />
            Profile saved — taking you to your dashboard
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
