import { type FastifyInstance } from 'fastify';
import { db, organizations, organizationUsers, users, eq, and, isNull } from '@menucraft/database';
import {
  CreateOrganizationSchema,
  UpdateOrganizationSchema,
} from '@menucraft/shared-types';
import { validate } from '../../utils/validation.js';
import { NotFoundError } from '../../utils/errors.js';
import { requireAuth, requireOrgContext } from '../../plugins/auth.js';

export async function organizationRoutes(app: FastifyInstance) {
  // List organizations for current user
  app.get('/', { preHandler: requireAuth }, async (request) => {
    const userId = request.auth!.userId;

    // Get organizations where user is a member
    const memberOrgs = await db.query.organizationUsers.findMany({
      where: and(
        eq(organizationUsers.userId, userId),
        isNull(organizationUsers.deletedAt)
      ),
      with: {
        organization: true,
      },
    });

    const orgs = memberOrgs.map(m => m.organization).filter(org => !org.deletedAt);

    return { success: true, data: orgs };
  });

  // Create organization
  app.post('/', { preHandler: requireAuth }, async (request) => {
    const userId = request.auth!.userId;
    const body = validate(CreateOrganizationSchema, request.body);

    const slug = body.slug || body.name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');

    const [org] = await db
      .insert(organizations)
      .values({
        name: body.name,
        slug,
      })
      .returning();

    if (!org) {
      throw new Error('Failed to create organization');
    }

    // Add the creator as owner
    await db
      .insert(organizationUsers)
      .values({
        organizationId: org.id,
        userId,
        role: 'owner',
      });

    return { success: true, data: org };
  });

  // Get organization by ID
  app.get('/:orgId', { preHandler: requireOrgContext }, async (request) => {
    const { organizationId } = request.tenantContext!;

    // Since RLS is active, we can query directly - RLS will filter to this org
    const org = await db.query.organizations.findFirst({
      where: and(
        eq(organizations.id, organizationId),
        isNull(organizations.deletedAt)
      ),
    });

    if (!org) {
      throw new NotFoundError('Organization');
    }

    return { success: true, data: org };
  });

  // Update organization
  app.patch('/:orgId', { preHandler: requireOrgContext }, async (request) => {
    const { organizationId } = request.tenantContext!;
    const body = validate(UpdateOrganizationSchema, request.body);

    const [org] = await db
      .update(organizations)
      .set({
        ...body,
        updatedAt: new Date(),
      })
      .where(and(
        eq(organizations.id, organizationId),
        isNull(organizations.deletedAt)
      ))
      .returning();

    if (!org) {
      throw new NotFoundError('Organization');
    }

    return { success: true, data: org };
  });

  // Get organization members
  app.get('/:orgId/members', { preHandler: requireOrgContext }, async (request) => {
    const { organizationId } = request.tenantContext!;

    // RLS will automatically filter to this organization
    const members = await db.query.organizationUsers.findMany({
      where: and(
        eq(organizationUsers.organizationId, organizationId),
        isNull(organizationUsers.deletedAt)
      ),
      with: {
        user: true,
      },
    });

    return { success: true, data: members };
  });
}
