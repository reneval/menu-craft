import { type FastifyInstance } from 'fastify';
import { requireSuperAdmin } from '../../plugins/super-admin.js';
import { statsRoutes } from './stats.js';
import { organizationsRoutes } from './organizations.js';
import { usersRoutes } from './users.js';
import { featureFlagsRoutes } from './feature-flags.js';
import { backupsRoutes } from './backups.js';

export async function adminRoutes(app: FastifyInstance) {
  // All admin routes require super admin authentication
  app.addHook('preHandler', requireSuperAdmin);

  // Dashboard stats
  await app.register(statsRoutes, { prefix: '/stats' });

  // Organization management
  await app.register(organizationsRoutes, { prefix: '/organizations' });

  // User management
  await app.register(usersRoutes, { prefix: '/users' });

  // Feature flags
  await app.register(featureFlagsRoutes, { prefix: '/feature-flags' });

  // Backups
  await app.register(backupsRoutes, { prefix: '/backups' });
}
