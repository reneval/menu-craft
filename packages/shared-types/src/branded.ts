/**
 * Branded types for type-safe IDs
 * Prevents accidentally passing a VenueId where a MenuId is expected
 */

import { z } from 'zod';

// Use a simpler branding approach that works better with TypeScript exports
type Brand<T, B> = T & { readonly __brand: B };

// Branded ID types
export type OrganizationId = Brand<string, 'OrganizationId'>;
export type UserId = Brand<string, 'UserId'>;
export type VenueId = Brand<string, 'VenueId'>;
export type MenuId = Brand<string, 'MenuId'>;
export type MenuSectionId = Brand<string, 'MenuSectionId'>;
export type MenuItemId = Brand<string, 'MenuItemId'>;
export type MenuItemOptionId = Brand<string, 'MenuItemOptionId'>;
export type MenuScheduleId = Brand<string, 'MenuScheduleId'>;
export type TranslationId = Brand<string, 'TranslationId'>;
export type SubscriptionId = Brand<string, 'SubscriptionId'>;
export type PlanId = Brand<string, 'PlanId'>;
export type QrCodeId = Brand<string, 'QrCodeId'>;

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

// Zod schemas for branded types - using brand with type assertion
export const OrganizationIdSchema = z.string().uuid().brand<'OrganizationId'>();
export const UserIdSchema = z.string().uuid().brand<'UserId'>();
export const VenueIdSchema = z.string().uuid().brand<'VenueId'>();
export const MenuIdSchema = z.string().uuid().brand<'MenuId'>();
export const MenuSectionIdSchema = z.string().uuid().brand<'MenuSectionId'>();
export const MenuItemIdSchema = z.string().uuid().brand<'MenuItemId'>();
export const MenuItemOptionIdSchema = z.string().uuid().brand<'MenuItemOptionId'>();
export const MenuScheduleIdSchema = z.string().uuid().brand<'MenuScheduleId'>();
export const TranslationIdSchema = z.string().uuid().brand<'TranslationId'>();
export const SubscriptionIdSchema = z.string().uuid().brand<'SubscriptionId'>();
export const PlanIdSchema = z.string().uuid().brand<'PlanId'>();
export const QrCodeIdSchema = z.string().uuid().brand<'QrCodeId'>();

// Type assertions for the schemas to match our branded types
export type InferredOrganizationId = z.infer<typeof OrganizationIdSchema>;
export type InferredUserId = z.infer<typeof UserIdSchema>;
export type InferredVenueId = z.infer<typeof VenueIdSchema>;
export type InferredMenuId = z.infer<typeof MenuIdSchema>;
