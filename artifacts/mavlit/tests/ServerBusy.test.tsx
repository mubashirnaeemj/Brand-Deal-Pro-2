import { renderHook, act, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { api, ApiRequestError, SERVER_BUSY_MESSAGE } from "@/lib/api";
import { useOwnBrandLookup } from "@/hooks/useOwnBrandLookup";

const json = (body: unknown, status = 200, headers: Record<string, string> = {}) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json", ...headers } });
const busy = (retryAfter?: string) => json({ detail: "Server is busy, please try again in a few seconds" }, 503, retryAfter === undefined ? {} : { "Retry-After": retryAfter });

function stub(...replies: (() => Response)[]) {
  const calls: { path: string; method: string }[] = [];
  vi.stubGlobal("fetch", vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    calls.push({ path: new URL(String(input), window.location.origin).pathname.replace("/api/mavlit", ""), method: init?.method ?? "GET" });
    const reply = replies[Math.min(calls.length - 1, replies.length - 1)];
    return reply();
  }));
  return calls;
}

beforeEach(() => { vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] }); });
afterEach(() => { vi.useRealTimers(); });

describe("503 with Retry-After", () => {
  it("repeats a GET once after the wait and returns the answer", async () => {
    const calls = stub(() => busy("5"), () => json({ ok: true }));
    const result = api.get<{ ok: boolean }>("/dashboard/me");
    await vi.advanceTimersByTimeAsync(4999);
    expect(calls).toHaveLength(1);
    await vi.advanceTimersByTimeAsync(1);
    await expect(result).resolves.toEqual({ ok: true });
    expect(calls).toHaveLength(2);
  });

  it("waits at most 10 s, however long the server asks", async () => {
    const calls = stub(() => busy("60"), () => json({ ok: true }));
    const result = api.get("/dashboard/me");
    await vi.advanceTimersByTimeAsync(9999);
    expect(calls).toHaveLength(1);
    await vi.advanceTimersByTimeAsync(1);
    await result;
    expect(calls).toHaveLength(2);
  });

  it("uses 5 s when Retry-After is an HTTP date, and 0 means at once", async () => {
    let calls = stub(() => busy("Wed, 21 Oct 2026 07:28:00 GMT"), () => json({}));
    let result = api.get("/dashboard/me");
    await vi.advanceTimersByTimeAsync(4999);
    expect(calls).toHaveLength(1);
    await vi.advanceTimersByTimeAsync(1);
    await result;
    calls = stub(() => busy("0"), () => json({}));
    result = api.get("/dashboard/me");
    await vi.advanceTimersByTimeAsync(0);
    await result;
    expect(calls).toHaveLength(2);
  });

  it("repeats only once, then shows the busy message", async () => {
    const calls = stub(() => busy("5"));
    const result = api.get("/dashboard/me").catch((e: unknown) => e as ApiRequestError);
    await vi.advanceTimersByTimeAsync(5000);
    const error = (await result) as ApiRequestError;
    expect(error).toBeInstanceOf(ApiRequestError);
    expect(error.message).toBe(SERVER_BUSY_MESSAGE);
    expect(error.message).toBe("Server is busy, please try again in a few seconds");
    expect(error.status).toBe(503);
    expect(calls).toHaveLength(2);
  });

  it.each([["POST", () => api.post("/rate-intelligence", {})], ["PUT", () => api.put("/creator-profile/me", {})],
          ["PATCH", () => api.patch("/pitches/3", {})], ["DELETE", () => api.delete("/pitches/3")]])("never repeats a %s", async (method, call) => {
    const calls = stub(() => busy("5"));
    const error = await call().catch((e: Error) => e);
    expect((error as Error).message).toBe(SERVER_BUSY_MESSAGE);
    await vi.advanceTimersByTimeAsync(20_000);
    expect(calls).toHaveLength(1);
    expect(calls[0].method).toBe(method);
  });

  it("does not repeat a GET when there is no Retry-After, and keeps the server's own text", async () => {
    const calls = stub(() => json({ detail: "Service Unavailable" }, 503));
    const error = await api.get("/dashboard/me").catch((e: Error) => e);
    expect((error as Error).message).toBe("Service Unavailable");
    expect(calls).toHaveLength(1);
  });

  it("stops waiting when the request is cancelled", async () => {
    const calls = stub(() => busy("5"), () => json({}));
    const controller = new AbortController();
    const result = api.get("/matches/me/v3", { signal: controller.signal }).catch((e: Error) => e);
    await vi.advanceTimersByTimeAsync(1000);
    controller.abort();
    const error = await result;
    expect((error as Error).name).toBe("AbortError");
    await vi.advanceTimersByTimeAsync(10_000);
    expect(calls).toHaveLength(1);
  });

  it("a 503 on the pitch stream (a POST) is shown at once, not repeated", async () => {
    const calls = stub(() => busy("5"));
    const error = await api.post("/pitches/stream", {}).catch((e: Error) => e);
    expect((error as Error).message).toBe(SERVER_BUSY_MESSAGE);
    await vi.advanceTimersByTimeAsync(10_000);
    expect(calls).toHaveLength(1);
  });
});

describe("409 keeps the server's own message", () => {
  it("on POST /own-brands and POST /creator-profile/me/generate-description", async () => {
    stub(() => json({ detail: "A brand lookup is already running. Wait for it to finish, then look up the next one." }, 409));
    expect(await api.post("/own-brands", { instagram: "brand" }).catch((e: Error) => e.message)).toBe(
      "A brand lookup is already running. Wait for it to finish, then look up the next one.");
    stub(() => json({ detail: "A description is already being generated. Wait for it to finish." }, 409));
    expect(await api.post("/creator-profile/me/generate-description", {}).catch((e: Error) => e.message)).toBe(
      "A description is already being generated. Wait for it to finish.");
  });

  it("the own-brand box shows it", async () => {
    stub(() => json({ detail: "A brand lookup is already running. Wait for it to finish, then look up the next one." }, 409));
    vi.useRealTimers();
    const { result } = renderHook(() => useOwnBrandLookup());
    act(() => result.current.setInput("brandtwo"));
    await act(async () => { await result.current.find(); });
    await waitFor(() => expect(result.current.state.inputError).toBe("A brand lookup is already running. Wait for it to finish, then look up the next one."));
    expect(result.current.state.phase).not.toBe("running");
  });

  it("a pitch 409 is still the short 'Another request is already running'", async () => {
    stub(() => json({ detail: "Another pitch is already being written for you." }, 409));
    expect(await api.post("/pitches", {}).catch((e: Error) => e.message)).toBe("Another request is already running");
  });
});
