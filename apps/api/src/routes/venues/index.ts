import { type FastifyInstance } from 'fastify';
import { db, venues, organizations, eq, and, isNull } from '@menucraft/database';
import { CreateVenueSchema, UpdateVenueSchema } from '@menucraft/shared-types';
import { validate } from '../../utils/validation.js';
import { NotFoundError, ForbiddenError } from '../../utils/errors.js';
import { canCreateVenue } from '../../lib/billing.js';
import { domainRoutes } from './domains.js';
import { emitVenueCreated, emitVenueUpdated, emitVenueDeleted } from '../../lib/webhooks.js';
import { startTrial } from '../../lib/trial.js';

// Ensure organization exists, create if not (with 30-day trial)
async function ensureOrganization(orgId: string): Promise<boolean> {
  const existing = await db.query.organizations.findFirst({
    where: eq(organizations.id, orgId),
  });

  if (!existing) {
    await db
      .insert(organizations)
      .values({
        id: orgId,
        name: 'My Organization',
        slug: `org-${orgId.slice(0, 8)}`,
      })
      .onConflictDoNothing();

    // Start 30-day trial for new organizations
    await startTrial(orgId);
    return true; // New org created
  }
  return false; // Existing org
}

export async function venueRoutes(app: FastifyInstance) {
  // List venues for organization
  app.get('/', async (request) => {
    const { orgId } = request.params as { orgId: string };

    const venueList = await db.query.venues.findMany({
      where: and(
        eq(venues.organizationId, orgId),
        isNull(venues.deletedAt)
      ),
      orderBy: (venues, { asc }) => [asc(venues.name)],
    });

    return { success: true, data: venueList };
  });

  // Create venue
  app.post('/', async (request) => {
    const { orgId } = request.params as { orgId: string };
    const body = validate(CreateVenueSchema, request.body);

    // Auto-create organization if it doesn't exist
    await ensureOrganization(orgId);

    // Check plan limits
    const { allowed, current, limit } = await canCreateVenue(orgId);
    if (!allowed) {
      throw new ForbiddenError(
        `Venue limit reached (${current}/${limit}). Please upgrade your plan to add more venues.`
      );
    }

    const slug = body.slug || body.name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');

    const [venue] = await db
      .insert(venues)
      .values({
        organizationId: orgId,
        name: body.name,
        slug,
        timezone: body.timezone || 'UTC',
        address: body.address || {},
        phone: body.phone,
        website: body.website,
        openingHours: body.openingHours,
      })
      .returning();

    // Emit webhook event (async, don't await)
    if (venue) {
      emitVenueCreated(orgId, venue).catch(() => {});
    }

    return { success: true, data: venue };
  });

  // Get venue by ID
  app.get('/:venueId', async (request) => {
    const { orgId, venueId } = request.params as { orgId: string; venueId: string };

    const venue = await db.query.venues.findFirst({
      where: and(
        eq(venues.id, venueId),
        eq(venues.organizationId, orgId),
        isNull(venues.deletedAt)
      ),
    });

    if (!venue) {
      throw new NotFoundError('Venue');
    }

    return { success: true, data: venue };
  });

  // Update venue
  app.patch('/:venueId', async (request) => {
    const { orgId, venueId } = request.params as { orgId: string; venueId: string };
    const body = validate(UpdateVenueSchema, request.body);

    const [venue] = await db
      .update(venues)
      .set({
        ...body,
        updatedAt: new Date(),
      })
      .where(and(
        eq(venues.id, venueId),
        eq(venues.organizationId, orgId),
        isNull(venues.deletedAt)
      ))
      .returning();

    if (!venue) {
      throw new NotFoundError('Venue');
    }

    // Emit webhook event (async, don't await)
    emitVenueUpdated(orgId, venue).catch(() => {});

    return { success: true, data: venue };
  });

  // Soft delete venue
  app.delete('/:venueId', async (request) => {
    const { orgId, venueId } = request.params as { orgId: string; venueId: string };

    const [venue] = await db
      .update(venues)
      .set({
        deletedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(and(
        eq(venues.id, venueId),
        eq(venues.organizationId, orgId),
        isNull(venues.deletedAt)
      ))
      .returning();

    if (!venue) {
      throw new NotFoundError('Venue');
    }

    // Emit webhook event (async, don't await)
    emitVenueDeleted(orgId, venueId).catch(() => {});

    return { success: true, data: { deleted: true } };
  });

  // Register domain routes under venue
  await app.register(domainRoutes, { prefix: '/:venueId/domains' });
}
