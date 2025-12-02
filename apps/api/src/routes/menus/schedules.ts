import { type FastifyInstance } from 'fastify';
import { db, menuSchedules, menus, eq, and, asc } from '@menucraft/database';
import { CreateScheduleSchema, UpdateScheduleSchema } from '@menucraft/shared-types';
import { validate } from '../../utils/validation.js';
import { NotFoundError } from '../../utils/errors.js';

export async function scheduleRoutes(app: FastifyInstance) {
  // List schedules for a menu
  app.get('/', async (request) => {
    const { orgId, menuId } = request.params as { orgId: string; menuId: string };

    const scheduleList = await db.query.menuSchedules.findMany({
      where: and(
        eq(menuSchedules.organizationId, orgId),
        eq(menuSchedules.menuId, menuId)
      ),
      orderBy: [asc(menuSchedules.priority)],
    });

    return { success: true, data: scheduleList };
  });

  // Create schedule
  app.post('/', async (request) => {
    const { orgId, menuId } = request.params as { orgId: string; menuId: string };
    const body = validate(CreateScheduleSchema, request.body);

    // Verify menu exists
    const menu = await db.query.menus.findFirst({
      where: and(
        eq(menus.id, menuId),
        eq(menus.organizationId, orgId)
      ),
    });

    if (!menu) {
      throw new NotFoundError('Menu');
    }

    const [schedule] = await db
      .insert(menuSchedules)
      .values({
        organizationId: orgId,
        menuId,
        scheduleType: body.scheduleType,
        startTime: body.startTime || null,
        endTime: body.endTime || null,
        daysOfWeek: body.daysOfWeek || null,
        startDate: body.startDate || null,
        endDate: body.endDate || null,
        priority: body.priority ?? 0,
        isActive: body.isActive ?? true,
      })
      .returning();

    return { success: true, data: schedule };
  });

  // Get single schedule
  app.get('/:scheduleId', async (request) => {
    const { orgId, menuId, scheduleId } = request.params as {
      orgId: string;
      menuId: string;
      scheduleId: string;
    };

    const schedule = await db.query.menuSchedules.findFirst({
      where: and(
        eq(menuSchedules.id, scheduleId),
        eq(menuSchedules.menuId, menuId),
        eq(menuSchedules.organizationId, orgId)
      ),
    });

    if (!schedule) {
      throw new NotFoundError('Schedule');
    }

    return { success: true, data: schedule };
  });

  // Update schedule
  app.patch('/:scheduleId', async (request) => {
    const { orgId, menuId, scheduleId } = request.params as {
      orgId: string;
      menuId: string;
      scheduleId: string;
    };
    const body = validate(UpdateScheduleSchema, request.body);

    const [schedule] = await db
      .update(menuSchedules)
      .set({
        ...body,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(menuSchedules.id, scheduleId),
          eq(menuSchedules.menuId, menuId),
          eq(menuSchedules.organizationId, orgId)
        )
      )
      .returning();

    if (!schedule) {
      throw new NotFoundError('Schedule');
    }

    return { success: true, data: schedule };
  });

  // Delete schedule
  app.delete('/:scheduleId', async (request) => {
    const { orgId, menuId, scheduleId } = request.params as {
      orgId: string;
      menuId: string;
      scheduleId: string;
    };

    const [schedule] = await db
      .delete(menuSchedules)
      .where(
        and(
          eq(menuSchedules.id, scheduleId),
          eq(menuSchedules.menuId, menuId),
          eq(menuSchedules.organizationId, orgId)
        )
      )
      .returning();

    if (!schedule) {
      throw new NotFoundError('Schedule');
    }

    return { success: true, data: { deleted: true } };
  });
}
