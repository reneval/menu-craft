/**
 * Trial Check Job
 * Runs daily to:
 * 1. Send trial ending warning emails (7 days, 3 days, 1 day before expiry)
 * 2. Expire trials and send trial expired emails
 */

import { db, organizations, organizationUsers, users, emailLogs, subscriptions, eq, and, isNull, gte, lte, sql } from '@menucraft/database';
import { sendTrialEndingEmail, sendTrialExpiredEmail } from '../lib/email.js';
import { TRIAL_DURATION_DAYS } from '../lib/trial.js';

interface TrialOrgInfo {
  orgId: string;
  orgName: string;
  trialEndsAt: Date;
  ownerEmail: string;
  ownerName: string;
  ownerId: string;
}

/**
 * Get organizations with trials ending in a specific number of days
 */
async function getOrgsWithTrialEndingIn(days: number): Promise<TrialOrgInfo[]> {
  const now = new Date();
  const targetDate = new Date(now);
  targetDate.setDate(targetDate.getDate() + days);

  // Set to start and end of target day
  const dayStart = new Date(targetDate);
  dayStart.setHours(0, 0, 0, 0);
  const dayEnd = new Date(targetDate);
  dayEnd.setHours(23, 59, 59, 999);

  // Find organizations with trial ending on the target day
  const orgs = await db
    .select({
      orgId: organizations.id,
      orgName: organizations.name,
      trialEndsAt: organizations.trialEndsAt,
    })
    .from(organizations)
    .where(and(
      isNull(organizations.deletedAt),
      gte(organizations.trialEndsAt, dayStart),
      lte(organizations.trialEndsAt, dayEnd)
    ));

  // Get owner info for each org
  const result: TrialOrgInfo[] = [];

  for (const org of orgs) {
    if (!org.trialEndsAt) continue;

    // Check if they already have a paid subscription (skip them)
    const [existingSub] = await db
      .select()
      .from(subscriptions)
      .where(and(
        eq(subscriptions.organizationId, org.orgId),
        eq(subscriptions.status, 'active')
      ))
      .limit(1);

    if (existingSub) continue;

    // Check if we already sent this type of email
    const emailType = days === 7 ? 'trial_ending_7d' : days === 3 ? 'trial_ending_3d' : 'trial_ending_1d';
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [alreadySent] = await db
      .select()
      .from(emailLogs)
      .where(and(
        eq(emailLogs.organizationId, org.orgId),
        eq(emailLogs.type, emailType),
        gte(emailLogs.createdAt, today)
      ))
      .limit(1);

    if (alreadySent) continue;

    // Get owner
    const [owner] = await db
      .select({
        userId: organizationUsers.userId,
        email: users.email,
        name: sql<string>`COALESCE(${users.firstName} || ' ' || ${users.lastName}, ${users.email})`,
      })
      .from(organizationUsers)
      .innerJoin(users, eq(organizationUsers.userId, users.id))
      .where(and(
        eq(organizationUsers.organizationId, org.orgId),
        eq(organizationUsers.role, 'owner')
      ))
      .limit(1);

    if (owner) {
      result.push({
        orgId: org.orgId,
        orgName: org.orgName,
        trialEndsAt: org.trialEndsAt,
        ownerEmail: owner.email,
        ownerName: owner.name,
        ownerId: owner.userId,
      });
    }
  }

  return result;
}

/**
 * Get organizations with expired trials
 */
async function getOrgsWithExpiredTrials(): Promise<TrialOrgInfo[]> {
  const now = new Date();

  // Find organizations with expired trials (trialEndsAt < now)
  const orgs = await db
    .select({
      orgId: organizations.id,
      orgName: organizations.name,
      trialEndsAt: organizations.trialEndsAt,
    })
    .from(organizations)
    .where(and(
      isNull(organizations.deletedAt),
      lte(organizations.trialEndsAt, now)
    ));

  const result: TrialOrgInfo[] = [];

  for (const org of orgs) {
    if (!org.trialEndsAt) continue;

    // Check if they have a paid subscription (skip them)
    const [existingSub] = await db
      .select()
      .from(subscriptions)
      .where(and(
        eq(subscriptions.organizationId, org.orgId),
        eq(subscriptions.status, 'active')
      ))
      .limit(1);

    if (existingSub) continue;

    // Check if we already sent expired email today
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [alreadySent] = await db
      .select()
      .from(emailLogs)
      .where(and(
        eq(emailLogs.organizationId, org.orgId),
        eq(emailLogs.type, 'trial_expired'),
        gte(emailLogs.createdAt, today)
      ))
      .limit(1);

    if (alreadySent) continue;

    // Get owner
    const [owner] = await db
      .select({
        userId: organizationUsers.userId,
        email: users.email,
        name: sql<string>`COALESCE(${users.firstName} || ' ' || ${users.lastName}, ${users.email})`,
      })
      .from(organizationUsers)
      .innerJoin(users, eq(organizationUsers.userId, users.id))
      .where(and(
        eq(organizationUsers.organizationId, org.orgId),
        eq(organizationUsers.role, 'owner')
      ))
      .limit(1);

    if (owner) {
      result.push({
        orgId: org.orgId,
        orgName: org.orgName,
        trialEndsAt: org.trialEndsAt,
        ownerEmail: owner.email,
        ownerName: owner.name,
        ownerId: owner.userId,
      });
    }
  }

  return result;
}

