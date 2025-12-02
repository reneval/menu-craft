import { type FastifyInstance } from 'fastify';
import { db, menus, menuSections, menuItems, venues, eq, and, isNull, asc } from '@menucraft/database';
import { z } from 'zod';
import { CreateMenuSchema, UpdateMenuSchema } from '@menucraft/shared-types';
import { validate } from '../../utils/validation.js';
import { NotFoundError, ForbiddenError } from '../../utils/errors.js';
import { sectionRoutes } from './sections.js';
import { itemRoutes } from './items.js';
import { scheduleRoutes } from './schedules.js';
import { translationRoutes } from './translations.js';
import { importRoutes } from './import.js';
import { versionRoutes } from './versions.js';
import { analyticsRoutes } from './analytics.js';
import { activityRoutes } from './activity.js';
import { canCreateMenu } from '../../lib/billing.js';
import { emitMenuCreated, emitMenuUpdated, emitMenuPublished, emitMenuDeleted } from '../../lib/webhooks.js';
import { createMenuVersion } from '../../lib/menu-versions.js';

export async function menuRoutes(app: FastifyInstance) {
  // Register nested routes
  await app.register(sectionRoutes, { prefix: '/:menuId/sections' });
  await app.register(
    async (sectionApp) => {
      await sectionApp.register(itemRoutes, { prefix: '/:sectionId/items' });
    },
    { prefix: '/:menuId/sections' }
  );
  await app.register(scheduleRoutes, { prefix: '/:menuId/schedules' });
  await app.register(translationRoutes, { prefix: '/:menuId/translations' });
  await app.register(importRoutes, { prefix: '/:menuId/import' });
  await app.register(versionRoutes, { prefix: '/:menuId/versions' });
  await app.register(analyticsRoutes, { prefix: '/:menuId/analytics' });
  await app.register(activityRoutes, { prefix: '/:menuId/activity' });

  // List menus for venue
  app.get('/', async (request) => {
    const { orgId, venueId } = request.params as { orgId: string; venueId: string };

    const menuList = await db.query.menus.findMany({
      where: and(
        eq(menus.organizationId, orgId),
        eq(menus.venueId, venueId),
        isNull(menus.deletedAt)
      ),
      orderBy: [asc(menus.sortOrder), asc(menus.name)],
    });

    return { success: true, data: menuList };
  });

  // Create menu
  app.post('/', async (request) => {
    const { orgId, venueId } = request.params as { orgId: string; venueId: string };
    const body = validate(CreateMenuSchema, request.body);

    // Check plan limits
    const { allowed, current, limit } = await canCreateMenu(orgId, venueId);
    if (!allowed) {
      throw new ForbiddenError(
        `Menu limit reached (${current}/${limit} menus for this venue). Please upgrade your plan to add more menus.`
      );
    }

    const slug = body.slug || body.name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');

    const [menu] = await db
      .insert(menus)
      .values({
        organizationId: orgId,
        venueId,
        name: body.name,
        slug,
        themeConfig: body.themeConfig || {},
      })
      .returning();

    // Emit webhook event (async, don't await)
    if (menu) {
      emitMenuCreated(orgId, menu).catch(() => {});
      // Audit log
      request.audit({
        action: 'menu.create',
        resourceType: 'menu',
        resourceId: menu.id,
        resourceName: menu.name,
      }).catch(() => {});
    }

    return { success: true, data: menu };
  });

  // Get menu by ID with sections and items
  app.get('/:menuId', async (request) => {
    const { orgId, menuId } = request.params as { orgId: string; menuId: string };

    const menu = await db.query.menus.findFirst({
      where: and(
        eq(menus.id, menuId),
        eq(menus.organizationId, orgId),
        isNull(menus.deletedAt)
      ),
      with: {
        sections: {
          orderBy: [asc(menuSections.sortOrder)],
          with: {
            items: {
              orderBy: [asc(menuItems.sortOrder)],
              with: {
                options: true,
              },
            },
          },
        },
      },
    });

    if (!menu) {
      throw new NotFoundError('Menu');
    }

    return { success: true, data: menu };
  });

  // Update menu
  app.patch('/:menuId', async (request) => {
    const { orgId, menuId } = request.params as { orgId: string; menuId: string };
    const body = validate(UpdateMenuSchema, request.body);

    const [menu] = await db
      .update(menus)
      .set({
        ...body,
        updatedAt: new Date(),
      })
      .where(and(
        eq(menus.id, menuId),
        eq(menus.organizationId, orgId),
        isNull(menus.deletedAt)
      ))
      .returning();

    if (!menu) {
      throw new NotFoundError('Menu');
    }

    // Emit webhook event (async, don't await)
    emitMenuUpdated(orgId, menu).catch(() => {});
    // Audit log
    request.audit({
      action: 'menu.update',
      resourceType: 'menu',
      resourceId: menu.id,
      resourceName: menu.name,
      metadata: { changes: Object.keys(body) },
    }).catch(() => {});

    return { success: true, data: menu };
  });

  // Publish menu
  app.post('/:menuId/publish', async (request) => {
    const { orgId, menuId } = request.params as { orgId: string; menuId: string };
    const userId = request.tenantContext?.userId;

    // Create a version before publishing
    const version = await createMenuVersion(menuId, orgId, 'publish', 'Published', userId);

    const [menu] = await db
      .update(menus)
      .set({
        status: 'published',
        updatedAt: new Date(),
      })
      .where(and(
        eq(menus.id, menuId),
        eq(menus.organizationId, orgId),
        isNull(menus.deletedAt)
      ))
      .returning();

    if (!menu) {
      throw new NotFoundError('Menu');
    }

    // Emit webhook event (async, don't await)
    emitMenuPublished(orgId, menu).catch(() => {});
    // Audit log
    request.audit({
      action: 'menu.publish',
      resourceType: 'menu',
      resourceId: menu.id,
      resourceName: menu.name,
      metadata: { version: version?.version },
    }).catch(() => {});

    return { success: true, data: { ...menu, version: version?.version } };
  });

  // Duplicate menu with all sections and items
  app.post('/:menuId/duplicate', async (request) => {
    const { orgId, venueId, menuId } = request.params as { orgId: string; venueId: string; menuId: string };

    // Get original menu with sections and items
    const originalMenu = await db.query.menus.findFirst({
      where: and(
        eq(menus.id, menuId),
        eq(menus.organizationId, orgId),
        isNull(menus.deletedAt)
      ),
      with: {
        sections: {
          orderBy: [asc(menuSections.sortOrder)],
          with: {
            items: {
              orderBy: [asc(menuItems.sortOrder)],
              with: {
                options: true,
              },
            },
          },
        },
      },
    });

    if (!originalMenu) {
      throw new NotFoundError('Menu');
    }

    // Check plan limits
    const { allowed, current, limit } = await canCreateMenu(orgId, venueId);
    if (!allowed) {
      throw new ForbiddenError(
        `Menu limit reached (${current}/${limit} menus for this venue). Please upgrade your plan to add more menus.`
      );
    }

    // Create new menu with "(Copy)" suffix
    const newSlug = `${originalMenu.slug}-copy-${Date.now()}`;
    const [newMenu] = await db
      .insert(menus)
      .values({
        organizationId: orgId,
        venueId,
        name: `${originalMenu.name} (Copy)`,
        slug: newSlug,
        status: 'draft',
        themeConfig: originalMenu.themeConfig,
      })
      .returning();

    // Copy sections and items
    for (const section of originalMenu.sections) {
      const [newSection] = await db
        .insert(menuSections)
        .values({
          organizationId: orgId,
          menuId: newMenu!.id,
          name: section.name,
          description: section.description,
          sortOrder: section.sortOrder,
        })
        .returning();

      // Copy items
      for (const item of section.items) {
        const [newItem] = await db
          .insert(menuItems)
          .values({
            organizationId: orgId,
            sectionId: newSection!.id,
            name: item.name,
            description: item.description,
            priceType: item.priceType,
            priceAmount: item.priceAmount,
            dietaryTags: item.dietaryTags,
            allergens: item.allergens,
            imageUrl: item.imageUrl,
            isAvailable: item.isAvailable,
            sortOrder: item.sortOrder,
          })
          .returning();

        // Copy options if any
        if (item.options && item.options.length > 0) {
          const { menuItemOptions } = await import('@menucraft/database');
          for (const option of item.options) {
            await db.insert(menuItemOptions).values({
              organizationId: orgId,
              menuItemId: newItem!.id,
              optionGroup: option.optionGroup,
              name: option.name,
              priceModifier: option.priceModifier,
              sortOrder: option.sortOrder,
            });
          }
        }
      }
    }

    // Audit log
    if (newMenu) {
      request.audit({
        action: 'menu.duplicate',
        resourceType: 'menu',
        resourceId: newMenu.id,
        resourceName: newMenu.name,
        metadata: { sourceMenuId: menuId, sourceMenuName: originalMenu.name },
      }).catch(() => {});
    }

    return { success: true, data: newMenu };
  });

  // Soft delete menu
  app.delete('/:menuId', async (request) => {
    const { orgId, menuId } = request.params as { orgId: string; menuId: string };

    const [menu] = await db
      .update(menus)
      .set({
        deletedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(and(
        eq(menus.id, menuId),
        eq(menus.organizationId, orgId),
        isNull(menus.deletedAt)
      ))
      .returning();

    if (!menu) {
      throw new NotFoundError('Menu');
    }

    // Emit webhook event (async, don't await)
    emitMenuDeleted(orgId, menuId).catch(() => {});
    // Audit log
    request.audit({
      action: 'menu.delete',
      resourceType: 'menu',
      resourceId: menu.id,
      resourceName: menu.name,
    }).catch(() => {});

    return { success: true, data: { deleted: true } };
  });

  // Clone menu to another venue
  const CloneToVenueSchema = z.object({
    targetVenueId: z.string().uuid(),
  });

  app.post('/:menuId/clone-to-venue', async (request) => {
    const { orgId, menuId } = request.params as { orgId: string; menuId: string };
    const body = validate(CloneToVenueSchema, request.body);

    // Get original menu with sections and items
    const originalMenu = await db.query.menus.findFirst({
      where: and(
        eq(menus.id, menuId),
        eq(menus.organizationId, orgId),
        isNull(menus.deletedAt)
      ),
      with: {
        sections: {
          orderBy: [asc(menuSections.sortOrder)],
          with: {
            items: {
              orderBy: [asc(menuItems.sortOrder)],
              with: {
                options: true,
              },
            },
          },
        },
      },
    });

    if (!originalMenu) {
      throw new NotFoundError('Menu');
    }

    // Verify target venue exists and belongs to the same organization
    const targetVenue = await db.query.venues.findFirst({
      where: and(
        eq(venues.id, body.targetVenueId),
        eq(venues.organizationId, orgId),
        isNull(venues.deletedAt)
      ),
    });

    if (!targetVenue) {
      throw new NotFoundError('Target venue');
    }

    // Check plan limits for the target venue
    const { allowed, current, limit } = await canCreateMenu(orgId, body.targetVenueId);
    if (!allowed) {
      throw new ForbiddenError(
        `Menu limit reached for target venue (${current}/${limit} menus). Please upgrade your plan to add more menus.`
      );
    }

    // Create new menu in target venue with "(Cloned)" suffix
    const newSlug = `${originalMenu.slug}-clone-${Date.now()}`;
    const [newMenu] = await db
      .insert(menus)
      .values({
        organizationId: orgId,
        venueId: body.targetVenueId,
        name: `${originalMenu.name} (Cloned)`,
        slug: newSlug,
        status: 'draft',
        themeConfig: originalMenu.themeConfig,
        defaultLanguage: originalMenu.defaultLanguage,
        enabledLanguages: originalMenu.enabledLanguages,
      })
      .returning();

    // Copy sections and items
    for (const section of originalMenu.sections) {
      const [newSection] = await db
        .insert(menuSections)
        .values({
          organizationId: orgId,
          menuId: newMenu!.id,
          name: section.name,
          description: section.description,
          sortOrder: section.sortOrder,
        })
        .returning();

      // Copy items
      for (const item of section.items) {
        const [newItem] = await db
          .insert(menuItems)
          .values({
            organizationId: orgId,
            sectionId: newSection!.id,
            name: item.name,
            description: item.description,
            priceType: item.priceType,
            priceAmount: item.priceAmount,
            dietaryTags: item.dietaryTags,
            allergens: item.allergens,
            imageUrl: item.imageUrl,
            isAvailable: item.isAvailable,
            sortOrder: item.sortOrder,
          })
          .returning();

        // Copy options if any
        if (item.options && item.options.length > 0) {
          const { menuItemOptions } = await import('@menucraft/database');
          for (const option of item.options) {
            await db.insert(menuItemOptions).values({
              organizationId: orgId,
              menuItemId: newItem!.id,
              optionGroup: option.optionGroup,
              name: option.name,
              priceModifier: option.priceModifier,
              sortOrder: option.sortOrder,
            });
          }
        }
      }
    }

    // Emit webhook event (async, don't await)
    if (newMenu) {
      emitMenuCreated(orgId, newMenu).catch(() => {});
      // Audit log
      request.audit({
        action: 'menu.clone',
        resourceType: 'menu',
        resourceId: newMenu.id,
        resourceName: newMenu.name,
        metadata: {
          sourceMenuId: menuId,
          sourceMenuName: originalMenu.name,
          targetVenueId: targetVenue.id,
          targetVenueName: targetVenue.name,
        },
      }).catch(() => {});
    }

    return {
      success: true,
      data: {
        menu: newMenu,
        targetVenue: {
          id: targetVenue.id,
          name: targetVenue.name,
          slug: targetVenue.slug,
        },
      },
    };
  });
}
