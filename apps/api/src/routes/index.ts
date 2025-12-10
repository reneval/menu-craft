import { type FastifyInstance } from 'fastify';
import { healthRoutes } from './health.js';
import { organizationRoutes } from './organizations/index.js';
import { venueRoutes } from './venues/index.js';
import { menuRoutes } from './menus/index.js';
import { publicRoutes } from './public/index.js';
import { uploadRoutes } from './uploads.js';
import { analyticsRoutes } from './analytics/index.js';
import { qrCodeRoutes } from './qr-codes/index.js';
import { billingRoutes, billingWebhookRoute } from './billing/index.js';
import { widgetRoutes } from './widgets/index.js';
import { adminRoutes } from './admin/index.js';
import { featureFlagsCheckRoutes } from './feature-flags.js';
import { webhookRoutes } from './webhooks/index.js';
import { seoRoutes } from './seo/index.js';
import { referralRoutes } from './referrals/index.js';
import { aiRoutes } from './ai/index.js';
import { userRoutes } from './users/index.js';

export async function registerRoutes(app: FastifyInstance) {
  // Health check routes
  await app.register(healthRoutes);

  // API routes (authenticated)
  await app.register(
    async (api) => {
      await api.register(userRoutes, { prefix: '/users' });
      await api.register(organizationRoutes, { prefix: '/organizations' });
      await api.register(venueRoutes, { prefix: '/organizations/:orgId/venues' });
      await api.register(menuRoutes, { prefix: '/organizations/:orgId/venues/:venueId/menus' });
      await api.register(analyticsRoutes, { prefix: '/organizations/:orgId/venues/:venueId/analytics' });
      await api.register(qrCodeRoutes, { prefix: '/organizations/:orgId/qr-codes' });
      await api.register(billingRoutes, { prefix: '/organizations/:orgId/billing' });
      await api.register(uploadRoutes, { prefix: '/uploads' });
      await api.register(featureFlagsCheckRoutes, { prefix: '/feature-flags' });
      await api.register(webhookRoutes, { prefix: '/organizations/:orgId/webhooks' });
      await api.register(referralRoutes, { prefix: '/organizations/:orgId/referrals' });
      await api.register(aiRoutes, { prefix: '/organizations/:orgId/ai' });
    },
    { prefix: '/api' }
  );

  // Admin routes (super admin only)
  await app.register(adminRoutes, { prefix: '/api/admin' });

  // Billing webhook (no auth, raw body)
  await app.register(billingWebhookRoute, { prefix: '/api/billing' });

  // Public routes (no auth)
  await app.register(publicRoutes, { prefix: '/public' });

  // Widget routes (no auth, CORS enabled)
  await app.register(widgetRoutes, { prefix: '/widgets' });

  // SEO routes (no auth, for search engines)
  await app.register(seoRoutes, { prefix: '/seo' });
}
