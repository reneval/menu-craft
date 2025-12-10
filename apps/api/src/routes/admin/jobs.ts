import { type FastifyInstance } from 'fastify';
import { requireSuperAdminPermission } from '../../plugins/super-admin.js';
import { runTrialCheckJob } from '../../jobs/trial-check.js';

export async function jobsRoutes(app: FastifyInstance) {
  // Run trial check job manually
  app.post(
    '/trial-check',
    { preHandler: requireSuperAdminPermission('canManageOrganizations') },
    async (request) => {
      const result = await runTrialCheckJob();

      await request.audit({
        action: 'settings.update',
        resourceType: 'system',
        resourceId: 'trial-check-job',
        metadata: {
          jobType: 'trial-check',
          warningsSent: result.warningsSent,
          expiredSent: result.expiredSent,
          errors: result.errors.length,
        },
      });

      return {
        success: true,
        data: result,
      };
    }
  );

  // Get job status/history (placeholder for future)
  app.get('/status', async () => {
    return {
      success: true,
      data: {
        jobs: [
          {
            name: 'trial-check',
            description: 'Check and send trial lifecycle emails',
            lastRun: null, // TODO: Track last run time
            schedule: 'daily',
          },
        ],
      },
    };
  });
}
