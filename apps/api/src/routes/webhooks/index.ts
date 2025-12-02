import { type FastifyInstance } from 'fastify';
import { db, webhookEndpoints, webhookDeliveries, eq, and, desc, count } from '@menucraft/database';
import { z } from 'zod';
import { validate } from '../../utils/validation.js';
import { NotFoundError, ForbiddenError } from '../../utils/errors.js';
import { generateWebhookSecret, retryWebhookDelivery, type WebhookEventType } from '../../lib/webhooks.js';

const WEBHOOK_EVENT_TYPES: WebhookEventType[] = [
  'menu.created',
  'menu.updated',
  'menu.published',
  'menu.deleted',
  'venue.created',
  'venue.updated',
  'venue.deleted',
  'qr_code.created',
  'qr_code.scanned',
  'qr_code.deleted',
  'subscription.created',
  'subscription.updated',
  'subscription.canceled',
  'subscription.renewed',
  'organization.updated',
  'team.member_added',
  'team.member_removed',
];

const CreateWebhookSchema = z.object({
  url: z.string().url(),
  description: z.string().optional(),
  events: z.array(z.string()).min(1, 'At least one event type is required'),
  enabled: z.boolean().default(true),
});

const UpdateWebhookSchema = z.object({
  url: z.string().url().optional(),
  description: z.string().optional(),
  events: z.array(z.string()).min(1).optional(),
  enabled: z.boolean().optional(),
});

