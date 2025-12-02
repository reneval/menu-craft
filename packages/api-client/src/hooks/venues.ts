import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type {
  Venue,
  CreateVenue,
  UpdateVenue,
} from '@menucraft/shared-types';
import { getApiClient } from '../client.js';

export const venueKeys = {
  all: ['venues'] as const,
  lists: () => [...venueKeys.all, 'list'] as const,
  list: (orgId: string) => [...venueKeys.lists(), { orgId }] as const,
  details: () => [...venueKeys.all, 'detail'] as const,
  detail: (orgId: string, id: string) => [...venueKeys.details(), { orgId, id }] as const,
};

export function useVenues(orgId: string) {
  return useQuery({
    queryKey: venueKeys.list(orgId),
    queryFn: async () => {
      const client = getApiClient();
      return client.get<Venue[]>(`/organizations/${orgId}/venues`);
    },
    enabled: !!orgId,
  });
}

export function useVenue(orgId: string, id: string) {
  return useQuery({
    queryKey: venueKeys.detail(orgId, id),
    queryFn: async () => {
      const client = getApiClient();
      return client.get<Venue>(`/organizations/${orgId}/venues/${id}`);
    },
    enabled: !!orgId && !!id,
  });
}

export function useCreateVenue(orgId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateVenue) => {
      const client = getApiClient();
      return client.post<Venue>(`/organizations/${orgId}/venues`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: venueKeys.list(orgId) });
    },
  });
}

export function useUpdateVenue(orgId: string, id: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: UpdateVenue) => {
      const client = getApiClient();
      return client.patch<Venue>(`/organizations/${orgId}/venues/${id}`, data);
    },
    onSuccess: (data) => {
      queryClient.setQueryData(venueKeys.detail(orgId, id), data);
      queryClient.invalidateQueries({ queryKey: venueKeys.list(orgId) });
    },
  });
}

export function useDeleteVenue(orgId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const client = getApiClient();
      return client.delete<{ deleted: boolean }>(`/organizations/${orgId}/venues/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: venueKeys.list(orgId) });
    },
  });
}
