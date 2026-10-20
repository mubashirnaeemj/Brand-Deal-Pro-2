import { act, cleanup, fireEvent, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import ProfileSettings from "@/pages/ProfileSettings";
import OnboardingPage from "@/pages/OnboardingPage";
import { useAuth } from "@/contexts/AuthContext";
import { renderProfile } from "./renderProfile";
import { creatorProfile } from "./fixtures/creatorProfile";
import { installProfileApi } from "./fixtures/profileApi";

let fixture: ReturnType<typeof installProfileApi>;
async function settle() { for (let i = 0; i < 15; i++) await act(async () => { await Promise.resolve(); }); }
async function tick(ms: number) { await act(async () => { await vi.advanceTimersByTimeAsync(ms); }); await settle(); }
afterEach(() => { cleanup(); fixture?.assertIsolated(); vi.useRealTimers(); });
function details(mode: "manual" | "generate" = "generate") {
  if (screen.queryByText("Step 1 of 3")) fireEvent.click(screen.getByRole("button", { name: "Continue" }));
  if (screen.queryByText("Step 2 of 3")) {
    fireEvent.click(screen.getByRole("tab", { name: mode === "manual" ? "Write it myself" : /Let MAVLIT generate/ }));
    fireEvent.click(screen.getByRole("button", { name: "Continue" }));
  }
}
async function mount(start = true) {
  vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
  fixture = installProfileApi(creatorProfile({ primary_platform: "instagram", instagram_description: null }));
  fixture.allowGeneration();
  const rendered = renderProfile(<ProfileSettings />);
  await settle();
  details();
  if (start) { fireEvent.click(screen.getByTestId("button-generate")); await settle(); }
  return rendered;
}
function finish(extra: Record<string, unknown> = {}) {
  fixture.replaceOnServer({
    ...fixture.persisted, instagram_description_status: "completed",
    instagram_description: "Generated creator description", instagram_audience_gender: "female",
    instagram_audience_age_min: 18, instagram_audience_age_max: 34,
    instagram_audience_description: "Young musicians learning guitar.",
    instagram_followers: 9876, follower_count: 9876, instagram_sub_niches: ["Guitar"],
    ...extra,
  });
}
function AuthProbe() {
  const { user } = useAuth();
  return <><output data-testid="auth-name">{user?.full_name || ""}</output><OnboardingPage /></>;
}

describe("Instagram wizard generation", () => {
  it("polls every 1.5 seconds, fills every generated read-only field, saves and reloads", async () => {
    const rendered = await mount();
    const initialReads = fixture.requests.filter((r) => r.method === "GET").length;
    await tick(1499);
    expect(fixture.requests.filter((r) => r.method === "GET")).toHaveLength(initialReads);
    finish();
    await tick(1);
    expect(screen.getByLabelText("instagram audience gender")).toHaveValue("female");
    expect(screen.getByLabelText("instagram audience gender")).toBeDisabled();
    expect(screen.getByLabelText("instagram audience age range")).toHaveValue("18-34");
    expect(screen.getByLabelText("Instagram audience description")).toHaveValue("Young musicians learning guitar.");
    expect(screen.getByLabelText("Instagram audience description")).toBeDisabled();
    expect(screen.getByTestId("input-followers")).toHaveValue(9876);
    expect(screen.getByTestId("input-followers")).toHaveAttribute("readonly");
    expect(screen.getByTestId("input-followers")).toBeDisabled();
    expect(screen.getByTestId("input-description")).toHaveValue("Generated creator description");
    expect(screen.getByTestId("input-description")).toHaveAttribute("readonly");
    expect(screen.getByLabelText("Instagram content description")).toBeDisabled();
    expect(screen.getByRole("button", { name: "Save Profile" })).toBeEnabled();
    fireEvent.click(screen.getByRole("button", { name: "Save Profile" }));
    await settle();
    expect(fixture.persisted).toMatchObject({
      primary_platform: "instagram", instagram_followers: 9876, instagram_sub_niches: ["Guitar"],
      instagram_audience_gender: "female", instagram_audience_age_min: 18, instagram_audience_age_max: 34,
      instagram_audience_description: "Young musicians learning guitar.",
      instagram_description_mode: "generate",
    });
    const sent = fixture.writes.at(-1)!.body as Record<string, unknown>;
    expect(Object.keys(sent).some((key) => key.endsWith("_pct"))).toBe(false);
    const reads = fixture.requests.length;
    await tick(5000);
    expect(fixture.requests).toHaveLength(reads);
    rendered.unmount();
    renderProfile(<ProfileSettings />);
    await settle();
    details();
    expect(screen.getByTestId("input-followers")).toHaveValue(9876);
    expect(screen.getByLabelText("instagram audience age range")).toHaveValue("18-34");
  });

  it("exposes only the allowed editable fields in generate mode and blocks Save before generation", async () => {
    await mount(false);
    expect(screen.getByTestId("input-username")).toBeEnabled();
    expect(screen.getByTestId("input-brand-preferences")).toBeEnabled();
    expect(screen.getByTestId("input-followers")).toHaveAttribute("readonly");
    expect(screen.getByLabelText("instagram audience age range")).toBeDisabled();
    expect(screen.getByRole("button", { name: "Save Profile" })).toBeDisabled();
    expect(fixture.writes).toHaveLength(0);
  });

  it("does not PUT while generation is queued/running and allows Back and Exit", async () => {
    await mount();
    expect(fixture.writes).toHaveLength(1); // identity prerequisites before POST
    expect(screen.getByRole("button", { name: "Save Profile" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Back" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "Exit" })).toBeEnabled();
    await tick(3000);
    expect(fixture.writes).toHaveLength(1);
  });

  it("requires regeneration if username or primary niche changes after completion", async () => {
    await mount();
    finish();
    await tick(1500);
    fireEvent.change(screen.getByTestId("input-username"), { target: { value: "changed_username" } });
    expect(screen.getByRole("button", { name: "Save Profile" })).toBeDisabled();
    fireEvent.change(screen.getByTestId("input-username"), { target: { value: "fixture_creator" } });
    expect(screen.getByRole("button", { name: "Save Profile" })).toBeEnabled();
  });

  it("stops when the watched job ID changes without adopting the replacement", async () => {
    await mount();
    finish({ instagram_description_job_id: "replacement-job" });
    await tick(1500);
    expect(screen.getByLabelText("instagram audience gender")).toHaveValue("");
    expect(screen.getByText(/generation job changed/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Save Profile" })).toBeDisabled();
    const reads = fixture.requests.length;
    await tick(5000);
    expect(fixture.requests).toHaveLength(reads);
  });

  it("shows backend failures and stops polling", async () => {
    await mount();
    fixture.replaceOnServer({ ...fixture.persisted, instagram_description_status: "failed", instagram_description_error: "Unable to read this bio." });
    await tick(1500);
    expect(screen.getByText(/Unable to read this bio/)).toBeInTheDocument();
    const reads = fixture.requests.length;
    await tick(5000);
    expect(fixture.requests).toHaveLength(reads);
  });

  it("leaves null estimates empty", async () => {
    await mount();
    finish({ instagram_audience_gender: null, instagram_audience_age_min: null, instagram_audience_age_max: null });
    await tick(1500);
    expect(screen.getByLabelText("instagram audience gender")).toHaveValue("");
    expect(screen.getByLabelText("instagram audience age range")).toHaveValue("");
  });

  it("switching to manual unlocks fields and protects manual edits while a job finishes", async () => {
    await mount();
    fireEvent.click(screen.getByRole("button", { name: "Back" }));
    fireEvent.click(screen.getByRole("tab", { name: "Write it myself" }));
    fireEvent.click(screen.getByRole("button", { name: "Continue" }));
    fireEvent.change(screen.getByLabelText("instagram audience gender"), { target: { value: "male" } });
    fireEvent.change(screen.getByTestId("input-description"), { target: { value: "My own text" } });
    finish();
    await tick(1500);
    expect(screen.getByLabelText("instagram audience gender")).toHaveValue("male");
    expect(screen.getByTestId("input-description")).toHaveValue("My own text");
    expect(screen.getByTestId("input-followers")).not.toHaveAttribute("readonly");
    expect(screen.getByTestId("input-followers")).toBeEnabled();
    expect(screen.getByLabelText("Instagram content description")).toBeEnabled();
  });

  it("stops checks on unmount and recovers completed values from a persisted pending draft", async () => {
    const rendered = await mount();
    rendered.unmount();
    const reads = fixture.requests.length;
    finish();
    await tick(5000);
    expect(fixture.requests).toHaveLength(reads);
    renderProfile(<ProfileSettings />);
    await settle();
    expect(screen.getByText("Step 3 of 3")).toBeInTheDocument();
    expect(screen.getByTestId("input-followers")).toHaveValue(9876);
    expect(screen.getByLabelText("instagram audience age range")).toHaveValue("18-34");
    expect(screen.getByRole("button", { name: "Save Profile" })).toBeEnabled();
  });

  it("lets new creators generate without requiring manual follower counts, then explicitly save", async () => {
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
    fixture = installProfileApi(creatorProfile({
      full_name: null, age: null, gender: null, follower_count: null, instagram_followers: null,
      content_description: null, instagram_description: null, youtube_description: null,
    }));
    fixture.allowGeneration();
    renderProfile(<AuthProbe />);
    await settle();
    fireEvent.change(screen.getByTestId("input-full-name"), { target: { value: "New Creator" } });
    fireEvent.change(screen.getByTestId("input-age"), { target: { value: "24" } });
    fireEvent.change(screen.getByTestId("select-gender"), { target: { value: "Female" } });
    details();
    fireEvent.click(screen.getByTestId("button-generate"));
    await settle();
    expect(screen.getByTestId("auth-name")).toHaveTextContent("");
    finish();
    await tick(1500);
    expect(screen.getByTestId("auth-name")).toHaveTextContent("");
    fireEvent.change(screen.getByTestId("input-brand-preferences"), { target: { value: "Keep this after generation" } });
    await settle();
    expect(JSON.parse(localStorage.getItem(`mavlit_profile_draft:${fixture.persisted.id}`)!))
      .toMatchObject({ brandPreferences: "Keep this after generation", wizardStep: 3 });
    const confirm = vi.spyOn(window, "confirm").mockReturnValue(false);
    fireEvent.click(screen.getByRole("button", { name: "Exit" }));
    expect(confirm).toHaveBeenCalledWith("Exit setup and sign out? Your draft will be kept on this device.");
    expect(screen.getByText("Step 3 of 3")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Save Profile" }));
    await settle();
    expect(screen.getByTestId("auth-name")).toHaveTextContent("New Creator");
    expect(fixture.persisted).toMatchObject({ primary_platform: "instagram", instagram_followers: 9876, gender: "Female" });
  });
});
