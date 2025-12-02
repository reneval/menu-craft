import { z } from 'zod';
import { TimestampSchema } from './common.js';

export const MenuSectionSchema = z.object({
  id: z.string().uuid(),
  organizationId: z.string().uuid(),
  menuId: z.string().uuid(),
  name: z.string().min(1).max(100),
  description: z.string().max(500).nullable(),
  sortOrder: z.number().int(),
  isVisible: z.boolean(),
  createdAt: TimestampSchema,
  updatedAt: TimestampSchema,
});

export type MenuSection = z.infer<typeof MenuSectionSchema>;

export const CreateSectionSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  isVisible: z.boolean().default(true),
});

export type CreateSection = z.infer<typeof CreateSectionSchema>;

export const UpdateSectionSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).nullable().optional(),
  isVisible: z.boolean().optional(),
  sortOrder: z.number().int().optional(),
});

export type UpdateSection = z.infer<typeof UpdateSectionSchema>;

export const ReorderSectionsSchema = z.object({
  sectionIds: z.array(z.string().uuid()),
});

export type ReorderSections = z.infer<typeof ReorderSectionsSchema>;
