import { type FastifyInstance } from 'fastify';
import { db, venues, menus, eq, and, isNull, asc } from '@menucraft/database';

export async function seoRoutes(app: FastifyInstance) {
  // Generate robots.txt
  app.get('/robots.txt', async (request, reply) => {
    const publicUrl = process.env.PUBLIC_URL || 'http://localhost:5174';

    const robotsTxt = `# MenuCraft Robots.txt
User-agent: *
Allow: /m/
Disallow: /dashboard/
Disallow: /login
Disallow: /signup
Disallow: /api/

# Sitemap
Sitemap: ${publicUrl}/sitemap.xml
`;

    reply.type('text/plain').send(robotsTxt);
  });

  // Generate sitemap.xml
  app.get('/sitemap.xml', async (request, reply) => {
    const publicUrl = process.env.PUBLIC_URL || 'http://localhost:5174';

    // Get all venues with published menus
    const venueList = await db.query.venues.findMany({
      where: isNull(venues.deletedAt),
      columns: {
        id: true,
        slug: true,
        updatedAt: true,
      },
    });

    // Filter to venues that have published menus
    const venuesWithMenus: Array<{ slug: string; updatedAt: Date }> = [];

    for (const venue of venueList) {
      const publishedMenu = await db.query.menus.findFirst({
        where: and(
          eq(menus.venueId, venue.id),
          eq(menus.status, 'published'),
          isNull(menus.deletedAt)
        ),
        columns: {
          updatedAt: true,
        },
      });

      if (publishedMenu) {
        venuesWithMenus.push({
          slug: venue.slug,
          updatedAt: publishedMenu.updatedAt > venue.updatedAt ? publishedMenu.updatedAt : venue.updatedAt,
        });
      }
    }

    // Generate XML
    const urlEntries = venuesWithMenus
      .map(
        (venue) => `  <url>
    <loc>${publicUrl}/m/${venue.slug}</loc>
    <lastmod>${venue.updatedAt.toISOString().split('T')[0]}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>`
      )
      .join('\n');

    const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>${publicUrl}</loc>
    <changefreq>monthly</changefreq>
    <priority>1.0</priority>
  </url>
${urlEntries}
</urlset>`;

    reply.type('application/xml').send(sitemap);
  });

  // Generate sitemap index for large sites
  app.get('/sitemap-index.xml', async (request, reply) => {
    const publicUrl = process.env.PUBLIC_URL || 'http://localhost:5174';
    const apiUrl = process.env.API_URL || 'http://localhost:3000';

    const sitemapIndex = `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <sitemap>
    <loc>${apiUrl}/seo/sitemap.xml</loc>
    <lastmod>${new Date().toISOString().split('T')[0]}</lastmod>
  </sitemap>
</sitemapindex>`;

    reply.type('application/xml').send(sitemapIndex);
  });

  // OpenSearch description for browser search integration
  app.get('/opensearch.xml', async (request, reply) => {
    const publicUrl = process.env.PUBLIC_URL || 'http://localhost:5174';

    const openSearch = `<?xml version="1.0" encoding="UTF-8"?>
<OpenSearchDescription xmlns="http://a9.com/-/spec/opensearch/1.1/">
  <ShortName>MenuCraft</ShortName>
  <Description>Search restaurant menus on MenuCraft</Description>
  <InputEncoding>UTF-8</InputEncoding>
  <Url type="text/html" template="${publicUrl}/m/{searchTerms}"/>
</OpenSearchDescription>`;

    reply.type('application/xml').send(openSearch);
  });
}
