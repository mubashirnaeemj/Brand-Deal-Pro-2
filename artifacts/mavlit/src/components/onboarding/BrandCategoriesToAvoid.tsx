import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import MultiSelectDropdown from "./MultiSelectDropdown";

export default function BrandCategoriesToAvoid({
  selected,
  onChange,
}: {
  selected: string[];
  onChange: (categories: string[]) => void;
}) {
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["brand-category-niches"],
    queryFn: async () => {
      const response = await api.get<{ niches: string[] }>("/brand-category-niches");
      if (!Array.isArray(response.niches) || !response.niches.every((niche) => typeof niche === "string")) {
        throw new Error("Invalid brand categories response");
      }
      return response.niches;
    },
    staleTime: 5 * 60_000,
    retry: 1,
  });

  return (
    <div>
      <MultiSelectDropdown label="Brand categories to avoid" selected={selected}
        onChange={onChange} options={data ?? []} searchable closeOnSelect
        placeholder={isLoading ? "Loading categories…" : "Select brand categories"} />
      {isError && (
        <div className="mt-2 flex items-center gap-2 text-xs text-red-400" role="alert">
          Could not load brand categories.
          <button type="button" onClick={() => refetch()} className="font-semibold underline">Retry</button>
        </div>
      )}
    </div>
  );
}