import { z } from 'zod';
import { SlugSchema, TimestampSchema } from './common.js';
import { MenuIdSchema, OrganizationIdSchema, VenueIdSchema } from './branded.js';

export const MenuStatusSchema = z.enum(['draft', 'published', 'archived']);
export type MenuStatus = z.infer<typeof MenuStatusSchema>;

export const MenuLayoutSchema = z.enum(['list', 'grid', 'compact']);
export type MenuLayout = z.infer<typeof MenuLayoutSchema>;

export const ThemeConfigSchema = z
  .object({
    primaryColor: z.string().default('#3b82f6'),
    backgroundColor: z.string().default('#ffffff'),
    textColor: z.string().default('#1f2937'),
    fontFamily: z.string().default('Inter'),
    borderRadius: z.number().default(8),
    customCss: z.string().optional(),
    // Layout options
    layout: MenuLayoutSchema.optional(),
    showImages: z.boolean().optional(),
    showDescriptions: z.boolean().optional(),
    showPrices: z.boolean().optional(),
    showTags: z.boolean().optional(),
  })
  .passthrough();

export type ThemeConfig = z.infer<typeof ThemeConfigSchema>;

export const MenuSchema = z.object({
  id: MenuIdSchema,
  organizationId: OrganizationIdSchema,
  venueId: VenueIdSchema,
  name: z.string().min(1).max(100),
  slug: SlugSchema,
  status: MenuStatusSchema,
  themeConfig: ThemeConfigSchema,
  sortOrder: z.number().int(),
  deletedAt: TimestampSchema.nullable(),
  createdAt: TimestampSchema,
  updatedAt: TimestampSchema,
});

export type Menu = z.infer<typeof MenuSchema>;

export const CreateMenuSchema = z.object({
  name: z.string().min(1).max(100),
  slug: SlugSchema.optional(),
  themeConfig: ThemeConfigSchema.optional(),
});

export type CreateMenu = z.infer<typeof CreateMenuSchema>;

export const UpdateMenuSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  slug: SlugSchema.optional(),
  themeConfig: ThemeConfigSchema.partial().optional(),
  sortOrder: z.number().int().optional(),
});

export type UpdateMenu = z.infer<typeof UpdateMenuSchema>;

export const PublishMenuSchema = z.object({
  status: z.enum(['published', 'draft']),
});

export type PublishMenu = z.infer<typeof PublishMenuSchema>;
