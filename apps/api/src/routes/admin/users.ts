import { type FastifyInstance } from 'fastify';
import { db, users, organizationUsers, superAdmins, eq, desc, count } from '@menucraft/database';
import { requireSuperAdminPermission } from '../../plugins/super-admin.js';

export async function usersRoutes(app: FastifyInstance) {
  // List all users
  app.get('/', async (request) => {
    const { page = 1, limit = 20 } = request.query as { page?: number; limit?: number };
    const offset = (page - 1) * limit;

    const userList = await db.query.users.findMany({
      limit,
      offset,
      orderBy: [desc(users.createdAt)],
    });

    const [totalCount] = await db.select({ count: count() }).from(users);

    // Check which users are super admins
    const admins = await db.select({ userId: superAdmins.userId }).from(superAdmins);
    const adminUserIds = new Set(admins.map((a) => a.userId));

    const enrichedUsers = userList.map((user) => ({
      ...user,
      isSuperAdmin: adminUserIds.has(user.id),
    }));

    return {
      success: true,
      data: {
        users: enrichedUsers,
        pagination: {
          page,
          limit,
          total: totalCount?.count ?? 0,
          totalPages: Math.ceil((totalCount?.count ?? 0) / limit),
        },
      },
    };
  });

  // Get user details
  app.get('/:userId', async (request) => {
    const { userId } = request.params as { userId: string };

    const user = await db.query.users.findFirst({
      where: eq(users.id, userId),
    });

    if (!user) {
      return { success: false, error: { code: 'NOT_FOUND', message: 'User not found' } };
    }

    // Get organization memberships
    const memberships = await db.query.organizationUsers.findMany({
      where: eq(organizationUsers.userId, userId),
      with: {
        organization: true,
      },
    });

    // Check if super admin
    const admin = await db.query.superAdmins.findFirst({
      where: eq(superAdmins.userId, userId),
    });

    return {
      success: true,
      data: {
        ...user,
        isSuperAdmin: !!admin,
        superAdminPermissions: admin || null,
        organizations: memberships.map((m) => ({
          id: m.organization?.id,
          name: m.organization?.name,
          role: m.role,
        })),
      },
    };
  });

  // Grant super admin access
  app.post(
    '/:userId/grant-admin',
    { preHandler: requireSuperAdminPermission('canManageUsers') },
    async (request) => {
      const { userId } = request.params as { userId: string };
      const permissions = request.body as {
        canManageOrganizations?: boolean;
        canManageUsers?: boolean;
        canManageFeatureFlags?: boolean;
        canViewAnalytics?: boolean;
        canManageBackups?: boolean;
      };

      // Check if already admin
      const existing = await db.query.superAdmins.findFirst({
        where: eq(superAdmins.userId, userId),
      });

      if (existing) {
        // Update permissions
        await db
          .update(superAdmins)
          .set(permissions)
          .where(eq(superAdmins.userId, userId));
      } else {
        // Create new super admin
        await db.insert(superAdmins).values({
          userId,
          ...permissions,
          createdBy: request.superAdmin?.userId,
        });
      }

      await request.audit({
        action: 'user.role_change',
        resourceType: 'user',
        resourceId: userId,
        metadata: { action: 'granted_super_admin', permissions },
      });

      return { success: true, message: 'Super admin access granted' };
    }
  );

  // Revoke super admin access
  app.post(
    '/:userId/revoke-admin',
    { preHandler: requireSuperAdminPermission('canManageUsers') },
    async (request) => {
      const { userId } = request.params as { userId: string };

      await db.delete(superAdmins).where(eq(superAdmins.userId, userId));

      await request.audit({
        action: 'user.role_change',
        resourceType: 'user',
        resourceId: userId,
        metadata: { action: 'revoked_super_admin' },
      });

      return { success: true, message: 'Super admin access revoked' };
    }
  );
}
