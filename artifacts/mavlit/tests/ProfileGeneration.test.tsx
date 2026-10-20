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
  vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout", "Date"] });
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
  it("polls every 1.5 seconds, reaches 100% early, reveals editable fields, saves and reloads", async () => {
    const rendered = await mount();
    const initialReads = fixture.requests.filter((r) => r.method === "GET").length;
    await tick(1499);
    expect(fixture.requests.filter((r) => r.method === "GET")).toHaveLength(initialReads);
    finish();
    await tick(1);
    expect(screen.getByTestId("generation-percentage")).toHaveTextContent("100%");
    expect(screen.getByRole("button", { name: "Save Profile" })).toBeDisabled();
    expect(screen.queryByTestId("input-followers")).not.toBeInTheDocument();
    await tick(450);
    expect(screen.getByLabelText("instagram audience gender")).toHaveValue("female");
    expect(screen.getByLabelText("instagram audience gender")).toBeEnabled();
    expect(screen.getByLabelText("instagram audience age range")).toHaveValue("18-34");
    expect(screen.getByLabelText("Instagram audience description")).toHaveValue("Young musicians learning guitar.");
    expect(screen.getByLabelText("Instagram audience description")).toBeEnabled();
    expect(screen.getByTestId("input-followers")).toHaveValue(9876);
    expect(screen.getByTestId("input-followers")).not.toHaveAttribute("readonly");
    expect(screen.getByTestId("input-followers")).toBeEnabled();
    expect(screen.getByTestId("input-description")).toHaveValue("Generated creator description");
    expect(screen.getByTestId("input-description")).not.toHaveAttribute("readonly");
    expect(screen.getByLabelText("Instagram content description")).toBeEnabled();
    fireEvent.change(screen.getByTestId("input-followers"), { target: { value: "10001" } });
    fireEvent.change(screen.getByTestId("input-description"), { target: { value: "My corrected content description" } });
    fireEvent.change(screen.getByLabelText("Instagram audience description"), { target: { value: "My corrected audience" } });
    fireEvent.change(screen.getByLabelText("instagram audience age range"), { target: { value: "25-44" } });
    expect(screen.getByRole("button", { name: "Save Profile" })).toBeEnabled();
    fireEvent.click(screen.getByRole("button", { name: "Save Profile" }));
    await settle();
    expect(fixture.persisted).toMatchObject({
      primary_platform: "instagram", instagram_followers: 10001, instagram_sub_niches: ["Guitar"],
      instagram_audience_gender: "female", instagram_audience_age_min: 25, instagram_audience_age_max: 44,
      instagram_audience_description: "My corrected audience",
      instagram_description: "My corrected content description",
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
    expect(screen.getByTestId("input-followers")).toHaveValue(10001);
    expect(screen.getByLabelText("instagram audience age range")).toHaveValue("25-44");
  });

  it("shows only username and primary niches with both Generate and disabled Save Profile", async () => {
    await mount(false);
    expect(screen.getByTestId("input-username")).toBeEnabled();
    expect(screen.getByText("Primary niches")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "2 selected" })).toBeEnabled();
    expect(screen.queryByTestId("input-brand-preferences")).not.toBeInTheDocument();
    expect(screen.queryByTestId("input-followers")).not.toBeInTheDocument();
    expect(screen.queryByTestId("input-description")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("instagram audience age range")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Sub-niches/ })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Save Profile" })).toBeDisabled();
    expect(screen.getAllByRole("button", { name: "Generate" })).toHaveLength(1);
    expect(fixture.writes).toHaveLength(0);
  });

  it.each(["GET", "PUT"] as const)("retains generated-profile corrections and the review step after a failed %s save and reload", async (method) => {
    const rendered = await mount();
    finish();
    await tick(1500);
    await tick(450);
    fireEvent.change(screen.getByTestId("input-followers"), { target: { value: "25000" } });
    fireEvent.change(screen.getByTestId("input-description"), { target: { value: "Retain my reviewed description" } });
    if (method === "GET") fixture.failGet("Fixture read failed");
    else fixture.failPut("Fixture save failed");
    fireEvent.click(screen.getByRole("button", { name: "Save Profile" }));
    await settle();
    expect(screen.getByTestId("text-error")).toHaveTextContent(method === "GET" ? "Fixture read failed" : "Fixture save failed");
    fixture.failGet(null);
    fixture.failPut(null);
    rendered.unmount();
    renderProfile(<ProfileSettings />);
    await settle();
    expect(screen.getByText("Step 3 of 3")).toBeInTheDocument();
    expect(screen.getByTestId("input-followers")).toHaveValue(25000);
    expect(screen.getByTestId("input-description")).toHaveValue("Retain my reviewed description");
    expect(screen.getByRole("button", { name: "Save Profile" })).toBeEnabled();
  });

  it("does not PUT while generation is queued/running and allows Back and Exit", async () => {
    await mount();
    expect(fixture.writes).toHaveLength(1); // identity prerequisites before POST
    expect(screen.getByRole("button", { name: "Generating" })).toBeDisabled();
    expect(screen.getByTestId("generation-progress-screen")).toBeInTheDocument();
    expect(screen.queryByTestId("input-username")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Back" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "Exit" })).toBeEnabled();
    await tick(3000);
    expect(fixture.writes).toHaveLength(1);
  });

  it("allows username corrections after generation and preserves unsaved corrections on reload", async () => {
    const rendered = await mount();
    finish();
    await tick(1500);
    await tick(450);
    fireEvent.change(screen.getByTestId("input-username"), { target: { value: "changed_username" } });
    fireEvent.change(screen.getByTestId("input-followers"), { target: { value: "12000" } });
    fireEvent.change(screen.getByTestId("input-description"), { target: { value: "Keep my correction" } });
    await settle();
    rendered.unmount();
    renderProfile(<ProfileSettings />);
    await settle();
    expect(screen.getByTestId("input-username")).toHaveValue("changed_username");
    expect(screen.getByTestId("input-followers")).toHaveValue(12000);
    expect(screen.getByTestId("input-description")).toHaveValue("Keep my correction");
    expect(screen.getByRole("button", { name: "Save Profile" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "Generate" })).toBeEnabled();
    fireEvent.click(screen.getByRole("button", { name: "Save Profile" }));
    await settle();
    expect(fixture.persisted).toMatchObject({ instagram_handle: "changed_username", instagram_followers: 12000, instagram_description: "Keep my correction" });
  });

  it("stops when the watched job ID changes without adopting the replacement", async () => {
    await mount();
    finish({ instagram_description_job_id: "replacement-job" });
    await tick(1500);
    expect(screen.queryByLabelText("instagram audience gender")).not.toBeInTheDocument();
    expect(screen.getByText(/generation job changed/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Generate" })).toBeEnabled();
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
    expect(screen.getByRole("button", { name: "Generate" })).toBeEnabled();
    fireEvent.click(screen.getByRole("button", { name: "Generate" }));
    await settle();
    expect(screen.getByTestId("generation-progress-screen")).toBeInTheDocument();
    expect(fixture.requests.filter((request) => request.method === "POST")).toHaveLength(2);
  });

  it("animates over two minutes but never reveals fields or claims 100% before the backend finishes", async () => {
    await mount();
    await tick(60000);
    expect(screen.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "47");
    await tick(60000);
    expect(screen.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "95");
    expect(screen.getByText(/taking a little longer/)).toBeInTheDocument();
    expect(screen.queryByTestId("input-followers")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Save Profile" })).toBeDisabled();
    expect(fixture.writes).toHaveLength(1);
    finish();
    await tick(1500);
    expect(screen.getByTestId("generation-percentage")).toHaveTextContent("100%");
    await tick(450);
    expect(screen.getByRole("button", { name: "Save Profile" })).toBeEnabled();
    expect(screen.getByTestId("input-followers")).toBeEnabled();
  });

  it("restores the estimated percentage after leaving and returning to a pending job", async () => {
    const rendered = await mount();
    await tick(60000);
    rendered.unmount();
    renderProfile(<ProfileSettings />);
    await settle();
    expect(screen.getByText("Step 3 of 3")).toBeInTheDocument();
    expect(screen.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "47");
    finish();
    await tick(1500);
    await tick(450);
    expect(screen.getByTestId("input-followers")).toBeEnabled();
  });

  it("does not accept a completed response missing the generated content", async () => {
    await mount();
    finish({ instagram_description: null });
    await tick(1500);
    expect(screen.getByText(/Generation finished without a content description/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Save Profile" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Generate" })).toBeEnabled();
  });

  it("validates the username before making generation requests", async () => {
    await mount(false);
    fireEvent.change(screen.getByTestId("input-username"), { target: { value: "" } });
    fireEvent.click(screen.getByRole("button", { name: "Generate" }));
    await settle();
    expect(screen.getByRole("alert")).toHaveTextContent(/Enter your Instagram username/);
    expect(fixture.writes).toHaveLength(0);
    expect(fixture.requests.filter((request) => request.method === "POST")).toHaveLength(0);
  });

  it("leaves null estimates empty", async () => {
    await mount();
    finish({ instagram_audience_gender: null, instagram_audience_age_min: null, instagram_audience_age_max: null });
    await tick(1500);
    await tick(450);
    expect(screen.getByLabelText("instagram audience gender")).toHaveValue("");
    expect(screen.getByLabelText("instagram audience age range")).toHaveValue("");
  });

  it("shows a missing audience description notice and saves a manual correction instead of null", async () => {
    const rendered = await mount();
    finish({ instagram_audience_description: null });
    await tick(1500);
    await tick(450);
    expect(screen.getByLabelText("Instagram audience description")).toHaveValue("");
    expect(screen.getByTestId("audience-description-missing")).toHaveTextContent("MAVLIT returned no audience description");
    expect(screen.getByRole("button", { name: "Generate" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "Save Profile" })).toBeEnabled();
    fireEvent.change(screen.getByLabelText("Instagram audience description"), { target: { value: "Guitar students aged 25-44." } });
    expect(screen.queryByTestId("audience-description-missing")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Save Profile" }));
    await settle();
    expect(fixture.persisted.instagram_audience_description).toBe("Guitar students aged 25-44.");
    rendered.unmount();
    renderProfile(<ProfileSettings />);
    await settle();
    details();
    expect(screen.getByLabelText("Instagram audience description")).toHaveValue("Guitar students aged 25-44.");
    expect(screen.queryByTestId("audience-description-missing")).not.toBeInTheDocument();
  });

  it("keeps Generate available after completion and accepts an audience description from a new generation", async () => {
    await mount();
    finish({ instagram_audience_description: null });
    await tick(1500);
    await tick(450);
    fireEvent.click(screen.getByRole("button", { name: "Generate" }));
    await settle();
    expect(screen.getByRole("button", { name: "Generating" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Save Profile" })).toBeDisabled();
    expect(fixture.requests.filter((request) => request.method === "POST")).toHaveLength(2);
    finish({ instagram_audience_description: "Newly generated audience description." });
    await tick(1500);
    await tick(450);
    expect(screen.getByLabelText("Instagram audience description")).toHaveValue("Newly generated audience description.");
    expect(screen.queryByTestId("audience-description-missing")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Generate" })).toBeEnabled();
    fireEvent.click(screen.getByRole("button", { name: "Save Profile" }));
    await settle();
    expect(fixture.persisted.instagram_audience_description).toBe("Newly generated audience description.");
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
    await tick(450);
    expect(screen.getByText("Step 3 of 3")).toBeInTheDocument();
    expect(screen.getByTestId("input-followers")).toHaveValue(9876);
    expect(screen.getByLabelText("instagram audience age range")).toHaveValue("18-34");
    expect(screen.getByRole("button", { name: "Save Profile" })).toBeEnabled();
  });

  it("lets new creators generate without requiring manual follower counts, then explicitly save", async () => {
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout", "Date"] });
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
    await tick(450);
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
