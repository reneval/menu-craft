import { z } from 'zod';
import { TimestampSchema } from './common.js';

export const UserRoleSchema = z.enum(['owner', 'admin', 'editor', 'viewer']);
export type UserRole = z.infer<typeof UserRoleSchema>;

export const UserPreferencesNotificationsSchema = z.object({
  emailOnMenuPublish: z.boolean().optional().default(true),
  emailWeeklyDigest: z.boolean().optional().default(true),
  emailProductUpdates: z.boolean().optional().default(true),
});

export const UserPreferencesSchema = z.object({
  language: z.string().optional().default('en'),
  timezone: z.string().optional().default('UTC'),
  notifications: UserPreferencesNotificationsSchema.optional().default({}),
});

export type UserPreferences = z.infer<typeof UserPreferencesSchema>;

export const UserSchema = z.object({
  id: z.string().uuid(),
  clerkUserId: z.string(),
  email: z.string().email(),
  firstName: z.string().nullable(),
  lastName: z.string().nullable(),
  avatarUrl: z.string().url().nullable(),
  preferences: UserPreferencesSchema.default({}),
  createdAt: TimestampSchema,
  updatedAt: TimestampSchema,
});

export type User = z.infer<typeof UserSchema>;

export const UpdateUserProfileSchema = z.object({
  firstName: z.string().min(1).max(100).optional(),
  lastName: z.string().max(100).optional(),
});

export type UpdateUserProfile = z.infer<typeof UpdateUserProfileSchema>;

export const UpdateUserPreferencesSchema = z.object({
  language: z.string().optional(),
  timezone: z.string().optional(),
  notifications: z.object({
    emailOnMenuPublish: z.boolean().optional(),
    emailWeeklyDigest: z.boolean().optional(),
    emailProductUpdates: z.boolean().optional(),
  }).optional(),
});

export type UpdateUserPreferences = z.infer<typeof UpdateUserPreferencesSchema>;

export const OrganizationUserSchema = z.object({
  id: z.string().uuid(),
  organizationId: z.string().uuid(),
  userId: z.string().uuid(),
  role: UserRoleSchema,
  deletedAt: TimestampSchema.nullable(),
  user: UserSchema.optional(),
});

export type OrganizationUser = z.infer<typeof OrganizationUserSchema>;

export const InviteMemberSchema = z.object({
  email: z.string().email(),
  role: UserRoleSchema.exclude(['owner']),
});

export type InviteMember = z.infer<typeof InviteMemberSchema>;

export const UpdateMemberRoleSchema = z.object({
  role: UserRoleSchema.exclude(['owner']),
});

export type UpdateMemberRole = z.infer<typeof UpdateMemberRoleSchema>;
