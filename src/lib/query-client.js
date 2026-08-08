import { QueryClient } from '@tanstack/react-query';

export const queryClientInstance = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
      staleTime: 1000 * 60 * 5, // 5 minutes
      gcTime: 1000 * 60 * 15, // 15 minutes
    },
  },
});

export const realTimeQueryOptions = {
  staleTime: 1000 * 5,       // 5 seconds
  refetchInterval: 1000 * 10, // Poll every 10 seconds
  refetchOnWindowFocus: true,
};