import { useQuery, useMutation } from '@tanstack/react-query';
import { getApiClient } from '../client.js';

export interface Plan {
  id: string;
  name: string;
  slug: string;
  stripePriceId: string;
  monthlyPrice: number;
  features: string[];
  limits: {
    venues: number;
    menusPerVenue: number;
    languages: number;
    customDomains: boolean;
    apiAccess: boolean;
  };
  isActive: boolean;
  createdAt: string;
}

export interface Subscription {
  id: string;
  organizationId: string;
  stripeSubscriptionId: string;
  status: 'active' | 'past_due' | 'canceled' | 'incomplete' | 'trialing';
  currentPeriodEnd: string | null;
  planId: string;
  plan: Plan;
  createdAt: string;
  updatedAt: string;
}

export interface SubscriptionResponse {
  status: 'free' | 'active' | 'past_due' | 'canceled' | 'incomplete' | 'trialing';
  plan: Plan;
  id?: string;
  stripeSubscriptionId?: string;
  currentPeriodEnd?: string | null;
}

export interface CheckoutResponse {
  url: string;
}

export interface PortalResponse {
  url: string;
}

export interface Invoice {
  id: string;
  number: string | null;
  status: string | null;
  amountDue: number;
  amountPaid: number;
  currency: string;
  created: number;
  periodStart: number;
  periodEnd: number;
  hostedInvoiceUrl: string | null;
  invoicePdf: string | null;
}

export interface TrialStatus {
  isTrialing: boolean;
  trialStartedAt: string | null;
  trialEndsAt: string | null;
  daysRemaining: number;
}

export const billingKeys = {
  all: ['billing'] as const,
  plans: () => [...billingKeys.all, 'plans'] as const,
  subscription: (orgId: string) => [...billingKeys.all, 'subscription', { orgId }] as const,
  invoices: (orgId: string) => [...billingKeys.all, 'invoices', { orgId }] as const,
  trialStatus: (orgId: string) => [...billingKeys.all, 'trial-status', { orgId }] as const,
};

export function usePlans() {
  return useQuery({
    queryKey: billingKeys.plans(),
    queryFn: async () => {
      const client = getApiClient();
      // Plans endpoint doesn't need orgId, but our route structure requires it
      // We'll use a workaround or create a public plans endpoint
      return client.get<Plan[]>('/billing/plans');
    },
    staleTime: 1000 * 60 * 60, // Plans don't change often
  });
}

export function useSubscription(orgId: string) {
  return useQuery({
    queryKey: billingKeys.subscription(orgId),
    queryFn: async () => {
      const client = getApiClient();
      return client.get<SubscriptionResponse>(`/organizations/${orgId}/billing/subscription`);
    },
    enabled: !!orgId,
  });
}

export function useCreateCheckout(orgId: string) {
  return useMutation({
    mutationFn: async (input: { priceId: string; successUrl?: string; cancelUrl?: string }) => {
      const client = getApiClient();
      return client.post<CheckoutResponse>(`/organizations/${orgId}/billing/checkout`, input);
    },
  });
}

export function useCreatePortalSession(orgId: string) {
  return useMutation({
    mutationFn: async (input: { returnUrl?: string }) => {
      const client = getApiClient();
      return client.post<PortalResponse>(`/organizations/${orgId}/billing/portal`, input);
    },
  });
}

export function useInvoices(orgId: string) {
  return useQuery({
    queryKey: billingKeys.invoices(orgId),
    queryFn: async () => {
      const client = getApiClient();
      return client.get<Invoice[]>(`/organizations/${orgId}/billing/invoices`);
    },
    enabled: !!orgId,
  });
}

export function useTrialStatus(orgId: string) {
  return useQuery({
    queryKey: billingKeys.trialStatus(orgId),
    queryFn: async () => {
      const client = getApiClient();
      return client.get<TrialStatus>(`/organizations/${orgId}/billing/trial-status`);
    },
    enabled: !!orgId,
  });
}
