import { type FastifyInstance } from 'fastify';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { existsSync, readFileSync } from 'fs';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Path to widget dist files
const WIDGET_DIST = join(__dirname, '../../../../..', 'packages/widget/dist');

// Cache for widget files
const widgetCache = new Map<string, { content: string; etag: string }>();

function loadWidget(filename: string): { content: string; etag: string } | null {
  if (widgetCache.has(filename)) {
    return widgetCache.get(filename)!;
  }

  const filePath = join(WIDGET_DIST, filename);
  if (!existsSync(filePath)) {
    return null;
  }

  const content = readFileSync(filePath, 'utf-8');
  const etag = `"${Buffer.from(content).length}-${Date.now()}"`;

  const cached = { content, etag };
  widgetCache.set(filename, cached);

  return cached;
}

export async function widgetRoutes(app: FastifyInstance) {
  // Serve iframe widget
  app.get('/menucraft-widget.js', async (request, reply) => {
    const widget = loadWidget('menucraft-widget.js');

    if (!widget) {
      return reply.status(404).send({ error: 'Widget not found. Run pnpm build in packages/widget' });
    }

    // Check if client has cached version
    const ifNoneMatch = request.headers['if-none-match'];
    if (ifNoneMatch === widget.etag) {
      return reply.status(304).send();
    }

    return reply
      .header('Content-Type', 'application/javascript')
      .header('Cache-Control', 'public, max-age=3600')
      .header('ETag', widget.etag)
      .header('Access-Control-Allow-Origin', '*')
      .send(widget.content);
  });

  // Serve shadow DOM widget
  app.get('/menucraft-widget-shadow.js', async (request, reply) => {
    const widget = loadWidget('menucraft-widget-shadow.js');

    if (!widget) {
      return reply.status(404).send({ error: 'Widget not found. Run pnpm build in packages/widget' });
    }

    const ifNoneMatch = request.headers['if-none-match'];
    if (ifNoneMatch === widget.etag) {
      return reply.status(304).send();
    }

    return reply
      .header('Content-Type', 'application/javascript')
      .header('Cache-Control', 'public, max-age=3600')
      .header('ETag', widget.etag)
      .header('Access-Control-Allow-Origin', '*')
      .send(widget.content);
  });

  // Clear widget cache (for development)
  app.post('/clear-cache', async (request, reply) => {
    widgetCache.clear();
    return { success: true, message: 'Widget cache cleared' };
  });
}
