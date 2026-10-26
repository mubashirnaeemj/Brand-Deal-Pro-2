import { createContext, useContext, useState, useEffect, useCallback } from "react";
import { useLocation } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import { api, ApiRequestError } from "@/lib/api";

export type DescriptionStatus = "idle" | "queued" | "running" | "completed" | "failed";
export type DescriptionPlatform = "instagram" | "youtube";
export const isDescriptionPending = (status: DescriptionStatus | null | undefined) =>
  status === "queued" || status === "running";

export interface DescriptionJob {
  platform?: DescriptionPlatform;
  status: DescriptionStatus;
  job_id: string | null;
  description?: string | null;
  error?: string | null;
}

export interface CreatorProfile {
  id: number;
  email: string;
  is_active: boolean;
  full_name: string | null;
  creator_handle: string | null;
  age: number | null;
  gender: string | null;
  location_city: string | null;
  location_country: string | null;
  bio_tagline: string | null;
  content_niche: string | null;
  sub_niches: string[] | null;
  content_description: string | null;
  brand_preferences?: string | null;
  pitch_style_preferences?: string | null;
  instagram_description: string | null;
  instagram_sub_niches: string[] | null;
  instagram_excluded_categories: string[] | null;
  instagram_description_mode: string | null;
  instagram_description_status?: DescriptionStatus | null;
  instagram_description_job_id?: string | null;
  instagram_description_error?: string | null;
  instagram_audience_gender?: "male" | "female" | "both" | "" | null;
  instagram_audience_description?: string | null;
  youtube_description: string | null;
  youtube_sub_niches: string[] | null;
  youtube_excluded_categories: string[] | null;
  youtube_description_mode: string | null;
  youtube_description_status?: DescriptionStatus | null;
  youtube_description_job_id?: string | null;
  youtube_description_error?: string | null;
  youtube_audience_gender?: "male" | "female" | "both" | "" | null;
  youtube_audience_description?: string | null;
  instagram_primary_niche: string | null;
  youtube_primary_niche: string | null;
  excluded_categories: string[] | null;
  instagram_handle: string | null;
  youtube_channel: string | null;
  facebook_page: string | null;
  substack_url: string | null;
  substack_subscribers: number | null;
  instagram_followers: number | null;
  instagram_highest_views?: number | null;
  youtube_channel_name: string | null;
  youtube_subscribers: number | null;
  instagram_following: number | null;
  youtube_followers: number | null;
  facebook_followers: number | null;
  facebook_following: number | null;
  primary_platform: string | null;
  follower_count: number | null;
  onboarding_completed?: boolean;
  audience_top_countries: Record<string, unknown>[] | null;
  creator_tier: string | null;
  content_tags: string[] | null;
  created_at: string;
  updated_at: string | null;
}

/** Until the API supplies onboarding_completed, derive it from persisted profile fields. */
export function isProfileComplete(profile: CreatorProfile): boolean {
  if (typeof profile.onboarding_completed === "boolean") return profile.onboarding_completed;
  return (
    !!profile.full_name?.trim() &&
    Number.isInteger(profile.age) && profile.age! >= 13 && profile.age! <= 120 &&
    !!profile.gender?.trim() &&
    !!profile.primary_platform?.trim() &&
    !!profile.instagram_handle?.trim() &&
    Number.isInteger(profile.follower_count) && profile.follower_count! >= 0 &&
    !!(profile.content_niche?.trim() || profile.instagram_primary_niche?.trim()) &&
    !!(profile.content_description?.trim() || profile.instagram_description?.trim() || profile.youtube_description?.trim())
  );
}

