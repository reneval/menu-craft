import { pgTable, text, timestamp, jsonb, uuid, integer, uniqueIndex, index } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { menuStatusEnum } from './enums';
import { organizations } from './organizations';
import { venues } from './venues';

export const menus = pgTable(
  'menus',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    organizationId: uuid('organization_id')
      .notNull()
      .references(() => organizations.id),
    venueId: uuid('venue_id')
      .notNull()
      .references(() => venues.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    slug: text('slug').notNull(),
    status: menuStatusEnum('status').notNull().default('draft'),
    themeConfig: jsonb('theme_config').notNull().default({}),
    defaultLanguage: text('default_language').notNull().default('en'),
    enabledLanguages: jsonb('enabled_languages').notNull().default(['en']), // array of language codes
    sortOrder: integer('sort_order').notNull().default(0),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex('menus_venue_slug_unique')
      .on(table.venueId, table.slug)
      .where(sql`${table.deletedAt} IS NULL`),
    // RLS-optimized indexes - organization_id first for efficient filtering
    index('menus_org_venue_sort_idx')
      .on(table.organizationId, table.venueId, table.sortOrder)
      .where(sql`${table.deletedAt} IS NULL`),
    index('menus_org_status_idx')
      .on(table.organizationId, table.status)
      .where(sql`${table.deletedAt} IS NULL`),
  ]
);

export type Menu = typeof menus.$inferSelect;
export type NewMenu = typeof menus.$inferInsert;
