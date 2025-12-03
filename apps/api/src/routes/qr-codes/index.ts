import { type FastifyInstance } from 'fastify';
import { db, qrCodes, venues, menus, eq, and } from '@menucraft/database';
import { z } from 'zod';
import { randomBytes } from 'crypto';
import { NotFoundError } from '../../utils/errors.js';
import { qrService, type QRCodeOptions } from '../../lib/qr-service.js';

// Generate a unique 8-character alphanumeric code
function generateCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
  const bytes = randomBytes(8);
  let code = '';
  for (let i = 0; i < 8; i++) {
    code += chars[bytes[i]! % chars.length];
  }
  return code;
}

const qrCodeOptionsSchema = z.object({
  size: z.number().min(100).max(2000).optional(),
  errorCorrectionLevel: z.enum(['L', 'M', 'Q', 'H']).optional(),
  margin: z.number().min(0).max(20).optional(),
  color: z.object({
    dark: z.string().optional(),
    light: z.string().optional(),
  }).optional(),
  logo: z.object({
    url: z.string().url(),
    size: z.number().min(20).max(200),
    borderRadius: z.number().min(0).max(50).optional(),
  }).optional(),
}).optional();

const createQrCodeSchema = z.object({
  name: z.string().min(1).max(100),
  targetType: z.enum(['venue', 'menu']),
  targetId: z.string().uuid(),
  options: qrCodeOptionsSchema.default({}),
});

const updateQrCodeSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  options: qrCodeOptionsSchema.optional(),
});

