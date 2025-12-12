import { type FastifyInstance, type FastifyRequest, type FastifyReply } from 'fastify';
import fp from 'fastify-plugin';
import { db, organizationUsers, users, eq, and, isNull } from '@menucraft/database';
import { auth } from '../lib/auth.js';

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
  app.decorateRequest('auth', undefined);

  // Auth middleware to extract user from better-auth session
  app.addHook('preHandler', async (request: FastifyRequest) => {
    // Skip auth for public routes and auth routes
    if (request.url.startsWith('/public') ||
        request.url.startsWith('/health') ||
        request.url.startsWith('/docs') ||
        request.url.startsWith('/uploads') ||
        request.url.startsWith('/seo') ||
        request.url.startsWith('/widgets') ||
        request.url.startsWith('/auth')) {
      return;
    }

    // Get session from cookies via better-auth
    const headers = new Headers();
    for (const [key, value] of Object.entries(request.headers)) {
      if (value) {
        if (Array.isArray(value)) {
          value.forEach(v => headers.append(key, v));
        } else {
          headers.set(key, value);
        }
      }
    }

    const session = await auth.api.getSession({
      headers,
    });

    if (session?.user && session?.session) {
      request.auth = {
        userId: session.user.id,
        sessionId: session.session.id,
      };

      // For organization-scoped routes, populate tenant context
      if (request.url.includes('/api/organizations/')) {
        const orgIdMatch = request.url.match(/\/api\/organizations\/([^\/]+)/);
        const orgId = orgIdMatch?.[1];
        if (orgId) {
          // Verify user has access to this organization
          const membership = await db.query.organizationUsers.findFirst({
            where: and(
              eq(organizationUsers.organizationId, orgId),
              eq(organizationUsers.userId, session.user.id),
              isNull(organizationUsers.deletedAt)
            ),
          });

          if (membership) {
            request.tenantContext = {
              organizationId: orgId,
              userId: session.user.id,
              role: membership.role,
            };
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
