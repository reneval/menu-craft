import { type FastifyInstance } from 'fastify';
import { db, menus, venues, menuSections, menuItems, menuItemOptions, eq, and, asc } from '@menucraft/database';
import { z } from 'zod';
import { NotFoundError } from '../../utils/errors.js';
import { pdfService, type PDFOptions, type MenuPDFData } from '../../lib/pdf-service.js';

const pdfOptionsSchema = z.object({
  format: z.enum(['A4', 'A3', 'Letter', 'Legal']).optional(),
  orientation: z.enum(['portrait', 'landscape']).optional(),
  margin: z.object({
    top: z.string().optional(),
    right: z.string().optional(),
    bottom: z.string().optional(),
    left: z.string().optional(),
  }).optional(),
  background: z.boolean().optional(),
  scale: z.number().min(0.1).max(2).optional(),
});

export async function pdfExportRoutes(app: FastifyInstance) {
  // Generate PDF for a specific menu
  app.get('/:menuId/pdf', async (request, reply) => {
    const { orgId, venueId, menuId } = request.params as {
      orgId: string;
      venueId: string;
      menuId: string;
    };

    const queryOptions = pdfOptionsSchema.parse(request.query);

    // Validate PDF options
    const validation = pdfService.validatePDFOptions(queryOptions as PDFOptions);
    if (!validation.valid) {
      throw new Error(`Invalid PDF options: ${validation.errors.join(', ')}`);
    }

    // Fetch menu
    const [menu] = await db
      .select()
      .from(menus)
      .where(and(eq(menus.id, menuId), eq(menus.venueId, venueId), eq(menus.organizationId, orgId)))
      .limit(1);

    if (!menu) {
      throw new NotFoundError('Menu');
    }

    // Fetch venue
    const [venue] = await db
      .select()
      .from(venues)
      .where(eq(venues.id, venueId))
      .limit(1);

    if (!venue) {
      throw new NotFoundError('Venue');
    }

    // Fetch sections with items
    const sections = await db
      .select()
      .from(menuSections)
      .where(and(eq(menuSections.menuId, menuId), eq(menuSections.organizationId, orgId)))
      .orderBy(asc(menuSections.sortOrder));

    const sectionIds = sections.map(s => s.id);

    // Fetch items for all sections
    const items = sectionIds.length > 0
      ? await db
          .select()
          .from(menuItems)
          .where(eq(menuItems.organizationId, orgId))
          .orderBy(asc(menuItems.sortOrder))
      : [];

    const itemIds = items.map(i => i.id);

    // Fetch options for all items
    const options = itemIds.length > 0
      ? await db
          .select()
          .from(menuItemOptions)
          .where(eq(menuItemOptions.organizationId, orgId))
          .orderBy(asc(menuItemOptions.sortOrder))
      : [];

    // Group items by section
    const itemsBySection = new Map<string, typeof items>();
    for (const item of items) {
      const sectionItems = itemsBySection.get(item.sectionId) || [];
      sectionItems.push(item);
      itemsBySection.set(item.sectionId, sectionItems);
    }

    // Group options by item
    const optionsByItem = new Map<string, typeof options>();
    for (const option of options) {
      const itemOptions = optionsByItem.get(option.menuItemId) || [];
      itemOptions.push(option);
      optionsByItem.set(option.menuItemId, itemOptions);
    }

    // Extract address fields from jsonb
    const venueAddress = venue.address as Record<string, string> | null;

    // Transform data for PDF generation
    const pdfData: MenuPDFData = {
      venue: {
        name: venue.name,
        description: venueAddress?.description,
        address: venueAddress?.street,
        phone: venueAddress?.phone,
        website: venueAddress?.website,
        logo: venue.logoUrl || undefined,
      },
      menu: {
        id: menu.id,
        name: menu.name,
        description: undefined,
        currency: 'USD',
        sections: sections.map(section => ({
          id: section.id,
          name: section.name,
          description: section.description || undefined,
          items: (itemsBySection.get(section.id) || []).map(item => ({
            id: item.id,
            name: item.name,
            description: item.description || undefined,
            priceAmount: item.priceAmount ?? 0,
            imageUrl: item.imageUrl || undefined,
            allergens: (item.allergens as string[]) || [],
            options: (optionsByItem.get(item.id) || []).map(option => ({
              name: option.name,
              choices: [],
            })),
          })),
        })),
      },
      theme: menu.themeConfig ? {
        primaryColor: (menu.themeConfig as Record<string, unknown>).primaryColor as string || undefined,
        fontFamily: (menu.themeConfig as Record<string, unknown>).fontFamily as string || undefined,
        headerStyle: (menu.themeConfig as Record<string, unknown>).headerStyle as string || undefined,
      } : undefined,
    };

    try {
      const pdfBuffer = await pdfService.generateMenuPDF(pdfData, queryOptions as PDFOptions);
      const filename = pdfService.generateFileName(venue.name, menu.name);

      reply
        .type('application/pdf')
        .header('Content-Disposition', `attachment; filename="${filename}"`)
        .send(pdfBuffer);
    } catch (error) {
      console.error('PDF generation failed:', error);
      throw new Error('Failed to generate PDF');
    }
  });

  // Generate PDF preview (inline display)
  app.get('/:menuId/pdf/preview', async (request, reply) => {
    const { orgId, venueId, menuId } = request.params as {
      orgId: string;
      venueId: string;
      menuId: string;
    };

    const queryOptions = pdfOptionsSchema.parse(request.query);

    // Validate PDF options
    const validation = pdfService.validatePDFOptions(queryOptions as PDFOptions);
    if (!validation.valid) {
      throw new Error(`Invalid PDF options: ${validation.errors.join(', ')}`);
    }

    // Fetch menu
    const [menu] = await db
      .select()
      .from(menus)
      .where(and(eq(menus.id, menuId), eq(menus.venueId, venueId), eq(menus.organizationId, orgId)))
      .limit(1);

    if (!menu) {
      throw new NotFoundError('Menu');
    }

    // Fetch venue
    const [venue] = await db
      .select()
      .from(venues)
      .where(eq(venues.id, venueId))
      .limit(1);

    if (!venue) {
      throw new NotFoundError('Venue');
    }

    // Fetch sections with items
    const sections = await db
      .select()
      .from(menuSections)
      .where(and(eq(menuSections.menuId, menuId), eq(menuSections.organizationId, orgId)))
      .orderBy(asc(menuSections.sortOrder));

    const sectionIds = sections.map(s => s.id);

    // Fetch items for all sections
    const items = sectionIds.length > 0
      ? await db
          .select()
          .from(menuItems)
          .where(eq(menuItems.organizationId, orgId))
          .orderBy(asc(menuItems.sortOrder))
      : [];

    const itemIds = items.map(i => i.id);

    // Fetch options for all items
    const options = itemIds.length > 0
      ? await db
          .select()
          .from(menuItemOptions)
          .where(eq(menuItemOptions.organizationId, orgId))
          .orderBy(asc(menuItemOptions.sortOrder))
      : [];

    // Group items by section
    const itemsBySection = new Map<string, typeof items>();
    for (const item of items) {
      const sectionItems = itemsBySection.get(item.sectionId) || [];
      sectionItems.push(item);
      itemsBySection.set(item.sectionId, sectionItems);
    }

    // Group options by item
    const optionsByItem = new Map<string, typeof options>();
    for (const option of options) {
      const itemOptions = optionsByItem.get(option.menuItemId) || [];
      itemOptions.push(option);
      optionsByItem.set(option.menuItemId, itemOptions);
    }

    // Extract address fields from jsonb
    const venueAddress = venue.address as Record<string, string> | null;

    // Transform data for PDF generation
    const pdfData: MenuPDFData = {
      venue: {
        name: venue.name,
        description: venueAddress?.description,
        address: venueAddress?.street,
        phone: venueAddress?.phone,
        website: venueAddress?.website,
        logo: venue.logoUrl || undefined,
      },
      menu: {
        id: menu.id,
        name: menu.name,
        description: undefined,
        currency: 'USD',
        sections: sections.map(section => ({
          id: section.id,
          name: section.name,
          description: section.description || undefined,
          items: (itemsBySection.get(section.id) || []).map(item => ({
            id: item.id,
            name: item.name,
            description: item.description || undefined,
            priceAmount: item.priceAmount ?? 0,
            imageUrl: item.imageUrl || undefined,
            allergens: (item.allergens as string[]) || [],
            options: (optionsByItem.get(item.id) || []).map(option => ({
              name: option.name,
              choices: [],
            })),
          })),
        })),
      },
      theme: menu.themeConfig ? {
        primaryColor: (menu.themeConfig as Record<string, unknown>).primaryColor as string || undefined,
        fontFamily: (menu.themeConfig as Record<string, unknown>).fontFamily as string || undefined,
        headerStyle: (menu.themeConfig as Record<string, unknown>).headerStyle as string || undefined,
      } : undefined,
    };

    try {
      const pdfBuffer = await pdfService.generateMenuPDF(pdfData, queryOptions as PDFOptions);
      const filename = pdfService.generateFileName(venue.name, menu.name);

      reply
        .type('application/pdf')
        .header('Content-Disposition', `inline; filename="${filename}"`)
        .send(pdfBuffer);
    } catch (error) {
      console.error('PDF preview generation failed:', error);
      throw new Error('Failed to generate PDF preview');
    }
  });

  // Get PDF generation options/templates
  app.get('/pdf/options', async (request, reply) => {
    return {
      success: true,
      data: {
        formats: ['A4', 'A3', 'Letter', 'Legal'],
        orientations: ['portrait', 'landscape'],
        defaultOptions: {
          format: 'A4',
          orientation: 'portrait',
          margin: {
            top: '20px',
            right: '20px',
            bottom: '20px',
            left: '20px'
          },
          background: true,
          scale: 1,
        },
        templates: [
          {
            id: 'classic',
            name: 'Classic',
            description: 'Clean and professional layout',
            preview: '/api/templates/classic-preview.png',
          },
          {
            id: 'modern',
            name: 'Modern',
            description: 'Contemporary design with accent colors',
            preview: '/api/templates/modern-preview.png',
          },
          {
            id: 'elegant',
            name: 'Elegant',
            description: 'Sophisticated layout for fine dining',
            preview: '/api/templates/elegant-preview.png',
          },
        ],
      },
    };
  });
}
