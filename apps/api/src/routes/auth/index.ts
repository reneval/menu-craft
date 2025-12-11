import { type FastifyInstance } from 'fastify';
import { auth } from '../../lib/auth.js';

export async function authRoutes(app: FastifyInstance) {
  // Handle all better-auth endpoints
  app.all('/auth/*', async (request, reply) => {
    // Convert Fastify request/reply to Web Request/Response
    const url = new URL(request.url, `http://${request.headers.host}`);

    // Build headers
    const headers = new Headers();
    for (const [key, value] of Object.entries(request.headers)) {
      if (value) {
        if (Array.isArray(value)) {
          value.forEach(v => headers.append(key, v));
        } else {
          headers.set(key, value);
        }
      }
    }

    // Create web request
    const webRequest = new Request(url.toString(), {
      method: request.method,
      headers,
      body: request.method !== 'GET' && request.method !== 'HEAD'
        ? JSON.stringify(request.body)
        : undefined,
    });

    // Handle with better-auth
    const response = await auth.handler(webRequest);

    // Set response headers
    response.headers.forEach((value, key) => {
      reply.header(key, value);
    });

    // Set status and send body
    reply.status(response.status);

    const body = await response.text();
    return reply.send(body);
  });
}
