import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import App from "@/App";
import { api, ApiRequestError } from "@/lib/api";

const json = (body: unknown, status: number) => new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
const stubFetch = (handler: (path: string, init?: RequestInit) => Response | Promise<Response>) => {
  const calls: { path: string; init?: RequestInit }[] = [];
  vi.stubGlobal("fetch", vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const path = new URL(String(input), window.location.origin).pathname.replace("/api/mavlit", "");
    calls.push({ path, init });
    return handler(path, init);
  }));
  return calls;
};

async function messageOf(promise: Promise<unknown>): Promise<string> {
  try { await promise; } catch (error) { return (error as Error).message; }
  return "(no error)";
}

describe("friendly messages for the cost caps", () => {
  it.each([
    ["/pitches"], ["/pitches/stream"], ["/rate-intelligence"], ["/contract-advice"], ["/own-brands"],
    ["/matches/me/v3/refresh"], ["/matches/me/v2/refresh"], ["/creator-profile/me/generate-description"],
  ])("429 on POST %s says the daily limit is reached", async (path) => {
    stubFetch(() => json({ detail: "You have used your 30 pitches for today, which is the daily limit." }, 429));
    expect(await messageOf(api.post(path, {}))).toBe("Daily limit reached, try again tomorrow");
  });

  it("keeps the server's own wording for a 429 anywhere else (login lockout, logout-all, manual pitches)", async () => {
    for (const path of ["/auth/login", "/auth/logout-all", "/pitches/manual", "/saved-brands"]) {
      stubFetch(() => json({ detail: "Too many failed sign-in attempts. Try again in 15 minutes." }, 429));
      expect(await messageOf(api.post(path, {}))).toBe("Too many failed sign-in attempts. Try again in 15 minutes.");
    }
  });

  it.each([["/pitches"], ["/pitches/stream"]])("409 on POST %s says another request is already running", async (path) => {
    stubFetch(() => json({ detail: "Another pitch is already being written for you." }, 409));
    expect(await messageOf(api.post(path, {}))).toBe("Another request is already running");
  });

  it("keeps the server's wording for other 409s (saved-brands cap, profile save during a description job, pitch transitions)", async () => {
    stubFetch(() => json({ detail: "You can save up to 500 brands." }, 409));
    expect(await messageOf(api.post("/saved-brands", { brand_id: 1 }))).toBe("You can save up to 500 brands.");
    stubFetch(() => json({ detail: "A description is still being generated." }, 409));
    expect(await messageOf(api.put("/creator-profile/me", {}))).toBe("A description is still being generated.");
    stubFetch(() => json({ detail: "Cannot transition from closed_won to sent" }, 409));
    expect(await messageOf(api.patch("/pitches/3", { status: "sent" }))).toBe("Cannot transition from closed_won to sent");
  });

  it("the status is still available on the error", async () => {
    stubFetch(() => json({ detail: "x" }, 429));
    const error = await api.post("/contract-advice", {}).catch((e) => e);
    expect(error).toBeInstanceOf(ApiRequestError);
    expect((error as ApiRequestError).status).toBe(429);
  });
});

describe("403 profile_incomplete", () => {
  it("still raises the profile-incomplete event for the object body the server now sends", async () => {
    const seen = vi.fn();
    window.addEventListener("mavlit:profile-incomplete", seen);
    stubFetch(() => json({ detail: { error: "profile_incomplete", message: "Complete your creator profile before accessing the application" } }, 403));
    await api.get("/saved-brands/me").catch(() => undefined);
    window.removeEventListener("mavlit:profile-incomplete", seen);
    expect(seen).toHaveBeenCalledTimes(1);
  });
});

describe("403 password_change_required", () => {
  beforeEach(() => { window.history.replaceState(null, "", "/dashboard"); });

  it("shows a clear message and a log-out button instead of a generic error, and logging out works", async () => {
    const calls = stubFetch((path) => {
      if (path === "/creator-profile/me") return json({ detail: { code: "password_change_required", message: "You must set a new password before you can continue." } }, 403);
      if (path === "/auth/logout") return json({ message: "Logged out" }, 200);
      return json({ detail: "unexpected" }, 500);
    });
    render(<App />);
    expect(await screen.findByTestId("password-change-required")).toBeInTheDocument();
    expect(screen.getByRole("alert")).toHaveTextContent(/change your password|new password/i);
    expect(screen.queryByText(/Couldn't check your session/)).not.toBeInTheDocument();
    fireEvent.click(screen.getByTestId("button-logout-password-change"));
    await waitFor(() => expect(calls.some((c) => c.path === "/auth/logout" && c.init?.method === "POST")).toBe(true));
    await waitFor(() => expect(screen.queryByTestId("password-change-required")).not.toBeInTheDocument());
  });

  it("the error carries its code and raises the event", async () => {
    const seen = vi.fn();
    window.addEventListener("mavlit:password-change-required", seen);
    stubFetch(() => json({ detail: { code: "password_change_required", message: "x" } }, 403));
    const error = await api.get("/pitches/me").catch((e) => e);
    window.removeEventListener("mavlit:password-change-required", seen);
    expect((error as ApiRequestError).code).toBe("password_change_required");
    expect(seen).toHaveBeenCalledTimes(1);
  });
});