/**
 * Run the trial check job
 */
export async function runTrialCheckJob(): Promise<{
  warningsSent: number;
  expiredSent: number;
  errors: string[];
}> {
  console.log('[TrialCheck] Starting trial check job...');

  const result = {
    warningsSent: 0,
    expiredSent: 0,
    errors: [] as string[],
  };

  // Send 7-day warnings
  try {
    const sevenDayOrgs = await getOrgsWithTrialEndingIn(7);
    console.log(`[TrialCheck] Found ${sevenDayOrgs.length} orgs with trial ending in 7 days`);

    for (const org of sevenDayOrgs) {
      try {
        await sendTrialEndingEmail(org.ownerEmail, org.ownerName, 7, org.ownerId, org.orgId);
        result.warningsSent++;
        console.log(`[TrialCheck] Sent 7-day warning to ${org.ownerEmail} for org ${org.orgName}`);
      } catch (err) {
        const error = `Failed to send 7-day warning to ${org.ownerEmail}: ${err}`;
        result.errors.push(error);
        console.error(`[TrialCheck] ${error}`);
      }
    }
  } catch (err) {
    result.errors.push(`Failed to get 7-day warning orgs: ${err}`);
  }

  // Send 3-day warnings
  try {
    const threeDayOrgs = await getOrgsWithTrialEndingIn(3);
    console.log(`[TrialCheck] Found ${threeDayOrgs.length} orgs with trial ending in 3 days`);

    for (const org of threeDayOrgs) {
      try {
        await sendTrialEndingEmail(org.ownerEmail, org.ownerName, 3, org.ownerId, org.orgId);
        result.warningsSent++;
        console.log(`[TrialCheck] Sent 3-day warning to ${org.ownerEmail} for org ${org.orgName}`);
      } catch (err) {
        const error = `Failed to send 3-day warning to ${org.ownerEmail}: ${err}`;
        result.errors.push(error);
        console.error(`[TrialCheck] ${error}`);
      }
    }
  } catch (err) {
    result.errors.push(`Failed to get 3-day warning orgs: ${err}`);
  }

  // Send 1-day warnings
  try {
    const oneDayOrgs = await getOrgsWithTrialEndingIn(1);
    console.log(`[TrialCheck] Found ${oneDayOrgs.length} orgs with trial ending in 1 day`);

    for (const org of oneDayOrgs) {
      try {
        await sendTrialEndingEmail(org.ownerEmail, org.ownerName, 1, org.ownerId, org.orgId);
        result.warningsSent++;
        console.log(`[TrialCheck] Sent 1-day warning to ${org.ownerEmail} for org ${org.orgName}`);
      } catch (err) {
        const error = `Failed to send 1-day warning to ${org.ownerEmail}: ${err}`;
        result.errors.push(error);
        console.error(`[TrialCheck] ${error}`);
      }
    }
  } catch (err) {
    result.errors.push(`Failed to get 1-day warning orgs: ${err}`);
  }

  // Send expired notices
  try {
    const expiredOrgs = await getOrgsWithExpiredTrials();
    console.log(`[TrialCheck] Found ${expiredOrgs.length} orgs with expired trials`);

    for (const org of expiredOrgs) {
      try {
        await sendTrialExpiredEmail(org.ownerEmail, org.ownerName, org.ownerId, org.orgId);
        result.expiredSent++;
        console.log(`[TrialCheck] Sent expired notice to ${org.ownerEmail} for org ${org.orgName}`);
      } catch (err) {
        const error = `Failed to send expired notice to ${org.ownerEmail}: ${err}`;
        result.errors.push(error);
        console.error(`[TrialCheck] ${error}`);
      }
    }
  } catch (err) {
    result.errors.push(`Failed to get expired orgs: ${err}`);
  }

  console.log(`[TrialCheck] Job complete. Warnings: ${result.warningsSent}, Expired: ${result.expiredSent}, Errors: ${result.errors.length}`);

  return result;
}
