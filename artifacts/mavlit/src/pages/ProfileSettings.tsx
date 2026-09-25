import { useState, useRef, useEffect, useCallback, useMemo } from "react";
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
  DollarSign,
  Check,
  ChevronsUpDown,
  X,
  Users,
} from "lucide-react";
import { SiTiktok, SiFacebook } from "react-icons/si";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandInput,
  CommandList,
  CommandItem,
  CommandEmpty,
} from "@/components/ui/command";

import { isProfileComplete, useAuth } from "@/contexts/AuthContext";
import { NICHE_OPTIONS, SUB_NICHE_OPTIONS, type PlatformKey } from "@/components/onboarding/types";

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
const NICHE_CHOICES = [
  ...NICHES.map(({ value, label }) => ({ value, label })),
  ...NICHE_OPTIONS.filter((name) => !NICHES.some((niche) => niche.label.toLowerCase() === name.toLowerCase()))
    .map((name) => ({ value: name, label: name })),
];
function normalizeNiche(value: string | null | undefined): string {
  if (!value) return "";
  return NICHES.find((niche) => niche.value.toLowerCase() === value.toLowerCase() || niche.label.toLowerCase() === value.toLowerCase())?.value ?? value;
}

const PLATFORMS = [
  { key: "instagram", label: "Instagram",  Icon: Instagram,   color: "#e1306c", placeholder: "instagram.com/yourhandle"  },
  { key: "tiktok",    label: "TikTok",     Icon: SiTiktok,    color: "#ffffff", placeholder: "tiktok.com/@yourhandle"    },
  { key: "youtube",   label: "YouTube",    Icon: Youtube,     color: "#ff0000", placeholder: "youtube.com/@yourchannel"  },
  { key: "facebook",  label: "Facebook",   Icon: SiFacebook,  color: "#1877f2", placeholder: "facebook.com/yourpage"     },
];

const AGE_BRACKETS = ["13–17", "18–24", "25–34", "35–44", "45–54", "55+"];

type SubNiche = { id: number; name: string };
type PlatformStat = { followers: string; engagement: string; watchTime: string; avgViews: string };
type RateEntry = { amount: string; includesExclusivity: boolean; includesPaidUsage: boolean };

type ProfileForm = {
  name: string;
  handle: string;
  age: string;
  gender: string;
  platforms: PlatformKey[];
  instagramUsername: string;
  followerCount: string;
  youtubeChannelName: string;
  youtubeSubscribers: string;
  youtubeNiche: string;
  contentDescription: string;
  instagramDescription: string;
  youtubeDescription: string;
  bio: string;
  niche: string;
  subNiches: number[];
  location: string;
  links: Record<string, string>;
  stats: Record<string, PlatformStat>;
  rates: Record<string, RateEntry>;
  audienceGenderMalePct: string;
  audienceGenderFemalePct: string;
  audienceAgeBrackets: string[];
};

const RATE_DELIVERABLES: { platform: string; Icon: React.ElementType; color: string; deliverables: string[] }[] = [
  { platform: "Instagram", Icon: Instagram,  color: "#e1306c", deliverables: ["Reel", "Story", "Static post"] },
  { platform: "TikTok",    Icon: SiTiktok,   color: "#ffffff", deliverables: ["TikTok video"] },
  { platform: "YouTube",   Icon: Youtube,    color: "#ff0000", deliverables: ["YouTube integration"] },
];

const EMPTY_RATE: RateEntry = { amount: "", includesExclusivity: false, includesPaidUsage: false };

const STAT_PLATFORMS = [
  { key: "instagram", label: "Instagram", Icon: Instagram,   color: "#e1306c", subscribersOnly: false },
  { key: "tiktok",    label: "TikTok",    Icon: SiTiktok,    color: "#ffffff",  subscribersOnly: false },
  { key: "youtube",   label: "YouTube",   Icon: Youtube,     color: "#ff0000",  subscribersOnly: false },
  { key: "facebook",  label: "Facebook",  Icon: SiFacebook,  color: "#1877f2",  subscribersOnly: false },
  { key: "substack",  label: "Substack",  Icon: Newspaper,   color: "#ff6719",  subscribersOnly: true  },
];

const DEMO_STAT: PlatformStat = { followers: "", engagement: "", watchTime: "", avgViews: "" };

