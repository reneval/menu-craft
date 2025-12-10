import { db, referralCodes, referralRedemptions, credits, eq, and } from '@menucraft/database';
import { randomBytes } from 'crypto';

const REFERRAL_CREDIT_CENTS = 900; // €9.00

/**
 * Generate a unique referral code
 */
function generateReferralCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const bytes = randomBytes(6);
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars[bytes[i]! % chars.length];
  }
  return code;
}

/**
 * Get or create a referral code for an organization
 */
export async function getOrCreateReferralCode(orgId: string): Promise<string> {
  // Check for existing active code
  const existing = await db.query.referralCodes.findFirst({
    where: and(
      eq(referralCodes.organizationId, orgId),
      eq(referralCodes.isActive, true)
    ),
  });

  if (existing) {
    return existing.code;
  }

  // Generate new code (retry if collision)
  let code = generateReferralCode();
  let attempts = 0;
  while (attempts < 5) {
    const collision = await db.query.referralCodes.findFirst({
      where: eq(referralCodes.code, code),
    });
    if (!collision) break;
    code = generateReferralCode();
    attempts++;
  }

  // Create new code
  const [newCode] = await db
    .insert(referralCodes)
    .values({
      organizationId: orgId,
      code,
    })
    .returning();

  return newCode!.code;
}

/**
 * Get referral statistics for an organization
 */
export async function getReferralStats(orgId: string): Promise<{
  code: string | null;
  totalReferrals: number;
  successfulReferrals: number;
  creditsEarned: number;
}> {
  const referralCode = await db.query.referralCodes.findFirst({
    where: and(
      eq(referralCodes.organizationId, orgId),
      eq(referralCodes.isActive, true)
    ),
    with: {
      redemptions: true,
    },
  });

  if (!referralCode) {
    return {
      code: null,
      totalReferrals: 0,
      successfulReferrals: 0,
      creditsEarned: 0,
    };
  }

  const redemptions = referralCode.redemptions || [];
  const successfulReferrals = redemptions.filter((r) => r.referrerCreditApplied).length;

  return {
    code: referralCode.code,
    totalReferrals: redemptions.length,
    successfulReferrals,
    creditsEarned: successfulReferrals * REFERRAL_CREDIT_CENTS,
  };
}

/**
 * Redeem a referral code for a new organization
 * Returns the referrer's org ID if successful
 */
export async function redeemReferralCode(
  code: string,
  newOrgId: string
): Promise<{ success: boolean; referrerOrgId?: string; error?: string }> {
  // Find the referral code
  const referralCode = await db.query.referralCodes.findFirst({
    where: and(eq(referralCodes.code, code.toUpperCase()), eq(referralCodes.isActive, true)),
  });

  if (!referralCode) {
    return { success: false, error: 'Invalid referral code' };
  }

  // Check if the new org hasn't already used a referral
  const existingRedemption = await db.query.referralRedemptions.findFirst({
    where: eq(referralRedemptions.referredOrganizationId, newOrgId),
  });

  if (existingRedemption) {
    return { success: false, error: 'Organization has already used a referral code' };
  }

  // Can't refer yourself
  if (referralCode.organizationId === newOrgId) {
    return { success: false, error: 'Cannot use your own referral code' };
  }

  // Create redemption record
  const [redemption] = await db
    .insert(referralRedemptions)
    .values({
      referralCodeId: referralCode.id,
      referredOrganizationId: newOrgId,
    })
    .returning();

  return {
    success: true,
    referrerOrgId: referralCode.organizationId,
  };
}

/**
 * Apply referral reward credits to the referrer
 * Called after the referred org becomes a paying customer
 */
export async function applyReferralReward(redemptionId: string): Promise<boolean> {
  const redemption = await db.query.referralRedemptions.findFirst({
    where: eq(referralRedemptions.id, redemptionId),
    with: {
      referralCode: true,
    },
  });

  if (!redemption || redemption.referrerCreditApplied) {
    return false;
  }

  // Apply credit to referrer
  await db.insert(credits).values({
    organizationId: redemption.referralCode.organizationId,
    amountCents: REFERRAL_CREDIT_CENTS,
    reason: 'Referral reward',
    referralRedemptionId: redemptionId,
  });

  // Mark as applied
  await db
    .update(referralRedemptions)
    .set({
      referrerCreditApplied: true,
      referrerCreditAppliedAt: new Date(),
    })
    .where(eq(referralRedemptions.id, redemptionId));

  return true;
}

/**
 * Get credit balance for an organization
 */
export async function getCreditBalance(orgId: string): Promise<number> {
  const allCredits = await db.query.credits.findMany({
    where: eq(credits.organizationId, orgId),
  });

  return allCredits.reduce((sum, c) => sum + c.amountCents, 0);
}

/**
 * Add manual credit (admin action)
 */
export async function addCredit(
  orgId: string,
  amountCents: number,
  reason: string
): Promise<void> {
  await db.insert(credits).values({
    organizationId: orgId,
    amountCents,
    reason,
  });
}
