import { pgTable, text, timestamp, uuid, index } from 'drizzle-orm/pg-core';
import { venues } from './venues';
import { menus } from './menus';

export const menuViews = pgTable(
  'menu_views',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    venueId: uuid('venue_id')
      .notNull()
      .references(() => venues.id, { onDelete: 'cascade' }),
    menuId: uuid('menu_id')
      .notNull()
      .references(() => menus.id, { onDelete: 'cascade' }),
    // Anonymous visitor tracking (no PII)
    sessionId: text('session_id'), // Optional session identifier
    userAgent: text('user_agent'),
    referrer: text('referrer'),
    // Timestamp
    viewedAt: timestamp('viewed_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    // Index for querying by venue and time
    index('menu_views_venue_viewed_at_idx').on(table.venueId, table.viewedAt),
    // Index for querying by menu and time
    index('menu_views_menu_viewed_at_idx').on(table.menuId, table.viewedAt),
  ]
);

export type MenuView = typeof menuViews.$inferSelect;
export type NewMenuView = typeof menuViews.$inferInsert;
