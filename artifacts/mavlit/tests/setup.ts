import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach, beforeEach, vi } from "vitest";

beforeEach(() => {
  vi.spyOn(window, "scrollTo").mockImplementation(() => {});
  sessionStorage.clear();
  localStorage.clear();
  window.history.replaceState(null, "", "/profile");
  // jsdom has no object URLs; give each picture a distinct, inspectable one.
  let pictures = 0;
  URL.createObjectURL = vi.fn(() => `blob:picture-${++pictures}`);
  URL.revokeObjectURL = vi.fn();
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
