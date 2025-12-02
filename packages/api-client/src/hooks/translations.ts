import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getApiClient } from '../client.js';
import { menuKeys } from './menus.js';

export type EntityType = 'menu' | 'menu_section' | 'menu_item' | 'menu_item_option';

export interface TranslationContent {
  name?: string;
  description?: string;
  optionGroup?: string;
}

export interface Translation {
  id: string;
  organizationId: string;
  entityType: EntityType;
  entityId: string;
  languageCode: string;
  translations: TranslationContent;
  isAutoTranslated: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface TranslationEntry {
  entityType: EntityType;
  translations: TranslationContent;
}

export interface TranslationsData {
  menu: {
    id: string;
    defaultLanguage: string;
    enabledLanguages: string[];
  };
  translations: Record<string, Record<string, TranslationEntry>>;
}

export interface SaveTranslationInput {
  entityType: EntityType;
  entityId: string;
  content: TranslationContent;
}

export interface SaveTranslationsInput {
  languageCode: string;
  translations: SaveTranslationInput[];
}

export interface UpdateLanguageSettingsInput {
  defaultLanguage?: string;
  enabledLanguages?: string[];
}

export const translationKeys = {
  all: ['translations'] as const,
  menu: (orgId: string, venueId: string, menuId: string) =>
    [...translationKeys.all, orgId, venueId, menuId] as const,
  menuLang: (orgId: string, venueId: string, menuId: string, lang: string) =>
    [...translationKeys.menu(orgId, venueId, menuId), lang] as const,
};

export function useTranslations(
  orgId: string,
  venueId: string,
  menuId: string,
  lang?: string
) {
  return useQuery({
    queryKey: lang
      ? translationKeys.menuLang(orgId, venueId, menuId, lang)
      : translationKeys.menu(orgId, venueId, menuId),
    queryFn: async () => {
      const client = getApiClient();
      const url = lang
        ? `/organizations/${orgId}/venues/${venueId}/menus/${menuId}/translations?lang=${lang}`
        : `/organizations/${orgId}/venues/${venueId}/menus/${menuId}/translations`;
      return client.get<TranslationsData>(url);
    },
    enabled: !!orgId && !!venueId && !!menuId,
  });
}

export function useSaveTranslations(
  orgId: string,
  venueId: string,
  menuId: string
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: SaveTranslationsInput) => {
      const client = getApiClient();
      return client.post<Translation[]>(
        `/organizations/${orgId}/venues/${venueId}/menus/${menuId}/translations`,
        input
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: translationKeys.menu(orgId, venueId, menuId),
      });
    },
  });
}

export function useUpdateLanguageSettings(
  orgId: string,
  venueId: string,
  menuId: string
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: UpdateLanguageSettingsInput) => {
      const client = getApiClient();
      return client.patch(
        `/organizations/${orgId}/venues/${venueId}/menus/${menuId}/translations/settings`,
        input
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: translationKeys.menu(orgId, venueId, menuId),
      });
      queryClient.invalidateQueries({
        queryKey: menuKeys.detail(orgId, venueId, menuId),
      });
    },
  });
}

export function useDeleteTranslationLanguage(
  orgId: string,
  venueId: string,
  menuId: string
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (languageCode: string) => {
      const client = getApiClient();
      return client.delete(
        `/organizations/${orgId}/venues/${venueId}/menus/${menuId}/translations/${languageCode}`
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: translationKeys.menu(orgId, venueId, menuId),
      });
    },
  });
}

// Utility: List of common languages for restaurant menus
export const COMMON_LANGUAGES = [
  { code: 'en', name: 'English', nativeName: 'English' },
  { code: 'es', name: 'Spanish', nativeName: 'Español' },
  { code: 'fr', name: 'French', nativeName: 'Français' },
  { code: 'de', name: 'German', nativeName: 'Deutsch' },
  { code: 'it', name: 'Italian', nativeName: 'Italiano' },
  { code: 'pt', name: 'Portuguese', nativeName: 'Português' },
  { code: 'zh', name: 'Chinese (Simplified)', nativeName: '中文' },
  { code: 'zh-TW', name: 'Chinese (Traditional)', nativeName: '繁體中文' },
  { code: 'ja', name: 'Japanese', nativeName: '日本語' },
  { code: 'ko', name: 'Korean', nativeName: '한국어' },
  { code: 'ar', name: 'Arabic', nativeName: 'العربية' },
  { code: 'ru', name: 'Russian', nativeName: 'Русский' },
  { code: 'hi', name: 'Hindi', nativeName: 'हिन्दी' },
  { code: 'vi', name: 'Vietnamese', nativeName: 'Tiếng Việt' },
  { code: 'th', name: 'Thai', nativeName: 'ไทย' },
  { code: 'nl', name: 'Dutch', nativeName: 'Nederlands' },
  { code: 'pl', name: 'Polish', nativeName: 'Polski' },
  { code: 'tr', name: 'Turkish', nativeName: 'Türkçe' },
  { code: 'he', name: 'Hebrew', nativeName: 'עברית' },
  { code: 'uk', name: 'Ukrainian', nativeName: 'Українська' },
];

export function getLanguageName(code: string): string {
  const lang = COMMON_LANGUAGES.find((l) => l.code === code);
  return lang ? lang.name : code;
}

export function getLanguageNativeName(code: string): string {
  const lang = COMMON_LANGUAGES.find((l) => l.code === code);
  return lang ? lang.nativeName : code;
}
