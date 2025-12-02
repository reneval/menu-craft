import { pgTable, text, timestamp, uuid, jsonb, index } from 'drizzle-orm/pg-core';
import { pgEnum } from 'drizzle-orm/pg-core';

// Audit action types
export const auditActionEnum = pgEnum('audit_action', [
  // Auth
  'auth.login',
  'auth.logout',
  // Organizations
  'organization.create',
  'organization.update',
  'organization.delete',
  // Venues
  'venue.create',
  'venue.update',
  'venue.delete',
  // Menus
  'menu.create',
  'menu.update',
  'menu.delete',
  'menu.publish',
  'menu.unpublish',
  'menu.duplicate',
  'menu.clone',
  'menu.import_photo',
  // Menu items
  'menu_item.create',
  'menu_item.update',
  'menu_item.delete',
  // Sections
  'section.create',
  'section.update',
  'section.delete',
  // Users
  'user.invite',
  'user.remove',
  'user.role_change',
  // Billing
  'subscription.create',
  'subscription.update',
  'subscription.cancel',
  // Domains
  'domain.create',
  'domain.verify',
  'domain.delete',
  // QR Codes
  'qr_code.create',
  'qr_code.delete',
  // Settings
  'settings.update',
]);

export const auditLogs = pgTable(
  'audit_logs',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    // Who performed the action
    userId: uuid('user_id'),
    userEmail: text('user_email'),
    // Organization context
    organizationId: uuid('organization_id'),
    // What action was performed
    action: auditActionEnum('action').notNull(),
    // Resource details
    resourceType: text('resource_type'), // e.g., 'menu', 'venue', 'user'
    resourceId: uuid('resource_id'),
    resourceName: text('resource_name'), // Human-readable name
    // Additional context
    metadata: jsonb('metadata'), // Any additional data
    // Request context
    ipAddress: text('ip_address'),
    userAgent: text('user_agent'),
    traceId: text('trace_id'), // OpenTelemetry trace ID
    // Timestamps
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('audit_logs_organization_id_idx').on(table.organizationId),
    index('audit_logs_user_id_idx').on(table.userId),
    index('audit_logs_action_idx').on(table.action),
    index('audit_logs_created_at_idx').on(table.createdAt),
    index('audit_logs_resource_idx').on(table.resourceType, table.resourceId),
  ]
);

export type AuditLog = typeof auditLogs.$inferSelect;
export type NewAuditLog = typeof auditLogs.$inferInsert;
export type AuditAction = (typeof auditActionEnum.enumValues)[number];
