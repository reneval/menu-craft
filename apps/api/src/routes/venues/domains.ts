import { type FastifyInstance } from 'fastify';
import { db, customDomains, eq, and } from '@menucraft/database';
import { randomBytes } from 'crypto';
import { z } from 'zod';
import dns from 'dns/promises';

const AddDomainSchema = z.object({
  domain: z
    .string()
    .min(1)
    .max(255)
    .regex(
      /^([a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}$/,
      'Invalid domain format'
    ),
});

function generateVerificationToken(): string {
  return `menucraft-verify-${randomBytes(16).toString('hex')}`;
}

async function verifyDNS(domain: string, expectedToken: string): Promise<boolean> {
  try {
    // Check for TXT record with verification token
    const records = await dns.resolveTxt(`_menucraft.${domain}`);
    const flatRecords = records.flat();
    return flatRecords.some((record) => record.includes(expectedToken));
  } catch {
    return false;
  }
}

async function checkCNAME(domain: string): Promise<boolean> {
  try {
    // In production, check if CNAME points to our domain
    // For now, we'll just check if the domain resolves
    await dns.resolve(domain);
    return true;
  } catch {
    return false;
  }
}

export async function domainRoutes(app: FastifyInstance) {
  // Get all custom domains for a venue
  app.get('/', async (request) => {
    const { orgId, venueId } = request.params as { orgId: string; venueId: string };

    const domains = await db.query.customDomains.findMany({
      where: and(
        eq(customDomains.organizationId, orgId),
        eq(customDomains.venueId, venueId)
      ),
      orderBy: (domains, { desc }) => [desc(domains.createdAt)],
    });

    return { success: true, data: domains };
  });

  // Add a new custom domain
  app.post('/', async (request, reply) => {
    const { orgId, venueId } = request.params as { orgId: string; venueId: string };
    const body = AddDomainSchema.parse(request.body);

    // Normalize domain (lowercase, remove trailing dot)
    const normalizedDomain = body.domain.toLowerCase().replace(/\.$/, '');

    // Check if domain is already registered
    const existing = await db.query.customDomains.findFirst({
      where: eq(customDomains.domain, normalizedDomain),
    });

    if (existing) {
      return reply.status(409).send({
        success: false,
        error: 'Domain is already registered',
      });
    }

    // Generate verification token
    const verificationToken = generateVerificationToken();

    // Create the domain record
    const [domain] = await db
      .insert(customDomains)
      .values({
        organizationId: orgId,
        venueId,
        domain: normalizedDomain,
        verificationToken,
        status: 'pending',
      })
      .returning();

    return reply.status(201).send({ success: true, data: domain });
  });

  // Verify a domain
  app.post('/:domainId/verify', async (request, reply) => {
    const { orgId, venueId, domainId } = request.params as {
      orgId: string;
      venueId: string;
      domainId: string;
    };

    const domain = await db.query.customDomains.findFirst({
      where: and(
        eq(customDomains.id, domainId),
        eq(customDomains.organizationId, orgId),
        eq(customDomains.venueId, venueId)
      ),
    });

    if (!domain) {
      return reply.status(404).send({ success: false, error: 'Domain not found' });
    }

    // Update status to verifying
    await db
      .update(customDomains)
      .set({ status: 'verifying', lastCheckedAt: new Date(), updatedAt: new Date() })
      .where(eq(customDomains.id, domainId));

    // Check DNS verification
    const txtVerified = await verifyDNS(domain.domain, domain.verificationToken);
    const cnameValid = await checkCNAME(domain.domain);

    if (txtVerified && cnameValid) {
      // Mark as active
      const [updatedDomain] = await db
        .update(customDomains)
        .set({
          status: 'active',
          verifiedAt: new Date(),
          lastCheckedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(customDomains.id, domainId))
        .returning();

      return { success: true, data: updatedDomain, verified: true };
    } else {
      // Mark as pending (verification failed but can retry)
      const [updatedDomain] = await db
        .update(customDomains)
        .set({
          status: 'pending',
          lastCheckedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(customDomains.id, domainId))
        .returning();

      return {
        success: true,
        data: updatedDomain,
        verified: false,
        message: 'DNS verification failed. Please check your DNS settings.',
        checks: {
          txtRecord: txtVerified,
          cname: cnameValid,
        },
      };
    }
  });

  // Delete a domain
  app.delete('/:domainId', async (request, reply) => {
    const { orgId, venueId, domainId } = request.params as {
      orgId: string;
      venueId: string;
      domainId: string;
    };

    const domain = await db.query.customDomains.findFirst({
      where: and(
        eq(customDomains.id, domainId),
        eq(customDomains.organizationId, orgId),
        eq(customDomains.venueId, venueId)
      ),
    });

    if (!domain) {
      return reply.status(404).send({ success: false, error: 'Domain not found' });
    }

    await db.delete(customDomains).where(eq(customDomains.id, domainId));

    return { success: true };
  });
}
