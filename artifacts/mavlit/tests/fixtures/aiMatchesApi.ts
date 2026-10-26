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
  // The creator's saved brands (GET /saved-brands/me, POST /saved-brands, DELETE /saved-brands/{id}), kept in memory.
  const savedBrands: { brand_id: number; name: string; niche: string; short_bio: string | null; saved_at: string }[] = [];
  const savedCalls: string[] = [];
  for (const version of ["v2", "v3"] as const) {
    responders.set(`GET ${version}`, () => ({ body: ranking("completed") }));
    responders.set(`POST ${version}`, () => ({ body: ranking("queued") }));
  }

  vi.stubGlobal("fetch", vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = new URL(String(input), window.location.origin);
    const method = init?.method ?? "GET";
    const saved = /^\/api\/mavlit\/saved-brands(?:\/(me|\d+))?$/.exec(url.pathname);
    if (saved) {
      const json = (body: unknown) => new Response(JSON.stringify(body), { status: 200, headers: { "Content-Type": "application/json" } });
      savedCalls.push(`${method} ${saved[1] ?? ""}`.trim());
      if (method === "GET" && saved[1] === "me") return json(savedBrands);
      if (method === "POST" && !saved[1]) {
        const { brand_id } = JSON.parse(String(init?.body));
        if (!savedBrands.some((brand) => brand.brand_id === brand_id)) savedBrands.push({ brand_id, name: `brand ${brand_id}`, niche: "", short_bio: null, saved_at: "2026-10-26T00:00:00Z" });
        return json({ brand_id, saved: true });
      }
      if (method === "DELETE" && saved[1] && saved[1] !== "me") {
        const index = savedBrands.findIndex((brand) => String(brand.brand_id) === saved[1]);
        if (index >= 0) savedBrands.splice(index, 1);
        return json({ brand_id: Number(saved[1]), saved: false });
      }
      unexpected.push(`${method} ${url}`);
      throw new Error(`Unexpected saved-brands request: ${method} ${url}`);
    }
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
    profile, requests, savedBrands, savedCalls,
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
