import { useQuery } from '@tanstack/react-query';
import type { Venue, Menu, MenuSection, MenuItem, MenuItemOption } from '@menucraft/shared-types';

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
      const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
      const response = await fetch(`${baseUrl}/public/v/${venueSlug}`);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      if (!data.success) {
        throw new Error(data.error?.message || 'Unknown error');
      }

      return data.data;
    },
    enabled: !!venueSlug,
  });
}

export function usePublicMenu(venueSlug: string, lang?: string) {
  return useQuery<PublicMenuData>({
    queryKey: publicKeys.menu(venueSlug, lang),
    queryFn: async (): Promise<PublicMenuData> => {
      const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
      const url = lang
        ? `${baseUrl}/public/v/${venueSlug}/menu?lang=${lang}`
        : `${baseUrl}/public/v/${venueSlug}/menu`;

      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      if (!data.success) {
        throw new Error(data.error?.message || 'Unknown error');
      }

      return data.data as PublicMenuData;
    },
    enabled: !!venueSlug,
  });
}

export function usePublicMenuByDomain(domain: string) {
  return useQuery({
    queryKey: publicKeys.domain(domain),
    queryFn: async () => {
      const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
      const response = await fetch(`${baseUrl}/public/d/${domain}`);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      if (!data.success) {
        throw new Error(data.error?.message || 'Unknown error');
      }

      return data.data;
    },
    enabled: !!domain,
  });
}
