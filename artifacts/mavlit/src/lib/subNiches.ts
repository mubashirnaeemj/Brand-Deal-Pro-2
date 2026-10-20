export function normalizeSubNiche(value: string): string {
  return value.replace(/_+/g, " ").replace(/\s+/g, " ").trim();
}

export function normalizeSubNiches(values: string[]): string[] {
  const seen = new Set<string>();
  return values.map(normalizeSubNiche).filter((value) => {
    const key = value.toLowerCase();
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
