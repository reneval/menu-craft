import { pgTable, text, timestamp, jsonb, uuid, uniqueIndex, index } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { organizations } from './organizations';

export const venues = pgTable(
  'venues',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    organizationId: uuid('organization_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    slug: text('slug').notNull(),
    timezone: text('timezone').notNull().default('UTC'),
    address: jsonb('address').notNull().default({}),
    phone: text('phone'),
    website: text('website'),
    openingHours: jsonb('opening_hours'), // { monday: { open: "09:00", close: "22:00", closed?: boolean }, ... }
    logoUrl: text('logo_url'),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex('venues_org_slug_unique')
      .on(table.organizationId, table.slug)
      .where(sql`${table.deletedAt} IS NULL`),
    // RLS-optimized indexes - organization_id is already first in unique index above
    index('venues_org_name_idx')
      .on(table.organizationId, table.name)
      .where(sql`${table.deletedAt} IS NULL`),
  ]
);

export type Venue = typeof venues.$inferSelect;
export type NewVenue = typeof venues.$inferInsert;
