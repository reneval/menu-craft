import { type FastifyInstance } from 'fastify';
import { db, featureFlags, featureFlagOverrides, type NewFeatureFlag, eq, desc } from '@menucraft/database';
import { requireSuperAdminPermission } from '../../plugins/super-admin.js';
import { z } from 'zod';
import { validate } from '../../utils/validation.js';

const CreateFlagSchema = z.object({
  key: z.string().min(1).regex(/^[a-z][a-z0-9_]*$/),
  name: z.string().min(1),
  description: z.string().optional(),
  type: z.enum(['boolean', 'percentage', 'user_list', 'org_list']).default('boolean'),
  enabled: z.boolean().default(false),
  value: z.record(z.unknown()).optional(),
});

const UpdateFlagSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional(),
  enabled: z.boolean().optional(),
  value: z.record(z.unknown()).optional(),
});

export async function featureFlagsRoutes(app: FastifyInstance) {
  // All routes require feature flag permission
  app.addHook('preHandler', requireSuperAdminPermission('canManageFeatureFlags'));

  // List all feature flags
  app.get('/', async () => {
    const flags = await db.query.featureFlags.findMany({
      orderBy: [desc(featureFlags.createdAt)],
    });

    return { success: true, data: flags };
  });

  // Get flag details with overrides
  app.get('/:flagId', async (request) => {
    const { flagId } = request.params as { flagId: string };

    const flag = await db.query.featureFlags.findFirst({
      where: eq(featureFlags.id, flagId),
    });

    if (!flag) {
      return { success: false, error: { code: 'NOT_FOUND', message: 'Feature flag not found' } };
    }

    const overrides = await db.query.featureFlagOverrides.findMany({
      where: eq(featureFlagOverrides.flagId, flagId),
    });

    return { success: true, data: { ...flag, overrides } };
  });

  // Create feature flag
  app.post('/', async (request) => {
    const body = validate(CreateFlagSchema, request.body);

    // Check for duplicate key
    const existing = await db.query.featureFlags.findFirst({
      where: eq(featureFlags.key, body.key),
    });

    if (existing) {
      return { success: false, error: { code: 'DUPLICATE', message: 'Flag key already exists' } };
    }

    const [flag] = await db
      .insert(featureFlags)
      .values({
        ...body,
        createdBy: request.superAdmin?.userId,
      } as NewFeatureFlag)
      .returning();

    if (!flag) {
      return { success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to create feature flag' } };
    }

    await request.audit({
      action: 'settings.update',
      resourceType: 'feature_flag',
      resourceId: flag.id,
      resourceName: flag.key,
      metadata: { action: 'created', flag: body },
    });

    return { success: true, data: flag };
  });

  // Update feature flag
  app.patch('/:flagId', async (request) => {
    const { flagId } = request.params as { flagId: string };
    const body = validate(UpdateFlagSchema, request.body);

    const [flag] = await db
      .update(featureFlags)
      .set({
        ...body,
        updatedAt: new Date(),
      })
      .where(eq(featureFlags.id, flagId))
      .returning();

    if (!flag) {
      return { success: false, error: { code: 'NOT_FOUND', message: 'Feature flag not found' } };
    }

    await request.audit({
      action: 'settings.update',
      resourceType: 'feature_flag',
      resourceId: flag.id,
      resourceName: flag.key,
      metadata: { action: 'updated', changes: body },
    });

    return { success: true, data: flag };
  });

  // Toggle feature flag
  app.post('/:flagId/toggle', async (request) => {
    const { flagId } = request.params as { flagId: string };

    const flag = await db.query.featureFlags.findFirst({
      where: eq(featureFlags.id, flagId),
    });

    if (!flag) {
      return { success: false, error: { code: 'NOT_FOUND', message: 'Feature flag not found' } };
    }

    const [updated] = await db
      .update(featureFlags)
      .set({
        enabled: !flag.enabled,
        updatedAt: new Date(),
      })
      .where(eq(featureFlags.id, flagId))
      .returning();

    if (!updated) {
      return { success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to toggle feature flag' } };
    }

    await request.audit({
      action: 'settings.update',
      resourceType: 'feature_flag',
      resourceId: flag.id,
      resourceName: flag.key,
      metadata: { action: 'toggled', enabled: updated.enabled },
    });

    return { success: true, data: updated };
  });

  // Delete feature flag
  app.delete('/:flagId', async (request) => {
    const { flagId } = request.params as { flagId: string };

    const flag = await db.query.featureFlags.findFirst({
      where: eq(featureFlags.id, flagId),
    });

    if (!flag) {
      return { success: false, error: { code: 'NOT_FOUND', message: 'Feature flag not found' } };
    }

    await db.delete(featureFlags).where(eq(featureFlags.id, flagId));

    await request.audit({
      action: 'settings.update',
      resourceType: 'feature_flag',
      resourceId: flagId,
      resourceName: flag.key,
      metadata: { action: 'deleted' },
    });

    return { success: true, message: 'Feature flag deleted' };
  });

  // Add override for org/user
  app.post('/:flagId/overrides', async (request) => {
    const { flagId } = request.params as { flagId: string };
    const { organizationId, userId, enabled } = request.body as {
      organizationId?: string;
      userId?: string;
      enabled: boolean;
    };

    if (!organizationId && !userId) {
      return {
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Either organizationId or userId is required' },
      };
    }

    const [override] = await db
      .insert(featureFlagOverrides)
      .values({
        flagId,
        organizationId,
        userId,
        enabled,
        createdBy: request.superAdmin?.userId,
      })
      .returning();

    return { success: true, data: override };
  });

  // Remove override
  app.delete('/:flagId/overrides/:overrideId', async (request) => {
    const { overrideId } = request.params as { overrideId: string };

    await db.delete(featureFlagOverrides).where(eq(featureFlagOverrides.id, overrideId));

    return { success: true, message: 'Override removed' };
  });
}
