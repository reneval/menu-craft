import { pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { subscriptionStatusEnum } from './enums';
import { organizations } from './organizations';
import { plans } from './plans';

export const subscriptions = pgTable('subscriptions', {
  id: uuid('id').primaryKey().defaultRandom(),
  organizationId: uuid('organization_id')
    .notNull()
    .references(() => organizations.id),
  stripeSubscriptionId: text('stripe_subscription_id').unique().notNull(),
  status: subscriptionStatusEnum('status').notNull(),
  currentPeriodEnd: timestamp('current_period_end', { withTimezone: true }),
  planId: uuid('plan_id')
    .notNull()
    .references(() => plans.id),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export type Subscription = typeof subscriptions.$inferSelect;
export type NewSubscription = typeof subscriptions.$inferInsert;
