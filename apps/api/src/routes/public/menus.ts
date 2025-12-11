/**
 * Public menu routes - no authentication required
 */

import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { db, eq, and, isNull, asc, desc } from '@menucraft/database';
import { menus, menuSections, menuItems, menuItemOptions, venues, menuSchedules } from '@menucraft/database/schema';
import { NotFoundError } from '../../utils/errors.js';

const VenueSlugParamsSchema = z.object({
  venueSlug: z.string().min(1),
});

const MenuQuerySchema = z.object({
  lang: z.string().length(2).optional(),
  timezone: z.string().optional(),
});

export async function publicMenuRoutes(fastify: FastifyInstance) {

  // Get venue info by slug
  fastify.get<{
    Params: z.infer<typeof VenueSlugParamsSchema>;
  }>('/v/:venueSlug', {
    schema: {
      params: VenueSlugParamsSchema,
    },
  }, async (request, reply) => {
    const { venueSlug } = request.params;

    try {
      const venue = await db.query.venues.findFirst({
        where: and(
          eq(venues.slug, venueSlug),
          isNull(venues.deletedAt)
        ),
        columns: {
          id: true,
          name: true,
          slug: true,
          timezone: true,
          logoUrl: true,
          phone: true,
          website: true,
          address: true,
          openingHours: true,
        },
      });

      if (!venue) {
        throw new NotFoundError('Venue');
      }

      return reply.send({
        success: true,
        data: venue,
      });

    } catch (error) {
      if (error instanceof NotFoundError) {
        return reply.code(404).send({
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'Venue not found',
          },
        });
      }

      console.error('Public venue error:', error);
      return reply.code(500).send({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Internal server error',
        },
      });
    }
  });

  // Get active menu for venue (respects schedules)
  fastify.get<{
    Params: z.infer<typeof VenueSlugParamsSchema>;
    Querystring: z.infer<typeof MenuQuerySchema>;
  }>('/v/:venueSlug/menu', {
    schema: {
      params: VenueSlugParamsSchema,
      querystring: MenuQuerySchema,
    },
  }, async (request, reply) => {
    const { venueSlug } = request.params;
    const { lang = 'en', timezone } = request.query;

    try {
      // First get the venue
      const venue = await db.query.venues.findFirst({
        where: and(
          eq(venues.slug, venueSlug),
          isNull(venues.deletedAt)
        ),
      });

      if (!venue) {
        throw new NotFoundError('Venue');
      }

      // Get the active menu based on current time and schedules
      const activeMenu = await getActiveMenuForVenue(venue.id, timezone || venue.timezone);

      if (!activeMenu) {
        return reply.send({
          success: true,
          data: null,
          message: 'No active menu found for this venue',
        });
      }

      // Get the complete menu with sections and items
      const menuWithContent = await db.query.menus.findFirst({
        where: eq(menus.id, activeMenu.id),
        with: {
          sections: {
            where: eq(menuSections.isVisible, true),
            orderBy: [asc(menuSections.sortOrder), asc(menuSections.name)],
            with: {
              items: {
                where: eq(menuItems.isAvailable, true),
                orderBy: [asc(menuItems.sortOrder), asc(menuItems.name)],
                with: {
                  options: {
                    orderBy: [asc(menuItemOptions.optionGroup), asc(menuItemOptions.sortOrder)],
                  },
                },
              },
            },
          },
        },
      });

      if (!menuWithContent) {
        throw new NotFoundError('Menu');
      }

      // TODO: Apply translations based on lang parameter
      // For now, return the menu in default language

      const response = {
        venue: {
          id: venue.id,
          name: venue.name,
          slug: venue.slug,
          logoUrl: venue.logoUrl,
          timezone: venue.timezone,
          // Contact info for Call/Directions buttons
          phone: venue.phone,
          website: venue.website,
          address: venue.address,
          openingHours: venue.openingHours,
        },
        menu: {
          id: menuWithContent.id,
          name: menuWithContent.name,
          themeConfig: menuWithContent.themeConfig,
          sections: menuWithContent.sections.map(section => ({
            id: section.id,
            name: section.name,
            description: section.description,
            items: section.items.map(item => ({
              id: item.id,
              name: item.name,
              description: item.description,
              priceType: item.priceType,
              priceAmount: item.priceAmount,
              dietaryTags: item.dietaryTags,
              allergens: item.allergens,
              badges: item.badges,
              imageUrl: item.imageUrl,
              options: groupItemOptions(item.options),
            })),
          })),
        },
        meta: {
          language: lang,
          generatedAt: new Date().toISOString(),
        },
      };

      return reply.send({
        success: true,
        data: response,
      });

    } catch (error) {
      if (error instanceof NotFoundError) {
        return reply.code(404).send({
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'Venue or menu not found',
          },
        });
      }

      console.error('Public menu error:', error);
      return reply.code(500).send({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Internal server error',
        },
      });
    }
  });

  // QR code redirect endpoint
  fastify.get<{
    Params: { code: string };
  }>('/qr/:code', {
    schema: {
      params: z.object({
        code: z.string().min(1),
      }),
    },
  }, async (request, reply) => {
    const { code } = request.params;

    try {
      // TODO: Look up QR code and get target URL
      // For now, we'll implement a simple redirect

      // Update scan count
      // await updateQRScanCount(code, request.ip, request.headers['user-agent']);

      // For MVP, assume code format is venue-slug
      const redirectUrl = `/v/${code}`;

      return reply.redirect(redirectUrl, 302);

    } catch (error) {
      console.error('QR redirect error:', error);
      return reply.code(404).send({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'QR code not found',
        },
      });
    }
  });
}

/**
 * Get the active menu for a venue based on current time and schedules
 */
async function getActiveMenuForVenue(venueId: string, timezone: string = 'UTC'): Promise<{ id: string } | null> {
  const now = new Date();

  // For MVP, we'll use a simple approach:
  // 1. Look for published menus for this venue
  // 2. Check if any have active schedules
  // 3. Return the highest priority one, or the most recently updated if no schedules

  const publishedMenus = await db.query.menus.findMany({
    where: and(
      eq(menus.venueId, venueId),
      eq(menus.status, 'published'),
      isNull(menus.deletedAt)
    ),
    orderBy: [desc(menus.updatedAt)],
    with: {
      schedules: {
        where: eq(menuSchedules.isActive, true),
        orderBy: [desc(menuSchedules.priority)],
      },
    },
  });

  if (publishedMenus.length === 0) {
    return null;
  }

  // TODO: Implement sophisticated schedule evaluation
  // For now, return the first published menu
  const firstMenu = publishedMenus[0];
  return firstMenu ? { id: firstMenu.id } : null;
}

/**
 * Group item options by option group
 */
function groupItemOptions(options: Array<{
  id: string;
  optionGroup: string;
  name: string;
  priceModifier: number;
  sortOrder: number;
}>) {
  const grouped = options.reduce((acc, option) => {
    if (!acc[option.optionGroup]) {
      acc[option.optionGroup] = [];
    }
    acc[option.optionGroup]!.push({
      id: option.id,
      name: option.name,
      priceModifier: option.priceModifier,
    });
    return acc;
  }, {} as Record<string, Array<{
    id: string;
    name: string;
    priceModifier: number;
  }>>);

  return Object.entries(grouped).map(([groupName, groupOptions]) => ({
    group: groupName,
    options: groupOptions,
  }));
}