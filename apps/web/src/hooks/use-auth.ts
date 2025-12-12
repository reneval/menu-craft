import { useSession, signOut as authSignOut } from '../lib/auth-client';
import { useNavigate } from '@tanstack/react-router';

export function useAuth() {
  const session = useSession();
  const navigate = useNavigate();

  const signOut = async () => {
    await authSignOut();
    navigate({ to: '/auth/sign-in' });
  };

  return {
    user: session.data?.user ?? null,
    session: session.data?.session ?? null,
    isLoading: session.isPending,
    isAuthenticated: !!session.data?.user,
    signOut,
  };
}

export function useUser() {
  const { user, isLoading } = useAuth();

  return {
    user,
    isLoading,
    // Compatibility with Clerk's useUser
    firstName: user?.name?.split(' ')[0] ?? '',
    lastName: user?.name?.split(' ').slice(1).join(' ') ?? '',
    fullName: user?.name ?? '',
    imageUrl: user?.image ?? null,
    primaryEmailAddress: user?.email ? { emailAddress: user.email } : null,
  };
}
