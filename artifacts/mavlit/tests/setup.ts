import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach, beforeEach, vi } from "vitest";

beforeEach(() => {
  sessionStorage.clear();
  localStorage.clear();
  window.history.replaceState(null, "", "/profile");
  // Even tests without a fixture must never fall through to a real API.
  vi.stubGlobal("fetch", vi.fn(() => {
    throw new Error("Network access is forbidden in regression tests.");
  }));
});

afterEach(() => {
  cleanup();
  sessionStorage.clear();
  localStorage.clear();
});
