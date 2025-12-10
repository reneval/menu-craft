import { type FastifyInstance } from 'fastify';
import { z } from 'zod';
import {
  getOrCreateReferralCode,
  getReferralStats,
  redeemReferralCode,
  getCreditBalance,
} from '../../lib/referrals.js';

const redeemSchema = z.object({
  code: z.string().min(1).max(20),
});

export async function referralRoutes(app: FastifyInstance) {
  // Get referral code and stats for organization
  app.get('/', async (request) => {
    const { orgId } = request.params as { orgId: string };

    const stats = await getReferralStats(orgId);

    // Generate code if none exists
    if (!stats.code) {
      const code = await getOrCreateReferralCode(orgId);
      stats.code = code;
    }

    return { success: true, data: stats };
  });

  // Generate/regenerate referral code
  app.post('/generate', async (request) => {
    const { orgId } = request.params as { orgId: string };

    const code = await getOrCreateReferralCode(orgId);

    return { success: true, data: { code } };
  });

  // Get credit balance
  app.get('/credits', async (request) => {
    const { orgId } = request.params as { orgId: string };

    const balance = await getCreditBalance(orgId);

    return {
      success: true,
      data: {
        balanceCents: balance,
        balanceFormatted: `€${(balance / 100).toFixed(2)}`,
      },
    };
  });

  // Redeem a referral code (for new organizations)
  app.post('/redeem', async (request) => {
    const { orgId } = request.params as { orgId: string };
    const body = redeemSchema.parse(request.body);

    const result = await redeemReferralCode(body.code, orgId);

    if (!result.success) {
      return {
        success: false,
        error: { code: 'INVALID_CODE', message: result.error },
      };
    }

    return {
      success: true,
      data: { message: 'Referral code applied successfully' },
    };
  });
}
