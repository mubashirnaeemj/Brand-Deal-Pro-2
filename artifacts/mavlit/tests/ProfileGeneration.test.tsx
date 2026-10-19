import { act, cleanup, fireEvent, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import ProfileSettings from "@/pages/ProfileSettings";
import OnboardingPage from "@/pages/OnboardingPage";
import { useAuth } from "@/contexts/AuthContext";
import { profileToForm } from "@/pages/profileForm";
import { renderProfile } from "./renderProfile";
import { creatorProfile } from "./fixtures/creatorProfile";
import { installProfileApi } from "./fixtures/profileApi";

let fixture: ReturnType<typeof installProfileApi>;
async function settle() {
  for (let i = 0; i < 15; i++) await act(async () => { await Promise.resolve(); });
}
async function tick(ms: number) {
  await act(async () => { await vi.advanceTimersByTimeAsync(ms); });
  await settle();
}
afterEach(() => {
  cleanup();
  fixture?.assertIsolated();
  vi.useRealTimers();
});

async function mount(platform: "instagram" | "youtube" = "instagram") {
  vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
  fixture = installProfileApi(creatorProfile({ primary_platform: platform }));
  fixture.allowGeneration();
  const rendered = renderProfile(<ProfileSettings />);
  await settle();
  const radios = screen.getAllByRole("radio", { name: /Let MAVLIT generate/ });
  fireEvent.click(radios[0]);
  fireEvent.click(screen.getByRole("button", { name: "Generate description" }));
  await settle();
  return rendered;
}
function finish(platform: "instagram" | "youtube", extra: Record<string, unknown> = {}) {
  fixture.replaceOnServer({
    ...fixture.persisted,
    [`${platform}_description_status`]: "completed",
    [`${platform}_description`]: "Generated creator description",
    [`${platform}_audience_gender`]: "female",
    [`${platform}_audience_age_min`]: 18,
    [`${platform}_audience_age_max`]: 34,
    ...extra,
  });
}
function field(platform: string, name: string) {
  return screen.getByLabelText(`${platform} audience ${name}`);
}
function ReadyOnboarding() {
  const { user } = useAuth();
  return user ? <OnboardingPage /> : null;
}
describe("description audience auto-fill", () => {
  it.each(["instagram", "youtube"] as const)("fills %s estimates, allows edits, saves and reloads with no legacy percentage writes", async (platform) => {
    const rendered = await mount(platform);
    expect(fixture.requests.filter((request) => request.method === "POST")).toHaveLength(1);
    const initialReads = fixture.requests.filter((request) => request.method === "GET").length;
    await tick(1499);
    expect(fixture.requests.filter((request) => request.method === "GET")).toHaveLength(initialReads);
    finish(platform);
    await tick(1);
    expect(field(platform, "gender")).toHaveValue("female");
    expect(field(platform, "age from")).toHaveValue(18);
    expect(field(platform, "age to")).toHaveValue(34);
    expect(screen.getByText("Estimated by MAVLIT from your bio and recent content. You can edit it.")).toBeInTheDocument();
    fireEvent.change(field(platform, "gender"), { target: { value: "both" } });
    fireEvent.change(field(platform, "age from"), { target: { value: "25" } });
    fireEvent.click(screen.getByRole("button", { name: "Save Profile" }));
    await settle();
    expect(fixture.persisted).toMatchObject({
      [`${platform}_description_mode`]: "generate",
      [`${platform}_audience_gender`]: "both",
      [`${platform}_audience_age_min`]: 25,
      [`${platform}_audience_age_max`]: 34,
    });
    const reads = fixture.requests.filter((request) => request.method === "GET").length;
    await tick(10000);
    expect(fixture.requests.filter((request) => request.method === "GET")).toHaveLength(reads);
    rendered.unmount();
    renderProfile(<ProfileSettings />);
    await settle();
    expect(field(platform, "gender")).toHaveValue("both");
    expect(field(platform, "age from")).toHaveValue(25);
    expect(field(platform, "age to")).toHaveValue(34);
  });

  it("does not overwrite audience values typed while a generation is running", async () => {
    await mount();
    fireEvent.change(field("instagram", "gender"), { target: { value: "male" } });
    fireEvent.change(field("instagram", "age from"), { target: { value: "21" } });
    finish("instagram", { instagram_audience_age_max: null });
    await tick(1500);
    expect(field("instagram", "gender")).toHaveValue("male");
    expect(field("instagram", "age from")).toHaveValue(21);
    expect(field("instagram", "age to")).toHaveValue(null);
  });

  it("keeps a description typed during generation as well as typed audience values", async () => {
    await mount();
    fireEvent.click(screen.getByRole("radio", { name: /Write it myself/ }));
    fireEvent.change(screen.getByRole("textbox", { name: /instagram description/i }), { target: { value: "My own description" } });
    finish("instagram");
    await tick(1500);
    expect(screen.getByRole("textbox", { name: /instagram description/i })).toHaveValue("My own description");
    expect(field("instagram", "age from")).toHaveValue(18);
  });

  it("detects a job started elsewhere before saving, waits, and then saves all generated fields", async () => {
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
    fixture = installProfileApi(creatorProfile({ primary_platform: "instagram", instagram_description_mode: "generate", instagram_description: null }));
    renderProfile(<ProfileSettings />);
    await settle();
    fixture.replaceOnServer({ ...fixture.persisted, instagram_description_status: "running", instagram_description_job_id: "other-tab-job" });
    fireEvent.click(screen.getByRole("button", { name: "Save Profile" }));
    await settle();
    expect(fixture.writes).toHaveLength(0);
    for (const button of screen.getAllByRole("button", { name: "Generating…" })) expect(button).toBeDisabled();
    finish("instagram");
    await tick(1500);
    expect(field("instagram", "gender")).toHaveValue("female");
    expect(screen.getByRole("textbox", { name: /instagram description/i })).toHaveValue("Generated creator description");
    fireEvent.click(screen.getByRole("button", { name: "Save Profile" }));
    await settle();
    expect(fixture.writes).toHaveLength(1);
    expect(fixture.writes[0].body).toMatchObject({
      instagram_audience_gender: "female", instagram_audience_age_min: 18, instagram_audience_age_max: 34,
    });
  });

  it("allows intentionally clearing completed estimates without refilling them during save", async () => {
    await mount();
    finish("instagram");
    await tick(1500);
    for (const name of ["gender", "age from", "age to"]) fireEvent.change(field("instagram", name), { target: { value: "" } });
    fireEvent.click(screen.getByRole("button", { name: "Save Profile" }));
    await settle();
    expect(fixture.persisted).toMatchObject({
      instagram_audience_gender: null, instagram_audience_age_min: null, instagram_audience_age_max: null,
    });
  });

  it("stops when the watched job ID changes, without filling from the other job", async () => {
    await mount();
    finish("instagram", { instagram_description_job_id: "replacement-job" });
    await tick(1500);
    expect(field("instagram", "gender")).toHaveValue("");
    expect(screen.getByText(/generation job changed/)).toBeInTheDocument();
    const reads = fixture.requests.length;
    await tick(10000);
    expect(fixture.requests).toHaveLength(reads);
  });

  it("shows the backend failure and stops polling", async () => {
    await mount();
    fixture.replaceOnServer({ ...fixture.persisted, instagram_description_status: "failed", instagram_description_error: "Unable to read this bio." });
    await tick(1500);
    expect(screen.getByText(/Unable to read this bio/)).toBeInTheDocument();
    const reads = fixture.requests.length;
    await tick(10000);
    expect(fixture.requests).toHaveLength(reads);
  });

  it("shows inline range errors and blocks save", async () => {
    await mount();
    finish("instagram");
    await tick(1500);
    fireEvent.change(field("instagram", "age from"), { target: { value: "45" } });
    expect(screen.getByText(/Audience age from must be less/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Save Profile" })).toBeDisabled();
    fireEvent.change(field("instagram", "age from"), { target: { value: "12" } });
    expect(screen.getByText(/whole numbers between 13 and 100/)).toBeInTheDocument();
  });

  it("recovers completed estimates into empty draft fields after a reload without replacing typed ones", async () => {
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
    const initial = creatorProfile({ primary_platform: "instagram", instagram_description_mode: "generate" });
    const draft = profileToForm(initial);
    draft.instagram.audienceGender = "male";
    sessionStorage.setItem(`mavlit_profile_draft:${initial.id}`, JSON.stringify(draft));
    fixture = installProfileApi({
      ...initial, instagram_audience_gender: "female", instagram_audience_age_min: 18, instagram_audience_age_max: null,
    });
    renderProfile(<ProfileSettings />);
    await settle();
    expect(field("instagram", "gender")).toHaveValue("male");
    expect(field("instagram", "age from")).toHaveValue(18);
    expect(field("instagram", "age to")).toHaveValue(null);
  });

  it("does not forward removed percentage fields even when a legacy GET still includes them", async () => {
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
    fixture = installProfileApi({
      ...creatorProfile(), instagram_audience_gender_male_pct: 80, youtube_audience_gender_female_pct: 20,
      audience_gender_male_pct: 30,
    } as ReturnType<typeof creatorProfile>);
    renderProfile(<ProfileSettings />);
    await settle();
    fireEvent.click(screen.getByRole("button", { name: "Save Profile" }));
    await settle();
    expect(fixture.writes).toHaveLength(1);
    const sent = fixture.writes[0].body as Record<string, unknown>;
    expect(Object.keys(sent).some((key) => key.endsWith("_pct"))).toBe(false);
    expect(sent).toEqual(creatorProfile());
  });

  it("lets a new creator review/edit generated estimates before completing onboarding", async () => {
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
    fixture = installProfileApi(creatorProfile({ instagram_description: null, youtube_description: null, content_description: null }));
    fixture.allowGeneration();
    localStorage.setItem(`mavlit_onboarding_draft_${creatorProfile().id}`, JSON.stringify({
      step: "instagram",
      data: {
        creator: { fullName: "Fixture Creator", age: "24", gender: "Female", platforms: ["instagram"], contentDescription: "" },
        instagramDescriptionMode: "generate", youtubeDescriptionMode: "manual",
        instagram: { username: "fixture_creator", followers: "1200", niches: ["Music"], subNiches: [], excludedCategories: [], contentDescription: "", audienceGender: "", audienceAgeMin: "", audienceAgeMax: "" },
        youtube: { channelName: "", subscribers: "", niches: [], subNiches: [], excludedCategories: [], contentDescription: "", audienceGender: "", audienceAgeMin: "", audienceAgeMax: "" },
      },
    }));
    const rendered = renderProfile(<ReadyOnboarding />);
    await settle();
    fireEvent.click(screen.getByRole("button", { name: "Generate description" }));
    await settle();
    finish("instagram");
    await tick(1500);
    expect(field("instagram", "gender")).toHaveValue("female");
    fireEvent.change(field("instagram", "gender"), { target: { value: "both" } });
    fireEvent.change(field("instagram", "age from"), { target: { value: "25" } });
    // It stays on the platform step instead of saving estimates without review.
    expect(screen.getByRole("heading", { name: "Instagram" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /^Continue/ }));
    await tick(500);
    fireEvent.click(screen.getByRole("button", { name: /Complete Profile/ }));
    await settle();
    expect(fixture.persisted).toMatchObject({ instagram_audience_gender: "both", instagram_audience_age_min: 25, instagram_audience_age_max: 34 });
    rendered.unmount();
    renderProfile(<ProfileSettings />);
    await settle();
    expect(field("instagram", "gender")).toHaveValue("both");
  });
});
