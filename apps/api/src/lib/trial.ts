import { db, organizations, eq } from '@menucraft/database';

export const TRIAL_DURATION_DAYS = 30;

/**
 * Start a trial for an organization
 */
export async function startTrial(orgId: string): Promise<Date> {
  const now = new Date();
  const trialEndsAt = new Date(now.getTime() + TRIAL_DURATION_DAYS * 24 * 60 * 60 * 1000);

  await db
    .update(organizations)
    .set({
      trialStartedAt: now,
      trialEndsAt,
      updatedAt: now,
    })
    .where(eq(organizations.id, orgId));

  return trialEndsAt;
}

/**
 * Get trial status for an organization
 */
export async function getTrialStatus(orgId: string): Promise<{
  isTrialing: boolean;
  daysRemaining: number;
  trialEndsAt: Date | null;
}> {
  const org = await db.query.organizations.findFirst({
    where: eq(organizations.id, orgId),
  });

  if (!org || !org.trialEndsAt) {
    return { isTrialing: false, daysRemaining: 0, trialEndsAt: null };
  }

  const now = new Date();
  const trialEndsAt = new Date(org.trialEndsAt);
  const isTrialing = trialEndsAt > now;
  const daysRemaining = isTrialing
    ? Math.ceil((trialEndsAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
    : 0;

  return {
    isTrialing,
    daysRemaining: Math.max(0, daysRemaining),
    trialEndsAt,
  };
}

/**
 * Extend trial by a number of days
 */
export async function extendTrial(
  orgId: string,
  days: number,
  extendedBy?: string
): Promise<Date> {
  const org = await db.query.organizations.findFirst({
    where: eq(organizations.id, orgId),
  });

  if (!org) {
    throw new Error('Organization not found');
  }

  const now = new Date();
  const currentEnd = org.trialEndsAt ? new Date(org.trialEndsAt) : now;
  const baseDate = currentEnd > now ? currentEnd : now;
  const newTrialEndsAt = new Date(baseDate.getTime() + days * 24 * 60 * 60 * 1000);

  await db
    .update(organizations)
    .set({
      trialEndsAt: newTrialEndsAt,
      trialExtendedBy: extendedBy || null,
      updatedAt: now,
    })
    .where(eq(organizations.id, orgId));

  return newTrialEndsAt;
}

/**
 * Check if organization has an active trial or paid subscription
 */
export async function hasActiveAccess(orgId: string): Promise<boolean> {
  const { isTrialing } = await getTrialStatus(orgId);
  if (isTrialing) return true;

  // Check for active subscription
  const org = await db.query.organizations.findFirst({
    where: eq(organizations.id, orgId),
    with: {
      subscriptions: {
        where: (subs, { eq }) => eq(subs.status, 'active'),
        limit: 1,
      },
    },
  });

  return (org?.subscriptions?.length ?? 0) > 0;
}
