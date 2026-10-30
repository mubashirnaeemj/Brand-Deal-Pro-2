import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api, SAVED_BRANDS_LIST_PATH, type SavedBrand } from "@/lib/api";

const KEY = ["saved-brands"];

/** The creator's saved brands, shared by every Save button on the page (one request, one cache entry). */
export default function useSavedBrands() {
  const queryClient = useQueryClient();
  const { data: saved = [] } = useQuery<SavedBrand[]>({
    queryKey: KEY,
    queryFn: () => api.get(SAVED_BRANDS_LIST_PATH),
    staleTime: 60_000,
    retry: 1,
  });
  const isSaved = (brandId: number) => saved.some((brand) => brand.brand_id === brandId);

  // The button flips at once; if the request fails the list is reloaded from the server.
  const toggle = async (brand: { id: number; name: string; niche?: string | null }) => {
    if (isSaved(brand.id)) {
      queryClient.setQueryData<SavedBrand[]>(KEY, (previous) => (previous ?? []).filter((item) => item.brand_id !== brand.id));
      try { await api.delete(`/saved-brands/${brand.id}`); }
      catch { await queryClient.invalidateQueries({ queryKey: KEY }); }
    } else {
      queryClient.setQueryData<SavedBrand[]>(KEY, (previous) => [
        ...(previous ?? []),
        { brand_id: brand.id, name: brand.name, niche: brand.niche ?? "", short_bio: null, saved_at: new Date().toISOString() },
      ]);
      try { await api.post("/saved-brands", { brand_id: brand.id }); }
      catch { await queryClient.invalidateQueries({ queryKey: KEY }); }
    }
  };
  return { saved, isSaved, toggle };
}
