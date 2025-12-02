import { pgTable, text, timestamp, uuid, integer } from 'drizzle-orm/pg-core';
import { qrTargetTypeEnum } from './enums';
import { organizations } from './organizations';

export const qrCodes = pgTable('qr_codes', {
  id: uuid('id').primaryKey().defaultRandom(),
  organizationId: uuid('organization_id')
    .notNull()
    .references(() => organizations.id),
  targetType: qrTargetTypeEnum('target_type').notNull(),
  targetId: uuid('target_id').notNull(),
  code: text('code').unique().notNull(),
  scanCount: integer('scan_count').notNull().default(0),
  lastScannedAt: timestamp('last_scanned_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export type QrCode = typeof qrCodes.$inferSelect;
export type NewQrCode = typeof qrCodes.$inferInsert;