export async function webhookRoutes(app: FastifyInstance) {
  // List available event types
  app.get('/event-types', async () => {
    return {
      success: true,
      data: WEBHOOK_EVENT_TYPES.map((type) => ({
        type,
        description: getEventDescription(type),
      })),
    };
  });

  // List all webhook endpoints for organization
  app.get('/', async (request) => {
    const { orgId } = request.params as { orgId: string };
    const tenantOrgId = request.tenantContext?.organizationId;

    if (tenantOrgId !== orgId) {
      throw new ForbiddenError('Access denied');
    }

    const endpoints = await db.query.webhookEndpoints.findMany({
      where: eq(webhookEndpoints.organizationId, orgId),
      orderBy: [desc(webhookEndpoints.createdAt)],
    });

    // Get delivery stats for each endpoint
    const endpointsWithStats = await Promise.all(
      endpoints.map(async (endpoint) => {
        const [deliveryStats] = await db
          .select({ count: count() })
          .from(webhookDeliveries)
          .where(eq(webhookDeliveries.endpointId, endpoint.id));

        const [failedStats] = await db
          .select({ count: count() })
          .from(webhookDeliveries)
          .where(
            and(
              eq(webhookDeliveries.endpointId, endpoint.id),
              eq(webhookDeliveries.status, 'failed')
            )
          );

        return {
          ...endpoint,
          secret: maskSecret(endpoint.secret),
          stats: {
            totalDeliveries: deliveryStats?.count ?? 0,
            failedDeliveries: failedStats?.count ?? 0,
          },
        };
      })
    );

    return { success: true, data: endpointsWithStats };
  });

  // Get single webhook endpoint
  app.get('/:webhookId', async (request) => {
    const { orgId, webhookId } = request.params as { orgId: string; webhookId: string };
    const tenantOrgId = request.tenantContext?.organizationId;

    if (tenantOrgId !== orgId) {
      throw new ForbiddenError('Access denied');
    }

    const endpoint = await db.query.webhookEndpoints.findFirst({
      where: and(
        eq(webhookEndpoints.id, webhookId),
        eq(webhookEndpoints.organizationId, orgId)
      ),
    });

    if (!endpoint) {
      throw new NotFoundError('Webhook endpoint not found');
    }

    return {
      success: true,
      data: {
        ...endpoint,
        secret: maskSecret(endpoint.secret),
      },
    };
  });

  // Create webhook endpoint
  app.post('/', async (request) => {
    const { orgId } = request.params as { orgId: string };
    const tenantOrgId = request.tenantContext?.organizationId;

    if (tenantOrgId !== orgId) {
      throw new ForbiddenError('Access denied');
    }

    const body = validate(CreateWebhookSchema, request.body);

    // Validate event types
    const invalidEvents = body.events.filter(
      (e) => e !== '*' && !WEBHOOK_EVENT_TYPES.includes(e as WebhookEventType)
    );
    if (invalidEvents.length > 0) {
      return {
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: `Invalid event types: ${invalidEvents.join(', ')}`,
        },
      };
    }

    const secret = generateWebhookSecret();

    const [endpoint] = await db
      .insert(webhookEndpoints)
      .values({
        organizationId: orgId,
        url: body.url,
        description: body.description,
        events: body.events,
        enabled: body.enabled,
        secret,
      })
      .returning();

    if (!endpoint) {
      return { success: false, error: { code: 'INSERT_FAILED', message: 'Failed to create webhook endpoint' } };
    }

    await request.audit({
      action: 'settings.update',
      resourceType: 'webhook',
      resourceId: endpoint.id,
      metadata: { action: 'created', url: body.url, events: body.events },
    });

    return {
      success: true,
      data: {
        ...endpoint,
        // Return the full secret only on creation
      },
    };
  });

  // Update webhook endpoint
  app.patch('/:webhookId', async (request) => {
    const { orgId, webhookId } = request.params as { orgId: string; webhookId: string };
    const tenantOrgId = request.tenantContext?.organizationId;

    if (tenantOrgId !== orgId) {
      throw new ForbiddenError('Access denied');
    }

    const body = validate(UpdateWebhookSchema, request.body);

    // Validate event types if provided
    if (body.events) {
      const invalidEvents = body.events.filter(
        (e) => e !== '*' && !WEBHOOK_EVENT_TYPES.includes(e as WebhookEventType)
      );
      if (invalidEvents.length > 0) {
        return {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: `Invalid event types: ${invalidEvents.join(', ')}`,
          },
        };
      }
    }

    const [endpoint] = await db
      .update(webhookEndpoints)
      .set({
        ...body,
        updatedAt: new Date(),
      })
      .where(
        and(eq(webhookEndpoints.id, webhookId), eq(webhookEndpoints.organizationId, orgId))
      )
      .returning();

    if (!endpoint) {
      throw new NotFoundError('Webhook endpoint not found');
    }

    await request.audit({
      action: 'settings.update',
      resourceType: 'webhook',
      resourceId: endpoint.id,
      metadata: { action: 'updated', changes: body },
    });

    return {
      success: true,
      data: {
        ...endpoint,
        secret: maskSecret(endpoint.secret),
      },
    };
  });

  // Regenerate webhook secret
  app.post('/:webhookId/regenerate-secret', async (request) => {
    const { orgId, webhookId } = request.params as { orgId: string; webhookId: string };
    const tenantOrgId = request.tenantContext?.organizationId;

    if (tenantOrgId !== orgId) {
      throw new ForbiddenError('Access denied');
    }

    const newSecret = generateWebhookSecret();

    const [endpoint] = await db
      .update(webhookEndpoints)
      .set({
        secret: newSecret,
        updatedAt: new Date(),
      })
      .where(
        and(eq(webhookEndpoints.id, webhookId), eq(webhookEndpoints.organizationId, orgId))
      )
      .returning();

    if (!endpoint) {
      throw new NotFoundError('Webhook endpoint not found');
    }

    await request.audit({
      action: 'settings.update',
      resourceType: 'webhook',
      resourceId: endpoint.id,
      metadata: { action: 'secret_regenerated' },
    });

    return {
      success: true,
      data: {
        ...endpoint,
        // Return the full new secret
      },
    };
  });

  // Delete webhook endpoint
  app.delete('/:webhookId', async (request) => {
    const { orgId, webhookId } = request.params as { orgId: string; webhookId: string };
    const tenantOrgId = request.tenantContext?.organizationId;

    if (tenantOrgId !== orgId) {
      throw new ForbiddenError('Access denied');
    }

    const endpoint = await db.query.webhookEndpoints.findFirst({
      where: and(
        eq(webhookEndpoints.id, webhookId),
        eq(webhookEndpoints.organizationId, orgId)
      ),
    });

    if (!endpoint) {
      throw new NotFoundError('Webhook endpoint not found');
    }

    await db.delete(webhookEndpoints).where(eq(webhookEndpoints.id, webhookId));

    await request.audit({
      action: 'settings.update',
      resourceType: 'webhook',
      resourceId: webhookId,
      metadata: { action: 'deleted', url: endpoint.url },
    });

    return { success: true, message: 'Webhook endpoint deleted' };
  });

  // List recent deliveries for endpoint
  app.get('/:webhookId/deliveries', async (request) => {
    const { orgId, webhookId } = request.params as { orgId: string; webhookId: string };
    const { page = 1, limit = 20 } = request.query as { page?: number; limit?: number };
    const tenantOrgId = request.tenantContext?.organizationId;

    if (tenantOrgId !== orgId) {
      throw new ForbiddenError('Access denied');
    }

    // Verify endpoint belongs to org
    const endpoint = await db.query.webhookEndpoints.findFirst({
      where: and(
        eq(webhookEndpoints.id, webhookId),
        eq(webhookEndpoints.organizationId, orgId)
      ),
    });

    if (!endpoint) {
      throw new NotFoundError('Webhook endpoint not found');
    }

    const offset = (page - 1) * limit;

    const deliveries = await db.query.webhookDeliveries.findMany({
      where: eq(webhookDeliveries.endpointId, webhookId),
      orderBy: [desc(webhookDeliveries.createdAt)],
      limit,
      offset,
    });

    const [totalCount] = await db
      .select({ count: count() })
      .from(webhookDeliveries)
      .where(eq(webhookDeliveries.endpointId, webhookId));

    return {
      success: true,
      data: {
        deliveries,
        pagination: {
          page,
          limit,
          total: totalCount?.count ?? 0,
          totalPages: Math.ceil((totalCount?.count ?? 0) / limit),
        },
      },
    };
  });

  // Retry a failed delivery
  app.post('/:webhookId/deliveries/:deliveryId/retry', async (request) => {
    const { orgId, webhookId, deliveryId } = request.params as {
      orgId: string;
      webhookId: string;
      deliveryId: string;
    };
    const tenantOrgId = request.tenantContext?.organizationId;

    if (tenantOrgId !== orgId) {
      throw new ForbiddenError('Access denied');
    }

    // Verify endpoint belongs to org
    const endpoint = await db.query.webhookEndpoints.findFirst({
      where: and(
        eq(webhookEndpoints.id, webhookId),
        eq(webhookEndpoints.organizationId, orgId)
      ),
    });

    if (!endpoint) {
      throw new NotFoundError('Webhook endpoint not found');
    }

    const success = await retryWebhookDelivery(deliveryId);

    if (!success) {
      throw new NotFoundError('Delivery not found');
    }

    return { success: true, message: 'Retry scheduled' };
  });

  // Test webhook endpoint
  app.post('/:webhookId/test', async (request) => {
    const { orgId, webhookId } = request.params as { orgId: string; webhookId: string };
    const tenantOrgId = request.tenantContext?.organizationId;

    if (tenantOrgId !== orgId) {
      throw new ForbiddenError('Access denied');
    }

    const endpoint = await db.query.webhookEndpoints.findFirst({
      where: and(
        eq(webhookEndpoints.id, webhookId),
        eq(webhookEndpoints.organizationId, orgId)
      ),
    });

    if (!endpoint) {
      throw new NotFoundError('Webhook endpoint not found');
    }

    // Create a test delivery
    const { dispatchWebhook } = await import('../../lib/webhooks.js');

    // Since we can't really dispatch a "test" event type, we'll manually create
    // a test ping payload
    const testPayload = {
      id: crypto.randomUUID(),
      type: 'test.ping' as WebhookEventType,
      timestamp: new Date().toISOString(),
      data: { message: 'Test webhook delivery from MenuCraft' },
    };

    const [delivery] = await db
      .insert(webhookDeliveries)
      .values({
        endpointId: endpoint.id,
        eventType: 'menu.created', // Use a valid event type
        payload: testPayload,
        status: 'pending',
      })
      .returning();

    if (!delivery) {
      return { success: false, data: { error: 'Failed to create test delivery' } };
    }

    // Attempt delivery synchronously for test
    const { generateSignature } = await import('../../lib/webhooks.js');
    const payloadString = JSON.stringify(testPayload);
    const signature = generateSignature(payloadString, endpoint.secret);

    try {
      const response = await fetch(endpoint.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Webhook-Signature': signature,
          'X-Webhook-ID': testPayload.id,
          'X-Webhook-Timestamp': testPayload.timestamp,
          'User-Agent': 'MenuCraft-Webhooks/1.0',
        },
        body: payloadString,
        signal: AbortSignal.timeout(10000),
      });

      const responseBody = await response.text().catch(() => '');

      await db
        .update(webhookDeliveries)
        .set({
          status: response.ok ? 'success' : 'failed',
          httpStatus: response.status,
          responseBody: responseBody.substring(0, 1000),
          attempts: 1,
          completedAt: new Date(),
        })
        .where(eq(webhookDeliveries.id, delivery.id));

      return {
        success: response.ok,
        data: {
          deliveryId: delivery.id,
          httpStatus: response.status,
          responseBody: responseBody.substring(0, 500),
        },
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      await db
        .update(webhookDeliveries)
        .set({
          status: 'failed',
          errorMessage,
          attempts: 1,
          completedAt: new Date(),
        })
        .where(eq(webhookDeliveries.id, delivery.id));

      return {
        success: false,
        data: {
          deliveryId: delivery.id,
          error: errorMessage,
        },
      };
    }
  });
}

