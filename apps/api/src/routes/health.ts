import { type FastifyInstance } from 'fastify';
import { sql } from '@menucraft/database';

const startTime = Date.now();

export async function healthRoutes(app: FastifyInstance) {
  // Liveness probe - basic health check
  app.get('/health', async () => {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: Math.floor((Date.now() - startTime) / 1000),
    };
  });

  // Database connectivity check
  app.get('/health/db', async (request, reply) => {
    try {
      await sql`SELECT 1`;
      return { status: 'ok', database: 'connected' };
    } catch (error) {
      reply.status(503);
      return { status: 'error', database: 'disconnected' };
    }
  });

  // Readiness probe - checks all dependencies
  app.get('/ready', async (request, reply) => {
    const checks: Record<string, 'ok' | 'error'> = {};

    // Check database
    try {
      await sql`SELECT 1`;
      checks.database = 'ok';
    } catch {
      checks.database = 'error';
    }

    const allOk = Object.values(checks).every((v) => v === 'ok');

    if (!allOk) {
      reply.status(503);
    }

    return {
      status: allOk ? 'ready' : 'not_ready',
      checks,
      timestamp: new Date().toISOString(),
    };
  });
}
