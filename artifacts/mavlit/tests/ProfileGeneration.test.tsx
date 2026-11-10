import { act, cleanup, fireEvent, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import ProfileSettings from "@/pages/ProfileSettings";
import OnboardingPage from "@/pages/OnboardingPage";
import { useAuth } from "@/contexts/AuthContext";
import { applyProfileGeneration } from "@/pages/profileWizardModel";
import { profileToForm } from "@/pages/profileForm";
import { renderProfile } from "./renderProfile";
import { creatorProfile } from "./fixtures/creatorProfile";
import { fixturePost, installProfileApi } from "./fixtures/profileApi";

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
    instagram_audience_description: "Young musicians aged 18-34 learning guitar.",
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
    expect(screen.queryByLabelText("instagram audience age range")).not.toBeInTheDocument();   // the age is in the description
    expect(screen.getByLabelText("Instagram audience description")).toHaveValue("Young musicians aged 18-34 learning guitar.");
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
    expect(screen.getByRole("button", { name: "Save Profile" })).toBeEnabled();
    fireEvent.click(screen.getByRole("button", { name: "Save Profile" }));
    await settle();
    expect(fixture.persisted).toMatchObject({
      primary_platform: "instagram", instagram_followers: 10001, instagram_sub_niches: ["Guitar"],
      instagram_audience_gender: "female",
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
    expect(screen.getByLabelText("Instagram audience description")).toHaveValue("My corrected audience");
  });

  it("fills highest views from the completed job, sends it in the PUT, and keeps it after reload", async () => {
    const rendered = await mount();
    finish({ instagram_highest_views: 250000 });
    await tick(1500);
    await tick(450);
    expect(screen.getByTestId("input-highest-views")).toHaveValue(250000);
    fireEvent.click(screen.getByRole("button", { name: "Save Profile" }));
    await settle();
    expect(fixture.writes.at(-1)!.body).toMatchObject({ instagram_highest_views: 250000 });
    expect(fixture.persisted).toMatchObject({ instagram_highest_views: 250000 });
    rendered.unmount();
    renderProfile(<ProfileSettings />);
    await settle();
    details();
    expect(screen.getByTestId("input-highest-views")).toHaveValue(250000);
  });

  it("keeps the typed highest views when the generated value is null, and does not need it to start", async () => {
    await mount();
    expect(screen.queryByTestId("input-highest-views")).not.toBeInTheDocument();
    finish({ instagram_highest_views: null });
    await tick(1500);
    await tick(450);
    expect(screen.getByTestId("input-highest-views")).toHaveValue(null);
    fireEvent.change(screen.getByTestId("input-highest-views"), { target: { value: "7000" } });
    const typed = profileToForm(creatorProfile({ instagram_highest_views: 7000, instagram_description_mode: "generate" }));
    expect(applyProfileGeneration(typed, creatorProfile({ instagram_highest_views: null }), "instagram").instagram.highestViews).toBe("7000");
    expect(applyProfileGeneration(typed, creatorProfile({ instagram_highest_views: 9000 }), "instagram").instagram.highestViews).toBe("9000");
  });

  it("shows the recent posts card once generation has finished, with the posts it read", async () => {
    await mount();
    expect(screen.queryByTestId("recent-posts-card")).not.toBeInTheDocument();
    fixture.setPosts(Array.from({ length: 12 }, (_, index) => fixturePost(index + 1)));
    finish();
    await tick(1500);
    await tick(450);
    expect(screen.getByTestId("recent-posts-card")).toBeInTheDocument();
    expect(screen.getByTestId("recent-posts-card")).not.toHaveTextContent("hasn't read any posts");
  });

  it("shows only username and primary niches with both Generate and disabled Save Profile", async () => {
    await mount(false);
    expect(screen.getByTestId("input-username")).toBeDisabled();   // a username is saved on this profile, so it is fixed
    expect(screen.getByText("Primary niches")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "2 selected" })).toBeEnabled();
    expect(screen.queryByTestId("input-brand-preferences")).not.toBeInTheDocument();
    expect(screen.queryByTestId("input-followers")).not.toBeInTheDocument();
    expect(screen.queryByTestId("input-description")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("instagram audience age range")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Sub-niches/ })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Save Profile" })).toBeDisabled();
    expect(screen.getAllByRole("button", { name: "Fetch profile details with MAVLIT" })).toHaveLength(1);
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

  it("keeps the saved username fixed and preserves other unsaved corrections on reload", async () => {
    const rendered = await mount();
    finish();
    await tick(1500);
    await tick(450);
    const savedUsername = (screen.getByTestId("input-username") as HTMLInputElement).value;
    fireEvent.change(screen.getByTestId("input-username"), { target: { value: "changed_username" } });   // locked: ignored
    fireEvent.change(screen.getByTestId("input-followers"), { target: { value: "12000" } });
    fireEvent.change(screen.getByTestId("input-description"), { target: { value: "Keep my correction" } });
    await settle();
    rendered.unmount();
    renderProfile(<ProfileSettings />);
    await settle();
    expect(screen.getByTestId("input-username")).toHaveValue(savedUsername);
    expect(screen.getByTestId("input-followers")).toHaveValue(12000);
    expect(screen.getByTestId("input-description")).toHaveValue("Keep my correction");
    expect(screen.getByRole("button", { name: "Save Profile" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "Fetch profile details with MAVLIT" })).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: "Save Profile" }));
    await settle();
    expect(fixture.persisted).toMatchObject({ instagram_followers: 12000, instagram_description: "Keep my correction" });
  });

  it("stops when the watched job ID changes without adopting the replacement", async () => {
    await mount();
    finish({ instagram_description_job_id: "replacement-job" });
    await tick(1500);
    expect(screen.queryByLabelText("instagram audience gender")).not.toBeInTheDocument();
    expect(screen.getByText(/generation job changed/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Fetch profile details with MAVLIT" })).toBeEnabled();
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
    expect(screen.getByRole("button", { name: "Fetch profile details with MAVLIT" })).toBeEnabled();
    fireEvent.click(screen.getByRole("button", { name: "Fetch profile details with MAVLIT" }));
    await settle();
    expect(screen.getByTestId("generation-progress-screen")).toBeInTheDocument();
    expect(fixture.requests.filter((request) => request.method === "POST")).toHaveLength(2);
  });

  it("shows the server's own message for a job lost in a restart, and for a job that took too long", async () => {
    await mount();
    fixture.replaceOnServer({ ...fixture.persisted, instagram_description_status: "failed", instagram_description_error: "The server restarted, please try again" });
    await tick(1500);
    expect(screen.getByText("The server restarted, please try again", { exact: false })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Fetch profile details with MAVLIT" })).toBeEnabled();
  });

  it("shows the server's message when starting a description is refused with 409 (two clicks at once)", async () => {
    await mount(false);
    const wrapped = globalThis.fetch;
    vi.stubGlobal("fetch", vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      if (new URL(String(input), window.location.origin).pathname.endsWith("/generate-description")) {
        return new Response(JSON.stringify({ detail: "A description is already being generated. Wait for it to finish." }),
          { status: 409, headers: { "Content-Type": "application/json" } });
      }
      return wrapped(input, init);
    }));
    fireEvent.click(screen.getByTestId("button-generate"));
    await settle();
    expect(screen.getByText(/A description is already being generated\. Wait for it to finish\./)).toBeInTheDocument();
  });

  it("animates over one minute but never reveals fields or claims 100% before the backend finishes", async () => {
    await mount();
    await tick(30000);
    expect(screen.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "47");
    await tick(30000);
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
    await tick(30000);
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
    expect(screen.getByRole("button", { name: "Fetch profile details with MAVLIT" })).toBeEnabled();
  });

  it("validates the username before making generation requests", async () => {
    await mount(false);
    fireEvent.change(screen.getByTestId("input-username"), { target: { value: "" } });
    fireEvent.click(screen.getByRole("button", { name: "Fetch profile details with MAVLIT" }));
    await settle();
    expect(screen.getByRole("alert")).toHaveTextContent(/Enter your Instagram username/);
    expect(fixture.writes).toHaveLength(0);
    expect(fixture.requests.filter((request) => request.method === "POST")).toHaveLength(0);
  });

  it("leaves null estimates empty", async () => {
    await mount();
    finish({ instagram_audience_gender: null });
    await tick(1500);
    await tick(450);
    expect(screen.getByLabelText("instagram audience gender")).toHaveValue("");
  });

  it("displays and saves generated sub-niches with spaces rather than underscores", async () => {
    await mount();
    finish({ instagram_sub_niches: ["country_music", "bedroom__pop"] });
    await tick(1500);
    await tick(450);
    expect(screen.getByRole("button", { name: "Remove country music" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "Remove bedroom pop" })).toBeEnabled();
    fireEvent.click(screen.getByRole("button", { name: "Save Profile" }));
    await settle();
    expect(fixture.persisted.instagram_sub_niches).toEqual(["country music", "bedroom pop"]);
  });

  it("shows a missing audience description notice and saves a manual correction instead of null", async () => {
    const rendered = await mount();
    finish({ instagram_audience_description: null });
    await tick(1500);
    await tick(450);
    expect(screen.getByLabelText("Instagram audience description")).toHaveValue("");
    expect(screen.getByTestId("audience-description-missing")).toHaveTextContent("MAVLIT returned no audience description");
    expect(screen.getByRole("button", { name: "Fetch profile details with MAVLIT" })).toBeEnabled();
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
    fireEvent.click(screen.getByRole("button", { name: "Fetch profile details with MAVLIT" }));
    await settle();
    expect(screen.getByRole("button", { name: "Generating" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Save Profile" })).toBeDisabled();
    expect(fixture.requests.filter((request) => request.method === "POST")).toHaveLength(2);
    finish({ instagram_audience_description: "Newly generated audience description." });
    await tick(1500);
    await tick(450);
    expect(screen.getByLabelText("Instagram audience description")).toHaveValue("Newly generated audience description.");
    expect(screen.queryByTestId("audience-description-missing")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Fetch profile details with MAVLIT" })).toBeDisabled();
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
    expect(screen.getByLabelText("Instagram audience description")).toHaveValue("Young musicians aged 18-34 learning guitar.");
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
    fireEvent.change(screen.getByTestId("input-pitch-style-preferences"), { target: { value: "Conversational and direct." } });
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
    expect(fixture.persisted).toMatchObject({
      primary_platform: "instagram", instagram_followers: 9876, gender: "Female",
      pitch_style_preferences: "Conversational and direct.",
    });
  });

  it("greys out Fetch after a generation finishes; editing fields does not unlock it, adding or deleting a post does", async () => {
    await mount();
    finish();
    await tick(1500);
    await tick(450);
    const fetch = () => screen.getByRole("button", { name: "Fetch profile details with MAVLIT" });
    expect(fetch()).toBeDisabled();
    fireEvent.change(screen.getByTestId("input-description"), { target: { value: "Edited description" } });
    fireEvent.change(screen.getByTestId("input-username"), { target: { value: "another_name" } });
    expect(fetch()).toBeDisabled();
    fixture.setPosts(Array.from({ length: 12 }, (_, index) => fixturePost(12 - index)));
    await settle();
    fireEvent.click(screen.getByRole("button", { name: "View more recent Instagram posts" }));
    await settle();
    const dialog = screen.getByRole("dialog");
    fireEvent.change(within(dialog).getByLabelText("Instagram post link"), { target: { value: "https://www.instagram.com/p/NEWPOST1/" } });
    fireEvent.click(within(dialog).getByRole("button", { name: "Add post" }));
    await settle();
    fireEvent.keyDown(dialog, { key: "Escape" });
    await settle();
    expect(fetch()).toBeEnabled();
  });

  it("keeps Fetch greyed out after a reload until a post is added or deleted", async () => {
    const rendered = await mount();
    finish();
    await tick(1500);
    await tick(450);
    const fetch = () => screen.getByRole("button", { name: "Fetch profile details with MAVLIT" });
    rendered.unmount();
    renderProfile(<ProfileSettings />);
    await settle();
    expect(fetch()).toBeDisabled();
  });

  it("keeps Save Profile greyed out until a field differs from the saved profile", async () => {
    fixture = installProfileApi(creatorProfile({ primary_platform: "instagram" }));
    renderProfile(<ProfileSettings />);
    await settle();
    details("manual");
    const save = () => screen.getByRole("button", { name: "Save Profile" });
    expect(save()).toBeDisabled();
    fireEvent.change(screen.getByTestId("input-description"), { target: { value: "A different description" } });
    expect(save()).toBeEnabled();
    fireEvent.change(screen.getByTestId("input-description"), { target: { value: (fixture.persisted as { instagram_description?: string }).instagram_description ?? "" } });
    expect(save()).toBeDisabled();
  });

  it("keeps Save Profile greyed out after a reload when nothing changed", async () => {
    fixture = installProfileApi(creatorProfile({ primary_platform: "instagram" }));
    const first = renderProfile(<ProfileSettings />);
    await settle();
    details("manual");
    expect(screen.getByRole("button", { name: "Save Profile" })).toBeDisabled();
    first.unmount();
    const second = renderProfile(<ProfileSettings />);   // the draft written by the first visit is restored
    await settle();
    expect(screen.getByRole("button", { name: "Save Profile" })).toBeDisabled();
    second.unmount();
    renderProfile(<ProfileSettings />);
    await settle();
    expect(screen.getByRole("button", { name: "Save Profile" })).toBeDisabled();
  });

  it("lets a creator who has not saved a username yet type one", async () => {
    fixture = installProfileApi(creatorProfile({ primary_platform: "instagram", instagram_handle: null, onboarding_completed: false } as never));
    renderProfile(<ProfileSettings />);
    await settle();
    details("manual");
    expect(screen.getByTestId("input-username")).toBeEnabled();
    fireEvent.change(screen.getByTestId("input-username"), { target: { value: "first_choice" } });
    expect(screen.getByTestId("input-username")).toHaveValue("first_choice");
  });

  it("shows the username from the database, not an older draft, once the username is saved", async () => {
    fixture = installProfileApi(creatorProfile({ primary_platform: "instagram", instagram_handle: "corrected_in_db" }));
    fixture.setPosts(Array.from({ length: 20 }, (_, index) => fixturePost(20 - index)));   // posts read from that username
    fixture.replaceOnServer({ ...fixture.persisted, instagram_description_status: "completed", instagram_description_mode: "generate", instagram_description: "d" } as never);
    const key = `mavlit_profile_draft:${(fixture.persisted as { id: number }).id}`;
    const stale = { ...JSON.parse(JSON.stringify(profileToForm(fixture.persisted as never))), wizardStep: 3, generatedFor: null, generationPending: false };
    stale.instagram.username = "old_name_from_draft";
    sessionStorage.setItem(key, JSON.stringify(stale));
    renderProfile(<ProfileSettings />);
    await settle();
    expect(screen.getByTestId("input-username")).toHaveValue("corrected_in_db");
    expect(screen.getByTestId("input-username")).toBeDisabled();
  });

  it("a username is typed once: the first Fetch saves it and the field is locked from then on, even if the fetch failed", async () => {
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout", "Date"] });
    fixture = installProfileApi(creatorProfile({ primary_platform: "instagram", instagram_handle: null, instagram_description: null, onboarding_completed: false } as never));
    fixture.allowGeneration();
    renderProfile(<ProfileSettings />);
    await settle();
    details();
    expect(screen.getByTestId("input-username")).toBeEnabled();                       // nothing saved yet: type it
    fireEvent.change(screen.getByTestId("input-username"), { target: { value: "first_try" } });
    expect(screen.getByTestId("input-username")).toHaveValue("first_try");
    fireEvent.click(screen.getByTestId("button-generate"));
    await settle();
    fixture.replaceOnServer({ ...fixture.persisted, instagram_description_status: "failed", instagram_description_error: "Instagram content could not be fetched" });
    await tick(1500);
    expect(screen.getByTestId("input-username")).toBeDisabled();                      // saved by the Fetch, so locked
    expect(screen.getByTestId("input-username")).toHaveValue("first_try");
    expect(screen.getByText(/can’t be changed/)).toBeInTheDocument();
  });

  it.each(["alternativenationnet@gmail.com", "brett@gmail.com", "Brett@Gmail.com", "ali128ahmed128128@gmail.com"])("%s can keep editing the username after it was saved", async (email) => {
    fixture = installProfileApi(creatorProfile({ primary_platform: "instagram", email } as never));
    renderProfile(<ProfileSettings />);
    await settle();
    details("manual");
    expect(screen.getByTestId("input-username")).toBeEnabled();
    fireEvent.change(screen.getByTestId("input-username"), { target: { value: "new_handle" } });
    expect(screen.getByTestId("input-username")).toHaveValue("new_handle");
    expect(screen.queryByText(/can’t be changed/)).not.toBeInTheDocument();
  });

  it("any other account is locked as soon as a username is saved", async () => {
    fixture = installProfileApi(creatorProfile({ primary_platform: "instagram", email: "someone.else@gmail.com" } as never));
    renderProfile(<ProfileSettings />);
    await settle();
    details("manual");
    expect(screen.getByTestId("input-username")).toBeDisabled();
  });

  it("makes Fetch clickable again when the username is changed in the admin, and shows the new username (still locked)", async () => {
    await mount();
    finish();
    await tick(1500);
    await tick(450);
    expect(screen.getByRole("button", { name: "Fetch profile details with MAVLIT" })).toBeDisabled();
    expect(screen.getByTestId("input-username")).toBeDisabled();
    // The admin changes instagram_handle in the database; the saved posts still belong to the old username.
    fixture.replaceOnServer({ ...fixture.persisted, instagram_handle: "changed_in_admin" });
    cleanup();
    renderProfile(<ProfileSettings />);
    await settle();
    expect(screen.getByRole("button", { name: "Fetch profile details with MAVLIT" })).toBeEnabled();
    expect(screen.getByTestId("input-username")).toHaveValue("changed_in_admin");
    expect(screen.getByTestId("input-username")).toBeDisabled();
  });

  it("shows 'Your recent Instagram posts' in generate mode only after the profile details were fetched", async () => {
    await mount(false);   // step 3, "Let MAVLIT generate", nothing fetched yet
    await settle();
    expect(screen.queryByTestId("recent-posts-card")).not.toBeInTheDocument();
    fireEvent.click(screen.getByTestId("button-generate"));
    await settle();
    expect(screen.queryByTestId("recent-posts-card")).not.toBeInTheDocument();   // not while it is generating either
    finish();
    await tick(1500);
    await tick(450);
    expect(screen.getByTestId("recent-posts-card")).toBeInTheDocument();
  });

  it("keeps the posts section on the page when the creator writes the description themselves", async () => {
    fixture = installProfileApi(creatorProfile({ primary_platform: "instagram" }));
    fixture.setPosts(Array.from({ length: 12 }, (_, index) => fixturePost(12 - index)));
    renderProfile(<ProfileSettings />);
    await settle();
    details("manual");
    await settle();
    expect(screen.getByTestId("recent-posts-card")).toBeInTheDocument();
  });
});
