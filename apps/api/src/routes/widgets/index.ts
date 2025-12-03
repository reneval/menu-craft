import { type FastifyInstance } from 'fastify';
import { db, venues, menus, eq, and } from '@menucraft/database';
import { z } from 'zod';
import { NotFoundError } from '../../utils/errors.js';

const widgetConfigSchema = z.object({
  menuId: z.string().uuid().optional(),
  hideHeader: z.boolean().optional().default(false),
  hideFooter: z.boolean().optional().default(true),
  compactMode: z.boolean().optional().default(true),
  maxHeight: z.string().optional().default('600px'),
  theme: z.object({
    primaryColor: z.string().optional(),
    fontFamily: z.string().optional(),
    borderRadius: z.string().optional(),
  }).optional(),
  language: z.string().optional(),
});

export async function widgetRoutes(app: FastifyInstance) {
  // Generate embed code for a venue
  app.post('/:venueId/embed-code', async (request) => {
    const { orgId, venueId } = request.params as { orgId: string; venueId: string };
    const config = widgetConfigSchema.parse(request.body);

    // Verify venue belongs to organization
    const venue = await db.query.venues.findFirst({
      where: and(eq(venues.id, venueId), eq(venues.organizationId, orgId)),
    });

    if (!venue) {
      throw new NotFoundError('Venue');
    }

    // If menuId is provided, verify it belongs to the venue
    if (config.menuId) {
      const menu = await db.query.menus.findFirst({
        where: and(eq(menus.id, config.menuId), eq(menus.venueId, venueId)),
      });

      if (!menu) {
        throw new NotFoundError('Menu');
      }
    }

    const embedUrl = generateEmbedUrl(venue.slug, config);
    const embedCode = generateEmbedCode(embedUrl, config);
    const previewUrl = generatePreviewUrl(venue.slug, config);

    return {
      success: true,
      data: {
        embedUrl,
        embedCode,
        previewUrl,
        config,
        venue: {
          id: venue.id,
          name: venue.name,
          slug: venue.slug,
        }
      }
    };
  });

  // Get widget configuration options
  app.get('/options', async (request, reply) => {
    return {
      success: true,
      data: {
        themes: {
          colors: [
            { name: 'Blue', value: '#2563eb' },
            { name: 'Green', value: '#16a34a' },
            { name: 'Red', value: '#dc2626' },
            { name: 'Purple', value: '#9333ea' },
            { name: 'Orange', value: '#ea580c' },
            { name: 'Teal', value: '#0d9488' },
          ],
          fonts: [
            { name: 'Default', value: '-apple-system, BlinkMacSystemFont, sans-serif' },
            { name: 'Arial', value: 'Arial, sans-serif' },
            { name: 'Georgia', value: 'Georgia, serif' },
            { name: 'Times New Roman', value: 'Times New Roman, serif' },
            { name: 'Helvetica', value: 'Helvetica, Arial, sans-serif' },
            { name: 'Roboto', value: 'Roboto, sans-serif' },
          ],
        },
        sizes: {
          heights: ['400px', '500px', '600px', '700px', '800px', 'auto'],
          borderRadius: ['0', '4px', '8px', '12px', '16px'],
        },
        languages: [
          { code: 'en', name: 'English' },
          { code: 'es', name: 'Español' },
          { code: 'fr', name: 'Français' },
          { code: 'de', name: 'Deutsch' },
          { code: 'it', name: 'Italiano' },
          { code: 'pt', name: 'Português' },
        ],
        defaultConfig: {
          hideHeader: false,
          hideFooter: true,
          compactMode: true,
          maxHeight: '600px',
          theme: {
            primaryColor: '#2563eb',
            fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif',
            borderRadius: '8px',
          },
        },
      }
    };
  });

  // Preview widget with custom configuration
  app.get('/:venueId/preview', async (request) => {
    const { orgId, venueId } = request.params as { orgId: string; venueId: string };
    const config = widgetConfigSchema.parse(request.query);

    // Verify venue belongs to organization
    const venue = await db.query.venues.findFirst({
      where: and(eq(venues.id, venueId), eq(venues.organizationId, orgId)),
    });

    if (!venue) {
      throw new NotFoundError('Venue');
    }

    const previewUrl = generatePreviewUrl(venue.slug, config);

    return {
      success: true,
      data: {
        previewUrl,
        config,
        venue: {
          id: venue.id,
          name: venue.name,
          slug: venue.slug,
        }
      }
    };
  });
}

function generateEmbedUrl(venueSlug: string, config: any): string {
  const params = new URLSearchParams();

  params.set('venue', venueSlug);

  if (config.menuId) {
    params.set('menu', config.menuId);
  }

  if (config.hideHeader) {
    params.set('hideHeader', 'true');
  }

  if (!config.hideFooter) {
    params.set('hideFooter', 'false');
  }

  if (!config.compactMode) {
    params.set('compactMode', 'false');
  }

  if (config.maxHeight && config.maxHeight !== '600px') {
    params.set('maxHeight', config.maxHeight);
  }

  if (config.theme?.primaryColor) {
    params.set('primaryColor', encodeURIComponent(config.theme.primaryColor));
  }

  if (config.theme?.fontFamily) {
    params.set('fontFamily', encodeURIComponent(config.theme.fontFamily));
  }

  if (config.theme?.borderRadius) {
    params.set('borderRadius', config.theme.borderRadius);
  }

  if (config.language) {
    params.set('lang', config.language);
  }

  return `${process.env.PUBLIC_URL || 'http://localhost:5174'}/embed?${params.toString()}`;
}

function generateEmbedCode(embedUrl: string, config: any): string {
  const height = config.maxHeight === 'auto' ? '600' : parseInt(config.maxHeight) || 600;

  return `<iframe
  src="${embedUrl}"
  width="100%"
  height="${height}"
  frameborder="0"
  scrolling="auto"
  title="Restaurant Menu"
  style="border: none; border-radius: ${config.theme?.borderRadius || '8px'};"
></iframe>

<script>
  // Auto-resize iframe based on content
  window.addEventListener('message', function(event) {
    if (event.data.type === 'heightUpdate') {
      const iframe = document.querySelector('iframe[src*="${embedUrl.split('?')[0]}"]');
      if (iframe && event.data.height) {
        iframe.style.height = event.data.height + 'px';
      }
    }
  });
</script>`;
}

function generatePreviewUrl(venueSlug: string, config: any): string {
  const embedUrl = generateEmbedUrl(venueSlug, config);
  return embedUrl;
}