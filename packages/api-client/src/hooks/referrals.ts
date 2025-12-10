import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getApiClient } from '../client.js';

export interface ReferralStats {
  code: string | null;
  totalReferrals: number;
  successfulReferrals: number;
  creditsEarned: number;
}

export interface CreditBalance {
  balanceCents: number;
  balanceFormatted: string;
}

export const referralKeys = {
  all: ['referrals'] as const,
  stats: (orgId: string) => [...referralKeys.all, 'stats', { orgId }] as const,
  credits: (orgId: string) => [...referralKeys.all, 'credits', { orgId }] as const,
};

export function useReferralStats(orgId: string) {
  return useQuery({
    queryKey: referralKeys.stats(orgId),
    queryFn: async () => {
      const client = getApiClient();
      return client.get<ReferralStats>(`/organizations/${orgId}/referrals`);
    },
    enabled: !!orgId,
  });
}

export function useCreditBalance(orgId: string) {
  return useQuery({
    queryKey: referralKeys.credits(orgId),
    queryFn: async () => {
      const client = getApiClient();
      return client.get<CreditBalance>(`/organizations/${orgId}/referrals/credits`);
    },
    enabled: !!orgId,
  });
}

export function useGenerateReferralCode(orgId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const client = getApiClient();
      return client.post<{ code: string }>(`/organizations/${orgId}/referrals/generate`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: referralKeys.stats(orgId) });
    },
  });
}

export function useRedeemReferralCode(orgId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (code: string) => {
      const client = getApiClient();
      return client.post<{ message: string }>(`/organizations/${orgId}/referrals/redeem`, { code });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: referralKeys.stats(orgId) });
      queryClient.invalidateQueries({ queryKey: referralKeys.credits(orgId) });
    },
  });
}
