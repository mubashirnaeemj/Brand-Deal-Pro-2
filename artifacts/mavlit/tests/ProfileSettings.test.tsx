import { fireEvent, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import ProfileSettings from "@/pages/ProfileSettings";
import { creatorProfile, freshCreatorProfile } from "./fixtures/creatorProfile";
import { installProfileApi } from "./fixtures/profileApi";
import { renderProfile } from "./renderProfile";

let fixture: ReturnType<typeof installProfileApi>;
afterEach(() => fixture?.assertIsolated());
const draftKey = `mavlit_profile_draft:${creatorProfile().id}`;

async function mount(initial = creatorProfile()) {
  fixture = installProfileApi(initial);
  const rendered = renderProfile(<ProfileSettings />);
  await screen.findByTestId("profile-wizard");
  return { ...rendered, user: userEvent.setup() };
}
async function details() {
  while (screen.queryByRole("button", { name: "Continue" })) {
    fireEvent.click(screen.getByRole("button", { name: "Continue" }));
  }
  await screen.findByTestId("input-brand-preferences");
}
async function save() {
  fireEvent.click(screen.getByRole("button", { name: "Save Profile" }));
  await screen.findByText("Profile saved.");
}
const instagramSaved = (extra = {}) => ({ ...creatorProfile(), primary_platform: "instagram", ...extra });

describe("three-page Instagram profile", () => {
  it("shows only creator information first and keeps the creator gender contract", async () => {
    await mount();
    expect(screen.getByRole("heading", { name: "Creator information" })).toBeInTheDocument();
    expect(screen.getByRole("combobox", { name: "Gender" })).toHaveValue("Other");
    expect(screen.queryByText("MAVLIT builds your profile around Instagram.")).not.toBeInTheDocument();
    expect(screen.queryByTestId("input-username")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Instagram" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "YouTube" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Back" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Exit" })).toBeEnabled();
  });

  it("validates creator information before Continue and shows errors on page one", async () => {
    await mount();
    fireEvent.change(screen.getByTestId("input-full-name"), { target: { value: "" } });
    fireEvent.click(screen.getByRole("button", { name: "Continue" }));
    expect(screen.getByRole("alert")).toHaveTextContent("Full name is required");
    expect(screen.getByText("Step 1 of 3")).toBeInTheDocument();
    expect(fixture.writes).toHaveLength(0);
  });

  it("shows just the two method tabs on page two and retains fields while moving back", async () => {
    await mount();
    fireEvent.click(screen.getByRole("button", { name: "Continue" }));
    expect(screen.getAllByRole("tab")).toHaveLength(2);
    expect(screen.queryByTestId("input-username")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Continue" }));
    fireEvent.change(screen.getByTestId("input-username"), { target: { value: "retained_draft" } });
    fireEvent.change(screen.getByTestId("input-brand-preferences"), { target: { value: "More guitar brands" } });
    fireEvent.click(screen.getByRole("button", { name: "Back" }));
    fireEvent.click(screen.getByRole("button", { name: "Back" }));
    expect(screen.getByText("Step 1 of 3")).toBeInTheDocument();
    await details();
    expect(screen.getByTestId("input-username")).toHaveValue("retained_draft");
    expect(screen.getByTestId("input-brand-preferences")).toHaveValue("More guitar brands");
  });

  it("manual mode exposes editable fields and saves numeric audience ages for Instagram only", async () => {
    await mount();
    await details();
    expect(screen.getByTestId("input-followers")).not.toHaveAttribute("readonly");
    expect(screen.getByLabelText("instagram audience gender")).toBeEnabled();
    fireEvent.change(screen.getByLabelText("instagram audience gender"), { target: { value: "both" } });
    fireEvent.change(screen.getByLabelText("instagram audience age range"), { target: { value: "25-44" } });
    fireEvent.change(screen.getByLabelText("Instagram audience description"), { target: { value: "  Guitar enthusiasts and aspiring musicians.  " } });
    await save();
    expect(fixture.writes[0].body).toEqual(instagramSaved({
      instagram_audience_gender: "both", instagram_audience_age_min: 25, instagram_audience_age_max: 44,
      instagram_audience_description: "Guitar enthusiasts and aspiring musicians.",
    }));
    expect(window.location.pathname + window.location.search).toBe("/brand-matches?version=v3");
  });

  it("saves the highest Instagram views as a number, sends null when cleared, and restores it on reload", async () => {
    const rendered = await mount(creatorProfile({ instagram_highest_views: 5000 }));
    await details();
    expect(screen.getByTestId("input-highest-views")).toHaveValue(5000);
    fireEvent.change(screen.getByTestId("input-highest-views"), { target: { value: "120000" } });
    await save();
    expect(fixture.writes[0].body).toMatchObject({ instagram_highest_views: 120000 });
    rendered.unmount();
    renderProfile(<ProfileSettings />);
    await screen.findByTestId("profile-wizard");
    await details();
    expect(screen.getByTestId("input-highest-views")).toHaveValue(120000);
    fireEvent.change(screen.getByTestId("input-highest-views"), { target: { value: "" } });
    await save();
    expect(fixture.writes.at(-1)!.body).toMatchObject({ instagram_highest_views: null });
  });

  it("rejects negative or fractional highest views", async () => {
    await mount();
    await details();
    for (const bad of ["-1", "1.5"]) {
      fireEvent.change(screen.getByTestId("input-highest-views"), { target: { value: bad } });
      fireEvent.click(screen.getByRole("button", { name: "Save Profile" }));
      expect(await screen.findByTestId("text-error")).toHaveTextContent("Highest Instagram reel / post views must be a non-negative whole number.");
    }
    expect(fixture.writes).toHaveLength(0);
  });

  it("preserves all hidden YouTube fields, unknown fresh fields, and fresh untouched audience data", async () => {
    await mount();
    await details();
    const fresh = freshCreatorProfile();
    fixture.replaceOnServer(fresh);
    fireEvent.change(screen.getByTestId("input-brand-preferences"), { target: { value: "More guitar brands." } });
    await save();
    expect(fixture.writes[0].body).toEqual({ ...fresh, primary_platform: "instagram", brand_preferences: "More guitar brands." });
    expect(sessionStorage.getItem(draftKey)).toBeNull();
    expect(fixture.requests.at(-1)?.method).toBe("GET");
  });

  it("adds custom sub-niches with Enter or Add, prevents duplicates, retains them across niche changes, and saves spaces", async () => {
    const rendered = await mount(creatorProfile({ instagram_sub_niches: ["country_music"] }));
    await details();
    expect(screen.getByRole("button", { name: "Remove country music" })).toBeInTheDocument();
    fireEvent.click(screen.getByText("Sub-niches").parentElement!.querySelector("button")!);
    const input = screen.getByRole("textbox", { name: "Sub-niches search or add" });
    fireEvent.change(input, { target: { value: "bedroom__pop" } });
    fireEvent.keyDown(input, { key: "Enter" });
    expect(screen.getByRole("button", { name: "Remove bedroom pop" })).toBeInTheDocument();
    fireEvent.change(input, { target: { value: " Country_Music " } });
    fireEvent.keyDown(input, { key: "Enter" });
    expect(screen.getAllByRole("button", { name: /Remove country music/i })).toHaveLength(1);
    fireEvent.change(input, { target: { value: "indie_rock" } });
    fireEvent.click(screen.getByRole("button", { name: 'Add "indie rock"' }));
    fireEvent.click(screen.getByRole("button", { name: "Done" }));
    fireEvent.click(screen.getByRole("button", { name: "Remove indie rock" }));
    fireEvent.click(screen.getByRole("button", { name: "Remove Music" }));
    expect(screen.getByRole("button", { name: "Remove bedroom pop" })).toBeInTheDocument();
    await save();
    expect(fixture.persisted.instagram_sub_niches).toEqual(["country music", "bedroom pop"]);
    rendered.unmount();
    renderProfile(<ProfileSettings />);
    await screen.findByTestId("profile-wizard");
    await details();
    expect(screen.getByRole("button", { name: "Remove country music" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Remove bedroom pop" })).toBeInTheDocument();
  });

  it("orders brand preferences, content description, then audience details", async () => {
    await mount();
    await details();
    const preferences = screen.getByTestId("input-brand-preferences");
    const description = screen.getByTestId("input-description");
    const audience = screen.getByText("Your audience");
    expect(preferences.compareDocumentPosition(description) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(description.compareDocumentPosition(audience) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(audience.compareDocumentPosition(screen.getByTestId("input-pitch-style-preferences")) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it("loads, drafts, saves, reloads, and clears optional pitch style preferences", async () => {
    const rendered = await mount(creatorProfile({ pitch_style_preferences: "Friendly and brief." }));
    await details();
    const input = screen.getByTestId("input-pitch-style-preferences");
    expect(input).toHaveValue("Friendly and brief.");
    expect(input).not.toBeRequired();
    expect(screen.getByText("Leave empty to use MAVLIT’s default.")).toBeInTheDocument();
    fireEvent.change(input, { target: { value: "  Confident, concise, and no emojis.  " } });
    await waitFor(() => expect(JSON.parse(sessionStorage.getItem(draftKey)!)).toMatchObject({
      pitchStylePreferences: "  Confident, concise, and no emojis.  ",
    }));
    rendered.unmount();
    const restored = renderProfile(<ProfileSettings />);
    await screen.findByTestId("profile-wizard");
    expect(screen.getByText("Step 3 of 3")).toBeInTheDocument();
    expect(screen.getByTestId("input-pitch-style-preferences")).toHaveValue("  Confident, concise, and no emojis.  ");
    await save();
    expect(fixture.persisted.pitch_style_preferences).toBe("Confident, concise, and no emojis.");
    restored.unmount();
    renderProfile(<ProfileSettings />);
    await screen.findByTestId("profile-wizard");
    await details();
    expect(screen.getByTestId("input-pitch-style-preferences")).toHaveValue("Confident, concise, and no emojis.");
    fireEvent.change(screen.getByTestId("input-pitch-style-preferences"), { target: { value: "" } });
    await save();
    expect(fixture.persisted.pitch_style_preferences).toBeNull();
  });

  it.each([1000, 1001])("enforces the %i character pitch-style preferences boundary", async (length) => {
    await mount();
    await details();
    fireEvent.change(screen.getByTestId("input-pitch-style-preferences"), { target: { value: "x".repeat(length) } });
    if (length > 1000) expect(screen.getByRole("button", { name: "Save Profile" })).toBeDisabled();
    else {
      await save();
      expect(fixture.persisted.pitch_style_preferences).toBe("x".repeat(length));
    }
  });

  it.each(["", " \n\t "])("clears blank preferences %j with null", async (value) => {
    await mount();
    await details();
    fireEvent.change(screen.getByTestId("input-brand-preferences"), { target: { value } });
    await save();
    expect(fixture.persisted.brand_preferences).toBeNull();
  });

  it.each([1000, 1001])("enforces the %i character preferences boundary", async (length) => {
    await mount();
    await details();
    fireEvent.change(screen.getByTestId("input-brand-preferences"), { target: { value: "x".repeat(length) } });
    const button = screen.getByRole("button", { name: "Save Profile" });
    if (length > 1000) expect(button).toBeDisabled();
    else { await save(); expect(fixture.persisted.brand_preferences).toBe("x".repeat(1000)); }
  });

  it("shows inline age-range errors and blocks invalid saves", async () => {
    await mount();
    await details();
    fireEvent.change(screen.getByLabelText("instagram audience age range"), { target: { value: "45-18" } });
    expect(screen.getByText(/Audience age from must be less/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Save Profile" })).toBeDisabled();
    expect(fixture.writes).toHaveLength(0);
  });

  it.each(["GET", "PUT"] as const)("keeps the draft and page after a failed %s, then retries safely", async (method) => {
    const rendered = await mount();
    await details();
    fireEvent.change(screen.getByTestId("input-brand-preferences"), { target: { value: "Keep this draft" } });
    if (method === "GET") fixture.failGet("Fixture read failed");
    else fixture.failPut("Fixture save failed");
    fireEvent.click(screen.getByRole("button", { name: "Save Profile" }));
    await screen.findByText(method === "GET" ? "Fixture read failed" : "Fixture save failed");
    expect(fixture.persisted).toEqual(creatorProfile());
    expect(JSON.parse(sessionStorage.getItem(draftKey)!)).toMatchObject({ brandPreferences: "Keep this draft" });
    fixture.failGet(null);
    fixture.failPut(null);
    // Saving again uses the same current form and does not discard its edits.
    await save();
    expect(fixture.persisted).toMatchObject({ brand_preferences: "Keep this draft", primary_platform: "instagram" });
    rendered.unmount();
  });

  it("Exit keeps a draft and a remount restores the step and edits", async () => {
    const rendered = await mount();
    await details();
    fireEvent.change(screen.getByTestId("input-brand-preferences"), { target: { value: "Retain on exit" } });
    fireEvent.click(screen.getByRole("button", { name: "Exit" }));
    expect(window.location.pathname).toBe("/dashboard");
    rendered.unmount();
    renderProfile(<ProfileSettings />);
    await screen.findByTestId("input-brand-preferences");
    expect(screen.getByText("Step 3 of 3")).toBeInTheDocument();
    expect(screen.getByTestId("input-brand-preferences")).toHaveValue("Retain on exit");
  });

  it("loads and retries a failed initial profile request", async () => {
    fixture = installProfileApi(creatorProfile());
    fixture.failGet("Fixture read failed");
    renderProfile(<ProfileSettings />);
    await screen.findByRole("button", { name: "Retry" });
    fixture.failGet(null);
    fireEvent.click(screen.getByRole("button", { name: "Retry" }));
    await screen.findByTestId("profile-wizard");
    expect(screen.getByText("Step 1 of 3")).toBeInTheDocument();
  });
});
