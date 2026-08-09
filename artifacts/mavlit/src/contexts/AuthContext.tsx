import { createContext, useContext, useState, useEffect, useCallback } from "react";
import { useLocation } from "wouter";

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

const API_BASE = "https://api.mavlit.com";
const SESSION_KEY = "mavlit_session";

/** Returns true when the profile's identity + niche sections are considered complete */
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
  updateProfile: (patch: Partial<CreatorProfile>) => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<CreatorProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [, navigate] = useLocation();

  // Rehydrate from localStorage on mount
  useEffect(() => {
    try {
      const raw = localStorage.getItem(SESSION_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as CreatorProfile;
        setUser(parsed);
      }
    } catch {
      /* ignore */
    } finally {
      setIsLoading(false);
    }
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ email, password }),
    });

    if (!res.ok) {
      let msg = "Invalid email or password.";
      try {
        const data = await res.json();
        if (data?.detail) msg = data.detail;
        else if (data?.message) msg = data.message;
      } catch { /* ignore */ }
      throw new Error(msg);
    }

    const profile = (await res.json()) as CreatorProfile;
    localStorage.setItem(SESSION_KEY, JSON.stringify(profile));
    setUser(profile);

    if (!isProfileComplete(profile)) {
      navigate("/profile-setup");
    } else {
      navigate("/dashboard");
    }
  }, [navigate]);

  const logout = useCallback(() => {
    localStorage.removeItem(SESSION_KEY);
    setUser(null);
    navigate("/login");
  }, [navigate]);

  const updateProfile = useCallback((patch: Partial<CreatorProfile>) => {
    setUser((prev) => {
      if (!prev) return prev;
      const next = { ...prev, ...patch };
      try { localStorage.setItem(SESSION_KEY, JSON.stringify(next)); } catch { /* ignore */ }
      return next;
    });
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
