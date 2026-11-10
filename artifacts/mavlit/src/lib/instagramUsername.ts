/** An Instagram username has letters, numbers, periods and underscores only (no spaces), at most 30 characters. */
export const INSTAGRAM_USERNAME_MAX = 30;
const VALID = /^[A-Za-z0-9._]{1,30}$/;

/** What the username box keeps while the creator types or pastes: no spaces or other characters Instagram does not allow. */
export function cleanInstagramUsername(raw: string): string {
  let value = raw.trim();
  const fromLink = value.match(/instagram\.com\/([^/?#\s]+)/i);   // a pasted profile link: keep just the username
  if (fromLink) value = fromLink[1];
  return value.replace(/^@+/, "").replace(/[^A-Za-z0-9._]/g, "").slice(0, INSTAGRAM_USERNAME_MAX);
}

export const isValidInstagramUsername = (value: string) => VALID.test(value);

/** A saved username that is already a clean, valid one (as opposed to e.g. "my name" or a link, which the creator has to fix). */
export const isCleanSavedUsername = (saved: string | null | undefined) => {
  const value = (saved ?? "").trim().replace(/^@/, "");
  return value !== "" && isValidInstagramUsername(value);
};

export const INVALID_USERNAME_MESSAGE = "An Instagram username can only contain letters, numbers, periods and underscores (no spaces).";

/** The server's start of the failure text when Instagram has no such account (or it is private). */
const WRONG_USERNAME_PREFIX = "Instagram username not found";
export const isWrongUsernameError = (error: string | null | undefined) => (error ?? "").startsWith(WRONG_USERNAME_PREFIX);
