import { profileWriteBody } from "./audience";

const API_BASE = "/api/mavlit";

type ApiErrorBody = { detail?: unknown; message?: unknown; error?: unknown };

export class ApiRequestError extends Error {
  constructor(message: string, public readonly status: number) {
    super(message);
    this.name = "ApiRequestError";
  }
}

async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers = new Headers(options.headers);
  if (options.body !== undefined && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    credentials: "include",
    headers,
  });
  if (!res.ok) {
    const err: ApiErrorBody = await res.json().catch(() => ({}));
    if (res.status === 401) window.dispatchEvent(new Event("mavlit:unauthorized"));
    if (res.status === 403 && (
      err.error === "profile_incomplete" ||
      err.detail === "profile_incomplete" ||
      (typeof err.detail === "object" && err.detail !== null && "error" in err.detail && err.detail.error === "profile_incomplete")
    )) window.dispatchEvent(new Event("mavlit:profile-incomplete"));
    const validationDetail = Array.isArray(err.detail) ? err.detail.map((item) =>
      item && typeof item === "object" && "msg" in item ? String(item.msg) : "").filter(Boolean).join("; ") : null;
    const detail = typeof err.detail === "string" ? err.detail : validationDetail || (typeof err.message === "string" ? err.message : null);
    throw new ApiRequestError(detail ?? `Request failed (${res.status})`, res.status);
  }
  return res.json() as Promise<T>;
}

export const api = {
  get:    <T>(path: string, options?: RequestInit) => apiFetch<T>(path, options),
  post:   <T>(path: string, body?: unknown) => apiFetch<T>(path, { method: "POST",   body: JSON.stringify(body) }),
  put:    <T>(path: string, body: unknown) => apiFetch<T>(path, { method: "PUT",    body: JSON.stringify(path === "/creator-profile/me" ? profileWriteBody(body) : body) }),
  patch:  <T>(path: string, body: unknown) => apiFetch<T>(path, { method: "PATCH",  body: JSON.stringify(body) }),
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
  pitch_text: string | null;
  status: string;
  source: string;
  is_manual: boolean;
  sent_at: string | null;
  agreed_rate: string | null;
  created_at: string;
}

export interface PitchListResponse {
  pitches: ApiPitch[];
  total: number;
  limit: number;
  offset: number;
}

export interface PitchUpdateRequest {
  pitch_text?: string | null;
  status?: string;
  sent_at?: string | null;
  agreed_rate?: number | null;
}

export async function getAllPitches(): Promise<ApiPitch[]> {
  const pitches: ApiPitch[] = [];
  while (true) {
    const page = await api.get<PitchListResponse>(`/pitches/me?limit=100&offset=${pitches.length}`);
    if (!Array.isArray(page.pitches)) throw new Error("Invalid pitch list response");
    pitches.push(...page.pitches);
    if (pitches.length >= page.total) return pitches;
    if (page.pitches.length === 0) throw new Error("Pitch list ended before the reported total");
  }
}

export interface ApiMatch {
  brand_raw_id: number;
  brand_name: string;
  niche: string | null;
  website?: string | null;
  total_score: number;
  dimensions: Record<string, { score: number | null; weight: number }>;
  reasons: string[];
}

export interface BrandPartnershipPosts {
  brand_raw_id: number;
  brand_name: string;
  posts: {
    post_url: string;
    post_date: string | null;
    creators: string[];
  }[];
}

export interface MatchesResponse {
  matches: ApiMatch[];
  total: number;
  cached: boolean;
  computed_at: string;
}

export async function getAllMatches(): Promise<ApiMatch[]> {
  const response = await api.get<MatchesResponse>("/matches/me");
  if (!Array.isArray(response.matches) || !Number.isInteger(response.total) || response.total < 0) {
    throw new Error("Invalid matches response");
  }
  return response.matches;
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

export interface BrandCatalogListItem {
  id: number;
  name: string;
  niche: string | null;
  website: string | null;
  domain: string | null;
  country: string | null;
}

export interface BrandCatalogListResponse {
  total: number;
  limit: number;
  offset: number;
  brands: BrandCatalogListItem[];
}

export interface BrandCatalogAd {
  id: number;
  page_name: string;
  ad_creative_bodies: string[];
  publisher_platforms: string[];
  start_date: string;
  end_date: string;
  impressions: { lower_bound: string; upper_bound: string | null };
  spend: { lower_bound: string; upper_bound: string | null };
  currency: string;
}

export interface BrandCatalogDetail extends BrandCatalogListItem {
  description: string | null;
  headquarters: string | null;
  instagram_handle: string | null;
  youtube_channel_id: string | null;
  facebook_page: string | null;
  brand_tier: string | null;
  geo_reach_score: number | null;
  geo_reach_label: string | null;
  meta_ads_total: number;
  meta_ads: BrandCatalogAd[];
}

export interface BrandCatalogNichesResponse {
  niches: string[];
}
