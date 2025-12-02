import { type ReactNode } from 'react';
import { QueryProvider, ApiClientWithAuth } from './query-provider';
import { AuthProvider } from './auth-provider';
import { env } from '@/config/env';

interface ProvidersProps {
  children: ReactNode;
}

export function Providers({ children }: ProvidersProps) {
  // If Clerk is available, wrap with ApiClientWithAuth to setup auth tokens
  const content = env.CLERK_PUBLISHABLE_KEY ? (
    <ApiClientWithAuth>{children}</ApiClientWithAuth>
  ) : (
    children
  );

  return (
    <AuthProvider>
      <QueryProvider>{content}</QueryProvider>
    </AuthProvider>
  );
}
