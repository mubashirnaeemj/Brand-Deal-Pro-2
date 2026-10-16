import { act, cleanup, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import useAiMatches from "@/hooks/useAiMatches";
import { installAiMatchesApi, ranking } from "./fixtures/aiMatchesApi";
import { matchesWrapper, settle, startMatchesClock, stopMatchesClock, tick } from "./aiMatchesTestUtils";

let fixture: ReturnType<typeof installAiMatchesApi>;
beforeEach(() => {
  startMatchesClock();
  fixture = installAiMatchesApi();
});
afterEach(() => {
  cleanup();
  fixture.assertIsolated();
  stopMatchesClock();
});

function mount(version: "v2" | "v3" = "v3", active = true) {
  const { Wrapper, queryClient } = matchesWrapper();
  return {
    ...renderHook(({ enabled }) => useAiMatches(version, enabled), {
      wrapper: Wrapper, initialProps: { enabled: active },
    }),
    queryClient,
  };
}

describe("V3 ranking lifecycle (mocked fetch and accelerated clock)", () => {
  it("reads only when opened, polls queued/running at exactly 3 seconds, and stops on completion", async () => {
    fixture.respond("GET", ranking("queued"));
    const hook = mount("v3", false);
    await settle();
    expect(fixture.requests).toHaveLength(0);
    hook.rerender({ enabled: true });
    await settle();
    expect(hook.result.current.data?.status).toBe("queued");
    expect(fixture.calls("GET")).toHaveLength(1);
    expect(fixture.calls("POST")).toHaveLength(0);
    await tick(2_999);
    expect(fixture.calls("GET")).toHaveLength(1);
    fixture.respond("GET", ranking("running"));
    await tick(1);
    expect(hook.result.current.data?.status).toBe("running");
    expect(fixture.calls("GET")).toHaveLength(2);
    await tick(2_999);
    expect(fixture.calls("GET")).toHaveLength(2);
    fixture.respond("GET", ranking("completed"));
    await tick(1);
    expect(hook.result.current.data?.status).toBe("completed");
    expect(fixture.calls("GET").map(({ at }) => at - fixture.calls("GET")[0].at)).toEqual([0, 3_000, 6_000]);
    await tick(180_000);
    expect(fixture.calls("GET")).toHaveLength(3);
    expect(hook.result.current.timedOut).toBe(false);
    expect(fixture.requests.every(({ version }) => version === "v3")).toBe(true);
  });

  it("stops on failure, sends one explicit retry POST, then polls the new run", async () => {
    fixture.respond("GET", ranking("running"));
    const hook = mount();
    await settle();
    fixture.respond("GET", ranking("failed"));
    await tick(3_000);
    expect(hook.result.current.data?.status).toBe("failed");
    await tick(12_000);
    expect(fixture.calls("GET")).toHaveLength(2);

    let release!: (reply: { body: unknown }) => void;
    fixture.handle("POST", () => new Promise((resolve) => { release = resolve; }));
    act(() => hook.result.current.refresh());
    await settle();
    expect(hook.result.current.refreshing).toBe(true);
    act(() => hook.result.current.refresh());
    await settle();
    expect(fixture.calls("POST")).toHaveLength(1);
    fixture.respond("GET", ranking("queued"));
    await act(async () => { release({ body: ranking("queued") }); });
    await settle();
    const readsAfterRetry = fixture.calls("GET").length;
    expect(hook.result.current.data?.status).toBe("queued");
    fixture.respond("GET", ranking("completed"));
    await tick(2_999);
    expect(fixture.calls("GET")).toHaveLength(readsAfterRetry);
    await tick(1);
    expect(fixture.calls("GET")).toHaveLength(readsAfterRetry + 1);
    expect(hook.result.current.data?.status).toBe("completed");
    await tick(12_000);
    expect(fixture.calls("POST")).toHaveLength(1);
    expect(fixture.calls("GET")).toHaveLength(readsAfterRetry + 1);
  });

  it("manual refresh after completion POSTs once and refuses another refresh while queued or running", async () => {
    const hook = mount();
    await settle();
    fixture.respond("GET", ranking("queued"));
    act(() => hook.result.current.refresh());
    await settle();
    expect(fixture.calls("POST")).toHaveLength(1);
    expect(hook.result.current.data?.status).toBe("queued");
    act(() => hook.result.current.refresh());
    await settle();
    expect(fixture.calls("POST")).toHaveLength(1);
    fixture.respond("GET", ranking("running"));
    const reads = fixture.calls("GET").length;
    await tick(3_000);
    expect(fixture.calls("GET")).toHaveLength(reads + 1);
    expect(hook.result.current.data?.status).toBe("running");
    act(() => hook.result.current.refresh());
    await settle();
    expect(fixture.calls("POST")).toHaveLength(1);
  });

  it("pauses checks at three minutes even as queued changes to running, without posting a new job", async () => {
    fixture.respond("GET", ranking("queued"));
    const hook = mount();
    await settle();
    await tick(90_000);
    fixture.respond("GET", ranking("running"));
    await tick(3_000);
    await tick(86_999);
    expect(hook.result.current.timedOut).toBe(false);
    await tick(1);
    expect(hook.result.current.timedOut).toBe(true);
    expect(hook.result.current.data?.status).toBe("running");
    const reads = fixture.calls("GET").length;
    await tick(60_000);
    expect(fixture.calls("GET")).toHaveLength(reads);
    expect(fixture.calls("POST")).toHaveLength(0);
  });

  it("resumes immediately with GET only and grants each check cycle a fresh bounded window", async () => {
    fixture.respond("GET", ranking("queued"));
    const hook = mount();
    await settle();
    // Checking is not a second way to start or refresh a ranking.
    act(() => hook.result.current.checkStatus());
    await settle();
    expect(fixture.calls("GET")).toHaveLength(1);
    await tick(180_000);
    expect(hook.result.current.timedOut).toBe(true);
    await tick(30_000);
    const reads = fixture.calls("GET").length;

    fixture.respond("GET", ranking("running"));
    act(() => {
      hook.result.current.checkStatus();
      hook.result.current.checkStatus();
      hook.result.current.refresh();
    });
    await settle();
    expect(fixture.calls("GET")).toHaveLength(reads + 1);
    expect(hook.result.current.timedOut).toBe(false);
    expect(hook.result.current.data).toEqual(ranking("running"));
    await tick(2_999);
    expect(fixture.calls("GET")).toHaveLength(reads + 1);
    await tick(1);
    expect(fixture.calls("GET")).toHaveLength(reads + 2);
    await tick(176_999);
    expect(hook.result.current.timedOut).toBe(false);
    await tick(1);
    expect(hook.result.current.timedOut).toBe(true);
    const pausedReads = fixture.calls("GET").length;
    await tick(60_000);
    expect(fixture.calls("GET")).toHaveLength(pausedReads);
    act(() => hook.result.current.checkStatus());
    await settle();
    expect(fixture.calls("GET")).toHaveLength(pausedReads + 1);
    expect(hook.result.current.timedOut).toBe(false);
    hook.unmount();
    await tick(180_000);
    expect(fixture.calls("GET")).toHaveLength(pausedReads + 1);
    expect(fixture.calls("POST")).toHaveLength(0);
  });

  it.each(["completed", "failed"] as const)("stops resumed checks when the backend returns %s", async (status) => {
    fixture.respond("GET", ranking("running"));
    const hook = mount();
    await settle();
    await tick(180_000);
    act(() => hook.result.current.checkStatus());
    await settle();
    const reads = fixture.calls("GET").length;
    fixture.respond("GET", ranking(status));
    await tick(3_000);
    expect(hook.result.current.data).toEqual(ranking(status));
    expect(hook.result.current.timedOut).toBe(false);
    await tick(180_000);
    expect(fixture.calls("GET")).toHaveLength(reads + 1);
    act(() => hook.result.current.checkStatus());
    await settle();
    expect(fixture.calls("GET")).toHaveLength(reads + 1);
    expect(fixture.calls("POST")).toHaveLength(0);
  });

  it("reuses a slow status GET when resuming rather than aborting or overlapping it", async () => {
    fixture.respond("GET", ranking("running"));
    const hook = mount();
    await settle();
    let release!: (reply: { body: unknown }) => void;
    fixture.handle("GET", () => new Promise((resolve) => { release = resolve; }));
    await tick(3_000);
    await tick(177_000);
    expect(hook.result.current.timedOut).toBe(true);
    act(() => hook.result.current.checkStatus());
    await settle();
    await tick(6_000);
    expect(fixture.calls("GET")).toHaveLength(2);
    expect(fixture.calls("GET")[1].signal?.aborted).toBe(false);
    await act(async () => { release({ body: ranking("completed") }); });
    await settle();
    expect(hook.result.current.data?.status).toBe("completed");
    expect(hook.result.current.timedOut).toBe(false);
    expect(fixture.calls("POST")).toHaveLength(0);
  });

  it("cleans up polling on unmount", async () => {
    fixture.respond("GET", ranking("running"));
    const hook = mount();
    await settle();
    hook.unmount();
    await tick(180_000);
    expect(fixture.calls("GET")).toHaveLength(1);
    expect(fixture.calls("POST")).toHaveLength(0);
  });

  it("does not overlap slow status requests", async () => {
    fixture.respond("GET", ranking("running"));
    const hook = mount();
    await settle();
    let release!: (reply: { body: unknown }) => void;
    fixture.handle("GET", () => new Promise((resolve) => { release = resolve; }));
    await tick(3_000);
    await tick(12_000);
    expect(fixture.calls("GET")).toHaveLength(2);
    await act(async () => { release({ body: ranking("completed") }); });
    await settle();
    expect(hook.result.current.data?.status).toBe("completed");
    await tick(6_000);
    expect(fixture.calls("GET")).toHaveLength(2);
  });
});

// Request/validation errors are not backend job-status "failed" responses.
describe("V3 request failures (fully intercepted fetch)", () => {
  it.each(["network", "503"] as const)("recovers from a transient %s GET with one delayed retry and no POST", async (failure) => {
    let attempts = 0;
    fixture.handle("GET", () => {
      if (++attempts === 1) {
        if (failure === "network") throw new TypeError("Failed to fetch");
        return { body: { detail: "Rankings temporarily unavailable" }, status: 503 };
      }
      return { body: ranking("completed") };
    });
    const hook = mount();
    await settle();
    expect(hook.result.current.loading).toBe(true);
    expect(hook.result.current.error).toBeNull();
    await tick(999);
    expect(fixture.calls("GET")).toHaveLength(1);
    await tick(1);
    expect(fixture.calls("GET").map(({ at }) => at - fixture.calls("GET")[0].at)).toEqual([0, 1_000]);
    expect(hook.result.current.data).toEqual(ranking("completed"));
    expect(hook.result.current.loading).toBe(false);
    expect(hook.result.current.error).toBeNull();
    await tick(180_000);
    expect(fixture.calls("GET")).toHaveLength(2);
    expect(fixture.calls("POST")).toHaveLength(0);
  });

  it.each(["network", "503"] as const)("stops after one retry of a persistent %s GET and exposes a readable error", async (failure) => {
    const message = failure === "network" ? "Failed to fetch" : "Rankings temporarily unavailable";
    fixture.handle("GET", () => {
      if (failure === "network") throw new TypeError(message);
      return { body: { detail: message }, status: 503 };
    });
    const hook = mount();
    await settle();
    await tick(1_000);
    expect(hook.result.current.loading).toBe(false);
    expect(hook.result.current.error).toBe(message);
    expect(hook.result.current.data).toBeUndefined();
    await tick(180_000);
    expect(fixture.calls("GET")).toHaveLength(2);
    expect(fixture.calls("POST")).toHaveLength(0);
  });

  it("retains prior running data across a transient polling failure and resumes normal polling", async () => {
    const previous = ranking("running");
    fixture.respond("GET", previous);
    const hook = mount();
    await settle();
    fixture.respond("GET", { detail: "Status service unavailable" }, "v3", 503);
    await tick(3_000);
    expect(hook.result.current.data).toEqual(previous);
    fixture.respond("GET", ranking("running", { matches: [], total: 0 }));
    await tick(999);
    expect(fixture.calls("GET")).toHaveLength(2);
    await tick(1);
    expect(hook.result.current.error).toBeNull();
    expect(hook.result.current.data?.matches).toEqual([]);
    fixture.respond("GET", ranking("completed"));
    await tick(3_000);
    expect(hook.result.current.data).toEqual(ranking("completed"));
    await tick(180_000);
    expect(fixture.calls("GET")).toHaveLength(4);
    expect(fixture.calls("POST")).toHaveLength(0);
  });

  it.each(["network", "503"] as const)("retains cached results after a %s refetch exhausts its retry", async (failure) => {
    const hook = mount();
    await settle();
    const previous = hook.result.current.data;
    const message = failure === "network" ? "Failed to fetch" : "Cannot check rankings right now";
    fixture.handle("GET", () => {
      if (failure === "network") throw new TypeError(message);
      return { body: { detail: message }, status: 503 };
    });
    act(() => { void hook.queryClient.refetchQueries({ queryKey: ["ai-brand-matches", "v3"] }); });
    await settle();
    await tick(1_000);
    expect(hook.result.current.error).toBe(message);
    expect(hook.result.current.data).toEqual(previous);
    expect(hook.queryClient.getQueryData(["ai-brand-matches", "v3"])).toEqual(previous);
    await tick(180_000);
    expect(fixture.calls("GET")).toHaveLength(3);
    expect(fixture.calls("POST")).toHaveLength(0);
  });

  it.each(["network", "503"] as const)("does not retry a failed %s refresh POST, retains results, and permits a new explicit refresh", async (failure) => {
    const hook = mount();
    await settle();
    const previous = hook.result.current.data;
    const message = failure === "network" ? "Failed to fetch" : "Unable to refresh matches right now";
    fixture.handle("POST", () => {
      if (failure === "network") throw new TypeError(message);
      return { body: { detail: message }, status: 503 };
    });
    act(() => hook.result.current.refresh());
    await settle();
    expect(hook.result.current.refreshing).toBe(false);
    expect(hook.result.current.error).toBe(message);
    expect(hook.result.current.data).toEqual(previous);
    await tick(180_000);
    expect(fixture.calls("POST")).toHaveLength(1);
    const reads = fixture.calls("GET").length;

    fixture.respond("POST", ranking("queued"));
    fixture.respond("GET", ranking("queued"));
    act(() => hook.result.current.refresh());
    await settle();
    expect(fixture.calls("POST")).toHaveLength(2);
    expect(hook.result.current.error).toBeNull();
    expect(hook.result.current.data?.status).toBe("queued");
    expect(fixture.calls("GET")).toHaveLength(reads + 1);
    fixture.respond("GET", ranking("completed", { matches: [], total: 0 }));
    await tick(3_000);
    expect(hook.result.current.data?.matches).toEqual([]);
    expect(hook.result.current.data?.status).toBe("completed");
    await tick(180_000);
    expect(fixture.calls("POST")).toHaveLength(2);
    expect(fixture.calls("GET")).toHaveLength(reads + 2);
  });

  const invalidRankings = [
    { name: "null envelope", body: null },
    { name: "unknown status", body: ranking("completed", { status: "unknown" as never }) },
    { name: "missing matches", body: { status: "completed", error: null, ranked_at: null, total: 0 } },
    { name: "invalid ranked date", body: ranking("completed", { ranked_at: "not-a-date" }) },
    { name: "negative total", body: ranking("completed", { total: -1 }) },
    { name: "invalid brand confidence", body: ranking("completed", {
      matches: [{ ...ranking("completed").matches[0], confidence: 101 }],
    }) },
  ];

  it.each(invalidRankings)("rejects a 200 GET with $name, retries only once, and never caches it", async ({ body }) => {
    fixture.respond("GET", body);
    const hook = mount();
    await settle();
    await tick(1_000);
    expect(hook.result.current.error).toBe("Invalid AI ranking response");
    expect(hook.result.current.loading).toBe(false);
    expect(hook.result.current.data).toBeUndefined();
    expect(hook.queryClient.getQueryData(["ai-brand-matches", "v3"])).toBeUndefined();
    await tick(180_000);
    expect(fixture.calls("GET")).toHaveLength(2);
    expect(fixture.calls("POST")).toHaveLength(0);
  });

  it.each(invalidRankings)("rejects a 200 refresh POST with $name without overwriting prior results", async ({ body }) => {
    const hook = mount();
    await settle();
    const previous = hook.result.current.data;
    fixture.respond("POST", body);
    act(() => hook.result.current.refresh());
    await settle();
    expect(hook.result.current.error).toBe("Invalid AI ranking response");
    expect(hook.result.current.refreshing).toBe(false);
    expect(hook.result.current.data).toEqual(previous);
    expect(hook.queryClient.getQueryData(["ai-brand-matches", "v3"])).toEqual(previous);
    await tick(180_000);
    expect(fixture.calls("POST")).toHaveLength(1);
    fixture.respond("POST", ranking("queued"));
    fixture.respond("GET", ranking("queued"));
    act(() => hook.result.current.refresh());
    await settle();
    expect(fixture.calls("POST")).toHaveLength(2);
    expect(hook.result.current.error).toBeNull();
    expect(hook.result.current.data?.status).toBe("queued");
  });

  it.each([
    { status: 401, body: { detail: "Your session has expired. Please sign in again." }, event: "mavlit:unauthorized" },
    { status: 403, body: { detail: "Complete your creator profile to view matches." }, event: "mavlit:profile-incomplete" },
    { status: 403, body: { detail: { error: "profile_incomplete" }, message: "Complete your creator profile." }, event: "mavlit:profile-incomplete" },
  ])("does not retry GET $status ($event) and emits the expected session event", async ({ status, body, event }) => {
    const dispatch = vi.spyOn(window, "dispatchEvent");
    fixture.respond("GET", body, "v3", status);
    const hook = mount();
    await settle();
    expect(hook.result.current.loading).toBe(false);
    expect(hook.result.current.error).toBe(body.message ?? body.detail);
    expect(dispatch).toHaveBeenCalledWith(expect.objectContaining({ type: event }));
    expect(dispatch).not.toHaveBeenCalledWith(expect.objectContaining({
      type: status === 401 ? "mavlit:profile-incomplete" : "mavlit:unauthorized",
    }));
    await tick(180_000);
    expect(fixture.calls("GET")).toHaveLength(1);
    expect(fixture.calls("POST")).toHaveLength(0);
  });

  it.each([401, 403])("does not retry refresh POST %s, retains prior data, and emits the expected session event", async (status) => {
    const hook = mount();
    await settle();
    const previous = hook.result.current.data;
    const dispatch = vi.spyOn(window, "dispatchEvent");
    const message = status === 401 ? "Your session has expired. Please sign in again." : "Complete your creator profile.";
    fixture.respond("POST", { detail: message }, "v3", status);
    act(() => hook.result.current.refresh());
    await settle();
    expect(hook.result.current.error).toBe(message);
    expect(hook.result.current.refreshing).toBe(false);
    expect(hook.result.current.data).toEqual(previous);
    expect(dispatch).toHaveBeenCalledWith(expect.objectContaining({
      type: status === 401 ? "mavlit:unauthorized" : "mavlit:profile-incomplete",
    }));
    await tick(180_000);
    expect(fixture.calls("POST")).toHaveLength(1);
  });
});

describe("legacy V2 stays separate from V3", () => {
  it("keeps its 5-second cadence and independent cache without the V3 timeout", async () => {
    fixture.respond("GET", ranking("running"), "v2");
    const { Wrapper, queryClient } = matchesWrapper();
    const hook = renderHook(() => ({
      v2: useAiMatches("v2", true),
      v3: useAiMatches("v3", true),
    }), { wrapper: Wrapper });
    await settle();
    expect(hook.result.current.v3.data?.status).toBe("completed");
    expect(hook.result.current.v2.data?.status).toBe("running");
    await tick(4_999);
    expect(fixture.calls("GET", "v2")).toHaveLength(1);
    await tick(1);
    expect(fixture.calls("GET", "v2")).toHaveLength(2);
    await tick(180_000);
    expect(hook.result.current.v2.timedOut).toBe(false);
    expect(fixture.calls("GET", "v2")).toHaveLength(38);
    expect(fixture.calls("GET", "v3")).toHaveLength(1);
    expect(queryClient.getQueryData(["ai-brand-matches", "v2"])).toEqual(ranking("running"));
    expect(queryClient.getQueryData(["ai-brand-matches", "v3"])).toEqual(ranking("completed"));
    expect(fixture.calls("POST", "v2")).toHaveLength(0);
  });
});
