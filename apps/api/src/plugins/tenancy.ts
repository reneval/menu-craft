import { type FastifyInstance, type FastifyRequest, type FastifyReply } from 'fastify';
import fp from 'fastify-plugin';
import { sql } from '@menucraft/database';
import { type UserRole } from '@menucraft/shared-types';

// Extend FastifyRequest with tenant context
declare module 'fastify' {
  interface FastifyRequest {
    tenantContext?: {
      organizationId: string;
      userId: string;
      role: UserRole;
    };
  }
}

async function tenancyPlugin(app: FastifyInstance) {
  // Set RLS context for database queries
  app.decorateRequest('tenantContext', undefined);

  app.addHook('preHandler', async (request: FastifyRequest) => {
    if (request.tenantContext?.organizationId) {
      // Set PostgreSQL session variable for RLS
      await sql`SELECT set_config('app.current_organization_id', ${request.tenantContext.organizationId}, true)`;
    }
  });
}

export default fp(tenancyPlugin, {
  name: 'tenancy',
});

// Middleware to require tenant context
export async function requireTenantContext(
  request: FastifyRequest,
  reply: FastifyReply
) {
  if (!request.tenantContext) {
    return reply.status(403).send({
      success: false,
      error: {
        code: 'FORBIDDEN',
        message: 'Organization context required',
      },
    });
  }
}

// Middleware to require specific roles
export function requireRole(...roles: UserRole[]) {
  return async function (request: FastifyRequest, reply: FastifyReply) {
    if (!request.tenantContext) {
      return reply.status(403).send({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: 'Organization context required',
        },
      });
    }

    if (!roles.includes(request.tenantContext.role)) {
      return reply.status(403).send({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: 'Insufficient permissions',
        },
      });
    }
  };
}
