import { type FastifyInstance } from 'fastify';
import { db, venues, menus, menuSections, menuItems, menuViews, itemViews, qrCodes, menuSchedules, customDomains, translations, eq, and, isNull, asc, sql, inArray } from '@menucraft/database';
import { NotFoundError } from '../../utils/errors.js';
import { isMenuScheduleActive } from '../../lib/schedules.js';
import { getClientIP, lookupGeo } from '../../lib/geoip.js';

type TranslationMap = Record<string, { name?: string; description?: string }>;

async function fetchTranslations(
  menuId: string,
  languageCode: string
): Promise<TranslationMap> {
  // Get all sections and items for this menu
  const sections = await db.query.menuSections.findMany({
    where: eq(menuSections.menuId, menuId),
    with: { items: { with: { options: true } } },
  });

  const entityIds: string[] = [menuId];
  sections.forEach((s) => {
    entityIds.push(s.id);
    s.items.forEach((i) => {
      entityIds.push(i.id);
      i.options?.forEach((o) => entityIds.push(o.id));
    });
  });

  const translationRecords = await db.query.translations.findMany({
    where: and(
      inArray(translations.entityId, entityIds),
      eq(translations.languageCode, languageCode)
    ),
  });

  const map: TranslationMap = {};
  translationRecords.forEach((t) => {
    map[t.entityId] = t.translations as { name?: string; description?: string };
  });
  return map;
}