interface AuthContextValue {
  user: CreatorProfile | null;
  isLoading: boolean;
  authError: string | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  updateProfile: (patch: Partial<CreatorProfile>, options?: { commit?: boolean }) => Promise<CreatorProfile>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<CreatorProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);
  const [, navigate] = useLocation();
  const queryClient = useQueryClient();

  useEffect(() => {
    const unauthorized = () => {
      queryClient.clear();
      setUser(null);
      const matchesPage = /\/(?:brand-matches|matches)\/?$/.test(window.location.pathname);
      navigate(matchesPage ? "/signin?return_to=/matches" : "/signin");
    };
    const incomplete = () => {
      setUser((current) => current ? { ...current, onboarding_completed: false } : current);
      navigate("/creator-profile");
    };
    window.addEventListener("mavlit:unauthorized", unauthorized);
    window.addEventListener("mavlit:profile-incomplete", incomplete);
    return () => {
      window.removeEventListener("mavlit:unauthorized", unauthorized);
      window.removeEventListener("mavlit:profile-incomplete", incomplete);
    };
  }, [navigate, queryClient]);

  // Never trust a locally cached profile as proof of authentication or completion.
  useEffect(() => {
    let cancelled = false;
    api.get<CreatorProfile>("/creator-profile/me")
      .then((profile) => {
        if (cancelled) return;
        setUser(profile);
        setAuthError(null);
      })
      .catch((error) => {
        if (cancelled) return;
        setUser(null);
        if (!(error instanceof ApiRequestError && error.status === 401)) {
          setAuthError("Couldn't check your session. Please try again.");
        }
      })
      .finally(() => { if (!cancelled) setIsLoading(false); });

    return () => { cancelled = true; };
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    // A successful login response alone does not prove the browser kept its
    // httpOnly session cookie (especially when the app is inside a preview).
    await api.post<CreatorProfile>("/auth/login", { email, password });
    let profile: CreatorProfile;
    try {
      profile = await api.get<CreatorProfile>("/creator-profile/me");
    } catch (err) {
      if (err instanceof ApiRequestError && err.status === 401) {
        throw new Error("Sign-in succeeded, but your browser did not keep the session. Open MAVLIT in its own tab and try again.");
      }
      throw err;
    }
    queryClient.clear();
    setUser(profile);
    setAuthError(null);
    navigate(isProfileComplete(profile) ? "/brand-matches" : "/creator-profile");
  }, [navigate, queryClient]);

  const logout = useCallback(async () => {
    try { await api.post("/auth/logout", {}); } catch { /* ignore — clear locally regardless */ }
    queryClient.clear();
    setUser(null);
    navigate("/signin");
  }, [navigate, queryClient]);

  const updateProfile = useCallback(async (patch: Partial<CreatorProfile>, options?: { commit?: boolean }) => {
    // PUT replaces the whole profile, including fields outside the current editor.
    const current = await api.get<CreatorProfile>("/creator-profile/me");
    if (isDescriptionPending(current.instagram_description_status) || isDescriptionPending(current.youtube_description_status)) {
      throw new Error("Description generation is still in progress. Wait for it to finish before saving.");
    }
    await api.put<CreatorProfile>("/creator-profile/me", { ...current, ...patch });
    // PUT is a replacement write; display and validate the persisted profile,
    // not an acknowledgement or an echo of the submitted body.
    const updated = await api.get<CreatorProfile>("/creator-profile/me");
    // Generation prerequisites are not the creator's final submission.
    if (options?.commit === false) return updated;
    setUser(updated);
    queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    queryClient.invalidateQueries({ queryKey: ["pitch-matches"] });
    for (const version of ["v2", "v3"]) {
      await queryClient.cancelQueries({ queryKey: ["ai-brand-matches", version] });
      queryClient.setQueryData(["ai-brand-matches", version], (previous: Record<string, unknown> | undefined) => ({
        ranked_at: null, total: 0, matches: [], ...previous, status: "queued", error: null,
      }));
      queryClient.invalidateQueries({ queryKey: ["ai-brand-matches", version] });
    }
    return updated;
  }, [queryClient]);

  return (
    <AuthContext.Provider value={{ user, isLoading, authError, login, logout, updateProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
