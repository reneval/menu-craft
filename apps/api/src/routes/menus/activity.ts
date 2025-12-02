import { type FastifyInstance } from 'fastify';
import { db, auditLogs, users, eq, and, or, desc } from '@menucraft/database';
import { z } from 'zod';

export async function activityRoutes(app: FastifyInstance) {
  // Get activity log for a menu
  app.get('/', async (request) => {
    const { orgId, menuId } = request.params as { orgId: string; menuId: string };
    const query = request.query as { limit?: string };
    const limit = Math.min(parseInt(query.limit || '20', 10), 50);

    // Fetch activity logs for this menu
    // Include actions on the menu itself and related resources
    const activities = await db
      .select({
        id: auditLogs.id,
        action: auditLogs.action,
        resourceType: auditLogs.resourceType,
        resourceId: auditLogs.resourceId,
        resourceName: auditLogs.resourceName,
        metadata: auditLogs.metadata,
        createdAt: auditLogs.createdAt,
        userId: auditLogs.userId,
        userEmail: auditLogs.userEmail,
      })
      .from(auditLogs)
      .where(
        and(
          eq(auditLogs.organizationId, orgId),
          or(
            // Direct menu actions
            and(
              eq(auditLogs.resourceType, 'menu'),
              eq(auditLogs.resourceId, menuId)
            ),
            // Actions on related resources (stored in metadata)
            eq(auditLogs.resourceId, menuId)
          )
        )
      )
      .orderBy(desc(auditLogs.createdAt))
      .limit(limit);

    // Get user info for display
    const userIds = [...new Set(activities.map(a => a.userId).filter(Boolean))];
    const usersMap = new Map<string, { name: string | null; email: string | null }>();

    if (userIds.length > 0) {
      const userRows = await db
        .select({ id: users.id, firstName: users.firstName, lastName: users.lastName, email: users.email })
        .from(users)
        .where(or(...userIds.map(id => eq(users.id, id!))));

      for (const user of userRows) {
        const name = [user.firstName, user.lastName].filter(Boolean).join(' ') || null;
        usersMap.set(user.id, { name, email: user.email });
      }
    }

    // Enrich activities with user info
    const enrichedActivities = activities.map(activity => ({
      ...activity,
      user: activity.userId ? usersMap.get(activity.userId) || { name: null, email: activity.userEmail } : null,
    }));

    return { success: true, data: enrichedActivities };
  });
}
