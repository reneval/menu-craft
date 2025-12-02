import { z } from 'zod';
import { TimestampSchema } from './common.js';

export const UserRoleSchema = z.enum(['owner', 'admin', 'editor', 'viewer']);
export type UserRole = z.infer<typeof UserRoleSchema>;

export const UserSchema = z.object({
  id: z.string().uuid(),
  clerkUserId: z.string(),
  email: z.string().email(),
  firstName: z.string().nullable(),
  lastName: z.string().nullable(),
  avatarUrl: z.string().url().nullable(),
  createdAt: TimestampSchema,
});

export type User = z.infer<typeof UserSchema>;

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
