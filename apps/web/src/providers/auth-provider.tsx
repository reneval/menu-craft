import { ClerkProvider } from '@clerk/clerk-react';
import { type ReactNode } from 'react';
import { env } from '@/config/env';

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  // If no Clerk key, just render children (dev mode without auth)
  if (!env.CLERK_PUBLISHABLE_KEY) {
    return <>{children}</>;
  }

  return (
    <ClerkProvider publishableKey={env.CLERK_PUBLISHABLE_KEY}>
      {children}
    </ClerkProvider>
  );
}