function maskSecret(secret: string): string {
  if (secret.length <= 12) return '****';
  return secret.substring(0, 8) + '...' + secret.substring(secret.length - 4);
}

function getEventDescription(type: WebhookEventType): string {
  const descriptions: Record<WebhookEventType, string> = {
    'menu.created': 'Triggered when a new menu is created',
    'menu.updated': 'Triggered when a menu is updated',
    'menu.published': 'Triggered when a menu is published',
    'menu.deleted': 'Triggered when a menu is deleted',
    'venue.created': 'Triggered when a new venue is created',
    'venue.updated': 'Triggered when a venue is updated',
    'venue.deleted': 'Triggered when a venue is deleted',
    'qr_code.created': 'Triggered when a QR code is created',
    'qr_code.scanned': 'Triggered when a QR code is scanned',
    'qr_code.deleted': 'Triggered when a QR code is deleted',
    'subscription.created': 'Triggered when a subscription is created',
    'subscription.updated': 'Triggered when a subscription is updated',
    'subscription.canceled': 'Triggered when a subscription is canceled',
    'subscription.renewed': 'Triggered when a subscription is renewed',
    'organization.updated': 'Triggered when organization settings are updated',
    'team.member_added': 'Triggered when a team member is added',
    'team.member_removed': 'Triggered when a team member is removed',
  };
  return descriptions[type] || type;
}
