import { useQuery } from '@tanstack/react-query';
import type { Venue, Menu, MenuSection, MenuItem, MenuItemOption } from '@menucraft/shared-types';
import { getApiClient } from '../client.js';

// Extended types for public API responses
export interface PublicMenuItemWithOptions extends MenuItem {
  options: MenuItemOption[];
}

export interface PublicMenuSectionWithItems extends MenuSection {
  items: PublicMenuItemWithOptions[];
}

export interface PublicMenuWithSections extends Menu {
  sections: PublicMenuSectionWithItems[];
}

export interface LanguageInfo {
  default: string;
  enabled: string[];
  current: string;
}

export type TranslationMap = Record<string, { name?: string; description?: string }>;

export interface PublicMenuData {
  venue: Venue;
  menu: PublicMenuWithSections;
  languages?: LanguageInfo;
  translations?: TranslationMap;
}

export interface PublicMenuByDomainData extends PublicMenuData {
  customDomain: string;
}

export const publicKeys = {
  all: ['public'] as const,
  venue: (venueSlug: string) => [...publicKeys.all, 'venue', venueSlug] as const,
  menu: (venueSlug: string, lang?: string) => [...publicKeys.all, 'menu', venueSlug, lang || 'default'] as const,
  domain: (domain: string) => [...publicKeys.all, 'domain', domain] as const,
};

export function usePublicVenue(venueSlug: string) {
  return useQuery({
    queryKey: publicKeys.venue(venueSlug),
    queryFn: async () => {
      const client = getApiClient();
      return client.get<Venue>(`/public/v/${venueSlug}`);
    },
    enabled: !!venueSlug,
  });
}

export function usePublicMenu(venueSlug: string, lang?: string) {
  return useQuery({
    queryKey: publicKeys.menu(venueSlug, lang),
    queryFn: async () => {
      const client = getApiClient();
      const url = lang
        ? `/public/v/${venueSlug}/menu?lang=${lang}`
        : `/public/v/${venueSlug}/menu`;
      return client.get<PublicMenuData>(url);
    },
    enabled: !!venueSlug,
  });
}

export function usePublicMenuByDomain(domain: string) {
  return useQuery({
    queryKey: publicKeys.domain(domain),
    queryFn: async () => {
      const client = getApiClient();
      return client.get<PublicMenuByDomainData>(`/public/d/${domain}`);
    },
    enabled: !!domain,
  });
}