const DEFAULT: ProfileForm = {
  name: "",
  handle: "",
  age: "",
  gender: "",
  platforms: [],
  instagramUsername: "",
  followerCount: "",
  youtubeChannelName: "",
  youtubeSubscribers: "",
  youtubeNiche: "",
  contentDescription: "",
  instagramDescription: "",
  youtubeDescription: "",
  bio: "",
  niche: "",
  subNiches: [],
  location: "",
  links: { instagram: "", tiktok: "", youtube: "", facebook: "" },
  stats: {
    instagram: { ...DEMO_STAT },
    tiktok:    { ...DEMO_STAT },
    youtube:   { ...DEMO_STAT },
    facebook:  { ...DEMO_STAT },
    substack:  { followers: "", engagement: "", watchTime: "", avgViews: "" },
  },
  rates: {},
  audienceGenderMalePct: "",
  audienceGenderFemalePct: "",
  audienceAgeBrackets: [],
};

function Field({ label, hint, required, children }: { label: string; hint?: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-baseline justify-between">
        <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{label}{required && <span className="text-primary"> *</span>}</label>
        {hint && <span className="text-xs text-muted-foreground/60">{hint}</span>}
      </div>
      {children}
    </div>
  );
}

const inputCls =
  "w-full px-4 py-2.5 rounded-xl bg-secondary border border-border text-white placeholder:text-muted-foreground/50 text-sm font-medium focus:outline-none focus:border-primary/60 focus:ring-1 focus:ring-primary/30 transition-all";

