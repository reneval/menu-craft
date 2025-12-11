import { createAuthClient } from 'better-auth/react';
import { env } from '../config/env';

export const authClient = createAuthClient({
  baseURL: env.API_URL,
});

export const {
  signIn,
  signUp,
  signOut,
  useSession,
  getSession,
} = authClient;
