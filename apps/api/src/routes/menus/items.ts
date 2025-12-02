import { type FastifyInstance } from 'fastify';
import { db, menuItems, menuItemOptions, eq, and, asc, sql } from '@menucraft/database';
import { CreateItemSchema, UpdateItemSchema, ReorderItemsSchema, MoveItemSchema } from '@menucraft/shared-types';
import { validate } from '../../utils/validation.js';
import { NotFoundError } from '../../utils/errors.js';

export async function itemRoutes(app: FastifyInstance) {
  // List items for section
  app.get('/', async (request) => {
    const { orgId, sectionId } = request.params as { orgId: string; sectionId: string };

    const items = await db.query.menuItems.findMany({
      where: and(
        eq(menuItems.organizationId, orgId),
        eq(menuItems.sectionId, sectionId)
      ),
      orderBy: [asc(menuItems.sortOrder)],
      with: {
        options: {
          orderBy: [asc(menuItemOptions.sortOrder)],
        },
      },
    });

    return { success: true, data: items };
  });

  // Create item
  app.post('/', async (request) => {
    const { orgId, sectionId } = request.params as { orgId: string; sectionId: string };
    const body = validate(CreateItemSchema, request.body);

    // Get max sort order
    const maxOrderResult = await db
      .select({ maxOrder: sql<number>`COALESCE(MAX(${menuItems.sortOrder}), -1)` })
      .from(menuItems)
      .where(and(
        eq(menuItems.organizationId, orgId),
        eq(menuItems.sectionId, sectionId)
      ));

    const nextOrder = (maxOrderResult[0]?.maxOrder ?? -1) + 1;

    // Create item
    const [item] = await db
      .insert(menuItems)
      .values({
        organizationId: orgId,
        sectionId,
        name: body.name,
        description: body.description,
        priceType: body.priceType,
        priceAmount: body.priceAmount,
        dietaryTags: body.dietaryTags,
        allergens: body.allergens,
        badges: body.badges,
        imageUrl: body.imageUrl,
        isAvailable: body.isAvailable ?? true,
        sortOrder: nextOrder,
      })
      .returning();

    if (!item) {
      throw new Error('Failed to create item');
    }

    // Create options if provided
    if (body.options && body.options.length > 0) {
      await db.insert(menuItemOptions).values(
        body.options.map((opt, index) => ({
          organizationId: orgId,
          menuItemId: item.id,
          optionGroup: opt.optionGroup,
          name: opt.name,
          priceModifier: opt.priceModifier ?? 0,
          sortOrder: index,
        }))
      );
    }

    // Return item with options
    const fullItem = await db.query.menuItems.findFirst({
      where: eq(menuItems.id, item.id),
      with: {
        options: true,
      },
    });

    return { success: true, data: fullItem };
  });

  // Get item by ID
  app.get('/:itemId', async (request) => {
    const { orgId, itemId } = request.params as { orgId: string; itemId: string };

    const item = await db.query.menuItems.findFirst({
      where: and(
        eq(menuItems.id, itemId),
        eq(menuItems.organizationId, orgId)
      ),
      with: {
        options: {
          orderBy: [asc(menuItemOptions.sortOrder)],
        },
      },
    });

    if (!item) {
      throw new NotFoundError('Item');
    }

    return { success: true, data: item };
  });

  // Update item
  app.patch('/:itemId', async (request) => {
    const { orgId, itemId } = request.params as { orgId: string; itemId: string };
    const body = validate(UpdateItemSchema, request.body);

    // Extract options from body
    const { options, ...itemData } = body;

    // Update item
    const [item] = await db
      .update(menuItems)
      .set({
        ...itemData,
        updatedAt: new Date(),
      })
      .where(and(
        eq(menuItems.id, itemId),
        eq(menuItems.organizationId, orgId)
      ))
      .returning();

    if (!item) {
      throw new NotFoundError('Item');
    }

    // Update options if provided
    if (options !== undefined) {
      // Delete existing options
      await db.delete(menuItemOptions).where(eq(menuItemOptions.menuItemId, itemId));

      // Insert new options
      if (options.length > 0) {
        await db.insert(menuItemOptions).values(
          options.map((opt, index) => ({
            organizationId: orgId,
            menuItemId: itemId,
            optionGroup: opt.optionGroup,
            name: opt.name,
            priceModifier: opt.priceModifier ?? 0,
            sortOrder: index,
          }))
        );
      }
    }

    // Return item with options
    const fullItem = await db.query.menuItems.findFirst({
      where: eq(menuItems.id, item.id),
      with: {
        options: true,
      },
    });

    return { success: true, data: fullItem };
  });

  // Delete item
  app.delete('/:itemId', async (request) => {
    const { orgId, itemId } = request.params as { orgId: string; itemId: string };

    const [item] = await db
      .delete(menuItems)
      .where(and(
        eq(menuItems.id, itemId),
        eq(menuItems.organizationId, orgId)
      ))
      .returning();

    if (!item) {
      throw new NotFoundError('Item');
    }

    return { success: true, data: { deleted: true } };
  });

  // Reorder items within section
  app.patch('/reorder', async (request) => {
    const { orgId, sectionId } = request.params as { orgId: string; sectionId: string };
    const body = validate(ReorderItemsSchema, request.body);

    // Update sort order for each item
    const updates = body.itemIds.map((itemId, index) =>
      db
        .update(menuItems)
        .set({ sortOrder: index, updatedAt: new Date() })
        .where(and(
          eq(menuItems.id, itemId),
          eq(menuItems.organizationId, orgId),
          eq(menuItems.sectionId, sectionId)
        ))
    );

    await Promise.all(updates);

    // Return updated items
    const items = await db.query.menuItems.findMany({
      where: and(
        eq(menuItems.organizationId, orgId),
        eq(menuItems.sectionId, sectionId)
      ),
      orderBy: [asc(menuItems.sortOrder)],
    });

    return { success: true, data: items };
  });

  // Move item to different section
  app.post('/:itemId/move', async (request) => {
    const { orgId, itemId } = request.params as { orgId: string; itemId: string };
    const body = validate(MoveItemSchema, request.body);

    // Get max sort order in target section
    const maxOrderResult = await db
      .select({ maxOrder: sql<number>`COALESCE(MAX(${menuItems.sortOrder}), -1)` })
      .from(menuItems)
      .where(and(
        eq(menuItems.organizationId, orgId),
        eq(menuItems.sectionId, body.targetSectionId)
      ));

    const newOrder = body.sortOrder ?? ((maxOrderResult[0]?.maxOrder ?? -1) + 1);

    // Move item
    const [item] = await db
      .update(menuItems)
      .set({
        sectionId: body.targetSectionId,
        sortOrder: newOrder,
        updatedAt: new Date(),
      })
      .where(and(
        eq(menuItems.id, itemId),
        eq(menuItems.organizationId, orgId)
      ))
      .returning();

    if (!item) {
      throw new NotFoundError('Item');
    }

    return { success: true, data: item };
  });
}