export async function qrCodeRoutes(app: FastifyInstance) {
  // List QR codes for organization
  app.get('/', async (request) => {
    const { orgId } = request.params as { orgId: string };

    const codes = await db.query.qrCodes.findMany({
      where: eq(qrCodes.organizationId, orgId),
      orderBy: (qrCodes, { desc }) => [desc(qrCodes.createdAt)],
    });

    // Enrich with target names
    const enrichedCodes = await Promise.all(
      codes.map(async (code) => {
        let targetName = '';
        if (code.targetType === 'venue') {
          const venue = await db.query.venues.findFirst({
            where: eq(venues.id, code.targetId),
          });
          targetName = venue?.name || 'Unknown Venue';
        } else {
          const menu = await db.query.menus.findFirst({
            where: eq(menus.id, code.targetId),
          });
          targetName = menu?.name || 'Unknown Menu';
        }
        return {
          ...code,
          targetName,
        };
      })
    );

    return { success: true, data: enrichedCodes };
  });

  // Get single QR code
  app.get('/:id', async (request) => {
    const { orgId, id } = request.params as { orgId: string; id: string };

    const code = await db.query.qrCodes.findFirst({
      where: and(eq(qrCodes.id, id), eq(qrCodes.organizationId, orgId)),
    });

    if (!code) {
      throw new NotFoundError('QR Code');
    }

    // Get target name
    let targetName = '';
    if (code.targetType === 'venue') {
      const venue = await db.query.venues.findFirst({
        where: eq(venues.id, code.targetId),
      });
      targetName = venue?.name || 'Unknown Venue';
    } else {
      const menu = await db.query.menus.findFirst({
        where: eq(menus.id, code.targetId),
      });
      targetName = menu?.name || 'Unknown Menu';
    }

    return { success: true, data: { ...code, targetName } };
  });

  // Create QR code
  app.post('/', async (request) => {
    const { orgId } = request.params as { orgId: string };
    const body = createQrCodeSchema.parse(request.body);

    // Validate QR code options
    if (body.options) {
      const validation = qrService.validateQRCodeOptions(body.options as QRCodeOptions);
      if (!validation.valid) {
        throw new Error(`Invalid QR options: ${validation.errors.join(', ')}`);
      }
    }

    // Validate target exists
    if (body.targetType === 'venue') {
      const venue = await db.query.venues.findFirst({
        where: and(eq(venues.id, body.targetId), eq(venues.organizationId, orgId)),
      });
      if (!venue) {
        throw new NotFoundError('Venue');
      }
    } else {
      const menu = await db.query.menus.findFirst({
        where: eq(menus.id, body.targetId),
      });
      if (!menu) {
        throw new NotFoundError('Menu');
      }
      // Verify menu belongs to a venue in this org
      const venue = await db.query.venues.findFirst({
        where: and(eq(venues.id, menu.venueId), eq(venues.organizationId, orgId)),
      });
      if (!venue) {
        throw new NotFoundError('Venue');
      }
    }

    // Generate unique code (retry if collision)
    let code = generateCode();
    let attempts = 0;
    while (attempts < 5) {
      const existing = await db.query.qrCodes.findFirst({
        where: eq(qrCodes.code, code),
      });
      if (!existing) break;
      code = generateCode();
      attempts++;
    }

    const [newCode] = await db
      .insert(qrCodes)
      .values({
        organizationId: orgId,
        name: body.name,
        targetType: body.targetType,
        targetId: body.targetId,
        options: body.options || {},
        code,
      })
      .returning();

    return { success: true, data: newCode };
  });

  // Update QR code
  app.put('/:id', async (request) => {
    const { orgId, id } = request.params as { orgId: string; id: string };
    const body = updateQrCodeSchema.parse(request.body);

    // Validate QR code options
    if (body.options) {
      const validation = qrService.validateQRCodeOptions(body.options as QRCodeOptions);
      if (!validation.valid) {
        throw new Error(`Invalid QR options: ${validation.errors.join(', ')}`);
      }
    }

    const code = await db.query.qrCodes.findFirst({
      where: and(eq(qrCodes.id, id), eq(qrCodes.organizationId, orgId)),
    });

    if (!code) {
      throw new NotFoundError('QR Code');
    }

    const updateData: any = { updatedAt: new Date() };
    if (body.name !== undefined) updateData.name = body.name;
    if (body.options !== undefined) updateData.options = body.options;

    const [updatedCode] = await db
      .update(qrCodes)
      .set(updateData)
      .where(eq(qrCodes.id, id))
      .returning();

    return { success: true, data: updatedCode };
  });

  // Generate QR code image
  app.get('/:id/image', async (request, reply) => {
    const { orgId, id } = request.params as { orgId: string; id: string };

    const code = await db.query.qrCodes.findFirst({
      where: and(eq(qrCodes.id, id), eq(qrCodes.organizationId, orgId)),
    });

    if (!code) {
      throw new NotFoundError('QR Code');
    }

    // Get the target information to generate URL
    let targetUrl: string;
    let venue: any;

    if (code.targetType === 'venue') {
      venue = await db.query.venues.findFirst({
        where: eq(venues.id, code.targetId),
      });
      if (!venue) {
        throw new NotFoundError('Venue');
      }
      targetUrl = qrService.generateMenuUrl('localhost:5174', venue.slug);
    } else {
      const menu = await db.query.menus.findFirst({
        where: eq(menus.id, code.targetId),
      });
      if (!menu) {
        throw new NotFoundError('Menu');
      }
      venue = await db.query.venues.findFirst({
        where: eq(venues.id, menu.venueId),
      });
      if (!venue) {
        throw new NotFoundError('Venue');
      }
      targetUrl = qrService.generateMenuUrl('localhost:5174', venue.slug, menu.id);
    }

    const qrOptions = (code.options as QRCodeOptions) || {};
    const qrImage = await qrService.generateQRCode(targetUrl, qrOptions);

    reply
      .type('image/png')
      .header('Content-Disposition', `inline; filename="${qrService.getQRCodeFileName(code.name)}"`)
      .send(qrImage);
  });

  // Download QR code image
  app.get('/:id/download', async (request, reply) => {
    const { orgId, id } = request.params as { orgId: string; id: string };

    const code = await db.query.qrCodes.findFirst({
      where: and(eq(qrCodes.id, id), eq(qrCodes.organizationId, orgId)),
    });

    if (!code) {
      throw new NotFoundError('QR Code');
    }

    // Get the target information to generate URL
    let targetUrl: string;
    let venue: any;

    if (code.targetType === 'venue') {
      venue = await db.query.venues.findFirst({
        where: eq(venues.id, code.targetId),
      });
      if (!venue) {
        throw new NotFoundError('Venue');
      }
      targetUrl = qrService.generateMenuUrl('localhost:5174', venue.slug);
    } else {
      const menu = await db.query.menus.findFirst({
        where: eq(menus.id, code.targetId),
      });
      if (!menu) {
        throw new NotFoundError('Menu');
      }
      venue = await db.query.venues.findFirst({
        where: eq(venues.id, menu.venueId),
      });
      if (!venue) {
        throw new NotFoundError('Venue');
      }
      targetUrl = qrService.generateMenuUrl('localhost:5174', venue.slug, menu.id);
    }

    const qrOptions = (code.options as QRCodeOptions) || {};
    const qrImage = await qrService.generateQRCode(targetUrl, qrOptions);

    reply
      .type('image/png')
      .header('Content-Disposition', `attachment; filename="${qrService.getQRCodeFileName(code.name)}"`)
      .send(qrImage);
  });

  // Delete QR code
  app.delete('/:id', async (request, reply) => {
    const { orgId, id } = request.params as { orgId: string; id: string };

    const code = await db.query.qrCodes.findFirst({
      where: and(eq(qrCodes.id, id), eq(qrCodes.organizationId, orgId)),
    });

    if (!code) {
      throw new NotFoundError('QR Code');
    }

    await db.delete(qrCodes).where(eq(qrCodes.id, id));

    return reply.code(204).send();
  });
}
