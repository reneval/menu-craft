import { pgTable, uuid, text, timestamp, pgEnum, jsonb } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { users } from './users';
import { organizations } from './organizations';

export const emailStatusEnum = pgEnum('email_status', [
  'pending',
  'sent',
  'delivered',
  'bounced',
  'failed',
]);

export const emailTypeEnum = pgEnum('email_type', [
  'welcome',
  'password_reset',
  'email_verification',
  'subscription_created',
  'subscription_canceled',
  'subscription_renewed',
  'subscription_past_due',
  'menu_published',
  'usage_alert',
  'team_invitation',
  'general',
]);

export const emailLogs = pgTable('email_logs', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'set null' }),
  organizationId: uuid('organization_id').references(() => organizations.id, { onDelete: 'set null' }),
  type: emailTypeEnum('type').notNull(),
  status: emailStatusEnum('status').notNull().default('pending'),
  to: text('to').notNull(),
  subject: text('subject').notNull(),
  templateId: text('template_id'),
  templateData: jsonb('template_data'),
  resendId: text('resend_id'),
  errorMessage: text('error_message'),
  sentAt: timestamp('sent_at', { withTimezone: true }),
  deliveredAt: timestamp('delivered_at', { withTimezone: true }),
  bouncedAt: timestamp('bounced_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const emailLogsRelations = relations(emailLogs, ({ one }) => ({
  user: one(users, {
    fields: [emailLogs.userId],
    references: [users.id],
  }),
  organization: one(organizations, {
    fields: [emailLogs.organizationId],
    references: [organizations.id],
  }),
}));

export type EmailLog = typeof emailLogs.$inferSelect;
export type NewEmailLog = typeof emailLogs.$inferInsert;
