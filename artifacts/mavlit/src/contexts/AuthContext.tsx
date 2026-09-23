import { createContext, useContext, useState, useEffect, useCallback } from "react";
import { useLocation } from "wouter";
import { api } from "@/lib/api";

export interface CreatorProfile {
  id: number;
  email: string;
  is_active: boolean;
  full_name: string | null;
  creator_handle: string | null;
  location_city: string | null;
  location_country: string | null;
  bio_tagline: string | null;
  content_niche: string | null;
  sub_niches: string[] | null;
  content_description: string | null;
  excluded_categories: string[] | null;
  instagram_handle: string | null;
  youtube_channel: string | null;
  facebook_page: string | null;
  substack_url: string | null;
  substack_subscribers: number | null;
  instagram_followers: number | null;
  instagram_following: number | null;
  youtube_followers: number | null;
  facebook_followers: number | null;
  facebook_following: number | null;
  primary_platform: string | null;
  follower_count: number | null;
  audience_gender_male_pct: number | null;
  audience_gender_female_pct: number | null;
  audience_age_bracket: string | null;
  audience_age_min: number | null;
  audience_age_max: number | null;
  audience_top_countries: Record<string, unknown>[] | null;
  creator_tier: string | null;
  content_tags: string[] | null;
  created_at: string;
  updated_at: string | null;
}

const PROFILE_CACHE_KEY = "mavlit_profile_cache";

/** Returns true when the profile's identity + niche are considered complete */
export function isProfileComplete(profile: CreatorProfile): boolean {
  return (
    !!profile.full_name?.trim() &&
    !!profile.creator_handle?.trim() &&
    !!profile.content_niche?.trim()
  );
}

interface AuthContextValue {
  user: CreatorProfile | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  updateProfile: (patch: Partial<CreatorProfile>) => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<CreatorProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [, navigate] = useLocation();

  // On mount — validate session via cookie by calling GET /creator-profile/me
  // Fall back to cache while the request is in flight so the UI doesn't flash
  useEffect(() => {
    let cancelled = false;

    // Seed from cache immediately so protected routes don't flash the login page
    try {
      const raw = localStorage.getItem(PROFILE_CACHE_KEY);
      if (raw) setUser(JSON.parse(raw) as CreatorProfile);
    } catch { /* ignore */ }

    // Validate with the server (cookie-based)
    api.get<CreatorProfile>("/creator-profile/me")
      .then((profile) => {
        if (cancelled) return;
        setUser(profile);
        try { localStorage.setItem(PROFILE_CACHE_KEY, JSON.stringify(profile)); } catch { /* ignore */ }
      })
      .catch(() => {
        if (cancelled) return;
        // 401 or network error — clear stale cache
        setUser(null);
        localStorage.removeItem(PROFILE_CACHE_KEY);
      })
      .finally(() => { if (!cancelled) setIsLoading(false); });

    return () => { cancelled = true; };
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    // Login sets the httpOnly cookie on the server; we receive the profile in the response
    const profile = await api.post<CreatorProfile>("/auth/login", { email, password });
    setUser(profile);
    try { localStorage.setItem(PROFILE_CACHE_KEY, JSON.stringify(profile)); } catch { /* ignore */ }

    navigate("/dashboard");
  }, [navigate]);

  const logout = useCallback(async () => {
    try { await api.post("/auth/logout", {}); } catch { /* ignore — clear locally regardless */ }
    localStorage.removeItem(PROFILE_CACHE_KEY);
    setUser(null);
    navigate("/login");
  }, [navigate]);

  const updateProfile = useCallback(async (patch: Partial<CreatorProfile>) => {
    const updated = await api.put<CreatorProfile>("/creator-profile/me", patch);
    setUser(updated);
    try { localStorage.setItem(PROFILE_CACHE_KEY, JSON.stringify(updated)); } catch { /* ignore */ }
  }, []);

  return (
    <AuthContext.Provider value={{ user, isLoading, login, logout, updateProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
