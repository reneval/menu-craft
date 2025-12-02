import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getApiClient } from '../client.js';

export interface QrCode {
  id: string;
  organizationId: string;
  targetType: 'venue' | 'menu';
  targetId: string;
  code: string;
  scanCount: number;
  lastScannedAt: string | null;
  createdAt: string;
}

export interface QrCodeWithTarget extends QrCode {
  targetName: string;
}

export interface CreateQrCodeInput {
  targetType: 'venue' | 'menu';
  targetId: string;
}

export const qrCodeKeys = {
  all: ['qrCodes'] as const,
  list: (orgId: string) => [...qrCodeKeys.all, 'list', { orgId }] as const,
  detail: (orgId: string, id: string) => [...qrCodeKeys.all, 'detail', { orgId, id }] as const,
};

export function useQrCodes(orgId: string) {
  return useQuery({
    queryKey: qrCodeKeys.list(orgId),
    queryFn: async () => {
      const client = getApiClient();
      return client.get<QrCodeWithTarget[]>(`/organizations/${orgId}/qr-codes`);
    },
    enabled: !!orgId,
  });
}

export function useQrCode(orgId: string, id: string) {
  return useQuery({
    queryKey: qrCodeKeys.detail(orgId, id),
    queryFn: async () => {
      const client = getApiClient();
      return client.get<QrCodeWithTarget>(`/organizations/${orgId}/qr-codes/${id}`);
    },
    enabled: !!orgId && !!id,
  });
}

export function useCreateQrCode(orgId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateQrCodeInput) => {
      const client = getApiClient();
      return client.post<QrCode>(`/organizations/${orgId}/qr-codes`, input);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: qrCodeKeys.list(orgId) });
    },
  });
}

export function useDeleteQrCode(orgId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const client = getApiClient();
      await client.delete(`/organizations/${orgId}/qr-codes/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: qrCodeKeys.list(orgId) });
    },
  });
}
