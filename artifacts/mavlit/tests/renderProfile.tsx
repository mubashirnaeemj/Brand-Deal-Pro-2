import type { ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render } from "@testing-library/react";
import { AuthProvider } from "@/contexts/AuthContext";

export function profileWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 }, mutations: { retry: false } },
  });
  const Wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>{children}</AuthProvider>
    </QueryClientProvider>
  );
  return { Wrapper, queryClient };
}

export function renderProfile(ui: ReactNode) {
  const { Wrapper, queryClient } = profileWrapper();
  return { ...render(ui, { wrapper: Wrapper }), queryClient };
}
