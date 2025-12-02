/**
 * Branded types for type-safe IDs
 * Prevents accidentally passing a VenueId where a MenuId is expected
 */

declare const __brand: unique symbol;
type Branded<T, B extends string> = T & { [__brand]: B };

// Branded ID types
export type OrganizationId = Branded<string, 'OrganizationId'>;
export type UserId = Branded<string, 'UserId'>;
export type VenueId = Branded<string, 'VenueId'>;
export type MenuId = Branded<string, 'MenuId'>;
export type MenuSectionId = Branded<string, 'MenuSectionId'>;
export type MenuItemId = Branded<string, 'MenuItemId'>;
export type MenuItemOptionId = Branded<string, 'MenuItemOptionId'>;
export type MenuScheduleId = Branded<string, 'MenuScheduleId'>;
export type TranslationId = Branded<string, 'TranslationId'>;
export type SubscriptionId = Branded<string, 'SubscriptionId'>;
export type PlanId = Branded<string, 'PlanId'>;
export type QrCodeId = Branded<string, 'QrCodeId'>;

// Constructor functions
export const OrganizationId = (id: string): OrganizationId => id as OrganizationId;
export const UserId = (id: string): UserId => id as UserId;
export const VenueId = (id: string): VenueId => id as VenueId;
export const MenuId = (id: string): MenuId => id as MenuId;
export const MenuSectionId = (id: string): MenuSectionId => id as MenuSectionId;
export const MenuItemId = (id: string): MenuItemId => id as MenuItemId;
export const MenuItemOptionId = (id: string): MenuItemOptionId => id as MenuItemOptionId;
export const MenuScheduleId = (id: string): MenuScheduleId => id as MenuScheduleId;
export const TranslationId = (id: string): TranslationId => id as TranslationId;
export const SubscriptionId = (id: string): SubscriptionId => id as SubscriptionId;
export const PlanId = (id: string): PlanId => id as PlanId;
export const QrCodeId = (id: string): QrCodeId => id as QrCodeId;
