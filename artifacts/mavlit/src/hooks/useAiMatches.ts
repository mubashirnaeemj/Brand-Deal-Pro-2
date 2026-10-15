import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ApiRequestError } from "@/lib/api";
import { loadAi, isAiRanking, rerankAi, type AiMatchesVersion } from "@/lib/aiMatches";

export default function useAiMatches(version: AiMatchesVersion, active: boolean) {
  const [loaded, setLoaded] = useState(false);
  const [timedOut, setTimedOut] = useState(false);
  const queryKey = ["ai-brand-matches", version];
  const queryClient = useQueryClient();
  useEffect(() => {
    if (active) setLoaded(true);
  }, [active]);
  const refresh = useMutation({
    mutationFn: () => rerankAi(version),
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey });
    },
    onSuccess: (data) => queryClient.setQueryData(queryKey, data),
  });
  const query = useQuery({
    queryKey,
    queryFn: ({ signal }) => loadAi(version, signal),
    // Once opened, keep observing this version even while another tab is shown.
    enabled: (active || loaded) && !refresh.isPending,
    staleTime: 0,
    retry: (count, error) => !(error instanceof ApiRequestError && (error.status === 401 || error.status === 403)) && count < 1,
    // React Query owns one poll interval per version and prevents overlapping
    // requests. Polling stops on a final status or when the page unmounts.
    refetchInterval: (query) => isAiRanking(query.state.data)
      ? version === "v3" ? timedOut ? false : 3_000 : 5_000 : false,
    refetchIntervalInBackground: false,
  });
  const error = refresh.error ?? query.error;
  const pending = isAiRanking(query.data);
  useEffect(() => {
    if (version !== "v3" || !pending) {
      setTimedOut(false);
      return;
    }
    const timer = setTimeout(() => setTimedOut(true), 180_000);
    return () => clearTimeout(timer);
  }, [pending, version]);
  useEffect(() => {
    if (error instanceof ApiRequestError && error.status === 403) {
      window.dispatchEvent(new Event("mavlit:profile-incomplete"));
    }
  }, [error]);
  return {
    loaded,
    data: query.data,
    loading: query.isLoading,
    error: error instanceof Error ? error.message : error ? "Could not load AI rankings." : null,
    refreshing: refresh.isPending,
    timedOut,
    refresh: () => {
      if (refresh.isPending || isAiRanking(query.data)) return;
      refresh.mutate();
    },
  };
}
