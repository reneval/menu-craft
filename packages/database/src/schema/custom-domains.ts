import { pgTable, text, timestamp, uuid, uniqueIndex, pgEnum } from 'drizzle-orm/pg-core';
import { venues } from './venues';
import { organizations } from './organizations';

export const domainStatusEnum = pgEnum('domain_status', [
  'pending',      // Waiting for DNS verification
  'verifying',    // DNS verification in progress
  'active',       // Domain is verified and active
  'failed',       // Verification failed
]);

export const customDomains = pgTable(
  'custom_domains',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    organizationId: uuid('organization_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),
    venueId: uuid('venue_id')
      .notNull()
      .references(() => venues.id, { onDelete: 'cascade' }),
    domain: text('domain').notNull(), // e.g., "menu.myrestaurant.com"
    status: domainStatusEnum('status').notNull().default('pending'),
    verificationToken: text('verification_token').notNull(), // Random token for TXT record verification
    verifiedAt: timestamp('verified_at', { withTimezone: true }),
    lastCheckedAt: timestamp('last_checked_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex('custom_domains_domain_unique').on(table.domain),
  ]
);

export type CustomDomain = typeof customDomains.$inferSelect;
export type NewCustomDomain = typeof customDomains.$inferInsert;
