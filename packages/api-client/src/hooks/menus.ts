import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type {
  Menu,
  MenuSection,
  MenuItem,
  MenuItemOption,
  CreateMenu,
  UpdateMenu,
} from '@menucraft/shared-types';
import { getApiClient } from '../client.js';

// Extended types for API responses with relations
export interface MenuItemWithOptions extends MenuItem {
  options: MenuItemOption[];
}

export interface MenuSectionWithItems extends MenuSection {
  items: MenuItemWithOptions[];
}

export interface MenuWithSections extends Menu {
  sections: MenuSectionWithItems[];
}

export const menuKeys = {
  all: ['menus'] as const,
  lists: () => [...menuKeys.all, 'list'] as const,
  list: (orgId: string, venueId: string) => [...menuKeys.lists(), { orgId, venueId }] as const,
  details: () => [...menuKeys.all, 'detail'] as const,
  detail: (orgId: string, venueId: string, id: string) =>
    [...menuKeys.details(), { orgId, venueId, id }] as const,
};

export function useMenus(orgId: string, venueId: string) {
  return useQuery({
    queryKey: menuKeys.list(orgId, venueId),
    queryFn: async () => {
      const client = getApiClient();
      return client.get<Menu[]>(`/organizations/${orgId}/venues/${venueId}/menus`);
    },
    enabled: !!orgId && !!venueId,
  });
}

export function useMenu(orgId: string, venueId: string, id: string) {
  return useQuery({
    queryKey: menuKeys.detail(orgId, venueId, id),
    queryFn: async () => {
      const client = getApiClient();
      return client.get<MenuWithSections>(`/organizations/${orgId}/venues/${venueId}/menus/${id}`);
    },
    enabled: !!orgId && !!venueId && !!id,
  });
}

export function useCreateMenu(orgId: string, venueId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateMenu) => {
      const client = getApiClient();
      return client.post<Menu>(`/organizations/${orgId}/venues/${venueId}/menus`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: menuKeys.list(orgId, venueId) });
    },
  });
}

export function useUpdateMenu(orgId: string, venueId: string, id: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: UpdateMenu) => {
      const client = getApiClient();
      return client.patch<Menu>(`/organizations/${orgId}/venues/${venueId}/menus/${id}`, data);
    },
    onSuccess: (data) => {
      queryClient.setQueryData(menuKeys.detail(orgId, venueId, id), data);
      queryClient.invalidateQueries({ queryKey: menuKeys.list(orgId, venueId) });
    },
  });
}

export function usePublishMenu(orgId: string, venueId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const client = getApiClient();
      return client.post<Menu>(`/organizations/${orgId}/venues/${venueId}/menus/${id}/publish`);
    },
    onSuccess: (data, id) => {
      queryClient.setQueryData(menuKeys.detail(orgId, venueId, id), data);
      queryClient.invalidateQueries({ queryKey: menuKeys.list(orgId, venueId) });
    },
  });
}

export function useDeleteMenu(orgId: string, venueId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const client = getApiClient();
      return client.delete<{ deleted: boolean }>(
        `/organizations/${orgId}/venues/${venueId}/menus/${id}`
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: menuKeys.list(orgId, venueId) });
    },
  });
}

export function useDuplicateMenu(orgId: string, venueId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const client = getApiClient();
      return client.post<Menu>(`/organizations/${orgId}/venues/${venueId}/menus/${id}/duplicate`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: menuKeys.list(orgId, venueId) });
    },
  });
}

// Menu Version Types
export interface MenuVersionChanges {
  menuChanges: Record<string, { from: unknown; to: unknown }>;
  sectionsAdded: string[];
  sectionsRemoved: string[];
  sectionsModified: string[];
  itemsAdded: number;
  itemsRemoved: number;
  itemsModified: number;
}

// Detailed diff types for visual diff UI
export interface ItemChange {
  id: string;
  name: string;
  sectionName: string;
  _type?: 'added' | 'modified' | 'removed';
  changes?: {
    name?: { from: string; to: string };
    description?: { from: string | null; to: string | null };
    priceAmount?: { from: number | null; to: number | null };
    priceType?: { from: string; to: string };
    isAvailable?: { from: boolean; to: boolean };
    dietaryTags?: { from: string[]; to: string[] };
  };
}

export interface SectionChange {
  id: string;
  name: string;
  changes?: {
    name?: { from: string; to: string };
    description?: { from: string | null; to: string | null };
  };
  items: ItemChange[];
}

export interface DetailedChanges {
  menuChanges: Record<string, { from: unknown; to: unknown }>;
  sections: {
    added: SectionChange[];
    removed: SectionChange[];
    modified: SectionChange[];
    unchanged: SectionChange[];
  };
  summary: {
    sectionsAdded: number;
    sectionsRemoved: number;
    sectionsModified: number;
    itemsAdded: number;
    itemsRemoved: number;
    itemsModified: number;
  };
}

export interface PublishPreview {
  isFirstPublish: boolean;
  lastPublishedAt: string | null;
  lastPublishedVersion?: number;
  changes: MenuVersionChanges;
  detailedChanges?: DetailedChanges;
  summary: {
    totalSections: number;
    totalItems: number;
    hasChanges: boolean;
  };
}

export const versionKeys = {
  all: ['menuVersions'] as const,
  publishPreview: (orgId: string, venueId: string, menuId: string) =>
    [...versionKeys.all, 'publishPreview', { orgId, venueId, menuId }] as const,
};

export function usePublishPreview(orgId: string, venueId: string, menuId: string, enabled = true) {
  return useQuery({
    queryKey: versionKeys.publishPreview(orgId, venueId, menuId),
    queryFn: async () => {
      const client = getApiClient();
      return client.get<PublishPreview>(
        `/organizations/${orgId}/venues/${venueId}/menus/${menuId}/versions/publish-preview`
      );
    },
    enabled: !!orgId && !!venueId && !!menuId && enabled,
  });
}

// Clone Menu to Another Venue

export interface CloneToVenueInput {
  targetVenueId: string;
}

export interface CloneToVenueResult {
  menu: Menu;
  targetVenue: {
    id: string;
    name: string;
    slug: string;
  };
}

export function useCloneMenuToVenue(orgId: string, venueId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ menuId, targetVenueId }: { menuId: string; targetVenueId: string }) => {
      const client = getApiClient();
      return client.post<CloneToVenueResult>(
        `/organizations/${orgId}/venues/${venueId}/menus/${menuId}/clone-to-venue`,
        { targetVenueId }
      );
    },
    onSuccess: (data) => {
      // Invalidate menu lists for both source and target venues
      queryClient.invalidateQueries({ queryKey: menuKeys.list(orgId, venueId) });
      queryClient.invalidateQueries({ queryKey: menuKeys.list(orgId, data.targetVenue.id) });
    },
  });
}