export async function publicRoutes(app: FastifyInstance) {
  // Get venue by slug
  app.get('/v/:venueSlug', async (request) => {
    const { venueSlug } = request.params as { venueSlug: string };

    const venue = await db.query.venues.findFirst({
      where: and(
        eq(venues.slug, venueSlug),
        isNull(venues.deletedAt)
      ),
    });

    if (!venue) {
      throw new NotFoundError('Venue');
    }

    return { success: true, data: venue };
  });

  // Get active menu for venue
  app.get('/v/:venueSlug/menu', async (request) => {
    const { venueSlug } = request.params as { venueSlug: string };
    const { lang } = request.query as { lang?: string };

    // Find venue
    const venue = await db.query.venues.findFirst({
      where: and(
        eq(venues.slug, venueSlug),
        isNull(venues.deletedAt)
      ),
    });

    if (!venue) {
      throw new NotFoundError('Venue');
    }

    // Find all published menus with their schedules
    const publishedMenus = await db.query.menus.findMany({
      where: and(
        eq(menus.venueId, venue.id),
        eq(menus.status, 'published'),
        isNull(menus.deletedAt)
      ),
      with: {
        schedules: true,
        sections: {
          where: eq(menuSections.isVisible, true),
          orderBy: [asc(menuSections.sortOrder)],
          with: {
            items: {
              where: eq(menuItems.isAvailable, true),
              orderBy: [asc(menuItems.sortOrder)],
              with: {
                options: true,
              },
            },
          },
        },
      },
      orderBy: [asc(menus.sortOrder), asc(menus.name)],
    });

    // Filter to menus with active schedules
    const now = new Date();
    const activeMenus = publishedMenus.filter(menu =>
      isMenuScheduleActive(menu.schedules, now)
    );

    // Pick the first active menu (sorted by sortOrder)
    const menu = activeMenus[0];

    if (!menu) {
      throw new NotFoundError('Menu');
    }

    // Remove schedules from response (internal data)
    const { schedules, ...menuData } = menu;

    // Fetch translations if a non-default language is requested
    const defaultLanguage = (menu as any).defaultLanguage || 'en';
    const enabledLanguages: string[] = (menu as any).enabledLanguages || ['en'];
    let translationMap: TranslationMap = {};

    if (lang && lang !== defaultLanguage && enabledLanguages.includes(lang)) {
      translationMap = await fetchTranslations(menu.id, lang);
    }

    return {
      success: true,
      data: {
        venue,
        menu: menuData,
        languages: {
          default: defaultLanguage,
          enabled: enabledLanguages,
          current: lang && enabledLanguages.includes(lang) ? lang : defaultLanguage,
        },
        translations: translationMap,
      },
    };
  });

  // QR code redirect
  app.get('/qr/:code', async (request, reply) => {
    const { code } = request.params as { code: string };

    // Look up QR code
    const qrCode = await db.query.qrCodes.findFirst({
      where: eq(qrCodes.code, code),
    });

    if (!qrCode) {
      throw new NotFoundError('QR Code');
    }

    // Update scan count asynchronously (don't await to avoid delaying redirect)
    db.update(qrCodes)
      .set({
        scanCount: sql`${qrCodes.scanCount} + 1`,
        lastScannedAt: new Date(),
      })
      .where(eq(qrCodes.id, qrCode.id))
      .catch(() => {
        // Silently fail scan tracking
      });

    // Redirect based on target type
    if (qrCode.targetType === 'venue') {
      const venue = await db.query.venues.findFirst({
        where: eq(venues.id, qrCode.targetId),
      });
      if (!venue) {
        throw new NotFoundError('Venue');
      }
      // Redirect to public menu page
      const publicUrl = process.env.PUBLIC_URL || 'http://localhost:5174';
      return reply.redirect(`${publicUrl}/${venue.slug}`);
    } else {
      // Menu - find menu and its venue
      const menu = await db.query.menus.findFirst({
        where: eq(menus.id, qrCode.targetId),
      });
      if (!menu) {
        throw new NotFoundError('Menu');
      }
      const venue = await db.query.venues.findFirst({
        where: eq(venues.id, menu.venueId),
      });
      if (!venue) {
        throw new NotFoundError('Venue');
      }
      const publicUrl = process.env.PUBLIC_URL || 'http://localhost:5174';
      return reply.redirect(`${publicUrl}/${venue.slug}`);
    }
  });

  // Get menu by custom domain
  app.get('/d/:domain', async (request) => {
    const { domain } = request.params as { domain: string };

    // Find the custom domain record
    const customDomain = await db.query.customDomains.findFirst({
      where: and(
        eq(customDomains.domain, domain),
        eq(customDomains.status, 'active')
      ),
    });

    if (!customDomain) {
      throw new NotFoundError('Domain');
    }

    // Find the venue
    const venue = await db.query.venues.findFirst({
      where: and(
        eq(venues.id, customDomain.venueId),
        isNull(venues.deletedAt)
      ),
    });

    if (!venue) {
      throw new NotFoundError('Venue');
    }

    // Find all published menus with their schedules
    const publishedMenus = await db.query.menus.findMany({
      where: and(
        eq(menus.venueId, venue.id),
        eq(menus.status, 'published'),
        isNull(menus.deletedAt)
      ),
      with: {
        schedules: true,
        sections: {
          where: eq(menuSections.isVisible, true),
          orderBy: [asc(menuSections.sortOrder)],
          with: {
            items: {
              where: eq(menuItems.isAvailable, true),
              orderBy: [asc(menuItems.sortOrder)],
              with: {
                options: true,
              },
            },
          },
        },
      },
      orderBy: [asc(menus.sortOrder), asc(menus.name)],
    });

    // Filter to menus with active schedules
    const now = new Date();
    const activeMenus = publishedMenus.filter(menu =>
      isMenuScheduleActive(menu.schedules, now)
    );

    // Pick the first active menu (sorted by sortOrder)
    const menu = activeMenus[0];

    if (!menu) {
      throw new NotFoundError('Menu');
    }

    // Remove schedules from response (internal data)
    const { schedules, ...menuData } = menu;

    return {
      success: true,
      data: {
        venue,
        menu: menuData,
        customDomain: domain,
      },
    };
  });

  // Track menu view (called from frontend)
  app.post('/v/:venueSlug/track', async (request, reply) => {
    const { venueSlug } = request.params as { venueSlug: string };
    const { menuId, sessionId, referrer, language } = request.body as {
      menuId: string;
      sessionId?: string;
      referrer?: string;
      language?: string;
    };

    // Find venue
    const venue = await db.query.venues.findFirst({
      where: and(
        eq(venues.slug, venueSlug),
        isNull(venues.deletedAt)
      ),
    });

    if (!venue) {
      // Silently fail for tracking - don't expose 404
      return { success: true };
    }

    // GeoIP lookup
    const clientIP = getClientIP(request);
    const geo = lookupGeo(clientIP);

    // Record the view
    try {
      await db.insert(menuViews).values({
        venueId: venue.id,
        menuId,
        sessionId,
        userAgent: request.headers['user-agent'] || null,
        referrer,
        // GeoIP data
        country: geo.country,
        city: geo.city,
        // Browser language
        language: language || request.headers['accept-language']?.split(',')[0]?.split('-')[0] || null,
      });
    } catch {
      // Silently fail for tracking errors
    }

    return { success: true };
  });

  // Track item views (batch - called from frontend with Intersection Observer)
  app.post('/v/:venueSlug/track-items', async (request) => {
    const { venueSlug } = request.params as { venueSlug: string };
    const { menuId, sessionId, items } = request.body as {
      menuId: string;
      sessionId?: string;
      items: Array<{ itemId: string; durationMs?: number }>;
    };

    if (!items || items.length === 0) {
      return { success: true };
    }

    // Find venue
    const venue = await db.query.venues.findFirst({
      where: and(
        eq(venues.slug, venueSlug),
        isNull(venues.deletedAt)
      ),
    });

    if (!venue) {
      // Silently fail for tracking - don't expose 404
      return { success: true };
    }

    // Record the item views (batch insert)
    try {
      const viewRecords = items.map((item) => ({
        venueId: venue.id,
        menuId,
        itemId: item.itemId,
        sessionId,
        durationMs: item.durationMs,
      }));

      await db.insert(itemViews).values(viewRecords);
    } catch {
      // Silently fail for tracking errors
    }

    return { success: true };
  });
}
