import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type {
  User,
  UpdateUserProfile,
  UpdateUserPreferences,
} from '@menucraft/shared-types';
import { getApiClient } from '../client.js';

export const userKeys = {
  all: ['users'] as const,
  me: () => [...userKeys.all, 'me'] as const,
};

export function useCurrentUser() {
  return useQuery({
    queryKey: userKeys.me(),
    queryFn: async () => {
      const client = getApiClient();
      return client.get<User>('/users/me');
    },
  });
}

export function useUpdateProfile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: UpdateUserProfile) => {
      const client = getApiClient();
      return client.patch<User>('/users/me', data);
    },
    onSuccess: (data) => {
      queryClient.setQueryData(userKeys.me(), data);
    },
  });
}

export function useUpdatePreferences() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: UpdateUserPreferences) => {
      const client = getApiClient();
      return client.patch<User>('/users/me/preferences', data);
    },
    onSuccess: (data) => {
      queryClient.setQueryData(userKeys.me(), data);
    },
  });
}
