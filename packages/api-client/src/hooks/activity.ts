import { useQuery } from '@tanstack/react-query';
import { getApiClient } from '../client.js';

// Audit action types - matches the database enum
export type AuditAction =
  | 'auth.login'
  | 'auth.logout'
  | 'organization.create'
  | 'organization.update'
  | 'organization.delete'
  | 'venue.create'
  | 'venue.update'
  | 'venue.delete'
  | 'menu.create'
  | 'menu.update'
  | 'menu.delete'
  | 'menu.publish'
  | 'menu.unpublish'
  | 'menu.duplicate'
  | 'menu.clone'
  | 'menu.import_photo'
  | 'menu_item.create'
  | 'menu_item.update'
  | 'menu_item.delete'
  | 'section.create'
  | 'section.update'
  | 'section.delete'
  | 'user.invite'
  | 'user.remove'
  | 'user.role_change'
  | 'subscription.create'
  | 'subscription.update'
  | 'subscription.cancel'
  | 'domain.create'
  | 'domain.verify'
  | 'domain.delete'
  | 'qr_code.create'
  | 'qr_code.delete'
  | 'settings.update';

export interface ActivityLogEntry {
  id: string;
  action: AuditAction;
  resourceType: string | null;
  resourceId: string | null;
  resourceName: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
  userId: string | null;
  userEmail: string | null;
  user: {
    name: string | null;
    email: string | null;
  } | null;
}

export const activityKeys = {
  all: ['activity'] as const,
  menu: (orgId: string, venueId: string, menuId: string) =>
    [...activityKeys.all, 'menu', { orgId, venueId, menuId }] as const,
};

export function useMenuActivity(
  orgId: string,
  venueId: string,
  menuId: string,
  options?: { limit?: number; enabled?: boolean }
) {
  const limit = options?.limit || 20;
  const enabled = options?.enabled ?? true;

  return useQuery({
    queryKey: activityKeys.menu(orgId, venueId, menuId),
    queryFn: async () => {
      const client = getApiClient();
      return client.get<ActivityLogEntry[]>(
        `/organizations/${orgId}/venues/${venueId}/menus/${menuId}/activity?limit=${limit}`
      );
    },
    enabled: !!orgId && !!venueId && !!menuId && enabled,
    refetchInterval: 60000, // Refresh every minute
  });
}

// Helper to format activity action for display
export function formatActivityAction(action: string): string {
  const actionMap: Record<string, string> = {
    'menu.create': 'Created menu',
    'menu.update': 'Updated menu',
    'menu.delete': 'Deleted menu',
    'menu.publish': 'Published menu',
    'menu.unpublish': 'Unpublished menu',
    'menu.duplicate': 'Duplicated menu',
    'menu.clone': 'Cloned menu',
    'menu.import_photo': 'Imported from photo',
    'section.create': 'Added section',
    'section.update': 'Updated section',
    'section.delete': 'Deleted section',
    'menu_item.create': 'Added item',
    'menu_item.update': 'Updated item',
    'menu_item.delete': 'Deleted item',
  };
  return actionMap[action] || action.replace(/[._]/g, ' ');
}

// Helper to get action icon type
export function getActivityActionType(action: string): 'create' | 'update' | 'delete' | 'publish' | 'other' {
  if (action.includes('create') || action.includes('duplicate') || action.includes('clone')) return 'create';
  if (action.includes('update')) return 'update';
  if (action.includes('delete')) return 'delete';
  if (action.includes('publish') || action.includes('unpublish')) return 'publish';
  return 'other';
}
