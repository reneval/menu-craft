import { z } from 'zod';
import { SlugSchema, TimestampSchema } from './common.js';
import { OrganizationIdSchema } from './branded.js';

export const OrganizationSettingsSchema = z
  .object({
    defaultCurrency: z.string().length(3).default('USD'),
    defaultLanguage: z.string().min(2).max(5).default('en'),
    enabledLanguages: z.array(z.string().min(2).max(5)).default(['en']),
  })
  .passthrough();

export type OrganizationSettings = z.infer<typeof OrganizationSettingsSchema>;

export const OrganizationSchema = z.object({
  id: OrganizationIdSchema,
  name: z.string().min(1).max(100),
  slug: SlugSchema,
  stripeCustomerId: z.string().nullable(),
  settings: OrganizationSettingsSchema,
  deletedAt: TimestampSchema.nullable(),
  createdAt: TimestampSchema,
  updatedAt: TimestampSchema,
});

export type Organization = z.infer<typeof OrganizationSchema>;

export const CreateOrganizationSchema = z.object({
  name: z.string().min(1).max(100),
  slug: SlugSchema.optional(),
});

export type CreateOrganization = z.infer<typeof CreateOrganizationSchema>;

export const UpdateOrganizationSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  settings: OrganizationSettingsSchema.partial().optional(),
});

export type UpdateOrganization = z.infer<typeof UpdateOrganizationSchema>;
