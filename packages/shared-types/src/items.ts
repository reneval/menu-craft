import { z } from 'zod';
import { TimestampSchema, NameSchema, DescriptionSchema, UrlSchema, PriceSchema } from './common.js';
import { MenuItemIdSchema, MenuItemOptionIdSchema, MenuSectionIdSchema, OrganizationIdSchema } from './branded.js';

export const PriceTypeSchema = z.enum(['fixed', 'variable', 'market_price']);
export type PriceType = z.infer<typeof PriceTypeSchema>;

export const DietaryTagSchema = z.enum([
  'vegetarian',
  'vegan',
  'gluten_free',
  'dairy_free',
  'nut_free',
  'halal',
  'kosher',
  'spicy',
  'organic',
]);
export type DietaryTag = z.infer<typeof DietaryTagSchema>;

export const AllergenSchema = z.enum([
  'gluten',
  'crustaceans',
  'eggs',
  'fish',
  'peanuts',
  'soybeans',
  'milk',
  'nuts',
  'celery',
  'mustard',
  'sesame',
  'sulphites',
  'lupin',
  'molluscs',
]);
export type Allergen = z.infer<typeof AllergenSchema>;

export const ItemBadgeSchema = z.enum([
  'popular',
  'new',
  'limited',
  'chef_pick',
  'bestseller',
  'seasonal',
]);
export type ItemBadge = z.infer<typeof ItemBadgeSchema>;

export const ITEM_BADGES = [
  { id: 'popular', label: 'Popular', color: 'bg-orange-100 text-orange-800', icon: 'Flame' },
  { id: 'new', label: 'New', color: 'bg-green-100 text-green-800', icon: 'Sparkles' },
  { id: 'limited', label: 'Limited', color: 'bg-red-100 text-red-800', icon: 'Clock' },
  { id: 'chef_pick', label: "Chef's Pick", color: 'bg-purple-100 text-purple-800', icon: 'Award' },
  { id: 'bestseller', label: 'Bestseller', color: 'bg-yellow-100 text-yellow-800', icon: 'Star' },
  { id: 'seasonal', label: 'Seasonal', color: 'bg-blue-100 text-blue-800', icon: 'Leaf' },
] as const;

export const MenuItemOptionSchema = z.object({
  id: MenuItemOptionIdSchema,
  organizationId: OrganizationIdSchema,
  menuItemId: MenuItemIdSchema,
  optionGroup: NameSchema.max(50, 'Option group name must not exceed 50 characters'),
  name: NameSchema,
  priceModifier: z.number().int().min(-50000, 'Price modifier cannot be less than -$500').max(50000, 'Price modifier cannot exceed $500'), // cents
  sortOrder: z.number().int().min(0, 'Sort order must be non-negative'),
});

export type MenuItemOption = z.infer<typeof MenuItemOptionSchema>;

export const MenuItemSchema = z.object({
  id: MenuItemIdSchema,
  organizationId: OrganizationIdSchema,
  sectionId: MenuSectionIdSchema,
  name: NameSchema,
  description: z.string().max(500, 'Description must not exceed 500 characters').refine(text => !/<script|javascript:|on\w+=/i.test(text), 'Description contains potentially dangerous content').nullable(),
  priceType: PriceTypeSchema,
  priceAmount: PriceSchema.nullable(),
  dietaryTags: z.array(DietaryTagSchema).max(10, 'Cannot have more than 10 dietary tags'),
  allergens: z.array(AllergenSchema).max(15, 'Cannot have more than 15 allergens'),
  badges: z.array(ItemBadgeSchema).max(5, 'Cannot have more than 5 badges'),
  imageUrl: UrlSchema.nullable(),
  isAvailable: z.boolean(),
  sortOrder: z.number().int().min(0, 'Sort order must be non-negative'),
  createdAt: TimestampSchema,
  updatedAt: TimestampSchema,
  options: z.array(MenuItemOptionSchema).max(50, 'Cannot have more than 50 options per item').optional(),
}).refine(data => {
  // Business logic: if price type is 'fixed', price amount must be set
  if (data.priceType === 'fixed' && (data.priceAmount === null || data.priceAmount === undefined)) {
    return false;
  }
  return true;
}, {
  message: 'Fixed price items must have a price amount',
  path: ['priceAmount']
});

export type MenuItem = z.infer<typeof MenuItemSchema>;

export const CreateItemOptionSchema = z.object({
  optionGroup: NameSchema.max(50, 'Option group name must not exceed 50 characters'),
  name: NameSchema,
  priceModifier: z.number().int().min(-50000, 'Price modifier cannot be less than -$500').max(50000, 'Price modifier cannot exceed $500').default(0),
});

export const CreateItemSchema = z.object({
  name: NameSchema,
  description: z.string().max(500, 'Description must not exceed 500 characters').refine(text => !/<script|javascript:|on\w+=/i.test(text), 'Description contains potentially dangerous content').optional(),
  priceType: PriceTypeSchema.default('fixed'),
  priceAmount: PriceSchema.optional(),
  dietaryTags: z.array(DietaryTagSchema).max(10, 'Cannot have more than 10 dietary tags').default([]),
  allergens: z.array(AllergenSchema).max(15, 'Cannot have more than 15 allergens').default([]),
  badges: z.array(ItemBadgeSchema).max(5, 'Cannot have more than 5 badges').default([]),
  imageUrl: UrlSchema.optional(),
  isAvailable: z.boolean().default(true),
  options: z.array(CreateItemOptionSchema).max(50, 'Cannot have more than 50 options per item').optional(),
}).refine(data => {
  // Business logic: if price type is 'fixed', price amount must be set
  if (data.priceType === 'fixed' && (data.priceAmount === null || data.priceAmount === undefined)) {
    return false;
  }
  return true;
}, {
  message: 'Fixed price items must have a price amount',
  path: ['priceAmount']
});

export type CreateItem = z.infer<typeof CreateItemSchema>;

export const UpdateItemSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).nullable().optional(),
  priceType: PriceTypeSchema.optional(),
  priceAmount: z.number().int().nullable().optional(),
  dietaryTags: z.array(DietaryTagSchema).optional(),
  allergens: z.array(AllergenSchema).optional(),
  badges: z.array(ItemBadgeSchema).optional(),
  imageUrl: z.string().url().nullable().optional(),
  isAvailable: z.boolean().optional(),
  sortOrder: z.number().int().optional(),
  options: z.array(CreateItemOptionSchema).optional(),
});

export type UpdateItem = z.infer<typeof UpdateItemSchema>;

export const ReorderItemsSchema = z.object({
  itemIds: z.array(MenuItemIdSchema).min(1, 'Must provide at least one item ID').max(100, 'Cannot reorder more than 100 items at once'),
});

export type ReorderItems = z.infer<typeof ReorderItemsSchema>;

export const MoveItemSchema = z.object({
  targetSectionId: MenuSectionIdSchema,
  sortOrder: z.number().int().min(0, 'Sort order must be non-negative').optional(),
});

export type MoveItem = z.infer<typeof MoveItemSchema>;
