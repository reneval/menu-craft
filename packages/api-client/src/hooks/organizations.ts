import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type {
  Organization,
  CreateOrganization,
  UpdateOrganization,
} from '@menucraft/shared-types';
import { getApiClient } from '../client.js';

export const organizationKeys = {
  all: ['organizations'] as const,
  lists: () => [...organizationKeys.all, 'list'] as const,
  list: (filters: object) => [...organizationKeys.lists(), filters] as const,
  details: () => [...organizationKeys.all, 'detail'] as const,
  detail: (id: string) => [...organizationKeys.details(), id] as const,
};

export function useOrganizations() {
  return useQuery({
    queryKey: organizationKeys.lists(),
    queryFn: async () => {
      const client = getApiClient();
      return client.get<Organization[]>('/organizations');
    },
  });
}

export function useOrganization(id: string) {
  return useQuery({
    queryKey: organizationKeys.detail(id),
    queryFn: async () => {
      const client = getApiClient();
      return client.get<Organization>(`/organizations/${id}`);
    },
    enabled: !!id,
  });
}

export function useCreateOrganization() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateOrganization) => {
      const client = getApiClient();
      return client.post<Organization>('/organizations', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: organizationKeys.lists() });
    },
  });
}

export function useUpdateOrganization(id: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: UpdateOrganization) => {
      const client = getApiClient();
      return client.patch<Organization>(`/organizations/${id}`, data);
    },
    onSuccess: (data) => {
      queryClient.setQueryData(organizationKeys.detail(id), data);
      queryClient.invalidateQueries({ queryKey: organizationKeys.lists() });
    },
  });
}
