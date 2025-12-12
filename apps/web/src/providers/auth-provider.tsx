import { type ReactNode } from 'react';

interface AuthProviderProps {
  children: ReactNode;
}

// Better-auth uses cookie-based sessions, no provider wrapper needed
// This component exists for backward compatibility with the provider structure
export function AuthProvider({ children }: AuthProviderProps) {
  return <>{children}</>;
}
