import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import useAiRankingMessage from "@/hooks/useAiRankingMessage";

beforeEach(() => { vi.useFakeTimers(); });
afterEach(() => { vi.useRealTimers(); });

describe("ranking progress lines", () => {
  it("changes the line every 5 seconds while the ranking runs, never repeating the previous one", () => {
    const { result } = renderHook(() => useAiRankingMessage(true));
    const seen = new Set<string>([result.current]);
    let previous = result.current;
    for (let i = 0; i < 200; i += 1) {
      act(() => { vi.advanceTimersByTime(5_000); });
      expect(result.current).not.toBe(previous);
      previous = result.current;
      seen.add(previous);
    }
    expect(seen.size).toBeGreaterThan(30);                                  // a big pool, not the original six
    expect([...seen].every((line) => line.length > 10 && /(…|\.\.\.)$/.test(line))).toBe(true);
  });

  it("includes the original lines and the 50 added ones (56 in all)", () => {
    // Collect the whole pool by running long enough.
    const { result } = renderHook(() => useAiRankingMessage(true));
    const seen = new Set<string>([result.current]);
    for (let i = 0; i < 4000; i += 1) { act(() => { vi.advanceTimersByTime(5_000); }); seen.add(result.current); }
    expect(seen.size).toBe(56);
    expect(seen.has("Polishing your top matches…")).toBe(true);
    expect(seen.has("Getting to know your content style...")).toBe(true);
    expect(seen.has("Finding your next great brand partnership...")).toBe(true);
  });

  it("does not rotate while nothing is running", () => {
    const { result } = renderHook(() => useAiRankingMessage(false));
    const first = result.current;
    act(() => { vi.advanceTimersByTime(60_000); });
    expect(result.current).toBe(first);
  });
});
