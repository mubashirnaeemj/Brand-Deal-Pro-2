import { api } from "./api";

export interface AiRankedMatch {
  brand_raw_id: number;
  brand_name: string;
  niche: string | null;
  rank: number;
  confidence: number;
  reason: string | null;
  reasons?: string[];
}

export interface AiMatchesResponse {
  status: "idle" | "queued" | "running" | "completed" | "failed";
  error: string | null;
  ranked_at: string | null;
  total: number;
  matches: AiRankedMatch[];
}

export function validateAiMatches(value: AiMatchesResponse): AiMatchesResponse {
  if (!value || !["idle", "queued", "running", "completed", "failed"].includes(value.status)
    || !(value.error === null || typeof value.error === "string")
    || !(value.ranked_at === null || (typeof value.ranked_at === "string" && Number.isFinite(Date.parse(value.ranked_at))))
    || !Number.isInteger(value.total) || value.total < 0 || !Array.isArray(value.matches)
    || !value.matches.every((match) => match && Number.isInteger(match.brand_raw_id)
      && typeof match.brand_name === "string" && (match.niche === null || typeof match.niche === "string")
      && Number.isInteger(match.rank) && match.rank > 0
      && Number.isInteger(match.confidence) && match.confidence >= 0 && match.confidence <= 100
      && (match.reason === null || typeof match.reason === "string")
      && (match.reasons === undefined || (Array.isArray(match.reasons) && match.reasons.every((reason) => typeof reason === "string"))))) {
    throw new Error("Invalid AI ranking response");
  }
  return value;
}

export const isAiRanking = (data?: AiMatchesResponse) => data?.status === "queued" || data?.status === "running";

export async function getAiMatches(signal?: AbortSignal) {
  return validateAiMatches(await api.get<AiMatchesResponse>("/matches/me/v2", { signal }));
}

export async function refreshAiMatches() {
  return validateAiMatches(await api.post<AiMatchesResponse>("/matches/me/v2/refresh"));
}
