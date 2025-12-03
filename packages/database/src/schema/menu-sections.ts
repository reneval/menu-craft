import { pgTable, text, timestamp, uuid, integer, boolean, index } from 'drizzle-orm/pg-core';
import { organizations } from './organizations';
import { menus } from './menus';

export const menuSections = pgTable('menu_sections', {
  id: uuid('id').primaryKey().defaultRandom(),
  organizationId: uuid('organization_id')
    .notNull()
    .references(() => organizations.id),
  menuId: uuid('menu_id')
    .notNull()
    .references(() => menus.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  description: text('description'),
  sortOrder: integer('sort_order').notNull().default(0),
  isVisible: boolean('is_visible').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  // RLS-optimized indexes
  index('menu_sections_org_menu_sort_idx')
    .on(table.organizationId, table.menuId, table.sortOrder),
  index('menu_sections_org_visible_idx')
    .on(table.organizationId, table.isVisible),
]);

export type MenuSection = typeof menuSections.$inferSelect;
export type NewMenuSection = typeof menuSections.$inferInsert;
