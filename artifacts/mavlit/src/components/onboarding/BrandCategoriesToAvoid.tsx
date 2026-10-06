import { useEffect, useState } from "react";
import { getCachedBrandTags, loadBrandTags, normalizeTagNiches } from "@/lib/brandCategoryTags";
import MultiSelectDropdown from "./MultiSelectDropdown";

export default function BrandCategoriesToAvoid({
  selected,
  onChange,
  primaryNiches,
}: {
  selected: string[];
  onChange: (categories: string[]) => void;
  primaryNiches: string[];
}) {
  const nicheKey = JSON.stringify(normalizeTagNiches(primaryNiches));
  const [, refresh] = useState(0);
  const niches: string[] = JSON.parse(nicheKey);
  const { options, loading, failed } = getCachedBrandTags(niches);

  useEffect(() => {
    let active = true;
    const currentNiches: string[] = JSON.parse(nicheKey);
    if (currentNiches.length) {
      void loadBrandTags(currentNiches).then(() => {
        if (active) refresh((value) => value + 1);
      });
    }
    return () => { active = false; };
  }, [nicheKey]);

  const hint = !niches.length
    ? "Select a primary niche first to see its brand tags."
    : loading ? "Loading tags…" : failed && !options.length ? "Could not load tags." : undefined;

  return (
    <div>
      <MultiSelectDropdown label="Brand categories to avoid" selected={selected}
        onChange={onChange} options={hint ? [] : options} searchable closeOnSelect
        placeholder="Search and select tag(s) to avoid"
        searchPlaceholder="Search and select tag(s) to avoid"
        hint={hint} tagSearch />
      {failed && options.length > 0 && <p role="alert" className="mt-2 text-xs text-red-400">Some brand tags could not be loaded.</p>}
    </div>
  );
}