import { pgTable, text, uuid, integer, index } from 'drizzle-orm/pg-core';
import { organizations } from './organizations';
import { menuItems } from './menu-items';

export const menuItemOptions = pgTable('menu_item_options', {
  id: uuid('id').primaryKey().defaultRandom(),
  organizationId: uuid('organization_id')
    .notNull()
    .references(() => organizations.id),
  menuItemId: uuid('menu_item_id')
    .notNull()
    .references(() => menuItems.id, { onDelete: 'cascade' }),
  optionGroup: text('option_group').notNull(),
  name: text('name').notNull(),
  priceModifier: integer('price_modifier').notNull().default(0), // cents
  sortOrder: integer('sort_order').notNull().default(0),
}, (table) => [
  // RLS-optimized indexes
  index('menu_item_options_org_item_group_idx')
    .on(table.organizationId, table.menuItemId, table.optionGroup),
  index('menu_item_options_org_sort_idx')
    .on(table.organizationId, table.sortOrder),
]);

export type MenuItemOption = typeof menuItemOptions.$inferSelect;
export type NewMenuItemOption = typeof menuItemOptions.$inferInsert;
