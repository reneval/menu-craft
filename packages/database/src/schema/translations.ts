import { pgTable, text, timestamp, uuid, boolean, jsonb, uniqueIndex } from 'drizzle-orm/pg-core';
import { entityTypeEnum } from './enums';
import { organizations } from './organizations';

export const translations = pgTable(
  'translations',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    organizationId: uuid('organization_id')
      .notNull()
      .references(() => organizations.id),
    entityType: entityTypeEnum('entity_type').notNull(),
    entityId: uuid('entity_id').notNull(),
    languageCode: text('language_code').notNull(), // e.g., 'en', 'es', 'zh-CN'
    translations: jsonb('translations').notNull().default({}), // { name: "...", description: "..." }
    isAutoTranslated: boolean('is_auto_translated').notNull().default(false),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex('translations_entity_lang_unique').on(
      table.entityType,
      table.entityId,
      table.languageCode
    ),
  ]
);

export type Translation = typeof translations.$inferSelect;
export type NewTranslation = typeof translations.$inferInsert;
