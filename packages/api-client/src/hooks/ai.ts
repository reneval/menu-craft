/**
 * AI suggestion hooks for menu items
 */

import { useQuery, useMutation } from '@tanstack/react-query';
import { getApiClient } from '../client.js';

// Types
export interface GenerateDescriptionInput {
  itemName: string;
  category?: string;
  venueType?: string;
  existingDescription?: string;
}

export interface GenerateDescriptionResult {
  description: string;
}

export interface SuggestPriceInput {
  itemName: string;
  category?: string;
  region?: string;
  currency?: string;
}

export interface SuggestPriceResult {
  low: number;
  mid: number;
  high: number;
  currency: string;
  reasoning?: string;
}

export interface SuggestTagsInput {
  itemName: string;
  description?: string;
}

export interface SuggestTagsResult {
  dietaryTags: string[];
  allergens: string[];
  reasoning?: string;
}

export interface AIStatusResult {
  available: boolean;
  features: {
    generateDescription: boolean;
    suggestPrice: boolean;
    suggestTags: boolean;
  };
}

// Query keys
export const aiKeys = {
  all: ['ai'] as const,
  status: (orgId: string) => [...aiKeys.all, 'status', orgId] as const,
};

/**
 * Check if AI service is available
 */
export function useAIStatus(orgId: string) {
  return useQuery({
    queryKey: aiKeys.status(orgId),
    queryFn: async () => {
      const client = getApiClient();
      return client.get<AIStatusResult>(`/organizations/${orgId}/ai/status`);
    },
    enabled: !!orgId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Generate an appetizing description for a menu item
 */
export function useGenerateDescription(orgId: string) {
  return useMutation({
    mutationFn: async (input: GenerateDescriptionInput) => {
      const client = getApiClient();
      return client.post<GenerateDescriptionResult>(
        `/organizations/${orgId}/ai/generate-description`,
        input
      );
    },
  });
}

/**
 * Suggest pricing for a menu item
 */
export function useSuggestPrice(orgId: string) {
  return useMutation({
    mutationFn: async (input: SuggestPriceInput) => {
      const client = getApiClient();
      return client.post<SuggestPriceResult>(
        `/organizations/${orgId}/ai/suggest-price`,
        input
      );
    },
  });
}

/**
 * Suggest dietary tags and allergens for a menu item
 */
export function useSuggestTags(orgId: string) {
  return useMutation({
    mutationFn: async (input: SuggestTagsInput) => {
      const client = getApiClient();
      return client.post<SuggestTagsResult>(
        `/organizations/${orgId}/ai/suggest-tags`,
        input
      );
    },
  });
}

/**
 * Clear AI cache (admin only)
 */
export function useClearAICache(orgId: string) {
  return useMutation({
    mutationFn: async () => {
      const client = getApiClient();
      return client.delete<{ cleared: boolean }>(`/organizations/${orgId}/ai/cache`);
    },
  });
}
