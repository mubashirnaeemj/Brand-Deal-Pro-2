import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  User,
  Instagram,
  Youtube,
  Link2,
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
  BarChart3,
} from "lucide-react";
import { SiTiktok, SiFacebook } from "react-icons/si";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

const NICHES = [
  { value: "music",         label: "Music",                   Icon: Music      },
  { value: "podcast",       label: "Podcast / Audio",         Icon: Mic2       },
  { value: "photography",   label: "Photography",             Icon: Camera     },
  { value: "gaming",        label: "Gaming",                  Icon: Gamepad2   },
  { value: "education",     label: "Education",               Icon: BookOpen   },
  { value: "fitness",       label: "Fitness",                 Icon: Dumbbell   },
  { value: "food",          label: "Food & Cooking",          Icon: ChefHat    },
  { value: "finance",       label: "Finance",                 Icon: TrendingUp },
  { value: "newsletter",    label: "Substack / Newsletter",   Icon: Newspaper  },
];

const PLATFORMS = [
  { key: "instagram", label: "Instagram",  Icon: Instagram,   color: "#e1306c", placeholder: "instagram.com/yourhandle"  },
  { key: "tiktok",    label: "TikTok",     Icon: SiTiktok,    color: "#ffffff", placeholder: "tiktok.com/@yourhandle"    },
  { key: "youtube",   label: "YouTube",    Icon: Youtube,     color: "#ff0000", placeholder: "youtube.com/@yourchannel"  },
  { key: "facebook",  label: "Facebook",   Icon: SiFacebook,  color: "#1877f2", placeholder: "facebook.com/yourpage"     },
];

type PlatformStat = { followers: string; engagement: string; watchTime: string; avgViews: string };

type ProfileForm = {
  name: string;
  handle: string;
  bio: string;
  niche: string;
  location: string;
  links: Record<string, string>;
  stats: Record<string, PlatformStat>;
};

const STAT_PLATFORMS = [
  { key: "instagram", label: "Instagram", Icon: Instagram,   color: "#e1306c", subscribersOnly: false },
  { key: "tiktok",    label: "TikTok",    Icon: SiTiktok,    color: "#ffffff",  subscribersOnly: false },
  { key: "youtube",   label: "YouTube",   Icon: Youtube,     color: "#ff0000",  subscribersOnly: false },
  { key: "facebook",  label: "Facebook",  Icon: SiFacebook,  color: "#1877f2",  subscribersOnly: false },
  { key: "substack",  label: "Substack",  Icon: Newspaper,   color: "#ff6719",  subscribersOnly: true  },
];

const DEMO_STAT: PlatformStat = { followers: "45,000", engagement: "4.2", watchTime: "2:35", avgViews: "8,200" };

const DEFAULT: ProfileForm = {
  name: "",
  handle: "",
  bio: "",
  niche: "music",
  location: "",
  links: { instagram: "", tiktok: "", youtube: "", facebook: "" },
  stats: {
    instagram: { ...DEMO_STAT },
    tiktok:    { ...DEMO_STAT },
    youtube:   { ...DEMO_STAT },
    facebook:  { ...DEMO_STAT },
    substack:  { followers: "12,000", engagement: "", watchTime: "", avgViews: "" },
  },
};

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-baseline justify-between">
        <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          {label}
        </label>
        {hint && <span className="text-xs text-muted-foreground/60">{hint}</span>}
      </div>
      {children}
    </div>
  );
}

const inputCls =
  "w-full px-4 py-2.5 rounded-xl bg-secondary border border-border text-white placeholder:text-muted-foreground/50 text-sm font-medium focus:outline-none focus:border-primary/60 focus:ring-1 focus:ring-primary/30 transition-all";

