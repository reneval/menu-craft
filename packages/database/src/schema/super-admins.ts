import { pgTable, text, timestamp, uuid, boolean } from 'drizzle-orm/pg-core';
import { users } from './users';

export const superAdmins = pgTable('super_admins', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' })
    .unique(),
  // Permissions
  canManageOrganizations: boolean('can_manage_organizations').notNull().default(true),
  canManageUsers: boolean('can_manage_users').notNull().default(true),
  canManageFeatureFlags: boolean('can_manage_feature_flags').notNull().default(true),
  canViewAnalytics: boolean('can_view_analytics').notNull().default(true),
  canManageBackups: boolean('can_manage_backups').notNull().default(true),
  // Metadata
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  createdBy: uuid('created_by'),
});

export type SuperAdmin = typeof superAdmins.$inferSelect;
export type NewSuperAdmin = typeof superAdmins.$inferInsert;
