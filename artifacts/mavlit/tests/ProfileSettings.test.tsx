import { fireEvent, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it } from "vitest";
import ProfileSettings from "@/pages/ProfileSettings";
import { profileToForm } from "@/pages/profileForm";
import { creatorProfile, freshCreatorProfile } from "./fixtures/creatorProfile";
import { installProfileApi } from "./fixtures/profileApi";
import { renderProfile } from "./renderProfile";

let fixture: ReturnType<typeof installProfileApi>;
afterEach(() => fixture?.assertIsolated());
const draftKey = `mavlit_profile_draft:${creatorProfile().id}`;

async function mountSettings(apiFixture = installProfileApi(creatorProfile())) {
  fixture = apiFixture;
  const rendered = renderProfile(<ProfileSettings />);
  const preferences = await screen.findByRole("textbox", { name: "Brand preferences" });
  await waitFor(() => expect(screen.getByRole("button", { name: /Sign Out/i })).toBeInTheDocument());
  return { ...rendered, preferences, user: userEvent.setup() };
}

async function save() {
  await userEvent.click(screen.getByRole("button", { name: "Save Profile" }));
}

describe("ProfileSettings fixture-backed saves", () => {
  it("saves a preferences-only edit without changing any other fresh server value", async () => {
    const { preferences, user } = await mountSettings();
    const fresh = freshCreatorProfile();
    fixture.replaceOnServer(fresh);
    await user.clear(preferences);
    await user.type(preferences, "  More guitar brands.  ");
    await save();
    await screen.findByText("Profile saved.");
    expect(fixture.writes).toHaveLength(1);
    expect(fixture.writes[0].body).toEqual({ ...fresh, brand_preferences: "More guitar brands." });
    expect(sessionStorage.getItem(draftKey)).toBeNull();
    expect(window.location.pathname + window.location.search).toBe("/brand-matches?version=v3");
  });

  it("keeps unknown fresh fields and existing preferences during an unrelated name edit", async () => {
    const { user } = await mountSettings();
    const fresh = freshCreatorProfile();
    // Preferences unchanged on the server; other fields changed since editor load.
    fresh.brand_preferences = creatorProfile().brand_preferences!;
    fixture.replaceOnServer(fresh);
    const name = screen.getByRole("textbox", { name: /Full name/ });
    await user.clear(name);
    await user.type(name, "Updated Fixture Creator");
    await save();
    await screen.findByText("Profile saved.");
    expect(fixture.writes[0].body).toEqual({ ...fresh, full_name: "Updated Fixture Creator" });
  });

  it.each(["", " \n\t "])("clears preferences %j by submitting null, not omission or empty text", async (value) => {
    const { preferences } = await mountSettings();
    fireEvent.change(preferences, { target: { value } });
    await save();
    await screen.findByText("Profile saved.");
    expect(fixture.writes[0].body).toEqual({ ...creatorProfile(), brand_preferences: null });
  });

  it("accepts exactly 1000 characters", async () => {
    const { preferences } = await mountSettings();
    fireEvent.change(preferences, { target: { value: "x".repeat(1000) } });
    expect(screen.getByText("1000 / 1000")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Save Profile" })).toBeEnabled();
    await save();
    await screen.findByText("Profile saved.");
    expect(fixture.writes[0].body).toEqual({ ...creatorProfile(), brand_preferences: "x".repeat(1000) });
  });

  it("rejects a 1001-character restored draft even if submit bypasses the disabled button", async () => {
    const draft = { ...profileToForm(creatorProfile()), brandPreferences: "x".repeat(1001) };
    sessionStorage.setItem(draftKey, JSON.stringify(draft));
    const { preferences } = await mountSettings();
    expect(preferences).toHaveAttribute("maxlength", "1000");
    expect(preferences).toHaveValue(draft.brandPreferences);
    expect(preferences).toHaveAttribute("aria-invalid", "true");
    expect(screen.getByText("1001 / 1000")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Save Profile" })).toBeDisabled();
    const requestCount = fixture.requests.length;
    fireEvent.submit(preferences.closest("form")!);
    await screen.findByRole("alert");
    expect(screen.getByRole("alert")).toHaveTextContent("Brand preferences must be 1000 characters or fewer.");
    expect(fixture.writes).toHaveLength(0);
    expect(fixture.requests).toHaveLength(requestCount);
    expect(sessionStorage.getItem(draftKey)).toBe(JSON.stringify(draft));
  });

  it.each(["GET", "PUT"] as const)("retains the complete draft after a failed %s, restores it on remount, and permits retry", async (method) => {
    const { preferences, user, unmount } = await mountSettings();
    await user.clear(preferences);
    await user.type(preferences, "Unsaved guitar preferences");
    const name = screen.getByRole("textbox", { name: /Full name/ });
    await user.clear(name);
    await user.type(name, "Unsaved Creator");
    const message = "Fixture service unavailable";
    if (method === "GET") fixture.failGet(message);
    else fixture.failPut(message);
    await save();
    expect(await screen.findByRole("alert")).toHaveTextContent(message);
    expect(preferences).toHaveValue("Unsaved guitar preferences");
    expect(name).toHaveValue("Unsaved Creator");
    expect(screen.getByRole("button", { name: "Save Profile" })).toBeEnabled();
    expect(window.location.pathname).toBe("/profile");
    expect(fixture.persisted).toEqual(creatorProfile());
    const draft = JSON.parse(sessionStorage.getItem(draftKey)!);
    expect(draft).toEqual({
      ...profileToForm(creatorProfile()),
      fullName: "Unsaved Creator",
      brandPreferences: "Unsaved guitar preferences",
    });
    expect(fixture.writes).toHaveLength(method === "GET" ? 0 : 1);
    fixture.assertIsolated();
    unmount();
    fixture.failGet(null);
    fixture.failPut(null);
    const restored = await mountSettings(fixture);
    expect(restored.preferences).toHaveValue(draft.brandPreferences);
    expect(screen.getByRole("textbox", { name: /Full name/ })).toHaveValue(draft.fullName);
    await save();
    await screen.findByText("Profile saved.");
    const expected = {
      ...creatorProfile(), full_name: draft.fullName, brand_preferences: draft.brandPreferences,
    };
    expect(fixture.writes).toHaveLength(method === "GET" ? 1 : 2);
    expect(fixture.writes.at(-1)!.body).toEqual(expected);
    expect(fixture.persisted).toEqual(expected);
    expect(sessionStorage.getItem(draftKey)).toBeNull();
  });
});
