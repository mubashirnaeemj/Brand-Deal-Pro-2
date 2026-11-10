import { describe, expect, it } from "vitest";
import { cleanInstagramUsername, isCleanSavedUsername, isValidInstagramUsername, isWrongUsernameError } from "@/lib/instagramUsername";

describe("Instagram username rules", () => {
  it("removes spaces and characters Instagram does not allow while typing", () => {
    expect(cleanInstagramUsername("vinylgone virall")).toBe("vinylgonevirall");
    expect(cleanInstagramUsername("  @Some.Name_1 ")).toBe("Some.Name_1");
    expect(cleanInstagramUsername("bad-name!#")).toBe("badname");
    expect(cleanInstagramUsername("x".repeat(40))).toHaveLength(30);
  });

  it("keeps just the username when a profile link is pasted", () => {
    expect(cleanInstagramUsername("https://www.instagram.com/vinylgoneviral/")).toBe("vinylgoneviral");
    expect(cleanInstagramUsername("instagram.com/a.b?hl=en")).toBe("a.b");
  });

  it("knows a valid username", () => {
    for (const ok of ["vinylgoneviral", "a.b_c9", "A".repeat(30)]) expect(isValidInstagramUsername(ok), ok).toBe(true);
    for (const bad of ["", "vinylgone virall", "bad-name", "a".repeat(31), "@x"]) expect(isValidInstagramUsername(bad), bad).toBe(false);
  });

  it("tells a clean saved username from one that has to be fixed", () => {
    expect(isCleanSavedUsername("@vinylgoneviral")).toBe(true);
    expect(isCleanSavedUsername("vinylgone virall")).toBe(false);
    expect(isCleanSavedUsername("https://www.instagram.com/x")).toBe(false);
    expect(isCleanSavedUsername(null)).toBe(false);
  });

  it("recognises the server's 'username not found' failure", () => {
    expect(isWrongUsernameError("Instagram username not found. You may have typed the wrong username, or the account is private.")).toBe(true);
    expect(isWrongUsernameError("RuntimeError")).toBe(false);
    expect(isWrongUsernameError(null)).toBe(false);
  });
});
