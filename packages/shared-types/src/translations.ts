import { z } from 'zod';
import { TimestampSchema } from './common.js';

export const EntityTypeSchema = z.enum(['menu', 'menu_section', 'menu_item']);
export type EntityType = z.infer<typeof EntityTypeSchema>;

export const TranslationContentSchema = z
  .object({
    name: z.string().optional(),
    description: z.string().optional(),
  })
  .passthrough();

export type TranslationContent = z.infer<typeof TranslationContentSchema>;

export const TranslationSchema = z.object({
  id: z.string().uuid(),
  organizationId: z.string().uuid(),
  entityType: EntityTypeSchema,
  entityId: z.string().uuid(),
  languageCode: z.string().min(2).max(5),
  translations: TranslationContentSchema,
  isAutoTranslated: z.boolean(),
  createdAt: TimestampSchema,
  updatedAt: TimestampSchema,
});

export type Translation = z.infer<typeof TranslationSchema>;

export const CreateTranslationSchema = z.object({
  languageCode: z.string().min(2).max(5),
  translations: TranslationContentSchema,
});

export type CreateTranslation = z.infer<typeof CreateTranslationSchema>;

export const UpdateTranslationSchema = z.object({
  translations: TranslationContentSchema,
});

export type UpdateTranslation = z.infer<typeof UpdateTranslationSchema>;

export const AutoTranslateRequestSchema = z.object({
  targetLanguages: z.array(z.string().min(2).max(5)),
});

export type AutoTranslateRequest = z.infer<typeof AutoTranslateRequestSchema>;
