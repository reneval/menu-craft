import { FastifyInstance, FastifyPluginAsync, FastifyRequest, FastifyReply } from 'fastify';
import fp from 'fastify-plugin';
import { db, superAdmins, users, eq } from '@menucraft/database';

export interface SuperAdminContext {
  id: string;
  userId: string;
  canManageOrganizations: boolean;
  canManageUsers: boolean;
  canManageFeatureFlags: boolean;
  canViewAnalytics: boolean;
  canManageBackups: boolean;
}

declare module 'fastify' {
  interface FastifyRequest {
    superAdmin?: SuperAdminContext;
  }
}

const superAdminPlugin: FastifyPluginAsync = async (fastify: FastifyInstance) => {
  fastify.decorateRequest('superAdmin', undefined);
};

export default fp(superAdminPlugin, {
  name: 'superAdmin',
});

/**
 * Middleware to check if the user is a super admin
 */
export async function requireSuperAdmin(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  // Get user ID from tenant context
  const userId = request.tenantContext?.userId;

  if (!userId) {
    reply.status(401).send({
      success: false,
      error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
    });
    return;
  }

  // Check if user is a super admin
  const admin = await db.query.superAdmins.findFirst({
    where: eq(superAdmins.userId, userId),
  });

  if (!admin) {
    reply.status(403).send({
      success: false,
      error: { code: 'FORBIDDEN', message: 'Super admin access required' },
    });
    return;
  }

  // Attach super admin context to request
  request.superAdmin = {
    id: admin.id,
    userId: admin.userId,
    canManageOrganizations: admin.canManageOrganizations,
    canManageUsers: admin.canManageUsers,
    canManageFeatureFlags: admin.canManageFeatureFlags,
    canViewAnalytics: admin.canViewAnalytics,
    canManageBackups: admin.canManageBackups,
  };
}

/**
 * Middleware to require specific super admin permission
 */
export function requireSuperAdminPermission(
  permission: keyof Omit<SuperAdminContext, 'id' | 'userId'>
) {
  return async function (request: FastifyRequest, reply: FastifyReply): Promise<void> {
    await requireSuperAdmin(request, reply);

    if (reply.sent) return;

    if (!request.superAdmin?.[permission]) {
      reply.status(403).send({
        success: false,
        error: { code: 'FORBIDDEN', message: `Permission '${permission}' required` },
      });
    }
  };
}

/**
 * Check if a user is a super admin (for use in services)
 */
export async function isSuperAdmin(userId: string): Promise<boolean> {
  const admin = await db.query.superAdmins.findFirst({
    where: eq(superAdmins.userId, userId),
  });
  return !!admin;
}
