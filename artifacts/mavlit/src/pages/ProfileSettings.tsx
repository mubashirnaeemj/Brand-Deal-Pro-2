import { useEffect, useState } from "react";
import { Save, User } from "lucide-react";
import Navbar from "@/components/Navbar";
import PlatformSelector from "@/components/onboarding/PlatformSelector";
import { INPUT_CLASS, parsePlatforms } from "@/components/onboarding/types";
import { isProfileComplete, type CreatorProfile, useAuth } from "@/contexts/AuthContext";
import { api } from "@/lib/api";
import { InstagramSection, YoutubeSection } from "./ProfilePlatformSection";
import { profilePatch, profileToForm, validateProfile, type ProfileForm } from "./profileForm";

export default function ProfileSettings() {
  const { updateProfile } = useAuth();
  const [profile, setProfile] = useState<CreatorProfile | null>(null);
  const [form, setForm] = useState<ProfileForm | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [generatingCount, setGeneratingCount] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
    api.get<CreatorProfile>("/creator-profile/me")
      .then((response) => {
        if (!active) return;
        setProfile(response);
        setForm(profileToForm(response));
      })
      .catch((cause) => {
        if (active) setError(cause instanceof Error ? cause.message : "Could not load your profile.");
      })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [retry]);

  const change = (next: ProfileForm) => {
    setForm(next);
    setSaved(false);
    setError(null);
  };

  const generated = (platform: "instagram" | "youtube", description: string) => {
    setForm((current) => current ? { ...current, [platform]: { ...current[platform], description } } : current);
    setSaved(false);
    setError(null);
  };

  const saveUsernameForGeneration = async (platform: "instagram" | "youtube", enteredUsername: string): Promise<string> => {
    if (!profile?.full_name?.trim()) throw new Error("Save your full name before generating a description.");
    const creatorHandle = platform === "instagram"
      ? enteredUsername
      : profile.creator_handle?.trim() || profile.instagram_handle?.trim().replace(/^@/, "");
    if (!creatorHandle) throw new Error("Save your Instagram username before generating a YouTube description.");

    // Use persisted values, not the other unsaved fields in the editor, when saving a name before generation.
    const updated = await updateProfile({
      full_name: profile.full_name,
      creator_handle: creatorHandle,
      age: profile.age,
      gender: profile.gender,
      primary_platform: profile.primary_platform,
      follower_count: profile.follower_count,
      content_niche: profile.content_niche,
      content_description: profile.content_description,
      excluded_categories: profile.excluded_categories,
      instagram_handle: platform === "instagram" ? enteredUsername : profile.instagram_handle,
      instagram_followers: profile.instagram_followers,
      instagram_primary_niche: profile.instagram_primary_niche,
      instagram_sub_niches: profile.instagram_sub_niches,
      instagram_excluded_categories: profile.instagram_excluded_categories,
      instagram_description: profile.instagram_description,
      instagram_description_mode: profile.instagram_description_mode,
      instagram_audience_gender_male_pct: profile.instagram_audience_gender_male_pct,
      instagram_audience_gender_female_pct: profile.instagram_audience_gender_female_pct,
      youtube_channel_name: platform === "youtube" ? enteredUsername : profile.youtube_channel_name,
      youtube_subscribers: profile.youtube_subscribers,
      youtube_primary_niche: profile.youtube_primary_niche,
      youtube_sub_niches: profile.youtube_sub_niches,
      youtube_excluded_categories: profile.youtube_excluded_categories,
      youtube_description: profile.youtube_description,
      youtube_description_mode: profile.youtube_description_mode,
      youtube_audience_gender_male_pct: profile.youtube_audience_gender_male_pct,
      youtube_audience_gender_female_pct: profile.youtube_audience_gender_female_pct,
    });
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

  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!form || !profile || saving || generatingCount > 0) return;
    setError(null);
    const validationError = validateProfile(form, profile);
    if (validationError) {
      setError(validationError);
      return;
    }
    setSaving(true);
    try {
      const updated = await updateProfile(profilePatch(form, profile));
      if (form.primaryPlatforms.some((platform) => !parsePlatforms(updated.primary_platform).includes(platform))) {
        setProfile(updated);
        setForm(profileToForm(updated));
        setError("The profile API did not keep all selected platforms. Please try again.");
        return;
      }
      if (!isProfileComplete(updated)) {
        setError("Your profile was saved, but it is still incomplete. Check the required creator details.");
        return;
      }
      setProfile(updated);
      setForm(profileToForm(updated));
      setSaved(true);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not save your profile.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Navbar />
      <main className="mx-auto max-w-3xl px-4 pb-20 pt-28">
        <div className="mb-8">
          <p className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-primary">
            <User size={15} /> Creator Profile
          </p>
          <h1 className="text-3xl font-extrabold text-white">Your Profile</h1>
        </div>

        {loading ? (
          <p className="rounded-2xl border border-border bg-card p-6 text-sm text-muted-foreground" role="status">Loading your profile…</p>
        ) : !form || !profile ? (
          <div className="rounded-2xl border border-border bg-card p-6">
            <p role="alert" className="text-sm text-red-400">{error ?? "Could not load your profile."}</p>
            <button type="button" onClick={() => setRetry((value) => value + 1)}
              className="mt-4 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white">Retry</button>
          </div>
        ) : (
          <form onSubmit={save} noValidate className="space-y-5">
            <section className="rounded-2xl border border-border bg-card p-5 sm:p-6">
              <h2 className="mb-5 text-lg font-bold text-white">Creator information</h2>
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Full name <span className="text-primary">*</span>
                  <input value={form.fullName} onChange={(event) => change({ ...form, fullName: event.target.value })}
                    autoComplete="name" className={`${INPUT_CLASS} mt-1.5`} />
                </label>
                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Age
                  <input type="number" min="13" max="120" step="1" value={form.age}
                    onChange={(event) => change({ ...form, age: event.target.value })}
                    className={`${INPUT_CLASS} mt-1.5`} />
                </label>
                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground sm:col-span-2">
                  Gender
                  <select value={form.gender} onChange={(event) => change({ ...form, gender: event.target.value })}
                    className={`${INPUT_CLASS} mt-1.5`}>
                    <option value="">Select an option</option>
                    {!["Male", "Female", "Non-binary", "Prefer not to say", "Other"].includes(form.gender) && form.gender &&
                      <option value={form.gender}>{form.gender}</option>}
                    <option>Male</option><option>Female</option><option>Non-binary</option>
                    <option>Prefer not to say</option><option>Other</option>
                  </select>
                </label>
              </div>
              <div className="mt-5">
                <PlatformSelector value={form.primaryPlatforms}
                  onChange={(primaryPlatforms) => change({ ...form, primaryPlatforms })} />
              </div>
            </section>

            <InstagramSection value={form.instagram} onChange={(instagram) => change({ ...form, instagram })}
              onGenerated={(description) => generated("instagram", description)}
              onSaveUsername={(username) => saveUsernameForGeneration("instagram", username)}
              generationBusy={generatingCount > 0}
              onGeneratingChange={(active) => setGeneratingCount((count) => count + (active ? 1 : -1))} />
            <YoutubeSection value={form.youtube} onChange={(youtube) => change({ ...form, youtube })}
              onGenerated={(description) => generated("youtube", description)}
              onSaveUsername={(username) => saveUsernameForGeneration("youtube", username)}
              generationBusy={generatingCount > 0}
              onGeneratingChange={(active) => setGeneratingCount((count) => count + (active ? 1 : -1))} />

            {error && <p role="alert" className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">{error}</p>}
            {saved && <p role="status" className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300">Profile saved.</p>}
            <div className="flex justify-end">
              <button type="submit" disabled={saving || generatingCount > 0}
                className="inline-flex items-center gap-2 rounded-xl bg-primary px-6 py-3 text-sm font-bold text-white transition hover:brightness-110 disabled:opacity-50">
                <Save size={16} /> {saving ? "Saving…" : generatingCount > 0 ? "Generating…" : "Save Profile"}
              </button>
            </div>
          </form>
        )}
      </main>
    </div>
  );
}