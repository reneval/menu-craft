import { type FastifyInstance } from 'fastify';
import { db, menus, venues, menuSections, menuItems, eq, and } from '@menucraft/database';
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

    // Fetch menu with all related data
    const menu = await db.query.menus.findFirst({
      where: and(eq(menus.id, menuId), eq(menus.venueId, venueId)),
      with: {
        venue: true,
        sections: {
          orderBy: (sections, { asc }) => [asc(sections.position)],
          with: {
            items: {
              orderBy: (items, { asc }) => [asc(items.position)],
              with: {
                options: {
                  with: {
                    choices: {
                      orderBy: (choices, { asc }) => [asc(choices.position)],
                    },
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!menu) {
      throw new NotFoundError('Menu');
    }

    // Verify organization access
    if (menu.venue.organizationId !== orgId) {
      throw new NotFoundError('Menu');
    }

    // Transform data for PDF generation
    const pdfData: MenuPDFData = {
      venue: {
        name: menu.venue.name,
        description: menu.venue.description || undefined,
        address: menu.venue.address || undefined,
        phone: menu.venue.phone || undefined,
        website: menu.venue.website || undefined,
        logo: menu.venue.logoUrl || undefined,
      },
      menu: {
        id: menu.id,
        name: menu.name,
        description: menu.description || undefined,
        currency: menu.currency,
        sections: menu.sections.map(section => ({
          id: section.id,
          name: section.name,
          description: section.description || undefined,
          items: section.items.map(item => ({
            id: item.id,
            name: item.name,
            description: item.description || undefined,
            priceAmount: item.priceAmount,
            imageUrl: item.imageUrl || undefined,
            allergens: item.allergens,
            options: item.options.map(option => ({
              name: option.name,
              choices: option.choices.map(choice => ({
                name: choice.name,
                priceModifier: choice.priceModifier,
              })),
            })),
          })),
        })),
      },
      theme: menu.theme ? {
        primaryColor: menu.theme.primaryColor || undefined,
        fontFamily: menu.theme.fontFamily || undefined,
        headerStyle: menu.theme.headerStyle || undefined,
      } : undefined,
    };

    try {
      const pdfBuffer = await pdfService.generateMenuPDF(pdfData, queryOptions as PDFOptions);
      const filename = pdfService.generateFileName(menu.venue.name, menu.name);

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

    // Fetch menu with all related data
    const menu = await db.query.menus.findFirst({
      where: and(eq(menus.id, menuId), eq(menus.venueId, venueId)),
      with: {
        venue: true,
        sections: {
          orderBy: (sections, { asc }) => [asc(sections.position)],
          with: {
            items: {
              orderBy: (items, { asc }) => [asc(items.position)],
              with: {
                options: {
                  with: {
                    choices: {
                      orderBy: (choices, { asc }) => [asc(choices.position)],
                    },
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!menu) {
      throw new NotFoundError('Menu');
    }

    // Verify organization access
    if (menu.venue.organizationId !== orgId) {
      throw new NotFoundError('Menu');
    }

    // Transform data for PDF generation
    const pdfData: MenuPDFData = {
      venue: {
        name: menu.venue.name,
        description: menu.venue.description || undefined,
        address: menu.venue.address || undefined,
        phone: menu.venue.phone || undefined,
        website: menu.venue.website || undefined,
        logo: menu.venue.logoUrl || undefined,
      },
      menu: {
        id: menu.id,
        name: menu.name,
        description: menu.description || undefined,
        currency: menu.currency,
        sections: menu.sections.map(section => ({
          id: section.id,
          name: section.name,
          description: section.description || undefined,
          items: section.items.map(item => ({
            id: item.id,
            name: item.name,
            description: item.description || undefined,
            priceAmount: item.priceAmount,
            imageUrl: item.imageUrl || undefined,
            allergens: item.allergens,
            options: item.options.map(option => ({
              name: option.name,
              choices: option.choices.map(choice => ({
                name: choice.name,
                priceModifier: choice.priceModifier,
              })),
            })),
          })),
        })),
      },
      theme: menu.theme ? {
        primaryColor: menu.theme.primaryColor || undefined,
        fontFamily: menu.theme.fontFamily || undefined,
        headerStyle: menu.theme.headerStyle || undefined,
      } : undefined,
    };

    try {
      const pdfBuffer = await pdfService.generateMenuPDF(pdfData, queryOptions as PDFOptions);
      const filename = pdfService.generateFileName(menu.venue.name, menu.name);

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