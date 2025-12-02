import { pgTable, text, timestamp, uuid, boolean, jsonb, index } from 'drizzle-orm/pg-core';
import { pgEnum } from 'drizzle-orm/pg-core';

// Feature flag types
export const featureFlagTypeEnum = pgEnum('feature_flag_type', [
  'boolean',      // Simple on/off
  'percentage',   // Percentage rollout (0-100)
  'user_list',    // Specific user IDs
  'org_list',     // Specific organization IDs
]);

export const featureFlags = pgTable(
  'feature_flags',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    // Flag identity
    key: text('key').notNull().unique(), // e.g., 'new_menu_editor', 'dark_mode'
    name: text('name').notNull(),
    description: text('description'),
    // Flag configuration
    type: featureFlagTypeEnum('type').notNull().default('boolean'),
    enabled: boolean('enabled').notNull().default(false),
    // Value based on type
    // - boolean: ignored (uses enabled field)
    // - percentage: { percentage: 50 }
    // - user_list: { userIds: ['uuid1', 'uuid2'] }
    // - org_list: { orgIds: ['uuid1', 'uuid2'] }
    value: jsonb('value'),
    // Metadata
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
    createdBy: uuid('created_by'),
  },
  (table) => [
    index('feature_flags_key_idx').on(table.key),
    index('feature_flags_enabled_idx').on(table.enabled),
  ]
);

export type FeatureFlag = typeof featureFlags.$inferSelect;
export type NewFeatureFlag = typeof featureFlags.$inferInsert;
export type FeatureFlagType = (typeof featureFlagTypeEnum.enumValues)[number];

// Feature flag overrides for specific orgs/users
export const featureFlagOverrides = pgTable(
  'feature_flag_overrides',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    flagId: uuid('flag_id')
      .notNull()
      .references(() => featureFlags.id, { onDelete: 'cascade' }),
    // Target (one of these should be set)
    organizationId: uuid('organization_id'),
    userId: uuid('user_id'),
    // Override value
    enabled: boolean('enabled').notNull(),
    // Metadata
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    createdBy: uuid('created_by'),
  },
  (table) => [
    index('feature_flag_overrides_flag_id_idx').on(table.flagId),
    index('feature_flag_overrides_org_idx').on(table.organizationId),
    index('feature_flag_overrides_user_idx').on(table.userId),
  ]
);

export type FeatureFlagOverride = typeof featureFlagOverrides.$inferSelect;
export type NewFeatureFlagOverride = typeof featureFlagOverrides.$inferInsert;
