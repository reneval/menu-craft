import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { initApiClient } from '@menucraft/api-client';
import { type ReactNode, useState } from 'react';
import { env } from '@/config/env';

// Initialize API client with config (uses cookies for auth)
initApiClient({
  baseUrl: env.API_URL,
});

interface QueryProviderProps {
  children: ReactNode;
}

export function QueryProvider({ children }: QueryProviderProps) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000, // 1 minute
            refetchOnWindowFocus: false,
          },
        },
      })
  );

  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}
