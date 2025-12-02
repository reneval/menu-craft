// Start telemetry BEFORE importing anything else
import { startTelemetry, stopTelemetry } from './instrumentation.js';
startTelemetry();

import 'dotenv/config';
import { buildApp } from './app.js';
import { env } from './config/env.js';

async function main() {
  const app = await buildApp();

  // Graceful shutdown
  const shutdown = async (signal: string) => {
    console.log(`\n${signal} received, shutting down gracefully...`);
    await app.close();
    await stopTelemetry();
    process.exit(0);
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));

  try {
    await app.listen({ port: env.PORT, host: env.HOST });
    console.log(`Server running at http://${env.HOST}:${env.PORT}`);
    console.log(`API docs available at http://${env.HOST}:${env.PORT}/docs`);
  } catch (err) {
    app.log.error(err);
    await stopTelemetry();
    process.exit(1);
  }
}

main();
