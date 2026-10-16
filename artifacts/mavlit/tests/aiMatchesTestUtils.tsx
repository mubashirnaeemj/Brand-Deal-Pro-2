import type { ReactNode } from "react";
import { act } from "@testing-library/react";
import { notifyManager, QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { vi } from "vitest";

export function matchesWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: Infinity, refetchOnWindowFocus: false },
      mutations: { retry: false },
    },
  });
  const Wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  return { Wrapper, queryClient };
}

export function startMatchesClock() {
  vi.useFakeTimers();
  // Only observer notifications use microtasks. Polling and deadline timers are
  // unchanged, so a nested zero-delay notification cannot add a fake 1ms delay
  // to a render at the exact 3-second boundary.
  notifyManager.setScheduler(queueMicrotask);
}

export function stopMatchesClock() {
  notifyManager.setScheduler((callback) => setTimeout(callback, 0));
  vi.useRealTimers();
}

// Flush fetch/json promises without real sleeps. Advance one boundary at a time
// when asserting exact poll cadence.
export async function settle() {
  await act(async () => { await vi.advanceTimersByTimeAsync(0); });
  await act(async () => { await vi.advanceTimersByTimeAsync(0); });
}

export async function tick(ms: number) {
  await act(async () => { await vi.advanceTimersByTimeAsync(ms); });
  await settle();
}
