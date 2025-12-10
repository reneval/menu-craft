import { type FastifyInstance } from 'fastify';
import { db, users, eq } from '@menucraft/database';
import {
  UpdateUserProfileSchema,
  UpdateUserPreferencesSchema,
  type UserPreferences,
} from '@menucraft/shared-types';
import { validate } from '../../utils/validation.js';
import { NotFoundError } from '../../utils/errors.js';
import { requireAuth } from '../../plugins/auth.js';

export async function userRoutes(app: FastifyInstance) {
  // Get current user profile
  app.get('/me', { preHandler: requireAuth }, async (request) => {
    const clerkUserId = request.auth!.userId;

    const user = await db.query.users.findFirst({
      where: eq(users.clerkUserId, clerkUserId),
    });

    if (!user) {
      throw new NotFoundError('User');
    }

    return { success: true, data: user };
  });

  // Update current user profile (name)
  app.patch('/me', { preHandler: requireAuth }, async (request) => {
    const clerkUserId = request.auth!.userId;
    const body = validate(UpdateUserProfileSchema, request.body);

    const [user] = await db
      .update(users)
      .set({
        ...body,
        updatedAt: new Date(),
      })
      .where(eq(users.clerkUserId, clerkUserId))
      .returning();

    if (!user) {
      throw new NotFoundError('User');
    }

    return { success: true, data: user };
  });

  // Update current user preferences
  app.patch('/me/preferences', { preHandler: requireAuth }, async (request) => {
    const clerkUserId = request.auth!.userId;
    const body = validate(UpdateUserPreferencesSchema, request.body);

    // First get the current user to merge preferences
    const currentUser = await db.query.users.findFirst({
      where: eq(users.clerkUserId, clerkUserId),
    });

    if (!currentUser) {
      throw new NotFoundError('User');
    }

    // Merge existing preferences with new ones
    const currentPrefs = (currentUser.preferences || {}) as UserPreferences;
    const newPreferences: UserPreferences = {
      ...currentPrefs,
      ...(body.language !== undefined && { language: body.language }),
      ...(body.timezone !== undefined && { timezone: body.timezone }),
      ...(body.notifications && {
        notifications: {
          ...currentPrefs.notifications,
          ...body.notifications,
        },
      }),
    };

    const [user] = await db
      .update(users)
      .set({
        preferences: newPreferences,
        updatedAt: new Date(),
      })
      .where(eq(users.clerkUserId, clerkUserId))
      .returning();

    if (!user) {
      throw new NotFoundError('User');
    }

    return { success: true, data: user };
  });
}
