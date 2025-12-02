import { FastifyInstance, FastifyPluginAsync, FastifyRequest } from 'fastify';
import fp from 'fastify-plugin';
import { db, auditLogs, type AuditAction, type NewAuditLog } from '@menucraft/database';
import { getTraceId } from '../lib/tracing.js';

export interface AuditLogOptions {
  action: AuditAction;
  resourceType?: string;
  resourceId?: string;
  resourceName?: string;
  metadata?: Record<string, unknown>;
  // Optional overrides for user context (useful when context not yet set)
  userId?: string;
  userEmail?: string;
  organizationId?: string;
}

type AuditFunction = (options: AuditLogOptions) => Promise<void>;

declare module 'fastify' {
  interface FastifyRequest {
    audit: AuditFunction;
  }
}

/**
 * Get the client IP address, handling proxies
 */
function getClientIp(request: FastifyRequest): string {
  const forwardedFor = request.headers['x-forwarded-for'];
  if (forwardedFor) {
    const ips = Array.isArray(forwardedFor) ? forwardedFor[0] : forwardedFor;
    if (ips) {
      const firstIp = ips.split(',')[0];
      if (firstIp) {
        return firstIp.trim();
      }
    }
  }
  return request.ip;
}

/**
 * Create the audit function for a specific request
 */
function createAuditFunction(request: FastifyRequest): AuditFunction {
  return async (options: AuditLogOptions) => {
    try {
      // Get user/org context from tenantContext or overrides
      const userId = options.userId || request.tenantContext?.userId || null;
      const organizationId = options.organizationId || request.tenantContext?.organizationId || null;

      const logEntry: NewAuditLog = {
        userId,
        userEmail: options.userEmail || null,
        organizationId,
        action: options.action,
        resourceType: options.resourceType,
        resourceId: options.resourceId,
        resourceName: options.resourceName,
        metadata: options.metadata,
        ipAddress: getClientIp(request),
        userAgent: request.headers['user-agent'] || null,
        traceId: getTraceId(),
      };

      await db.insert(auditLogs).values(logEntry);
    } catch (error) {
      // Don't fail the request if audit logging fails
      request.log.error({ error, options }, 'Failed to write audit log');
    }
  };
}

const auditPlugin: FastifyPluginAsync = async (fastify: FastifyInstance) => {
  // Decorate with a placeholder function that will be replaced per-request
  const placeholder: AuditFunction = async () => {
    throw new Error('Audit function not initialized');
  };
  fastify.decorateRequest('audit', placeholder);

  fastify.addHook('onRequest', async (request) => {
    // Replace the placeholder with the actual audit function for this request
    request.audit = createAuditFunction(request);
  });
};

export default fp(auditPlugin, {
  name: 'audit',
  dependencies: ['tenancy'],
});

/**
 * Standalone function to write audit logs (for use outside of request context)
 */
export async function writeAuditLog(
  options: AuditLogOptions & {
    ipAddress?: string;
    userAgent?: string;
  }
): Promise<void> {
  try {
    const logEntry: NewAuditLog = {
      userId: options.userId,
      userEmail: options.userEmail,
      organizationId: options.organizationId,
      action: options.action,
      resourceType: options.resourceType,
      resourceId: options.resourceId,
      resourceName: options.resourceName,
      metadata: options.metadata,
      ipAddress: options.ipAddress,
      userAgent: options.userAgent,
      traceId: getTraceId(),
    };

    await db.insert(auditLogs).values(logEntry);
  } catch (error) {
    console.error('Failed to write audit log:', error);
  }
}
