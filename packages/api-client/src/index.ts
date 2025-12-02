// Client
export { ApiClient, ApiError, initApiClient, getApiClient } from './client.js';
export type { ApiClientConfig } from './client.js';

// Organization hooks
export {
  organizationKeys,
  useOrganizations,
  useOrganization,
  useCreateOrganization,
  useUpdateOrganization,
} from './hooks/organizations.js';

// Venue hooks
export {
  venueKeys,
  useVenues,
  useVenue,
  useCreateVenue,
  useUpdateVenue,
  useDeleteVenue,
} from './hooks/venues.js';

// Menu hooks
export {
  menuKeys,
  useMenus,
  useMenu,
  useCreateMenu,
  useUpdateMenu,
  usePublishMenu,
  useDeleteMenu,
  useDuplicateMenu,
  versionKeys,
  usePublishPreview,
  useCloneMenuToVenue,
} from './hooks/menus.js';
export type {
  MenuItemWithOptions,
  MenuSectionWithItems,
  MenuWithSections,
  MenuVersionChanges,
  PublishPreview,
  CloneToVenueInput,
  CloneToVenueResult,
  ItemChange,
  SectionChange,
  DetailedChanges,
} from './hooks/menus.js';

// Section hooks
export {
  sectionKeys,
  useSections,
  useSection,
  useCreateSection,
  useUpdateSection,
  useDeleteSection,
  useReorderSections,
} from './hooks/sections.js';

// Item hooks
export {
  itemKeys,
  useItems,
  useItem,
  useCreateItem,
  useUpdateItem,
  useDeleteItem,
  useReorderItems,
  useMoveItem,
} from './hooks/items.js';

// Public hooks (no auth required)
export {
  publicKeys,
  usePublicVenue,
  usePublicMenu,
  usePublicMenuByDomain,
} from './hooks/public.js';
export type {
  PublicMenuItemWithOptions,
  PublicMenuSectionWithItems,
  PublicMenuWithSections,
  PublicMenuData,
  PublicMenuByDomainData,
  LanguageInfo,
  TranslationMap,
} from './hooks/public.js';

// Analytics hooks
export {
  analyticsKeys,
  useAnalytics,
  itemAnalyticsKeys,
  useMenuItemAnalytics,
  useMenuTrendingItems,
} from './hooks/analytics.js';
export type {
  AnalyticsSummary,
  DailyView,
  ViewByMenu,
  RecentView,
  DeviceStats,
  BrowserStats,
  DeviceBreakdown,
  QrCodeStats,
  DateRange,
  AnalyticsData,
  AnalyticsParams,
  ItemPopularityData,
  ItemAnalyticsPeriod,
  ItemAnalyticsData,
  TrendingItemData,
  ItemAnalyticsParams,
} from './hooks/analytics.js';

// QR Code hooks
export {
  qrCodeKeys,
  useQrCodes,
  useQrCode,
  useCreateQrCode,
  useDeleteQrCode,
} from './hooks/qr-codes.js';
export type {
  QrCode,
  QrCodeWithTarget,
  CreateQrCodeInput,
} from './hooks/qr-codes.js';

// Billing hooks
export {
  billingKeys,
  usePlans,
  useSubscription,
  useCreateCheckout,
  useCreatePortalSession,
} from './hooks/billing.js';
export type {
  Plan,
  Subscription,
  SubscriptionResponse,
  CheckoutResponse,
  PortalResponse,
} from './hooks/billing.js';

// Schedule hooks
export {
  scheduleKeys,
  useSchedules,
  useSchedule,
  useCreateSchedule,
  useUpdateSchedule,
  useDeleteSchedule,
} from './hooks/schedules.js';

// Domain hooks
export {
  domainKeys,
  useDomains,
  useAddDomain,
  useVerifyDomain,
  useDeleteDomain,
} from './hooks/domains.js';
export type {
  CustomDomain,
  VerifyDomainResponse,
} from './hooks/domains.js';

// Translation hooks
export {
  translationKeys,
  useTranslations,
  useSaveTranslations,
  useUpdateLanguageSettings,
  useDeleteTranslationLanguage,
  COMMON_LANGUAGES,
  getLanguageName,
  getLanguageNativeName,
} from './hooks/translations.js';
export type {
  EntityType,
  TranslationContent,
  Translation,
  TranslationsData,
  SaveTranslationInput,
  SaveTranslationsInput,
  UpdateLanguageSettingsInput,
} from './hooks/translations.js';

// Import hooks
export {
  importKeys,
  useImportTemplate,
  useImportCsv,
  useImportPhotoPreview,
  useImportFromPhoto,
  parseCsv,
} from './hooks/import.js';
export type {
  CsvRow,
  ImportInput,
  ImportStats,
  ImportResult,
  TemplateColumn,
  TemplateData,
  ExtractedMenuItem,
  ExtractedMenuSection,
  PhotoImportPreviewResult,
  PhotoImportResult,
} from './hooks/import.js';

// Activity hooks
export {
  activityKeys,
  useMenuActivity,
  formatActivityAction,
  getActivityActionType,
} from './hooks/activity.js';
export type { ActivityLogEntry } from './hooks/activity.js';
