import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getApiClient } from '../client';

export interface CustomDomain {
  id: string;
  organizationId: string;
  venueId: string;
  domain: string;
  status: 'pending' | 'verifying' | 'active' | 'failed';
  verificationToken: string;
  verifiedAt: string | null;
  lastCheckedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface VerifyDomainResponse {
  data: CustomDomain;
  verified: boolean;
  message?: string;
  checks?: {
    txtRecord: boolean;
    cname: boolean;
  };
}

export const domainKeys = {
  all: ['domains'] as const,
  list: (orgId: string, venueId: string) => [...domainKeys.all, orgId, venueId] as const,
};

export function useDomains(orgId: string, venueId: string) {
  return useQuery({
    queryKey: domainKeys.list(orgId, venueId),
    queryFn: async () => {
      const client = getApiClient();
      const response = await client.get<CustomDomain[]>(
        `/organizations/${orgId}/venues/${venueId}/domains`
      );
      return response;
    },
    enabled: !!orgId && !!venueId,
  });
}

export function useAddDomain(orgId: string, venueId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (domain: string) => {
      const client = getApiClient();
      return client.post<CustomDomain>(
        `/organizations/${orgId}/venues/${venueId}/domains`,
        { domain }
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: domainKeys.list(orgId, venueId) });
    },
  });
}

export function useVerifyDomain(orgId: string, venueId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (domainId: string) => {
      const client = getApiClient();
      return client.post<VerifyDomainResponse>(
        `/organizations/${orgId}/venues/${venueId}/domains/${domainId}/verify`,
        {}
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: domainKeys.list(orgId, venueId) });
    },
  });
}

export function useDeleteDomain(orgId: string, venueId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (domainId: string) => {
      const client = getApiClient();
      return client.delete(`/organizations/${orgId}/venues/${venueId}/domains/${domainId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: domainKeys.list(orgId, venueId) });
    },
  });
}
