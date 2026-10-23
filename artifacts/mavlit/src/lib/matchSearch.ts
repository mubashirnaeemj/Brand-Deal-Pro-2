interface SearchableMatch {
  brand_name: string;
  niche: string | null;
  website?: string | null;
}

export function filterBrandMatches<T extends SearchableMatch>(matches: T[], search: string): T[] {
  const query = search.trim().toLowerCase();
  if (!query) return matches;
  return matches.filter((match) =>
    [match.brand_name, match.niche, match.website].some((value) =>
      typeof value === "string" && value.toLowerCase().includes(query)));
}

const nicheKey = (niche: string | null | undefined) => (niche ?? "").trim().toLowerCase();

/** The niches of the matched brands (only those, so a choice never filters down to nothing), with brand counts, A to Z. */
export function matchNiches(matches: { niche: string | null }[]): { niche: string; count: number }[] {
  const byKey = new Map<string, { niche: string; count: number }>();
  for (const match of matches) {
    const key = nicheKey(match.niche);
    if (!key) continue;
    const entry = byKey.get(key);
    if (entry) entry.count += 1;
    else byKey.set(key, { niche: match.niche!.trim(), count: 1 });
  }
  return [...byKey.values()].sort((a, b) => a.niche.localeCompare(b.niche));
}

/** Only the brands of one niche (case does not matter); an empty niche means all brands. */
export function filterByNiche<T extends { niche: string | null }>(matches: T[], niche: string): T[] {
  const key = nicheKey(niche);
  return key ? matches.filter((match) => nicheKey(match.niche) === key) : matches;
}
