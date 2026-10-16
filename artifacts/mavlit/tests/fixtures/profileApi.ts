import { expect, vi } from "vitest";
import type { CreatorProfile } from "@/contexts/AuthContext";

type ProfileRecord = CreatorProfile & Record<string, unknown>;
type RequestRecord = { path: string; method: string; body: unknown; credentials?: RequestCredentials };

/** Intercepts the real api.ts fetch boundary; there is no network fallback. */
export function installProfileApi(initial: CreatorProfile) {
  let persisted: ProfileRecord = structuredClone(initial) as ProfileRecord;
  let getFailure: string | null = null;
  let putFailure: string | null = null;
  const requests: RequestRecord[] = [];
  const unexpected: string[] = [];
  const reply = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

  vi.stubGlobal("fetch", vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = new URL(String(input), window.location.origin);
    const method = init?.method ?? "GET";
    const body: unknown = init?.body ? JSON.parse(String(init.body)) : undefined;
    requests.push({ path: url.pathname, method, body, credentials: init?.credentials });
    if (url.origin === window.location.origin && url.pathname === "/api/mavlit/creator-profile/me") {
      if (method === "GET") {
        return getFailure ? reply({ detail: getFailure }, 503) : reply(persisted);
      }
      if (method === "PUT") {
        if (putFailure) return reply({ detail: putFailure }, 503);
        // Match full replacement, NOT a permissive merge that could hide omitted fields.
        persisted = structuredClone(body) as ProfileRecord;
        return reply(persisted);
      }
    }
    if (url.origin === window.location.origin && method === "GET" &&
        url.pathname === "/api/mavlit/brand-category-tags") {
      return reply({ tags_by_niche: Object.fromEntries(
        url.searchParams.getAll("niche").map((niche) => [niche, ["Fixture brand tag"]]),
      ) });
    }
    unexpected.push(`${method} ${url}`);
    throw new Error(`Unexpected fixture request: ${method} ${url}`);
  }));

  return {
    requests,
    get writes() { return requests.filter((request) => request.method === "PUT"); },
    get persisted() { return structuredClone(persisted); },
    replaceOnServer(profile: CreatorProfile) { persisted = structuredClone(profile) as ProfileRecord; },
    failGet(message: string | null) { getFailure = message; },
    failPut(message: string | null) { putFailure = message; },
    assertIsolated() {
      expect(unexpected, "Unlisted requests, including AI jobs, are forbidden").toEqual([]);
      expect(requests.every((request) => request.credentials === "include")).toBe(true);
    },
  };
}
