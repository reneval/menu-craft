import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { initApiClient } from '@menucraft/api-client';
import { useAuth } from '@clerk/clerk-react';
import { type ReactNode, useState, useEffect } from 'react';
import { env } from '@/config/env';

// Initialize API client with config (no auth token initially)
initApiClient({
  baseUrl: env.API_URL,
  getAuthToken: () => null,
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

// Component to reinitialize API client with auth token after Clerk loads
// Only use this inside ClerkProvider
export function ApiClientWithAuth({ children }: { children: ReactNode }) {
  const { getToken } = useAuth();

  useEffect(() => {
    initApiClient({
      baseUrl: env.API_URL,
      getAuthToken: () => getToken(),
    });
  }, [getToken]);

  return <>{children}</>;
}
