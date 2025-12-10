import { type FastifyInstance, type FastifyRequest, type FastifyReply } from 'fastify';
import fp from 'fastify-plugin';
import { clerkPlugin, getAuth } from '@clerk/fastify';
import { db, organizationUsers, users, eq, and, isNull } from '@menucraft/database';
import { env } from '../config/env.js';

// Extend FastifyRequest with auth context
declare module 'fastify' {
  interface FastifyRequest {
    auth?: {
      userId: string;
      sessionId: string;
    };
  }
}

async function authPlugin(app: FastifyInstance) {
  // Only register Clerk if keys are provided
  if (env.CLERK_PUBLISHABLE_KEY && env.CLERK_SECRET_KEY) {
    await app.register(clerkPlugin, {
      publishableKey: env.CLERK_PUBLISHABLE_KEY,
      secretKey: env.CLERK_SECRET_KEY,
    });
  }

  app.decorateRequest('auth', undefined);

  // Auth middleware to extract user from Clerk
  app.addHook('preHandler', async (request: FastifyRequest) => {
    // Skip auth for public routes
    if (request.url.startsWith('/public') ||
        request.url.startsWith('/health') ||
        request.url.startsWith('/docs') ||
        request.url.startsWith('/uploads') ||
        request.url.startsWith('/seo') ||
        request.url.startsWith('/widgets')) {
      return;
    }

    // Only try to get auth if Clerk is configured
    if (env.CLERK_PUBLISHABLE_KEY && env.CLERK_SECRET_KEY) {
      const { userId, sessionId } = getAuth(request);

      if (userId && sessionId) {
        request.auth = { userId, sessionId };

        // For organization-scoped routes, populate tenant context
        if (request.url.includes('/api/organizations/')) {
          const orgIdMatch = request.url.match(/\/api\/organizations\/([^\/]+)/);
          const orgId = orgIdMatch?.[1];
          if (orgId) {
            // Verify user has access to this organization
            const membership = await db.query.organizationUsers.findFirst({
              where: and(
                eq(organizationUsers.organizationId, orgId),
                eq(organizationUsers.userId, userId),
                isNull(organizationUsers.deletedAt)
              ),
            });

            if (membership) {
              request.tenantContext = {
                organizationId: orgId,
                userId,
                role: membership.role,
              };
            }
          }
        }
      }
    }
  });
}

// Middleware to require authentication
export async function requireAuth(request: FastifyRequest, reply: FastifyReply) {
  if (!request.auth) {
    return reply.status(401).send({
      success: false,
      error: {
        code: 'UNAUTHORIZED',
        message: 'Authentication required',
      },
    });
  }
}

// Middleware to require organization context (for organization-scoped routes)
export async function requireOrgContext(request: FastifyRequest, reply: FastifyReply) {
  await requireAuth(request, reply);

  if (!request.tenantContext) {
    return reply.status(403).send({
      success: false,
      error: {
        code: 'FORBIDDEN',
        message: 'Access to this organization is forbidden',
      },
    });
  }
}

export default fp(authPlugin, {
  name: 'auth',
  dependencies: ['tenancy'],
});