import { useQuery } from '@tanstack/react-query';
import { getApiClient } from '@menucraft/api-client';
import { createContext, useContext, ReactNode } from 'react';

interface FeatureFlagsContextValue {
  flags: Record<string, boolean>;
  isLoading: boolean;
  isEnabled: (key: string) => boolean;
}

const FeatureFlagsContext = createContext<FeatureFlagsContextValue | null>(null);

/**
 * Fetch all feature flags for the current user
 */
async function fetchFeatureFlags(): Promise<Record<string, boolean>> {
  try {
    const apiClient = getApiClient();
    const data = await apiClient.get<Record<string, boolean>>('/feature-flags');
    return data ?? {};
  } catch {
    // Return empty flags on error
    return {};
  }
}

/**
 * Provider component for feature flags
 */
export function FeatureFlagsProvider({ children }: { children: ReactNode }) {
  const { data: flags = {}, isLoading } = useQuery({
    queryKey: ['feature-flags'],
    queryFn: fetchFeatureFlags,
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
    retry: false,
  });

  const isEnabled = (key: string): boolean => {
    return flags[key] ?? false;
  };

  return (
    <FeatureFlagsContext.Provider value={{ flags, isLoading, isEnabled }}>
      {children}
    </FeatureFlagsContext.Provider>
  );
}

/**
 * Hook to access feature flags
 */
export function useFeatureFlags(): FeatureFlagsContextValue {
  const context = useContext(FeatureFlagsContext);
  if (!context) {
    // Return default values if used outside provider
    return {
      flags: {},
      isLoading: false,
      isEnabled: () => false,
    };
  }
  return context;
}

/**
 * Hook to check if a specific feature is enabled
 */
export function useFeatureFlag(key: string): boolean {
  const { isEnabled } = useFeatureFlags();
  return isEnabled(key);
}

/**
 * Component to conditionally render based on feature flag
 */
export function Feature({
  flag,
  children,
  fallback = null,
}: {
  flag: string;
  children: ReactNode;
  fallback?: ReactNode;
}) {
  const enabled = useFeatureFlag(flag);
  return <>{enabled ? children : fallback}</>;
}
