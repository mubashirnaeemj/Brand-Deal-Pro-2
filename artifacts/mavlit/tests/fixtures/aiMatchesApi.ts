import { expect, vi } from "vitest";
import type { AiMatchesResponse, AiMatchesVersion } from "@/lib/aiMatches";
import { creatorProfile } from "./creatorProfile";
import { installProfileApi } from "./profileApi";

// Deliberately not alphabetical, confidence, or numeric-rank order. The backend
// array is authoritative, including unwanted brands at the end.
export const rankedBrands: AiMatchesResponse["matches"] = [
  { brand_raw_id: 30, brand_name: "Zeta Guitars", niche: "Music", rank: 2, confidence: 72, reason: "Guitar content." },
  { brand_raw_id: 10, brand_name: "Alpha Audio", niche: "Music", rank: 1, confidence: 96, reason: "Audio content." },
  { brand_raw_id: 20, brand_name: "Unwanted Amplifiers", niche: "Music", rank: 3, confidence: 99, reason: "Still included." },
];

export function ranking(status: AiMatchesResponse["status"], overrides: Partial<AiMatchesResponse> = {}): AiMatchesResponse {
  return {
    status, error: status === "failed" ? "Fixture ranking failed" : null,
    ranked_at: "2026-10-01T12:00:00Z", total: rankedBrands.length,
    matches: structuredClone(rankedBrands), ...overrides,
  };
}

type Reply = { body: unknown; status?: number };
type Responder = () => Reply | Promise<Reply>;
type RequestRecord = { version: AiMatchesVersion; method: "GET" | "POST"; at: number; signal?: AbortSignal | null };

/** Uses the real API serialization, but every fetch stays in memory. */
export function installAiMatchesApi() {
  const profile = installProfileApi(creatorProfile({ brand_preferences: "Avoid Unwanted Amplifiers" }));
  const profileFetch = globalThis.fetch;
  const requests: RequestRecord[] = [];
  const unexpected: string[] = [];
  const responders = new Map<string, Responder>();
  for (const version of ["v2", "v3"] as const) {
    responders.set(`GET ${version}`, () => ({ body: ranking("completed") }));
    responders.set(`POST ${version}`, () => ({ body: ranking("queued") }));
  }

  vi.stubGlobal("fetch", vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = new URL(String(input), window.location.origin);
    const method = init?.method ?? "GET";
    const route = /^\/api\/mavlit\/matches\/me\/(v2|v3)(\/refresh)?$/.exec(url.pathname);
    if (!route) {
      // The profile fixture rejects every unlisted route, including V1.
      return profileFetch(input, init);
    }
    const version = route[1] as AiMatchesVersion;
    if (url.origin !== window.location.origin || url.search ||
        !((method === "GET" && !route[2]) || (method === "POST" && route[2]))) {
      unexpected.push(`${method} ${url}`);
      throw new Error(`Unexpected ranking request: ${method} ${url}`);
    }
    expect(init?.credentials).toBe("include");
    requests.push({ version, method, at: Date.now(), signal: init?.signal });
    const reply = await responders.get(`${method} ${version}`)!();
    return new Response(JSON.stringify(reply.body), {
      status: reply.status ?? 200, headers: { "Content-Type": "application/json" },
    });
  }));

  return {
    profile, requests,
    calls(method: "GET" | "POST", version: AiMatchesVersion = "v3") {
      return requests.filter((request) => request.method === method && request.version === version);
    },
    respond(method: "GET" | "POST", body: unknown, version: AiMatchesVersion = "v3", status = 200) {
      responders.set(`${method} ${version}`, () => ({ body, status }));
    },
    handle(method: "GET" | "POST", responder: Responder, version: AiMatchesVersion = "v3") {
      responders.set(`${method} ${version}`, responder);
    },
    assertIsolated() {
      expect(unexpected).toEqual([]);
      profile.assertIsolated();
    },
  };
}
