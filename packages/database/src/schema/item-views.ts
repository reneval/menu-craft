import { pgTable, text, timestamp, uuid, index, integer } from 'drizzle-orm/pg-core';
import { menuItems } from './menu-items';
import { menus } from './menus';
import { venues } from './venues';

export const itemViews = pgTable(
  'item_views',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    venueId: uuid('venue_id')
      .notNull()
      .references(() => venues.id, { onDelete: 'cascade' }),
    menuId: uuid('menu_id')
      .notNull()
      .references(() => menus.id, { onDelete: 'cascade' }),
    itemId: uuid('item_id')
      .notNull()
      .references(() => menuItems.id, { onDelete: 'cascade' }),
    // Anonymous visitor tracking (no PII)
    sessionId: text('session_id'),
    // View duration in milliseconds (time in viewport)
    durationMs: integer('duration_ms'),
    // Timestamp
    viewedAt: timestamp('viewed_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    // Index for querying by item and time
    index('item_views_item_viewed_at_idx').on(table.itemId, table.viewedAt),
    // Index for querying by menu and time
    index('item_views_menu_viewed_at_idx').on(table.menuId, table.viewedAt),
    // Index for querying by venue and time
    index('item_views_venue_viewed_at_idx').on(table.venueId, table.viewedAt),
    // Index for session-based deduplication
    index('item_views_session_item_idx').on(table.sessionId, table.itemId),
  ]
);

export type ItemView = typeof itemViews.$inferSelect;
export type NewItemView = typeof itemViews.$inferInsert;
