import { act, cleanup, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
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
