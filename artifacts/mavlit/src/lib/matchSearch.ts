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
