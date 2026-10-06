import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ApiRequestError } from "@/lib/api";
import { getAiMatches, isAiRanking, refreshAiMatches } from "@/lib/aiMatches";

const QUERY_KEY = ["ai-brand-matches"];

export default function useAiMatches(active: boolean) {
  const queryClient = useQueryClient();
  const refresh = useMutation({
    mutationFn: refreshAiMatches,
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: QUERY_KEY });
    },
    onSuccess: (data) => queryClient.setQueryData(QUERY_KEY, data),
  });
  const query = useQuery({
    queryKey: QUERY_KEY,
    queryFn: ({ signal }) => getAiMatches(signal),
    enabled: active && !refresh.isPending,
    staleTime: 0,
    retry: (count, error) => !(error instanceof ApiRequestError && (error.status === 401 || error.status === 403)) && count < 1,
    // React Query owns one interval, removes it on hide/unmount, and prevents
    // overlapping fetches. Polling stops as soon as the run reaches a final state.
    refetchInterval: (query) => isAiRanking(query.state.data) ? 5_000 : false,
    refetchIntervalInBackground: false,
  });
  const error = refresh.error ?? query.error;
  return {
    data: query.data,
    loading: query.isLoading,
    error: error instanceof Error ? error.message : error ? "Could not load AI rankings." : null,
    refreshing: refresh.isPending,
    refresh: () => {
      if (refresh.isPending || isAiRanking(query.data)) return;
      refresh.mutate();
    },
  };
}