export default function ProfileSettings() {
  const [form, setForm] = useState<ProfileForm>(DEFAULT);
  const [saved, setSaved] = useState(false);

  const set = (field: keyof Omit<ProfileForm, "links">, value: string) =>
    setForm((f) => ({ ...f, [field]: value }));

  const setLink = (key: string, value: string) =>
    setForm((f) => ({ ...f, links: { ...f.links, [key]: value } }));

  const setStat = (key: string, field: keyof PlatformStat, value: string) =>
    setForm((f) => ({ ...f, stats: { ...f.stats, [key]: { ...f.stats[key], [field]: value } } }));

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  const selectedNiche = NICHES.find((n) => n.value === form.niche);

  return (
    <div className="min-h-screen bg-background text-foreground overflow-x-hidden">
      <Navbar />

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
              <span className="text-xs font-semibold text-primary uppercase tracking-wider">Creator Profile</span>
            </div>
            <h1 className="text-3xl font-extrabold text-white tracking-tight mb-2">
              Your Profile
            </h1>
            <p className="text-muted-foreground text-base leading-relaxed">
              This information auto-fills your pitch decks and outreach emails. The more complete your profile, the more personalized your generated content.
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
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Field label="Full Name" hint="Used in pitch decks">
                    <input
                      data-testid="input-name"
                      type="text"
                      value={form.name}
                      onChange={(e) => set("name", e.target.value)}
                      placeholder="e.g. Jordan Mitchell"
                      className={inputCls}
                    />
                  </Field>
                  <Field label="Creator Handle" hint="Primary username">
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">@</span>
                      <input
                        data-testid="input-handle"
                        type="text"
                        value={form.handle}
                        onChange={(e) => set("handle", e.target.value)}
                        placeholder="yourhandle"
                        className={`${inputCls} pl-8`}
                      />
                    </div>
                  </Field>
                  <Field label="Location" hint="City, Country">
                    <input
                      data-testid="input-location"
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
                      data-testid="textarea-bio"
                      value={form.bio}
                      onChange={(e) => set("bio", e.target.value.slice(0, 200))}
                      rows={3}
                      placeholder="Describe what you create, who you create it for, and what makes your connection to your niche authentic. A brand reads this — make it specific, not generic."
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
                className="bg-card border border-border rounded-2xl p-6"
              >
                <div className="flex items-center gap-2 mb-5">
                  {selectedNiche && <selectedNiche.Icon size={14} className="text-primary" />}
                  <h2 className="text-sm font-bold text-white">Content Niche</h2>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {NICHES.map(({ value, label, Icon }) => {
                    const active = form.niche === value;
                    return (
                      <button
                        key={value}
                        type="button"
                        data-testid={`niche-${value}`}
                        onClick={() => set("niche", value)}
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
              </motion.div>

              {/* Platform links */}
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.18 }}
                className="bg-card border border-border rounded-2xl p-6"
              >
                <div className="flex items-center gap-2 mb-5">
                  <Link2 size={14} className="text-primary" />
                  <h2 className="text-sm font-bold text-white">Platform Links</h2>
                </div>
                <div className="flex flex-col gap-4">
                  {PLATFORMS.map(({ key, label, Icon, color, placeholder }) => (
                    <div key={key} className="flex items-center gap-3">
                      <div
                        className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                        style={{ background: `${color}18` }}
                      >
                        <Icon size={16} style={{ color }} />
                      </div>
                      <div className="flex-1">
                        <Field label={label}>
                          <input
                            data-testid={`input-link-${key}`}
                            type="url"
                            value={form.links[key]}
                            onChange={(e) => setLink(key, e.target.value)}
                            placeholder={placeholder}
                            className={inputCls}
                          />
                        </Field>
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>

              {/* Platform Stats */}
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.22 }}
                className="bg-card border border-border rounded-2xl p-6"
              >
                <div className="flex items-center gap-2 mb-5">
                  <BarChart3 size={14} className="text-primary" />
                  <h2 className="text-sm font-bold text-white">Platform Stats</h2>
                </div>
                <div className="flex flex-col gap-6">
                  {STAT_PLATFORMS.map(({ key, label, Icon, color, subscribersOnly }, idx) => (
                    <div key={key}>
                      <div className="flex items-center gap-2 mb-3">
                        <div
                          className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
                          style={{ background: `${color}18` }}
                        >
                          <Icon size={14} style={{ color }} />
                        </div>
                        <p className="text-xs font-bold uppercase tracking-wider text-white/70">{label}</p>
                      </div>
                      {subscribersOnly ? (
                        <div className="max-w-[calc(50%-6px)]">
                          <Field label="Subscribers">
                            <input
                              type="text"
                              value={form.stats[key]?.followers ?? ""}
                              onChange={(e) => setStat(key, "followers", e.target.value)}
                              placeholder="e.g. 12,000"
                              className={inputCls}
                            />
                          </Field>
                        </div>
                      ) : (
                        <div className="grid grid-cols-2 gap-3">
                          <Field label="Followers / Subscribers">
                            <input
                              type="text"
                              value={form.stats[key]?.followers ?? ""}
                              onChange={(e) => setStat(key, "followers", e.target.value)}
                              placeholder="e.g. 45,000"
                              className={inputCls}
                            />
                          </Field>
                          <Field label="Engagement Rate (%)">
                            <input
                              type="text"
                              value={form.stats[key]?.engagement ?? ""}
                              onChange={(e) => setStat(key, "engagement", e.target.value)}
                              placeholder="e.g. 4.2"
                              className={inputCls}
                            />
                          </Field>
                          <Field label="Avg. Video Watch Time">
                            <input
                              type="text"
                              value={form.stats[key]?.watchTime ?? ""}
                              onChange={(e) => setStat(key, "watchTime", e.target.value)}
                              placeholder="e.g. 2:35 or 155s"
                              className={inputCls}
                            />
                          </Field>
                          <Field label="Avg. Views per Post">
                            <input
                              type="text"
                              value={form.stats[key]?.avgViews ?? ""}
                              onChange={(e) => setStat(key, "avgViews", e.target.value)}
                              placeholder="e.g. 8,200"
                              className={inputCls}
                            />
                          </Field>
                        </div>
                      )}
                      {idx < STAT_PLATFORMS.length - 1 && <div className="mt-5 h-px bg-border/50" />}
                    </div>
                  ))}
                </div>
              </motion.div>

              {/* Save */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35, delay: 0.28 }}
                className="flex items-center justify-between gap-4"
              >
                <p className="text-xs text-muted-foreground">
                  Profile data is used locally to personalize your generated content.
                </p>
                <button
                  type="submit"
                  data-testid="button-save-profile"
                  className="flex items-center gap-2 px-6 py-3 rounded-xl bg-primary hover:bg-primary/90 text-white font-bold text-sm shadow-lg shadow-primary/30 transition-all hover:-translate-y-0.5 active:translate-y-0 shrink-0"
                >
                  <Save size={15} />
                  Save Profile
                </button>
              </motion.div>
            </div>
          </form>
        </div>
      </main>

      {/* Save toast */}
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
            Profile saved — pitch decks will now auto-fill your details
          </motion.div>
        )}
      </AnimatePresence>

      <Footer />
    </div>
  );
}
