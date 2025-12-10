import { useMutation, useQueryClient } from '@tanstack/react-query';
import { getApiClient } from '../client.js';

export interface ExtendTrialInput {
  days: number;
  reason?: string;
}

export interface ExtendTrialResult {
  message: string;
  newEndDate: string;
}

export interface AddCreditInput {
  amountCents: number;
  reason: string;
}

export interface AddCreditResult {
  message: string;
  amountCents: number;
}

export interface ImpersonateResult {
  token: string;
  expiresIn: number;
  organization: {
    id: string;
    name: string;
  };
}

export const adminKeys = {
  all: ['admin'] as const,
  organizations: () => [...adminKeys.all, 'organizations'] as const,
};

export function useExtendTrial() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ orgId, input }: { orgId: string; input: ExtendTrialInput }) => {
      const client = getApiClient();
      return client.post<ExtendTrialResult>(`/admin/organizations/${orgId}/extend-trial`, input);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminKeys.organizations() });
    },
  });
}

export function useAddCredit() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ orgId, input }: { orgId: string; input: AddCreditInput }) => {
      const client = getApiClient();
      return client.post<AddCreditResult>(`/admin/organizations/${orgId}/add-credit`, input);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminKeys.organizations() });
    },
  });
}

export function useImpersonate() {
  return useMutation({
    mutationFn: async (orgId: string) => {
      const client = getApiClient();
      return client.post<ImpersonateResult>(`/admin/organizations/${orgId}/impersonate`, {});
    },
  });
}

export function useSuspendOrganization() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ orgId, reason }: { orgId: string; reason?: string }) => {
      const client = getApiClient();
      return client.post<{ message: string }>(`/admin/organizations/${orgId}/suspend`, { reason });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminKeys.organizations() });
    },
  });
}

export function useUnsuspendOrganization() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (orgId: string) => {
      const client = getApiClient();
      return client.post<{ message: string }>(`/admin/organizations/${orgId}/unsuspend`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminKeys.organizations() });
    },
  });
}
