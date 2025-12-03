// Re-export types from api-client for consistency
export type {
  PublicMenuData as MenuData,
  PublicMenuWithSections,
  PublicMenuSectionWithItems,
  PublicMenuItemWithOptions,
  PublicMenuByDomainData,
  LanguageInfo,
  TranslationMap
} from '@menucraft/api-client';

// Additional types specific to the public app
export interface EmbedConfig {
  hideHeader?: boolean;
  hideFooter?: boolean;
  compactMode?: boolean;
  maxHeight?: string;
  primaryColor?: string;
  fontFamily?: string;
  borderRadius?: string;
}