// ── Sub-niche combobox ───────────────────────────────────────────────────────
function SubNicheCombobox({
  selected,
  onChange,
  options,
  loading,
}: {
  selected: number[];
  onChange: (ids: number[]) => void;
  options: SubNiche[];
  loading: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const triggerRef = useRef<HTMLButtonElement>(null);
  const [width, setWidth] = useState(0);

  useEffect(() => {
    if (triggerRef.current) setWidth(triggerRef.current.offsetWidth);
  }, [open]);

  const toggle = (id: number) => {
    onChange(selected.includes(id) ? selected.filter((x) => x !== id) : [...selected, id]);
  };

  const remove = (id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    onChange(selected.filter((x) => x !== id));
  };

  const selectedNames = options.filter((o) => selected.includes(o.id));
  const visibleOptions = options
    .filter((option) => option.name.toLowerCase().includes(query.trim().toLowerCase()))
    .slice(0, 80);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          ref={triggerRef}
          type="button"
          className="w-full min-h-[42px] px-3 py-2 rounded-xl bg-secondary border border-border text-left text-sm font-medium focus:outline-none focus:border-primary/60 focus:ring-1 focus:ring-primary/30 transition-all flex items-start justify-between gap-2"
        >
          <div className="flex flex-wrap gap-1.5 flex-1">
            {selectedNames.length === 0 ? (
              <span className="text-muted-foreground/50 py-0.5">Search sub-niches…</span>
            ) : (
              selectedNames.map((sn) => (
                <span
                  key={sn.id}
                  className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg bg-primary/15 border border-primary/30 text-primary text-xs font-semibold"
                >
                  {sn.name}
                  <span
                    role="button"
                    tabIndex={0}
                    onClick={(e) => remove(sn.id, e as unknown as React.MouseEvent)}
                    onKeyDown={(e) => e.key === "Enter" && remove(sn.id, e as unknown as React.MouseEvent)}
                    className="text-primary/60 hover:text-primary cursor-pointer"
                  >
                    <X size={10} />
                  </span>
                </span>
              ))
            )}
          </div>
          <ChevronsUpDown size={14} className="text-muted-foreground shrink-0 mt-1" />
        </button>
      </PopoverTrigger>

      <PopoverContent
        style={{ width: width || undefined }}
        className="p-0 border border-border bg-card shadow-xl rounded-xl overflow-hidden"
        align="start"
        sideOffset={6}
      >
        <Command shouldFilter={false} className="bg-transparent">
          <CommandInput
            placeholder="Search sub-niches…"
            value={query}
            onValueChange={setQuery}
            className="h-10 text-sm border-b border-border bg-transparent text-white placeholder:text-muted-foreground/50"
          />
          <CommandList className="max-h-56 overflow-y-auto py-1">
            {loading && (
              <div className="px-3 py-4 text-xs text-muted-foreground text-center">Loading…</div>
            )}
            <CommandEmpty className="px-3 py-4 text-xs text-muted-foreground text-center">
              No sub-niches found
            </CommandEmpty>
            {visibleOptions.map((sn) => {
              const active = selected.includes(sn.id);
              return (
                <CommandItem
                  key={sn.id}
                  value={sn.name}
                  onSelect={() => toggle(sn.id)}
                  className="flex items-center gap-2.5 px-3 py-2 text-sm cursor-pointer text-white/80 hover:text-white hover:bg-secondary aria-selected:bg-secondary"
                >
                  <div className={`w-4 h-4 rounded-md border flex items-center justify-center shrink-0 transition-all ${active ? "bg-primary border-primary" : "border-border"}`}>
                    {active && <Check size={10} className="text-white" />}
                  </div>
                  {sn.name}
                </CommandItem>
              );
            })}
            {options.length > 80 && !query.trim() && (
              <div className="px-3 py-2 text-xs text-muted-foreground">Showing the first 80. Search for more.</div>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

// ── Main component ───────────────────────────────────────────────────────────
export default function ProfileSettings() {
  const { user, updateProfile } = useAuth();

  const [form, setForm] = useState<ProfileForm>(() => {
    try {
      const raw = user && localStorage.getItem(`mavlit_creator_profile_${user.id}`);
      if (raw) return { ...DEFAULT, ...JSON.parse(raw) } as ProfileForm;
    } catch { /* ignore */ }
    return DEFAULT;
  });
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Seed form from auth user when it loads (prefer API data over stale localStorage)
  const seededRef = useRef(false);
  useEffect(() => {
    if (!user || seededRef.current) return;
    seededRef.current = true;
    setForm(prev => ({
      ...prev,
      name:     user.full_name      ?? prev.name,
      handle:   user.creator_handle ?? user.instagram_handle ?? prev.handle,
      age:      user.age != null ? String(user.age) : prev.age,
      gender:   user.gender ?? prev.gender,
      platforms: user.primary_platform === "youtube"
        ? ["youtube"]
        : user.primary_platform === "instagram"
          ? (user.youtube_channel_name ? ["instagram", "youtube"] : ["instagram"])
          : prev.platforms,
      instagramUsername: user.instagram_handle ?? prev.instagramUsername,
      followerCount: user.instagram_followers != null ? String(user.instagram_followers) : user.follower_count != null ? String(user.follower_count) : prev.followerCount,
      youtubeChannelName: user.youtube_channel_name ?? prev.youtubeChannelName,
      youtubeSubscribers: user.youtube_subscribers != null ? String(user.youtube_subscribers) : prev.youtubeSubscribers,
      youtubeNiche: normalizeNiche(user.youtube_primary_niche) || prev.youtubeNiche,
      contentDescription: user.content_description ?? prev.contentDescription,
      instagramDescription: user.instagram_description ?? prev.instagramDescription,
      youtubeDescription: user.youtube_description ?? prev.youtubeDescription,
      location: [user.location_city, user.location_country].filter(Boolean).join(", ") || prev.location,
      bio:      user.bio_tagline     ?? prev.bio,
      niche:    normalizeNiche(user.content_niche ?? user.instagram_primary_niche) || prev.niche,
      audienceGenderMalePct:    user.audience_gender_male_pct    != null ? String(user.audience_gender_male_pct)   : prev.audienceGenderMalePct,
      audienceGenderFemalePct:  user.audience_gender_female_pct  != null ? String(user.audience_gender_female_pct) : prev.audienceGenderFemalePct,
    }));
  }, [user]);

  // Use the same choices as onboarding, while retaining previously saved custom choices.
  const subNicheOptions = useMemo<SubNiche[]>(
    () => Array.from(new Set([...SUB_NICHE_OPTIONS, ...(user?.sub_niches ?? [])]))
      .map((name, index) => ({ id: index + 1, name })),
    [user?.sub_niches],
  );

  useEffect(() => {
    if (!user?.sub_niches?.length || !subNicheOptions.length) return;
    setForm((current) => current.subNiches.length ? current : {
      ...current,
      subNiches: subNicheOptions.filter((option) => user.sub_niches?.includes(option.name)).map((option) => option.id),
    });
  }, [subNicheOptions, user?.id]);

  const set = (field: keyof Omit<ProfileForm, "links" | "subNiches" | "audienceAgeBrackets" | "platforms" | "stats" | "rates">, value: string) =>
    setForm((f) => ({ ...f, [field]: value }));

  const togglePlatform = (platform: PlatformKey) =>
    setForm((f) => ({
      ...f,
      platforms: f.platforms.includes(platform)
        ? f.platforms.filter((item) => item !== platform)
        : [...f.platforms, platform],
    }));

  const setLink = (key: string, value: string) =>
    setForm((f) => ({ ...f, links: { ...f.links, [key]: value } }));

  const setStat = (key: string, field: keyof PlatformStat, value: string) =>
    setForm((f) => ({ ...f, stats: { ...f.stats, [key]: { ...f.stats[key], [field]: value } } }));

  const setRate = (key: string, field: keyof RateEntry, value: string | boolean) =>
    setForm((f) => ({
      ...f,
      rates: { ...f.rates, [key]: { ...EMPTY_RATE, ...f.rates[key], [field]: value } },
    }));

  // Male % auto-balances female %
  const setMalePct = (value: string) => {
    const num = parseFloat(value);
    setForm((f) => ({
      ...f,
      audienceGenderMalePct: value,
      audienceGenderFemalePct: !isNaN(num) && num >= 0 && num <= 100 ? String(Math.round((100 - num) * 10) / 10) : f.audienceGenderFemalePct,
    }));
  };

  const setFemalePct = (value: string) => {
    const num = parseFloat(value);
    setForm((f) => ({
      ...f,
      audienceGenderFemalePct: value,
      audienceGenderMalePct: !isNaN(num) && num >= 0 && num <= 100 ? String(Math.round((100 - num) * 10) / 10) : f.audienceGenderMalePct,
    }));
  };

  const toggleAgeBracket = (bracket: string) =>
    setForm((f) => ({
      ...f,
      audienceAgeBrackets: f.audienceAgeBrackets.includes(bracket)
        ? f.audienceAgeBrackets.filter((b) => b !== bracket)
        : [...f.audienceAgeBrackets, bracket],
    }));

  const handleSave = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    setSaveError(null);
    const missing: string[] = [];
    if (!form.name.trim()) missing.push("full name");
    if (!Number.isInteger(Number(form.age)) || Number(form.age) < 13 || Number(form.age) > 120) missing.push("age (13–120)");
    if (!form.gender.trim()) missing.push("gender");
    if (!form.platforms.length) missing.push("primary platform");
    if (!form.instagramUsername.trim()) missing.push("Instagram username");
    if (form.followerCount === "" || !Number.isInteger(Number(form.followerCount)) || Number(form.followerCount) < 0) missing.push("follower count");
    if (!form.niche.trim()) missing.push("primary niche");
    if (!form.contentDescription.trim() && !form.instagramDescription.trim() && !form.youtubeDescription.trim()) missing.push("at least one description");
    if (form.platforms.includes("youtube") && !form.youtubeChannelName.trim()) missing.push("YouTube channel name");
    if (form.platforms.includes("youtube") && (form.youtubeSubscribers === "" || !Number.isInteger(Number(form.youtubeSubscribers)) || Number(form.youtubeSubscribers) < 0)) missing.push("YouTube subscribers");
    if (form.platforms.includes("youtube") && !form.youtubeNiche.trim()) missing.push("YouTube primary niche");
    if (missing.length) {
      setSaveError(`Complete the required fields: ${missing.join(", ")}.`);
      return;
    }

    // Map form → API fields
    const parts = form.location.split(",").map(s => s.trim());
    const subNicheNames = subNicheOptions
      .filter(sn => form.subNiches.includes(sn.id))
      .map(sn => sn.name);

    try {
      const updated = await updateProfile({
        full_name:                  form.name.trim(),
        creator_handle:             form.handle.trim() || form.instagramUsername.trim().replace(/^@/, ""),
        age:                        Number(form.age),
        gender:                     form.gender,
        primary_platform:           form.platforms[0],
        instagram_handle:           form.instagramUsername.trim().replace(/^@/, ""),
        instagram_followers:        Number(form.followerCount),
        follower_count:             form.platforms[0] === "youtube" ? Number(form.youtubeSubscribers) : Number(form.followerCount),
        instagram_primary_niche:    form.niche,
        content_description:        form.contentDescription.trim() || null,
        instagram_description:      form.instagramDescription.trim() || null,
        youtube_description:        form.youtubeDescription.trim() || null,
        youtube_channel_name:       form.platforms.includes("youtube") ? form.youtubeChannelName.trim() || null : user?.youtube_channel_name ?? null,
        youtube_subscribers:        form.platforms.includes("youtube") ? Number(form.youtubeSubscribers) : user?.youtube_subscribers ?? null,
        youtube_primary_niche:      form.platforms.includes("youtube") ? form.youtubeNiche : user?.youtube_primary_niche ?? null,
        location_city:              parts[0]           || null,
        location_country:           parts[1]           || null,
        bio_tagline:                form.bio.trim()    || null,
        content_niche:              form.niche,
        sub_niches:                 subNicheOptions.length ? (subNicheNames.length ? subNicheNames : null) : user?.sub_niches ?? null,
        audience_gender_male_pct:   form.audienceGenderMalePct   ? parseFloat(form.audienceGenderMalePct)   : null,
        audience_gender_female_pct: form.audienceGenderFemalePct ? parseFloat(form.audienceGenderFemalePct) : null,
        audience_age_bracket:       form.audienceAgeBrackets.length ? form.audienceAgeBrackets.join(", ") : null,
      });
      if (!isProfileComplete(updated)) {
        setSaveError("Your profile was saved, but it is still incomplete. Check the required fields.");
        return;
      }
      if (user) {
        try { localStorage.setItem(`mavlit_creator_profile_${user.id}`, JSON.stringify(form)); } catch { /* ignore */ }
      }
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Failed to save profile");
    }
  }, [form, subNicheOptions, updateProfile, user]);

  const selectedNiche = NICHES.find((n) => n.value.toLowerCase() === form.niche.toLowerCase() || n.label.toLowerCase() === form.niche.toLowerCase());

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
            <h1 className="text-3xl font-extrabold text-white tracking-tight mb-2">Your Profile</h1>
            <p className="text-muted-foreground text-base leading-relaxed">
              Keep the same required creator details you entered during onboarding up to date. This information also auto-fills your pitch decks and outreach emails.
            </p>
          </motion.div>

          <form onSubmit={handleSave} noValidate>
            <div className="flex flex-col gap-6">

              {/* ── Identity ─────────────────────────────────────────────── */}
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
                  <Field label="Full Name" hint="Used in pitch decks" required>
                    <input
                      data-testid="input-name"
                      type="text"
                      value={form.name}
                      onChange={(e) => set("name", e.target.value)}
                      placeholder="e.g. Jordan Mitchell"
                      className={inputCls}
                    />
                  </Field>
                  <Field label="Age" required>
                    <input type="number" min={13} max={120} value={form.age} onChange={(e) => set("age", e.target.value)} placeholder="25" className={inputCls} />
                  </Field>
                  <Field label="Gender" required>
                    <select value={form.gender} onChange={(e) => set("gender", e.target.value)} className={inputCls}>
                      <option value="">Select an option</option>
                      <option>Male</option><option>Female</option><option>Non-binary</option>
                      <option>Prefer not to say</option><option>Other</option>
                    </select>
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
                <div className="mt-5">
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Primary platforms <span className="text-primary">*</span></p>
                  <div className="grid grid-cols-2 gap-3">
                    {([
                      ["instagram", "Instagram", Instagram],
                      ["youtube", "YouTube", Youtube],
                    ] as const).map(([key, label, Icon]) => (
                      <button key={key} type="button" aria-pressed={form.platforms.includes(key)} onClick={() => togglePlatform(key)}
                        className={`flex items-center gap-3 rounded-xl border p-4 text-left text-sm font-semibold transition ${form.platforms.includes(key) ? "border-primary/70 bg-primary/10 text-white" : "border-border bg-secondary/40 text-muted-foreground hover:border-primary/30"}`}>
                        <Icon size={18} />{label}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="mt-4">
                  <Field label="Bio / Pitch Tagline" hint={`${form.bio.length}/200`}>
                    <textarea
                      data-testid="textarea-bio"
                      value={form.bio}
                      onChange={(e) => set("bio", e.target.value.slice(0, 200))}
                      rows={3}
                      placeholder="Describe what you create, who you create it for, and what makes your connection to your niche authentic."
                      className={`${inputCls} resize-none leading-relaxed`}
                    />
                  </Field>
                </div>
              </motion.div>

              {/* ── Content Niche ─────────────────────────────────────────── */}
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

                 <div className="mb-4">
                   <Field label="Primary niche" required>
                     <select value={form.niche} onChange={(e) => set("niche", e.target.value)} className={inputCls}>
                       <option value="">Select a niche</option>
                       {NICHE_CHOICES.map(({ value, label }) => <option key={value} value={value}>{label}</option>)}
                     </select>
                   </Field>
                 </div>
                 {/* Primary niche quick choices */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
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

                {/* Sub-niches */}
                <div className="h-px bg-border/50 mb-5" />
                <Field label="Sub-niches" hint="Optional — select all that apply">
                  <SubNicheCombobox
                    selected={form.subNiches}
                    onChange={(ids) => setForm((f) => ({ ...f, subNiches: ids }))}
                    options={subNicheOptions}
                      loading={false}
                  />
                </Field>
              </motion.div>

              {/* ── Required platform details ─────────────────────────────── */}
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.16 }}
                className="bg-card border border-border rounded-2xl p-6"
              >
                <div className="flex items-center gap-2 mb-2">
                  <Instagram size={14} className="text-primary" />
                  <h2 className="text-sm font-bold text-white">Instagram profile</h2>
                </div>
                <p className="mb-5 text-xs text-muted-foreground">These details are required even if YouTube is your primary platform.</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Field label="Instagram username" required>
                    <input type="text" value={form.instagramUsername} onChange={(e) => set("instagramUsername", e.target.value.replace(/^@/, ""))} placeholder="yourhandle" className={inputCls} />
                  </Field>
                  <Field label="Follower count" required>
                    <input type="number" min={0} value={form.followerCount} onChange={(e) => set("followerCount", e.target.value)} placeholder="45000" className={inputCls} />
                  </Field>
                </div>
                {form.platforms.includes("youtube") && (
                  <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Field label="YouTube channel name" required>
                      <input type="text" value={form.youtubeChannelName} onChange={(e) => set("youtubeChannelName", e.target.value)} placeholder="Your channel" className={inputCls} />
                    </Field>
                    <Field label="YouTube subscribers" required>
                      <input type="number" min={0} value={form.youtubeSubscribers} onChange={(e) => set("youtubeSubscribers", e.target.value)} placeholder="1000" className={inputCls} />
                    </Field>
                    <Field label="YouTube primary niche" required>
                      <select value={form.youtubeNiche} onChange={(e) => set("youtubeNiche", e.target.value)} className={inputCls}>
                        <option value="">Select a niche</option>
                        {NICHE_CHOICES.map(({ value, label }) => <option key={value} value={value}>{label}</option>)}
                      </select>
                    </Field>
                  </div>
                )}
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.17 }}
                className="bg-card border border-border rounded-2xl p-6"
              >
                <h2 className="text-sm font-bold text-white mb-2">Content descriptions</h2>
                <p className="text-xs text-muted-foreground mb-5">At least one description is required, just like during onboarding.</p>
                <div className="space-y-4">
                  <Field label="Overall content description">
                    <textarea rows={3} value={form.contentDescription} onChange={(e) => set("contentDescription", e.target.value)} placeholder="Describe the content you create." className={`${inputCls} resize-none`} />
                  </Field>
                  <Field label="Instagram description">
                    <textarea rows={3} value={form.instagramDescription} onChange={(e) => set("instagramDescription", e.target.value)} placeholder="Describe your Instagram content." className={`${inputCls} resize-none`} />
                  </Field>
                  {form.platforms.includes("youtube") && (
                    <Field label="YouTube description">
                      <textarea rows={3} value={form.youtubeDescription} onChange={(e) => set("youtubeDescription", e.target.value)} placeholder="Describe your YouTube content." className={`${inputCls} resize-none`} />
                    </Field>
                  )}
                </div>
              </motion.div>

              {/* ── Platform Links ────────────────────────────────────────── */}
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
                      <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: `${color}18` }}>
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

              {/* ── Platform Stats ────────────────────────────────────────── */}
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
                        <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0" style={{ background: `${color}18` }}>
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
                            <input type="text" value={form.stats[key]?.followers ?? ""} onChange={(e) => setStat(key, "followers", e.target.value)} placeholder="e.g. 45,000" className={inputCls} />
                          </Field>
                          <Field label="Engagement Rate (%)">
                            <input type="text" value={form.stats[key]?.engagement ?? ""} onChange={(e) => setStat(key, "engagement", e.target.value)} placeholder="e.g. 4.2" className={inputCls} />
                          </Field>
                          <Field label="Avg. Video Watch Time">
                            <input type="text" value={form.stats[key]?.watchTime ?? ""} onChange={(e) => setStat(key, "watchTime", e.target.value)} placeholder="e.g. 2:35 or 155s" className={inputCls} />
                          </Field>
                          <Field label="Avg. Views per Post">
                            <input type="text" value={form.stats[key]?.avgViews ?? ""} onChange={(e) => setStat(key, "avgViews", e.target.value)} placeholder="e.g. 8,200" className={inputCls} />
                          </Field>
                        </div>
                      )}
                      {idx < STAT_PLATFORMS.length - 1 && <div className="mt-5 h-px bg-border/50" />}
                    </div>
                  ))}
                </div>
              </motion.div>

              {/* ── Audience Demographics ─────────────────────────────────── */}
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.25 }}
                className="bg-card border border-border rounded-2xl p-6"
              >
                <div className="flex items-start justify-between gap-3 mb-1">
                  <div className="flex items-center gap-2">
                    <Users size={14} className="text-primary" />
                    <h2 className="text-sm font-bold text-white">Audience Demographics</h2>
                  </div>
                  <span className="px-2 py-0.5 rounded-md text-xs font-semibold border border-border text-muted-foreground">Optional</span>
                </div>
                <p className="text-xs text-muted-foreground mb-6 leading-relaxed">
                  Helps brands understand your audience fit. Use data from your platform analytics.
                </p>

                {/* Gender split */}
                <div className="mb-6">
                  <p className="text-xs font-bold uppercase tracking-wider text-white/70 mb-3">Gender Split</p>
                  <div className="grid grid-cols-2 gap-3">
                    <Field label="Male %" hint="Auto-balances">
                      <div className="relative">
                        <input
                          type="number"
                          inputMode="decimal"
                          min={0}
                          max={100}
                          step={0.1}
                          value={form.audienceGenderMalePct}
                          onChange={(e) => setMalePct(e.target.value)}
                          placeholder="e.g. 60"
                          className={inputCls}
                        />
                      </div>
                    </Field>
                    <Field label="Female %" hint="Auto-balances">
                      <input
                        type="number"
                        inputMode="decimal"
                        min={0}
                        max={100}
                        step={0.1}
                        value={form.audienceGenderFemalePct}
                        onChange={(e) => setFemalePct(e.target.value)}
                        placeholder="e.g. 40"
                        className={inputCls}
                      />
                    </Field>
                  </div>
                  {/* Visual bar */}
                  {(form.audienceGenderMalePct || form.audienceGenderFemalePct) && (() => {
                    const m = parseFloat(form.audienceGenderMalePct) || 0;
                    const f = parseFloat(form.audienceGenderFemalePct) || 0;
                    const total = m + f;
                    if (total === 0) return null;
                    const mPct = Math.round((m / total) * 100);
                    return (
                      <div className="mt-3 flex rounded-full overflow-hidden h-2">
                        <div className="bg-blue-500 transition-all" style={{ width: `${mPct}%` }} />
                        <div className="bg-pink-500 flex-1 transition-all" />
                      </div>
                    );
                  })()}
                </div>

                <div className="h-px bg-border/50 mb-6" />

                {/* Age brackets */}
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-white/70 mb-3">Age Brackets</p>
                  <p className="text-xs text-muted-foreground mb-3">Select all that represent a significant portion of your audience.</p>
                  <div className="flex flex-wrap gap-2">
                    {AGE_BRACKETS.map((bracket) => {
                      const active = form.audienceAgeBrackets.includes(bracket);
                      return (
                        <button
                          key={bracket}
                          type="button"
                          onClick={() => toggleAgeBracket(bracket)}
                          className={`flex items-center gap-1.5 px-4 py-2 rounded-xl border text-sm font-semibold transition-all ${
                            active
                              ? "bg-primary/15 border-primary/60 text-primary"
                              : "border-border text-muted-foreground hover:border-primary/30 hover:text-white"
                          }`}
                        >
                          {active && <Check size={12} />}
                          {bracket}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </motion.div>

              {/* ── Typical Rates ─────────────────────────────────────────── */}
              <motion.div
                id="typical-rates"
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.28 }}
                className="bg-card border border-border rounded-2xl p-6"
              >
                <div className="flex items-start justify-between gap-3 mb-1">
                  <div className="flex items-center gap-2">
                    <DollarSign size={14} className="text-primary" />
                    <h2 className="text-sm font-bold text-white">Typical Rates</h2>
                  </div>
                  <span className="px-2 py-0.5 rounded-md text-xs font-semibold border border-border text-muted-foreground">Optional</span>
                </div>
                <p className="text-xs text-muted-foreground mb-5 leading-relaxed">
                  Adding your typical rates personalizes your Rate Intelligence. Enter just the number — the toggles below each rate are optional.
                </p>
                <div className="flex flex-col gap-6">
                  {RATE_DELIVERABLES.map(({ platform, Icon, color, deliverables }, pIdx) => (
                    <div key={platform}>
                      <div className="flex items-center gap-2 mb-3">
                        <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0" style={{ background: `${color}18` }}>
                          <Icon size={14} style={{ color }} />
                        </div>
                        <p className="text-xs font-bold uppercase tracking-wider text-white/70">{platform}</p>
                      </div>
                      <div className="flex flex-col gap-4">
                        {deliverables.map((deliverable, dIdx) => {
                          const rateKey = `${platform}|${deliverable}`;
                          const entry: RateEntry = { ...EMPTY_RATE, ...form.rates?.[rateKey] };
                          return (
                            <div key={deliverable}>
                              <div className="flex items-start gap-3">
                                <p className="text-xs font-medium text-white/70 w-32 pt-2.5 shrink-0">{deliverable}</p>
                                <div className="flex-1 space-y-2">
                                  <div className="relative">
                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm font-medium">$</span>
                                    <input
                                      type="text"
                                      inputMode="numeric"
                                      value={entry.amount}
                                      onChange={(e) => setRate(rateKey, "amount", e.target.value)}
                                      placeholder="e.g. 1,200"
                                      className={`${inputCls} pl-7`}
                                    />
                                  </div>
                                  <div className="flex flex-wrap gap-1.5">
                                    <button
                                      type="button"
                                      onClick={() => setRate(rateKey, "includesExclusivity", !entry.includesExclusivity)}
                                      className={`text-xs px-2.5 py-1 rounded-lg border transition-all ${entry.includesExclusivity ? "bg-primary/15 border-primary/40 text-primary" : "border-border/50 text-muted-foreground/50 hover:border-border hover:text-muted-foreground"}`}
                                    >
                                      {entry.includesExclusivity ? "✓ " : ""}Includes exclusivity
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => setRate(rateKey, "includesPaidUsage", !entry.includesPaidUsage)}
                                      className={`text-xs px-2.5 py-1 rounded-lg border transition-all ${entry.includesPaidUsage ? "bg-primary/15 border-primary/40 text-primary" : "border-border/50 text-muted-foreground/50 hover:border-border hover:text-muted-foreground"}`}
                                    >
                                      {entry.includesPaidUsage ? "✓ " : ""}Includes paid usage rights
                                    </button>
                                  </div>
                                </div>
                              </div>
                              {dIdx < deliverables.length - 1 && <div className="mt-4 h-px bg-border/30" />}
                            </div>
                          );
                        })}
                      </div>
                      {pIdx < RATE_DELIVERABLES.length - 1 && <div className="mt-5 h-px bg-border/50" />}
                    </div>
                  ))}
                </div>
              </motion.div>

              {/* ── Save ──────────────────────────────────────────────────── */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35, delay: 0.3 }}
                className="flex flex-col gap-3"
              >
                {saveError && (
                  <div className="px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
                    {saveError}
                  </div>
                )}
                <div className="flex items-center justify-between gap-4">
                  <p className="text-xs text-muted-foreground">
                    Profile data is saved to your MAVLIT account and used to personalize your generated content.
                  </p>
                  <button
                    type="submit"
                    data-testid="button-save-profile"
                    className="flex items-center gap-2 px-6 py-3 rounded-xl bg-primary hover:bg-primary/90 text-white font-bold text-sm shadow-lg shadow-primary/30 transition-all hover:-translate-y-0.5 active:translate-y-0 shrink-0"
                  >
                    <Save size={15} />
                    Save Profile
                  </button>
                </div>
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
