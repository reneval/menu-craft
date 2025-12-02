import { type FastifyInstance } from 'fastify';
import { db, organizations, organizationUsers, users, eq, and, isNull } from '@menucraft/database';
import {
  CreateOrganizationSchema,
  UpdateOrganizationSchema,
} from '@menucraft/shared-types';
import { validate } from '../../utils/validation.js';
import { NotFoundError } from '../../utils/errors.js';

export async function organizationRoutes(app: FastifyInstance) {
  // List organizations for current user
  app.get('/', async (request) => {
    // TODO: Get user from auth
    const orgs = await db.query.organizations.findMany({
      where: isNull(organizations.deletedAt),
    });

    return { success: true, data: orgs };
  });

  // Create organization
  app.post('/', async (request) => {
    const body = validate(CreateOrganizationSchema, request.body);

    const slug = body.slug || body.name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');

    const [org] = await db
      .insert(organizations)
      .values({
        name: body.name,
        slug,
      })
      .returning();

    return { success: true, data: org };
  });

  // Get organization by ID
  app.get('/:orgId', async (request) => {
    const { orgId } = request.params as { orgId: string };

    const org = await db.query.organizations.findFirst({
      where: and(
        eq(organizations.id, orgId),
        isNull(organizations.deletedAt)
      ),
    });

    if (!org) {
      throw new NotFoundError('Organization');
    }

    return { success: true, data: org };
  });

  // Update organization
  app.patch('/:orgId', async (request) => {
    const { orgId } = request.params as { orgId: string };
    const body = validate(UpdateOrganizationSchema, request.body);

    const [org] = await db
      .update(organizations)
      .set({
        ...body,
        updatedAt: new Date(),
      })
      .where(and(
        eq(organizations.id, orgId),
        isNull(organizations.deletedAt)
      ))
      .returning();

    if (!org) {
      throw new NotFoundError('Organization');
    }

    return { success: true, data: org };
  });

  // Get organization members
  app.get('/:orgId/members', async (request) => {
    const { orgId } = request.params as { orgId: string };

    const members = await db.query.organizationUsers.findMany({
      where: and(
        eq(organizationUsers.organizationId, orgId),
        isNull(organizationUsers.deletedAt)
      ),
      with: {
        user: true,
      },
    });

    return { success: true, data: members };
  });
}
