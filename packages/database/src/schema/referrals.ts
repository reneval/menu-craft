import { pgTable, text, timestamp, uuid, integer, boolean, index } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { organizations } from './organizations';

// Referral codes - each organization gets one code they can share
export const referralCodes = pgTable(
  'referral_codes',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    organizationId: uuid('organization_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),
    code: text('code').unique().notNull(), // e.g., "ACME-XYZ123"
    isActive: boolean('is_active').notNull().default(true),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index('referral_codes_org_idx').on(table.organizationId)]
);

// Track when a referral code is used
export const referralRedemptions = pgTable(
  'referral_redemptions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    referralCodeId: uuid('referral_code_id')
      .notNull()
      .references(() => referralCodes.id, { onDelete: 'cascade' }),
    referredOrganizationId: uuid('referred_organization_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),
    // Reward tracking
    referrerCreditApplied: boolean('referrer_credit_applied').notNull().default(false),
    referrerCreditAppliedAt: timestamp('referrer_credit_applied_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('referral_redemptions_code_idx').on(table.referralCodeId),
    index('referral_redemptions_referred_org_idx').on(table.referredOrganizationId),
  ]
);

// Credits ledger - tracks all credits (referral rewards, promos, admin gifts)
export const credits = pgTable(
  'credits',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    organizationId: uuid('organization_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),
    amountCents: integer('amount_cents').notNull(), // Positive for credit, negative for usage
    reason: text('reason').notNull(), // e.g., "Referral reward", "Admin credit", "Subscription payment"
    referralRedemptionId: uuid('referral_redemption_id').references(() => referralRedemptions.id),
    expiresAt: timestamp('expires_at', { withTimezone: true }), // Optional expiration
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('credits_org_idx').on(table.organizationId),
    index('credits_org_created_idx').on(table.organizationId, table.createdAt),
  ]
);

// Relations
export const referralCodesRelations = relations(referralCodes, ({ one, many }) => ({
  organization: one(organizations, {
    fields: [referralCodes.organizationId],
    references: [organizations.id],
  }),
  redemptions: many(referralRedemptions),
}));

export const referralRedemptionsRelations = relations(referralRedemptions, ({ one }) => ({
  referralCode: one(referralCodes, {
    fields: [referralRedemptions.referralCodeId],
    references: [referralCodes.id],
  }),
  referredOrganization: one(organizations, {
    fields: [referralRedemptions.referredOrganizationId],
    references: [organizations.id],
  }),
}));

export const creditsRelations = relations(credits, ({ one }) => ({
  organization: one(organizations, {
    fields: [credits.organizationId],
    references: [organizations.id],
  }),
  referralRedemption: one(referralRedemptions, {
    fields: [credits.referralRedemptionId],
    references: [referralRedemptions.id],
  }),
}));

// Types
export type ReferralCode = typeof referralCodes.$inferSelect;
export type NewReferralCode = typeof referralCodes.$inferInsert;
export type ReferralRedemption = typeof referralRedemptions.$inferSelect;
export type NewReferralRedemption = typeof referralRedemptions.$inferInsert;
export type Credit = typeof credits.$inferSelect;
export type NewCredit = typeof credits.$inferInsert;
