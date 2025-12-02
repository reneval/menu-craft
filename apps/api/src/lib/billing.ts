import { db, subscriptions, plans, venues, menus, eq, and, isNull, count } from '@menucraft/database';

export interface PlanLimits {
  venues: number;
  menusPerVenue: number;
  languages: number;
  customDomains: boolean;
  apiAccess: boolean;
}

// Free plan limits (used when no subscription exists)
export const FREE_PLAN_LIMITS: PlanLimits = {
  venues: 1,
  menusPerVenue: 2,
  languages: 1,
  customDomains: false,
  apiAccess: false,
};

// Get plan limits for an organization
export async function getPlanLimits(orgId: string): Promise<PlanLimits> {
  const subscription = await db.query.subscriptions.findFirst({
    where: and(
      eq(subscriptions.organizationId, orgId),
      eq(subscriptions.status, 'active')
    ),
    with: {
      plan: true,
    },
  });

  if (!subscription?.plan) {
    return FREE_PLAN_LIMITS;
  }

  return subscription.plan.limits as PlanLimits;
}

// Check if organization can create more venues
export async function canCreateVenue(orgId: string): Promise<{ allowed: boolean; current: number; limit: number }> {
  const limits = await getPlanLimits(orgId);

  // -1 means unlimited
  if (limits.venues === -1) {
    return { allowed: true, current: 0, limit: -1 };
  }

  const result = await db
    .select({ count: count() })
    .from(venues)
    .where(and(eq(venues.organizationId, orgId), isNull(venues.deletedAt)));

  const currentCount = result[0]?.count || 0;

  return {
    allowed: currentCount < limits.venues,
    current: currentCount,
    limit: limits.venues,
  };
}

// Check if organization can create more menus for a venue
export async function canCreateMenu(orgId: string, venueId: string): Promise<{ allowed: boolean; current: number; limit: number }> {
  const limits = await getPlanLimits(orgId);

  // -1 means unlimited
  if (limits.menusPerVenue === -1) {
    return { allowed: true, current: 0, limit: -1 };
  }

  const result = await db
    .select({ count: count() })
    .from(menus)
    .where(and(eq(menus.venueId, venueId), isNull(menus.deletedAt)));

  const currentCount = result[0]?.count || 0;

  return {
    allowed: currentCount < limits.menusPerVenue,
    current: currentCount,
    limit: limits.menusPerVenue,
  };
}

// Get usage stats for billing page
export async function getUsageStats(orgId: string): Promise<{
  venues: { current: number; limit: number };
  totalMenus: number;
}> {
  const limits = await getPlanLimits(orgId);

  const venueResult = await db
    .select({ count: count() })
    .from(venues)
    .where(and(eq(venues.organizationId, orgId), isNull(venues.deletedAt)));

  const menuResult = await db
    .select({ count: count() })
    .from(menus)
    .where(and(eq(menus.organizationId, orgId), isNull(menus.deletedAt)));

  return {
    venues: {
      current: venueResult[0]?.count || 0,
      limit: limits.venues,
    },
    totalMenus: menuResult[0]?.count || 0,
  };
}
