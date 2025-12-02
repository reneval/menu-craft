import { type FastifyInstance } from 'fastify';
import { db, featureFlags, featureFlagOverrides, eq, and, or, isNull } from '@menucraft/database';

/**
 * Feature flags check routes - for clients to check flag status
 */
export async function featureFlagsCheckRoutes(app: FastifyInstance) {
  // Check if a specific flag is enabled for the current user/org
  app.get('/:key', async (request) => {
    const { key } = request.params as { key: string };
    const userId = request.tenantContext?.userId;
    const organizationId = request.tenantContext?.organizationId;

    const enabled = await isFeatureEnabled(key, { userId, organizationId });

    return { success: true, data: { key, enabled } };
  });

  // Check multiple flags at once
  app.post('/check', async (request) => {
    const { keys } = request.body as { keys: string[] };
    const userId = request.tenantContext?.userId;
    const organizationId = request.tenantContext?.organizationId;

    const results: Record<string, boolean> = {};

    await Promise.all(
      keys.map(async (key) => {
        results[key] = await isFeatureEnabled(key, { userId, organizationId });
      })
    );

    return { success: true, data: results };
  });

  // Get all flags (for frontend feature flag provider)
  app.get('/', async (request) => {
    const userId = request.tenantContext?.userId;
    const organizationId = request.tenantContext?.organizationId;

    const flags = await db.query.featureFlags.findMany();
    const results: Record<string, boolean> = {};

    await Promise.all(
      flags.map(async (flag) => {
        results[flag.key] = await isFeatureEnabled(flag.key, { userId, organizationId });
      })
    );

    return { success: true, data: results };
  });
}

/**
 * Check if a feature flag is enabled for a given context
 */
export async function isFeatureEnabled(
  key: string,
  context: { userId?: string; organizationId?: string }
): Promise<boolean> {
  // Get the flag
  const flag = await db.query.featureFlags.findFirst({
    where: eq(featureFlags.key, key),
  });

  if (!flag) {
    return false; // Unknown flags are disabled
  }

  // Check for user/org-specific overrides
  if (context.userId || context.organizationId) {
    const override = await db.query.featureFlagOverrides.findFirst({
      where: and(
        eq(featureFlagOverrides.flagId, flag.id),
        or(
          context.userId ? eq(featureFlagOverrides.userId, context.userId) : undefined,
          context.organizationId
            ? eq(featureFlagOverrides.organizationId, context.organizationId)
            : undefined
        )
      ),
    });

    if (override) {
      return override.enabled;
    }
  }

  // Check based on flag type
  switch (flag.type) {
    case 'boolean':
      return flag.enabled;

    case 'percentage': {
      if (!flag.enabled) return false;
      const percentage = (flag.value as { percentage?: number })?.percentage ?? 0;
      // Use org ID or user ID for consistent bucketing
      const seed = context.organizationId || context.userId || '';
      const hash = hashString(seed + key);
      return (hash % 100) < percentage;
    }

    case 'user_list': {
      if (!flag.enabled) return false;
      const userIds = (flag.value as { userIds?: string[] })?.userIds ?? [];
      return context.userId ? userIds.includes(context.userId) : false;
    }

    case 'org_list': {
      if (!flag.enabled) return false;
      const orgIds = (flag.value as { orgIds?: string[] })?.orgIds ?? [];
      return context.organizationId ? orgIds.includes(context.organizationId) : false;
    }

    default:
      return flag.enabled;
  }
}

/**
 * Simple string hash for percentage rollouts
 */
function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash);
}
