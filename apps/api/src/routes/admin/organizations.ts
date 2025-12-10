import { type FastifyInstance } from 'fastify';
import { db, organizations, venues, menus, subscriptions, organizationUsers, eq, desc, sql, isNull, count } from '@menucraft/database';
import { requireSuperAdminPermission } from '../../plugins/super-admin.js';
import { extendTrial } from '../../lib/trial.js';
import { addCredit } from '../../lib/referrals.js';
import { z } from 'zod';
import jwt from 'jsonwebtoken';
import { env } from '../../config/env.js';

const extendTrialSchema = z.object({
  days: z.number().min(1).max(365),
  reason: z.string().optional(),
});

const addCreditSchema = z.object({
  amountCents: z.number().min(1),
  reason: z.string().min(1),
});

export async function organizationsRoutes(app: FastifyInstance) {
  // List all organizations with stats
  app.get('/', async (request) => {
    const { page = 1, limit = 20 } = request.query as { page?: number; limit?: number };
    const offset = (page - 1) * limit;

    const orgs = await db.query.organizations.findMany({
      limit,
      offset,
      orderBy: [desc(organizations.createdAt)],
      with: {
        subscriptions: {
          with: {
            plan: true,
          },
        },
      },
    });

    // Get counts
    const [totalCount] = await db.select({ count: count() }).from(organizations);

    return {
      success: true,
      data: {
        organizations: orgs,
        pagination: {
          page,
          limit,
          total: totalCount?.count ?? 0,
          totalPages: Math.ceil((totalCount?.count ?? 0) / limit),
        },
      },
    };
  });

  // Get organization details
  app.get('/:orgId', async (request) => {
    const { orgId } = request.params as { orgId: string };

    const org = await db.query.organizations.findFirst({
      where: eq(organizations.id, orgId),
      with: {
        venues: true,
        subscriptions: {
          with: {
            plan: true,
          },
        },
      },
    });

    if (!org) {
      return { success: false, error: { code: 'NOT_FOUND', message: 'Organization not found' } };
    }

    // Get member count
    const [memberCount] = await db
      .select({ count: count() })
      .from(organizationUsers)
      .where(eq(organizationUsers.organizationId, orgId));

    // Get menu count
    const [menuCount] = await db
      .select({ count: count() })
      .from(menus)
      .innerJoin(venues, eq(menus.venueId, venues.id))
      .where(eq(venues.organizationId, orgId));

    return {
      success: true,
      data: {
        ...org,
        stats: {
          members: memberCount?.count ?? 0,
          venues: org.venues.length,
          menus: menuCount?.count ?? 0,
        },
      },
    };
  });

  // Suspend/unsuspend organization
  app.post(
    '/:orgId/suspend',
    { preHandler: requireSuperAdminPermission('canManageOrganizations') },
    async (request) => {
      const { orgId } = request.params as { orgId: string };
      const { reason } = request.body as { reason?: string };

      await db
        .update(organizations)
        .set({
          deletedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(organizations.id, orgId));

      // Log audit
      await request.audit({
        action: 'organization.delete',
        resourceType: 'organization',
        resourceId: orgId,
        metadata: { reason, action: 'suspended' },
      });

      return { success: true, message: 'Organization suspended' };
    }
  );

  app.post(
    '/:orgId/unsuspend',
    { preHandler: requireSuperAdminPermission('canManageOrganizations') },
    async (request) => {
      const { orgId } = request.params as { orgId: string };

      await db
        .update(organizations)
        .set({
          deletedAt: null,
          updatedAt: new Date(),
        })
        .where(eq(organizations.id, orgId));

      await request.audit({
        action: 'organization.update',
        resourceType: 'organization',
        resourceId: orgId,
        metadata: { action: 'unsuspended' },
      });

      return { success: true, message: 'Organization unsuspended' };
    }
  );

  // Extend organization trial
  app.post(
    '/:orgId/extend-trial',
    { preHandler: requireSuperAdminPermission('canManageOrganizations') },
    async (request) => {
      const { orgId } = request.params as { orgId: string };
      const body = extendTrialSchema.parse(request.body);
      const adminId = request.auth?.userId;

      const newEndDate = await extendTrial(orgId, body.days, adminId);

      await request.audit({
        action: 'organization.update',
        resourceType: 'organization',
        resourceId: orgId,
        metadata: {
          action: 'trial_extended',
          days: body.days,
          reason: body.reason,
          newEndDate: newEndDate.toISOString(),
        },
      });

      return {
        success: true,
        data: {
          message: `Trial extended by ${body.days} days`,
          newEndDate,
        },
      };
    }
  );

  // Add credit to organization
  app.post(
    '/:orgId/add-credit',
    { preHandler: requireSuperAdminPermission('canManageOrganizations') },
    async (request) => {
      const { orgId } = request.params as { orgId: string };
      const body = addCreditSchema.parse(request.body);

      await addCredit(orgId, body.amountCents, body.reason);

      await request.audit({
        action: 'organization.update',
        resourceType: 'organization',
        resourceId: orgId,
        metadata: {
          action: 'credit_added',
          amountCents: body.amountCents,
          reason: body.reason,
        },
      });

      return {
        success: true,
        data: {
          message: `Added €${(body.amountCents / 100).toFixed(2)} credit`,
          amountCents: body.amountCents,
        },
      };
    }
  );

  // Impersonate organization (generate temporary login token)
  app.post(
    '/:orgId/impersonate',
    { preHandler: requireSuperAdminPermission('canManageOrganizations') },
    async (request) => {
      const { orgId } = request.params as { orgId: string };
      const adminId = request.auth?.userId;

      // Verify organization exists
      const org = await db.query.organizations.findFirst({
        where: eq(organizations.id, orgId),
      });

      if (!org) {
        return { success: false, error: { code: 'NOT_FOUND', message: 'Organization not found' } };
      }

      // Generate a temporary token valid for 1 hour
      const token = jwt.sign(
        {
          type: 'impersonation',
          orgId,
          adminId,
          orgName: org.name,
        },
        env.JWT_SECRET,
        { expiresIn: '1h' }
      );

      await request.audit({
        action: 'organization.update',
        resourceType: 'organization',
        resourceId: orgId,
        metadata: {
          action: 'impersonation_started',
          adminId,
        },
      });

      return {
        success: true,
        data: {
          token,
          expiresIn: 3600, // 1 hour in seconds
          organization: {
            id: org.id,
            name: org.name,
          },
        },
      };
    }
  );
}
