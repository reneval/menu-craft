import { createAuthClient } from 'better-auth/react';
import { env } from '../config/env';

const client = createAuthClient({
  baseURL: env.API_URL,
});

// Type alias to avoid TS2742 portable type errors in declaration emit
type AuthClient = ReturnType<typeof createAuthClient>;

// Export with explicit types to prevent non-portable type inference issues
export const authClient: AuthClient = client;
export const signIn: AuthClient['signIn'] = client.signIn;
export const signUp: AuthClient['signUp'] = client.signUp;
export const signOut: AuthClient['signOut'] = client.signOut;
export const useSession: AuthClient['useSession'] = client.useSession;
export const getSession: AuthClient['getSession'] = client.getSession;
