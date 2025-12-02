import { pgTable, uuid, text, timestamp, boolean, pgEnum, jsonb, integer } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { organizations } from './organizations';

export const webhookEventTypeEnum = pgEnum('webhook_event_type', [
  'menu.created',
  'menu.updated',
  'menu.published',
  'menu.deleted',
  'venue.created',
  'venue.updated',
  'venue.deleted',
  'qr_code.created',
  'qr_code.scanned',
  'qr_code.deleted',
  'subscription.created',
  'subscription.updated',
  'subscription.canceled',
  'subscription.renewed',
  'organization.updated',
  'team.member_added',
  'team.member_removed',
]);

export const webhookDeliveryStatusEnum = pgEnum('webhook_delivery_status', [
  'pending',
  'success',
  'failed',
  'retrying',
]);

export const webhookEndpoints = pgTable('webhook_endpoints', {
  id: uuid('id').primaryKey().defaultRandom(),
  organizationId: uuid('organization_id')
    .notNull()
    .references(() => organizations.id, { onDelete: 'cascade' }),
  url: text('url').notNull(),
  description: text('description'),
  secret: text('secret').notNull(), // For signing payloads
  events: jsonb('events').$type<string[]>().notNull().default([]), // Array of event types to subscribe to
  enabled: boolean('enabled').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const webhookDeliveries = pgTable('webhook_deliveries', {
  id: uuid('id').primaryKey().defaultRandom(),
  endpointId: uuid('endpoint_id')
    .notNull()
    .references(() => webhookEndpoints.id, { onDelete: 'cascade' }),
  eventType: webhookEventTypeEnum('event_type').notNull(),
  payload: jsonb('payload').notNull(),
  status: webhookDeliveryStatusEnum('status').notNull().default('pending'),
  httpStatus: integer('http_status'),
  responseBody: text('response_body'),
  errorMessage: text('error_message'),
  attempts: integer('attempts').notNull().default(0),
  maxAttempts: integer('max_attempts').notNull().default(5),
  nextRetryAt: timestamp('next_retry_at', { withTimezone: true }),
  completedAt: timestamp('completed_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const webhookEndpointsRelations = relations(webhookEndpoints, ({ one, many }) => ({
  organization: one(organizations, {
    fields: [webhookEndpoints.organizationId],
    references: [organizations.id],
  }),
  deliveries: many(webhookDeliveries),
}));

export const webhookDeliveriesRelations = relations(webhookDeliveries, ({ one }) => ({
  endpoint: one(webhookEndpoints, {
    fields: [webhookDeliveries.endpointId],
    references: [webhookEndpoints.id],
  }),
}));

export type WebhookEndpoint = typeof webhookEndpoints.$inferSelect;
export type NewWebhookEndpoint = typeof webhookEndpoints.$inferInsert;
export type WebhookDelivery = typeof webhookDeliveries.$inferSelect;
export type NewWebhookDelivery = typeof webhookDeliveries.$inferInsert;
export type WebhookEventType = (typeof webhookEventTypeEnum.enumValues)[number];
