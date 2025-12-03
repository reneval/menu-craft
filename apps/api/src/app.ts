import Fastify from 'fastify';
import fastifyMultipart from '@fastify/multipart';
import fastifyStatic from '@fastify/static';
import path from 'path';
import { existsSync, mkdirSync } from 'fs';
import { env } from './config/env.js';
import { registerCors } from './plugins/cors.js';
import { registerSwagger } from './plugins/swagger.js';
import { registerErrorHandler } from './plugins/error-handler.js';
import tenancyPlugin from './plugins/tenancy.js';
import authPlugin from './plugins/auth.js';
import auditPlugin from './plugins/audit.js';
import { registerRoutes } from './routes/index.js';

// Ensure uploads directory exists
const UPLOADS_DIR = path.join(process.cwd(), 'uploads');
if (!existsSync(UPLOADS_DIR)) {
  mkdirSync(UPLOADS_DIR, { recursive: true });
}

export async function buildApp() {
  const app = Fastify({
    logger: {
      level: env.NODE_ENV === 'production' ? 'info' : 'debug',
    },
  });

  // Register plugins
  await registerCors(app);
  await registerSwagger(app);
  await app.register(tenancyPlugin);
  await app.register(authPlugin);
  await app.register(auditPlugin);
  registerErrorHandler(app);

  // Register multipart for file uploads
  await app.register(fastifyMultipart, {
    limits: {
      fileSize: 5 * 1024 * 1024, // 5MB
    },
  });

  // Serve uploaded files statically
  await app.register(fastifyStatic, {
    root: UPLOADS_DIR,
    prefix: '/uploads/',
    decorateReply: false,
  });

  // Register routes
  await registerRoutes(app);

  return app;
}
