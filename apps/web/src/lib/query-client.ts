import { QueryClient, keepPreviousData } from "@tanstack/react-query";

export function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 4_000,
        retry: 3,
        retryDelay: (attempt) => Math.min(1_000 * 2 ** attempt, 8_000),
        placeholderData: keepPreviousData,
        refetchOnWindowFocus: false,
      },
    },
  });
}
