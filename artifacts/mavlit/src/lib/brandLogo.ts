const AVATAR_COLORS = [
  "#475569", "#5b5d8c", "#775b83", "#7f5c69",
  "#7a6249", "#486f65", "#456a80", "#656243",
];

export function brandWebsiteDomain(website: string | null | undefined): string | null {
  if (typeof website !== "string" || !website.trim()) return null;
  const value = website.trim();
  // Reject explicit non-web schemes instead of turning them into hostnames.
  if (/^[a-z][a-z\d+.-]*:/i.test(value) && !/^https?:\/\//i.test(value)) return null;
  try {
    const url = new URL(/^https?:\/\//i.test(value) ? value : `https://${value}`);
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    return url.hostname.replace(/^www\./i, "") || null;
  } catch {
    return null;
  }
}

export function brandAvatarColor(name: string): string {
  let hash = 0;
  for (const character of name) hash = (Math.imul(hash, 31) + character.codePointAt(0)!) | 0;
  return AVATAR_COLORS[(hash >>> 0) % AVATAR_COLORS.length];
}
