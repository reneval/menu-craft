import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type {
  MenuSchedule,
  CreateSchedule,
  UpdateSchedule,
} from '@menucraft/shared-types';
import { getApiClient } from '../client.js';
import { menuKeys } from './menus.js';

export const scheduleKeys = {
  all: ['schedules'] as const,
  lists: () => [...scheduleKeys.all, 'list'] as const,
  list: (orgId: string, venueId: string, menuId: string) =>
    [...scheduleKeys.lists(), { orgId, venueId, menuId }] as const,
  details: () => [...scheduleKeys.all, 'detail'] as const,
  detail: (orgId: string, venueId: string, menuId: string, id: string) =>
    [...scheduleKeys.details(), { orgId, venueId, menuId, id }] as const,
};

export function useSchedules(orgId: string, venueId: string, menuId: string) {
  return useQuery({
    queryKey: scheduleKeys.list(orgId, venueId, menuId),
    queryFn: async () => {
      const client = getApiClient();
      return client.get<MenuSchedule[]>(
        `/organizations/${orgId}/venues/${venueId}/menus/${menuId}/schedules`
      );
    },
    enabled: !!orgId && !!venueId && !!menuId,
  });
}

export function useSchedule(orgId: string, venueId: string, menuId: string, id: string) {
  return useQuery({
    queryKey: scheduleKeys.detail(orgId, venueId, menuId, id),
    queryFn: async () => {
      const client = getApiClient();
      return client.get<MenuSchedule>(
        `/organizations/${orgId}/venues/${venueId}/menus/${menuId}/schedules/${id}`
      );
    },
    enabled: !!orgId && !!venueId && !!menuId && !!id,
  });
}

export function useCreateSchedule(orgId: string, venueId: string, menuId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateSchedule) => {
      const client = getApiClient();
      return client.post<MenuSchedule>(
        `/organizations/${orgId}/venues/${venueId}/menus/${menuId}/schedules`,
        data
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: scheduleKeys.list(orgId, venueId, menuId) });
      queryClient.invalidateQueries({ queryKey: menuKeys.detail(orgId, venueId, menuId) });
    },
  });
}

export function useUpdateSchedule(orgId: string, venueId: string, menuId: string, id: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: UpdateSchedule) => {
      const client = getApiClient();
      return client.patch<MenuSchedule>(
        `/organizations/${orgId}/venues/${venueId}/menus/${menuId}/schedules/${id}`,
        data
      );
    },
    onSuccess: (data) => {
      queryClient.setQueryData(scheduleKeys.detail(orgId, venueId, menuId, id), data);
      queryClient.invalidateQueries({ queryKey: scheduleKeys.list(orgId, venueId, menuId) });
      queryClient.invalidateQueries({ queryKey: menuKeys.detail(orgId, venueId, menuId) });
    },
  });
}

export function useDeleteSchedule(orgId: string, venueId: string, menuId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const client = getApiClient();
      return client.delete<{ deleted: boolean }>(
        `/organizations/${orgId}/venues/${venueId}/menus/${menuId}/schedules/${id}`
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: scheduleKeys.list(orgId, venueId, menuId) });
      queryClient.invalidateQueries({ queryKey: menuKeys.detail(orgId, venueId, menuId) });
    },
  });
}
