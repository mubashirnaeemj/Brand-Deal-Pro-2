import { api } from "./api";

const tagsByNiche = new Map<string, string[]>();
const pendingByNiche = new Map<string, Promise<void>>();
const failedNiches = new Set<string>();

export function normalizeTagNiches(primaryNiches: string[]): string[] {
  return [...new Set(primaryNiches.flatMap((value) => value.split(","))
    .map((value) => value.trim().toLowerCase()).filter(Boolean))];
}

export function mergeBrandTags(lists: string[][]): string[] {
  const unique = new Map<string, string>();
  for (const tags of lists) {
    for (const tag of tags) {
      const key = tag.toLowerCase();
      if (!unique.has(key)) unique.set(key, tag);
    }
  }
  return [...unique.values()].sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase()));
}

export function getCachedBrandTags(niches: string[]) {
  return {
    options: mergeBrandTags(niches.map((niche) => tagsByNiche.get(niche) ?? [])),
    loading: niches.some((niche) => !tagsByNiche.has(niche)),
    failed: niches.some((niche) => failedNiches.has(niche)),
  };
}

export async function loadBrandTags(niches: string[]): Promise<void> {
  const missing = niches.filter((niche) => !tagsByNiche.has(niche) && !pendingByNiche.has(niche));
  if (missing.length) {
    const params = new URLSearchParams();
    missing.forEach((niche) => params.append("niche", niche));
    const request = (async () => {
      try {
        const response = await api.get<{ tags_by_niche: Record<string, string[]> }>(`/brand-category-tags?${params}`);
        if (!response.tags_by_niche || typeof response.tags_by_niche !== "object") {
          throw new Error("Invalid brand tags response");
        }
        const lists = missing.map((niche) => {
          const tags = response.tags_by_niche[niche];
          if (!Array.isArray(tags) || !tags.every((tag) => typeof tag === "string")) {
            throw new Error("Invalid brand tags response");
          }
          return tags;
        });
        missing.forEach((niche, index) => tagsByNiche.set(niche, lists[index]));
      } catch {
        // Cache failures too, so typing and remounting don't repeatedly fetch them.
        missing.forEach((niche) => {
          tagsByNiche.set(niche, []);
          failedNiches.add(niche);
        });
      } finally {
        missing.forEach((niche) => pendingByNiche.delete(niche));
      }
    })();
    missing.forEach((niche) => pendingByNiche.set(niche, request));
  }
  await Promise.all(niches.map((niche) => pendingByNiche.get(niche)));
}
