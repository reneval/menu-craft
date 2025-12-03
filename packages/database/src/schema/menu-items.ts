import { pgTable, text, timestamp, uuid, integer, boolean, jsonb, index } from 'drizzle-orm/pg-core';
import { priceTypeEnum } from './enums';
import { organizations } from './organizations';
import { menuSections } from './menu-sections';

export const menuItems = pgTable('menu_items', {
  id: uuid('id').primaryKey().defaultRandom(),
  organizationId: uuid('organization_id')
    .notNull()
    .references(() => organizations.id),
  sectionId: uuid('section_id')
    .notNull()
    .references(() => menuSections.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  description: text('description'),
  priceType: priceTypeEnum('price_type').notNull().default('fixed'),
  priceAmount: integer('price_amount'), // cents
  dietaryTags: jsonb('dietary_tags').notNull().default([]),
  allergens: jsonb('allergens').notNull().default([]),
  imageUrl: text('image_url'),
  badges: jsonb('badges').$type<string[]>().notNull().default([]),
  isAvailable: boolean('is_available').notNull().default(true),
  sortOrder: integer('sort_order').notNull().default(0),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  // RLS-optimized indexes
  index('menu_items_org_section_sort_idx')
    .on(table.organizationId, table.sectionId, table.sortOrder),
  index('menu_items_org_available_idx')
    .on(table.organizationId, table.isAvailable),
  index('menu_items_org_price_idx')
    .on(table.organizationId, table.priceType, table.priceAmount),
]);

export type MenuItem = typeof menuItems.$inferSelect;
export type NewMenuItem = typeof menuItems.$inferInsert;
