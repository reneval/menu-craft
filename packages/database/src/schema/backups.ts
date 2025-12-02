import { pgTable, text, timestamp, uuid, bigint, index } from 'drizzle-orm/pg-core';
import { pgEnum } from 'drizzle-orm/pg-core';

export const backupStatusEnum = pgEnum('backup_status', [
  'pending',
  'in_progress',
  'completed',
  'failed',
]);

export const backupTypeEnum = pgEnum('backup_type', [
  'full',        // Full database backup
  'incremental', // Incremental backup
  'manual',      // Manual backup triggered by admin
  'scheduled',   // Scheduled automatic backup
]);

export const backups = pgTable(
  'backups',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    // Backup info
    type: backupTypeEnum('type').notNull(),
    status: backupStatusEnum('status').notNull().default('pending'),
    // Storage
    filename: text('filename'),
    storageUrl: text('storage_url'), // S3/R2 URL
    sizeBytes: bigint('size_bytes', { mode: 'number' }),
    // Metadata
    startedAt: timestamp('started_at', { withTimezone: true }),
    completedAt: timestamp('completed_at', { withTimezone: true }),
    errorMessage: text('error_message'),
    // Who triggered it
    triggeredBy: uuid('triggered_by'), // null for scheduled
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('backups_status_idx').on(table.status),
    index('backups_type_idx').on(table.type),
    index('backups_created_at_idx').on(table.createdAt),
  ]
);

export type Backup = typeof backups.$inferSelect;
export type NewBackup = typeof backups.$inferInsert;
export type BackupStatus = (typeof backupStatusEnum.enumValues)[number];
export type BackupType = (typeof backupTypeEnum.enumValues)[number];
