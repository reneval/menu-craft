import { z } from 'zod';
import { TimestampSchema } from './common.js';

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
  id: z.string().uuid(),
  organizationId: z.string().uuid(),
  menuItemId: z.string().uuid(),
  optionGroup: z.string().min(1).max(50),
  name: z.string().min(1).max(100),
  priceModifier: z.number().int(), // cents
  sortOrder: z.number().int(),
});

export type MenuItemOption = z.infer<typeof MenuItemOptionSchema>;

export const MenuItemSchema = z.object({
  id: z.string().uuid(),
  organizationId: z.string().uuid(),
  sectionId: z.string().uuid(),
  name: z.string().min(1).max(100),
  description: z.string().max(500).nullable(),
  priceType: PriceTypeSchema,
  priceAmount: z.number().int().nullable(), // cents
  dietaryTags: z.array(DietaryTagSchema),
  allergens: z.array(AllergenSchema),
  badges: z.array(ItemBadgeSchema),
  imageUrl: z.string().url().nullable(),
  isAvailable: z.boolean(),
  sortOrder: z.number().int(),
  createdAt: TimestampSchema,
  updatedAt: TimestampSchema,
  options: z.array(MenuItemOptionSchema).optional(),
});

export type MenuItem = z.infer<typeof MenuItemSchema>;

export const CreateItemOptionSchema = z.object({
  optionGroup: z.string().min(1).max(50),
  name: z.string().min(1).max(100),
  priceModifier: z.number().int().default(0),
});

export const CreateItemSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  priceType: PriceTypeSchema.default('fixed'),
  priceAmount: z.number().int().optional(), // cents
  dietaryTags: z.array(DietaryTagSchema).default([]),
  allergens: z.array(AllergenSchema).default([]),
  badges: z.array(ItemBadgeSchema).default([]),
  imageUrl: z.string().url().optional(),
  isAvailable: z.boolean().default(true),
  options: z.array(CreateItemOptionSchema).optional(),
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
  itemIds: z.array(z.string().uuid()),
});

export type ReorderItems = z.infer<typeof ReorderItemsSchema>;

export const MoveItemSchema = z.object({
  targetSectionId: z.string().uuid(),
  sortOrder: z.number().int().optional(),
});

export type MoveItem = z.infer<typeof MoveItemSchema>;
