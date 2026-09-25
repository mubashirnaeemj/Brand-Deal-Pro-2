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

  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!form || !profile || saving) return;
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

            <InstagramSection value={form.instagram} onChange={(instagram) => change({ ...form, instagram })} />
            <YoutubeSection value={form.youtube} onChange={(youtube) => change({ ...form, youtube })} />

            {error && <p role="alert" className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">{error}</p>}
            {saved && <p role="status" className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300">Profile saved.</p>}
            <div className="flex justify-end">
              <button type="submit" disabled={saving}
                className="inline-flex items-center gap-2 rounded-xl bg-primary px-6 py-3 text-sm font-bold text-white transition hover:brightness-110 disabled:opacity-50">
                <Save size={16} /> {saving ? "Saving…" : "Save Profile"}
              </button>
            </div>
          </form>
        )}
      </main>
    </div>
  );
}