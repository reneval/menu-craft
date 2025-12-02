import { pgTable, text, timestamp, jsonb, uuid, integer } from 'drizzle-orm/pg-core';
import { menus } from './menus';
import { organizations } from './organizations';
import { users } from './users';

/**
 * Menu versions store snapshots of menus for versioning/rollback
 * The snapshot contains the complete menu data including sections, items, and options
 */
export const menuVersions = pgTable('menu_versions', {
  id: uuid('id').primaryKey().defaultRandom(),
  menuId: uuid('menu_id')
    .notNull()
    .references(() => menus.id, { onDelete: 'cascade' }),
  organizationId: uuid('organization_id')
    .notNull()
    .references(() => organizations.id),
  version: integer('version').notNull(), // Sequential version number per menu

  // Who created this version
  createdBy: uuid('created_by').references(() => users.id, { onDelete: 'set null' }),

  // Why this version was created
  changeType: text('change_type').notNull(), // 'manual_save', 'publish', 'auto_save', 'rollback'
  changeDescription: text('change_description'), // Optional description of changes

  // Complete snapshot of menu data
  snapshot: jsonb('snapshot').notNull().$type<{
    menu: {
      name: string;
      slug: string;
      status: string;
      themeConfig: Record<string, unknown>;
      defaultLanguage: string;
      enabledLanguages: string[];
      sortOrder: number;
    };
    sections: Array<{
      id: string;
      name: string;
      description: string | null;
      sortOrder: number;
      items: Array<{
        id: string;
        name: string;
        description: string | null;
        priceType: string;
        priceAmount: string | null;
        dietaryTags: string[];
        allergens: string[];
        imageUrl: string | null;
        isAvailable: boolean;
        sortOrder: number;
        options: Array<{
          id: string;
          optionGroup: string;
          name: string;
          priceModifier: string | null;
          sortOrder: number;
        }>;
      }>;
    }>;
  }>(),

  // Size of the snapshot for analytics
  snapshotSize: integer('snapshot_size'), // bytes

  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export type MenuVersion = typeof menuVersions.$inferSelect;
export type NewMenuVersion = typeof menuVersions.$inferInsert;
