import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type {
  MenuSection,
  CreateSection,
  UpdateSection,
  ReorderSections,
} from '@menucraft/shared-types';
import { getApiClient } from '../client.js';
import { menuKeys, type MenuSectionWithItems } from './menus.js';

export const sectionKeys = {
  all: ['sections'] as const,
  lists: () => [...sectionKeys.all, 'list'] as const,
  list: (orgId: string, venueId: string, menuId: string) =>
    [...sectionKeys.lists(), { orgId, venueId, menuId }] as const,
  details: () => [...sectionKeys.all, 'detail'] as const,
  detail: (orgId: string, venueId: string, menuId: string, id: string) =>
    [...sectionKeys.details(), { orgId, venueId, menuId, id }] as const,
};

export function useSections(orgId: string, venueId: string, menuId: string) {
  return useQuery({
    queryKey: sectionKeys.list(orgId, venueId, menuId),
    queryFn: async () => {
      const client = getApiClient();
      return client.get<MenuSectionWithItems[]>(
        `/organizations/${orgId}/venues/${venueId}/menus/${menuId}/sections`
      );
    },
    enabled: !!orgId && !!venueId && !!menuId,
  });
}

export function useSection(orgId: string, venueId: string, menuId: string, id: string) {
  return useQuery({
    queryKey: sectionKeys.detail(orgId, venueId, menuId, id),
    queryFn: async () => {
      const client = getApiClient();
      return client.get<MenuSectionWithItems>(
        `/organizations/${orgId}/venues/${venueId}/menus/${menuId}/sections/${id}`
      );
    },
    enabled: !!orgId && !!venueId && !!menuId && !!id,
  });
}

export function useCreateSection(orgId: string, venueId: string, menuId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateSection) => {
      const client = getApiClient();
      return client.post<MenuSection>(
        `/organizations/${orgId}/venues/${venueId}/menus/${menuId}/sections`,
        data
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: sectionKeys.list(orgId, venueId, menuId) });
      queryClient.invalidateQueries({ queryKey: menuKeys.detail(orgId, venueId, menuId) });
    },
  });
}

export function useUpdateSection(orgId: string, venueId: string, menuId: string, id: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: UpdateSection) => {
      const client = getApiClient();
      return client.patch<MenuSection>(
        `/organizations/${orgId}/venues/${venueId}/menus/${menuId}/sections/${id}`,
        data
      );
    },
    onSuccess: (data) => {
      queryClient.setQueryData(sectionKeys.detail(orgId, venueId, menuId, id), data);
      queryClient.invalidateQueries({ queryKey: sectionKeys.list(orgId, venueId, menuId) });
      queryClient.invalidateQueries({ queryKey: menuKeys.detail(orgId, venueId, menuId) });
    },
  });
}

export function useDeleteSection(orgId: string, venueId: string, menuId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const client = getApiClient();
      return client.delete<{ deleted: boolean }>(
        `/organizations/${orgId}/venues/${venueId}/menus/${menuId}/sections/${id}`
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: sectionKeys.list(orgId, venueId, menuId) });
      queryClient.invalidateQueries({ queryKey: menuKeys.detail(orgId, venueId, menuId) });
    },
  });
}

export function useReorderSections(orgId: string, venueId: string, menuId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: ReorderSections) => {
      const client = getApiClient();
      return client.patch<MenuSection[]>(
        `/organizations/${orgId}/venues/${venueId}/menus/${menuId}/sections/reorder`,
        data
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: sectionKeys.list(orgId, venueId, menuId) });
      queryClient.invalidateQueries({ queryKey: menuKeys.detail(orgId, venueId, menuId) });
    },
  });
}
