import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type {
  MenuItem,
  CreateItem,
  UpdateItem,
  ReorderItems,
  MoveItem,
} from '@menucraft/shared-types';
import { getApiClient } from '../client.js';
import { menuKeys, type MenuItemWithOptions } from './menus.js';
import { sectionKeys } from './sections.js';

export const itemKeys = {
  all: ['items'] as const,
  lists: () => [...itemKeys.all, 'list'] as const,
  list: (orgId: string, venueId: string, menuId: string, sectionId: string) =>
    [...itemKeys.lists(), { orgId, venueId, menuId, sectionId }] as const,
  details: () => [...itemKeys.all, 'detail'] as const,
  detail: (orgId: string, venueId: string, menuId: string, sectionId: string, id: string) =>
    [...itemKeys.details(), { orgId, venueId, menuId, sectionId, id }] as const,
};

export function useItems(orgId: string, venueId: string, menuId: string, sectionId: string) {
  return useQuery({
    queryKey: itemKeys.list(orgId, venueId, menuId, sectionId),
    queryFn: async () => {
      const client = getApiClient();
      return client.get<MenuItemWithOptions[]>(
        `/organizations/${orgId}/venues/${venueId}/menus/${menuId}/sections/${sectionId}/items`
      );
    },
    enabled: !!orgId && !!venueId && !!menuId && !!sectionId,
  });
}

export function useItem(
  orgId: string,
  venueId: string,
  menuId: string,
  sectionId: string,
  id: string
) {
  return useQuery({
    queryKey: itemKeys.detail(orgId, venueId, menuId, sectionId, id),
    queryFn: async () => {
      const client = getApiClient();
      return client.get<MenuItemWithOptions>(
        `/organizations/${orgId}/venues/${venueId}/menus/${menuId}/sections/${sectionId}/items/${id}`
      );
    },
    enabled: !!orgId && !!venueId && !!menuId && !!sectionId && !!id,
  });
}

export function useCreateItem(
  orgId: string,
  venueId: string,
  menuId: string,
  sectionId: string
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateItem) => {
      const client = getApiClient();
      return client.post<MenuItemWithOptions>(
        `/organizations/${orgId}/venues/${venueId}/menus/${menuId}/sections/${sectionId}/items`,
        data
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: itemKeys.list(orgId, venueId, menuId, sectionId),
      });
      queryClient.invalidateQueries({
        queryKey: sectionKeys.detail(orgId, venueId, menuId, sectionId),
      });
      queryClient.invalidateQueries({ queryKey: menuKeys.detail(orgId, venueId, menuId) });
    },
  });
}

export function useUpdateItem(
  orgId: string,
  venueId: string,
  menuId: string,
  sectionId: string,
  id: string
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: UpdateItem) => {
      const client = getApiClient();
      return client.patch<MenuItemWithOptions>(
        `/organizations/${orgId}/venues/${venueId}/menus/${menuId}/sections/${sectionId}/items/${id}`,
        data
      );
    },
    onSuccess: (data) => {
      queryClient.setQueryData(itemKeys.detail(orgId, venueId, menuId, sectionId, id), data);
      queryClient.invalidateQueries({
        queryKey: itemKeys.list(orgId, venueId, menuId, sectionId),
      });
      queryClient.invalidateQueries({ queryKey: menuKeys.detail(orgId, venueId, menuId) });
    },
  });
}

export function useDeleteItem(
  orgId: string,
  venueId: string,
  menuId: string,
  sectionId: string
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const client = getApiClient();
      return client.delete<{ deleted: boolean }>(
        `/organizations/${orgId}/venues/${venueId}/menus/${menuId}/sections/${sectionId}/items/${id}`
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: itemKeys.list(orgId, venueId, menuId, sectionId),
      });
      queryClient.invalidateQueries({ queryKey: menuKeys.detail(orgId, venueId, menuId) });
    },
  });
}

export function useReorderItems(
  orgId: string,
  venueId: string,
  menuId: string,
  sectionId: string
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: ReorderItems) => {
      const client = getApiClient();
      return client.patch<MenuItem[]>(
        `/organizations/${orgId}/venues/${venueId}/menus/${menuId}/sections/${sectionId}/items/reorder`,
        data
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: itemKeys.list(orgId, venueId, menuId, sectionId),
      });
      queryClient.invalidateQueries({ queryKey: menuKeys.detail(orgId, venueId, menuId) });
    },
  });
}

export function useMoveItem(
  orgId: string,
  venueId: string,
  menuId: string,
  sectionId: string
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ itemId, ...data }: MoveItem & { itemId: string }) => {
      const client = getApiClient();
      return client.post<MenuItem>(
        `/organizations/${orgId}/venues/${venueId}/menus/${menuId}/sections/${sectionId}/items/${itemId}/move`,
        data
      );
    },
    onSuccess: () => {
      // Invalidate both source and all sections since we don't know target
      queryClient.invalidateQueries({ queryKey: sectionKeys.list(orgId, venueId, menuId) });
      queryClient.invalidateQueries({ queryKey: menuKeys.detail(orgId, venueId, menuId) });
    },
  });
}
