const API_BASE = "https://api.mavlit.com";

type ApiErrorBody = { detail?: string; message?: string };

async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    credentials: "include",
    headers: { "Content-Type": "application/json", ...options.headers },
  });
  if (!res.ok) {
    const err: ApiErrorBody = await res.json().catch(() => ({}));
    throw new Error(err.detail ?? err.message ?? `Request failed (${res.status})`);
  }
  return res.json() as Promise<T>;
}

export const api = {
  get:    <T>(path: string)                => apiFetch<T>(path),
  post:   <T>(path: string, body: unknown) => apiFetch<T>(path, { method: "POST",   body: JSON.stringify(body) }),
  put:    <T>(path: string, body: unknown) => apiFetch<T>(path, { method: "PUT",    body: JSON.stringify(body) }),
  delete: <T>(path: string)               => apiFetch<T>(path, { method: "DELETE" }),
};

// ── Response types ────────────────────────────────────────────────────────────

export interface DashboardStats {
  brand_matches: number;
  active_deals: number;
  saved_brands: number;
  verified_contacts: number;
}

export interface ApiPitch {
  id: number;
  brand_id: number | null;
  brand_name: string;
  is_custom: boolean;
  story: string;
  product_reference: string | null;
  past_brand_partnership: string | null;
  content_link: string | null;
  contact_name: string | null;
  contact_email: string | null;
  pitch_text: string;
  status: string;
  created_at: string;
}

export interface SavedBrand {
  brand_id: number;
  name: string;
  niche: string;
  short_bio: string | null;
  saved_at: string;
}

export interface ApiBrand {
  brand_id: number;
  name: string;
  short_bio: string | null;
  description: string | null;
  niche: string;
  creator_tier_fit: {
    typical_tier: "nano" | "micro" | "macro" | "mega" | null;
    followers_low: number | null;
    followers_high: number | null;
  } | null;
  last_partnership_date: string | null;
  meta_ads_active: boolean | null;
  platform_signals: Record<string, "not_available" | "limited" | "moderate" | "strong"> | null;
  sponsorship_activity_score: number | null;
  top_contact: { name: string; email: string; title: string } | null;
}

export interface RateIntelligenceResult {
  id: number;
  rate_min: number;
  rate_max: number;
  currency: string;
  reasoning: string;
  created_at: string;
}

export interface ContractAdviceResult {
  id: number;
  looks_good: boolean;
  issues: string[];
  summary: string;
  created_at: string;
}
