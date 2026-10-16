import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { useAuth } from "@/contexts/AuthContext";
import { creatorProfile, freshCreatorProfile } from "./fixtures/creatorProfile";
import { installProfileApi } from "./fixtures/profileApi";
import { profileWrapper } from "./renderProfile";

let fixture: ReturnType<typeof installProfileApi>;
afterEach(() => fixture?.assertIsolated());

async function mountAuth() {
  fixture = installProfileApi(creatorProfile());
  const { Wrapper, queryClient } = profileWrapper();
  const hook = renderHook(() => useAuth(), { wrapper: Wrapper });
  await waitFor(() => expect(hook.result.current.isLoading).toBe(false));
  return { ...hook, queryClient };
}

describe("AuthContext.updateProfile full-replacement contract", () => {
  it.each([
    { full_name: "Updated Name" },
    { instagram_handle: "new_username", creator_handle: "new_username" },
  ])("merges %j onto a fresh GET, preserving preferences and unknown fields", async (patch) => {
    const { result } = await mountAuth();
    const fresh = freshCreatorProfile();
    fixture.replaceOnServer(fresh);
    const requestStart = fixture.requests.length;
    let returned;
    await act(async () => { returned = await result.current.updateProfile(patch); });
    const expected = { ...fresh, ...patch };
    expect(fixture.requests.slice(requestStart).map(({ method }) => method)).toEqual(["GET", "PUT"]);
    expect(fixture.writes).toHaveLength(1);
    expect(fixture.writes[0].body).toEqual(expected);
    expect(fixture.persisted).toEqual(expected);
    expect(returned).toEqual(expected);
    expect(result.current.user).toEqual(expected);
  });

  it("a preferences-only update changes exactly one value in the latest profile", async () => {
    const { result } = await mountAuth();
    const fresh = freshCreatorProfile();
    fixture.replaceOnServer(fresh);
    await act(async () => {
      await result.current.updateProfile({ brand_preferences: "More guitar brands." });
    });
    expect(fixture.writes[0].body).toEqual({ ...fresh, brand_preferences: "More guitar brands." });
  });

  it("a failed fresh GET prevents PUT and leaves the current auth profile intact", async () => {
    const { result } = await mountAuth();
    const previous = result.current.user;
    fixture.failGet("Fixture read failed");
    await act(async () => {
      await expect(result.current.updateProfile({ full_name: "Must not save" })).rejects.toThrow("Fixture read failed");
    });
    expect(fixture.writes).toHaveLength(0);
    expect(result.current.user).toEqual(previous);
  });

  it("a failed PUT propagates the error without replacing the current auth profile", async () => {
    const { result } = await mountAuth();
    const previous = result.current.user;
    fixture.failPut("Fixture save failed");
    await act(async () => {
      await expect(result.current.updateProfile({ brand_preferences: "Unsaved" })).rejects.toThrow("Fixture save failed");
    });
    expect(fixture.writes).toHaveLength(1);
    expect(result.current.user).toEqual(previous);
    expect(fixture.persisted).toEqual(creatorProfile());
  });
});
