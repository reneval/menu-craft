import { type FastifyInstance } from 'fastify';
import { db, menuSections, menuItems, eq, and, asc, sql } from '@menucraft/database';
import { CreateSectionSchema, UpdateSectionSchema, ReorderSectionsSchema } from '@menucraft/shared-types';
import { validate } from '../../utils/validation.js';
import { NotFoundError } from '../../utils/errors.js';

export async function sectionRoutes(app: FastifyInstance) {
  // List sections for menu
  app.get('/', async (request) => {
    const { orgId, menuId } = request.params as { orgId: string; menuId: string };

    const sections = await db.query.menuSections.findMany({
      where: and(
        eq(menuSections.organizationId, orgId),
        eq(menuSections.menuId, menuId)
      ),
      orderBy: [asc(menuSections.sortOrder)],
      with: {
        items: {
          orderBy: [asc(menuItems.sortOrder)],
          with: {
            options: true,
          },
        },
      },
    });

    return { success: true, data: sections };
  });

  // Create section
  app.post('/', async (request) => {
    const { orgId, menuId } = request.params as { orgId: string; menuId: string };
    const body = validate(CreateSectionSchema, request.body);

    // Get max sort order
    const maxOrderResult = await db
      .select({ maxOrder: sql<number>`COALESCE(MAX(${menuSections.sortOrder}), -1)` })
      .from(menuSections)
      .where(and(
        eq(menuSections.organizationId, orgId),
        eq(menuSections.menuId, menuId)
      ));

    const nextOrder = (maxOrderResult[0]?.maxOrder ?? -1) + 1;

    const [section] = await db
      .insert(menuSections)
      .values({
        organizationId: orgId,
        menuId,
        name: body.name,
        description: body.description,
        isVisible: body.isVisible ?? true,
        sortOrder: nextOrder,
      })
      .returning();

    return { success: true, data: section };
  });

  // Get section by ID
  app.get('/:sectionId', async (request) => {
    const { orgId, sectionId } = request.params as { orgId: string; sectionId: string };

    const section = await db.query.menuSections.findFirst({
      where: and(
        eq(menuSections.id, sectionId),
        eq(menuSections.organizationId, orgId)
      ),
      with: {
        items: {
          orderBy: [asc(menuItems.sortOrder)],
          with: {
            options: true,
          },
        },
      },
    });

    if (!section) {
      throw new NotFoundError('Section');
    }

    return { success: true, data: section };
  });

  // Update section
  app.patch('/:sectionId', async (request) => {
    const { orgId, sectionId } = request.params as { orgId: string; sectionId: string };
    const body = validate(UpdateSectionSchema, request.body);

    const [section] = await db
      .update(menuSections)
      .set({
        ...body,
        updatedAt: new Date(),
      })
      .where(and(
        eq(menuSections.id, sectionId),
        eq(menuSections.organizationId, orgId)
      ))
      .returning();

    if (!section) {
      throw new NotFoundError('Section');
    }

    return { success: true, data: section };
  });

  // Delete section
  app.delete('/:sectionId', async (request) => {
    const { orgId, sectionId } = request.params as { orgId: string; sectionId: string };

    const [section] = await db
      .delete(menuSections)
      .where(and(
        eq(menuSections.id, sectionId),
        eq(menuSections.organizationId, orgId)
      ))
      .returning();

    if (!section) {
      throw new NotFoundError('Section');
    }

    return { success: true, data: { deleted: true } };
  });

  // Reorder sections
  app.patch('/reorder', async (request) => {
    const { orgId, menuId } = request.params as { orgId: string; menuId: string };
    const body = validate(ReorderSectionsSchema, request.body);

    // Update sort order for each section
    const updates = body.sectionIds.map((sectionId, index) =>
      db
        .update(menuSections)
        .set({ sortOrder: index, updatedAt: new Date() })
        .where(and(
          eq(menuSections.id, sectionId),
          eq(menuSections.organizationId, orgId),
          eq(menuSections.menuId, menuId)
        ))
    );

    await Promise.all(updates);

    // Return updated sections
    const sections = await db.query.menuSections.findMany({
      where: and(
        eq(menuSections.organizationId, orgId),
        eq(menuSections.menuId, menuId)
      ),
      orderBy: [asc(menuSections.sortOrder)],
    });

    return { success: true, data: sections };
  });
}
