import { type FastifyInstance } from 'fastify';
import { db, menuSections, menuItems, menuItemOptions, eq, and, menus } from '@menucraft/database';
import { z } from 'zod';
import { validate } from '../../utils/validation.js';
import { NotFoundError, ValidationError } from '../../utils/errors.js';
import { visionService, type ExtractedMenu } from '../../services/vision.js';
import { env } from '../../config/env.js';

// CSV row schema
const CsvRowSchema = z.object({
  section: z.string().min(1, 'Section name is required'),
  name: z.string().min(1, 'Item name is required'),
  description: z.string().optional().default(''),
  price: z.string().optional().default(''),
  priceType: z.enum(['fixed', 'variable', 'market_price']).optional().default('fixed'),
  dietaryTags: z.string().optional().default(''),
  allergens: z.string().optional().default(''),
  available: z.string().optional().default('true'),
});

const ImportSchema = z.object({
  rows: z.array(CsvRowSchema).min(1, 'At least one row is required'),
  mode: z.enum(['append', 'replace']).default('append'),
});

type CsvRow = z.infer<typeof CsvRowSchema>;

function parsePrice(priceStr: string): number | null {
  if (!priceStr || priceStr.trim() === '') return null;
  // Remove currency symbols and spaces
  const cleaned = priceStr.replace(/[$€£¥,\s]/g, '').trim();
  const num = parseFloat(cleaned);
  if (isNaN(num)) return null;
  // Convert to cents
  return Math.round(num * 100);
}

function parseTags(tagsStr: string): string[] {
  if (!tagsStr || tagsStr.trim() === '') return [];
  return tagsStr
    .split(/[,;|]/)
    .map((t) => t.trim().toLowerCase().replace(/\s+/g, '_'))
    .filter((t) => t.length > 0);
}

function parseBoolean(str: string): boolean {
  const lower = str.toLowerCase().trim();
  return lower === 'true' || lower === 'yes' || lower === '1' || lower === 'y';
}

export async function importRoutes(app: FastifyInstance) {
  // Import items from CSV data
  app.post('/', async (request) => {
    const { orgId, venueId, menuId } = request.params as {
      orgId: string;
      venueId: string;
      menuId: string;
    };
    const body = validate(ImportSchema, request.body);

    // If replace mode, delete existing sections and items
    if (body.mode === 'replace') {
      const existingSections = await db.query.menuSections.findMany({
        where: eq(menuSections.menuId, menuId),
      });

      for (const section of existingSections) {
        // Delete items first (cascade should handle this, but being explicit)
        await db.delete(menuItems).where(eq(menuItems.sectionId, section.id));
        await db.delete(menuSections).where(eq(menuSections.id, section.id));
      }
    }

    // Group rows by section (after validation, all fields have defaults applied)
    const validatedRows = body.rows as CsvRow[];
    const sectionMap = new Map<string, CsvRow[]>();
    for (const row of validatedRows) {
      const sectionName = row.section.trim();
      const sectionRows = sectionMap.get(sectionName);
      if (sectionRows) {
        sectionRows.push(row);
      } else {
        sectionMap.set(sectionName, [row]);
      }
    }

    // Get existing sections for append mode
    const existingSections = await db.query.menuSections.findMany({
      where: eq(menuSections.menuId, menuId),
    });
    const existingSectionMap = new Map(existingSections.map((s) => [s.name.toLowerCase(), s]));

    // Get max sort order for sections
    let maxSectionSortOrder = existingSections.reduce(
      (max, s) => Math.max(max, s.sortOrder),
      -1
    );

    const stats = {
      sectionsCreated: 0,
      sectionsUpdated: 0,
      itemsCreated: 0,
    };

    // Process each section
    for (const [sectionName, items] of sectionMap) {
      let section = existingSectionMap.get(sectionName.toLowerCase());

      if (!section) {
        // Create new section
        maxSectionSortOrder++;
        const [newSection] = await db
          .insert(menuSections)
          .values({
            organizationId: orgId,
            menuId,
            name: sectionName,
            sortOrder: maxSectionSortOrder,
          })
          .returning();
        section = newSection!;
        stats.sectionsCreated++;
      }

      // Get max sort order for items in this section
      const sectionId = section.id;
      const existingItems = await db.query.menuItems.findMany({
        where: eq(menuItems.sectionId, sectionId),
      });
      let maxItemSortOrder = existingItems.reduce((max, i) => Math.max(max, i.sortOrder), -1);

      // Create items
      for (const item of items) {
        maxItemSortOrder++;
        const priceAmount = parsePrice(item.price);

        await db.insert(menuItems).values({
          organizationId: orgId,
          sectionId,
          name: item.name.trim(),
          description: item.description?.trim() || null,
          priceType: item.priceType || 'fixed',
          priceAmount,
          dietaryTags: parseTags(item.dietaryTags || ''),
          allergens: parseTags(item.allergens || ''),
          isAvailable: parseBoolean(item.available || 'true'),
          sortOrder: maxItemSortOrder,
        });
        stats.itemsCreated++;
      }
    }

    return {
      success: true,
      data: {
        message: `Import complete: ${stats.sectionsCreated} sections created, ${stats.itemsCreated} items created`,
        stats,
      },
    };
  });

  // Get sample CSV template
  app.get('/template', async () => {
    const template = [
      'section,name,description,price,priceType,dietaryTags,allergens,available',
      'Appetizers,Spring Rolls,Crispy vegetable rolls,8.99,fixed,vegetarian,gluten,true',
      'Appetizers,Chicken Wings,Spicy buffalo wings,12.99,fixed,spicy,none,true',
      'Main Course,Grilled Salmon,Fresh Atlantic salmon with herbs,24.99,fixed,gluten_free,fish,true',
      'Main Course,Veggie Burger,Plant-based patty with all fixings,16.99,fixed,vegetarian|vegan,gluten|soy,true',
      'Desserts,Chocolate Cake,Rich dark chocolate layer cake,9.99,fixed,vegetarian,gluten|milk|eggs,true',
      'Beverages,Fresh Lemonade,House-made lemonade,4.99,fixed,vegan,none,true',
    ].join('\n');

    return {
      success: true,
      data: {
        template,
        columns: [
          { name: 'section', description: 'Section/category name (required)', required: true },
          { name: 'name', description: 'Item name (required)', required: true },
          { name: 'description', description: 'Item description', required: false },
          { name: 'price', description: 'Price (e.g., 12.99 or $12.99)', required: false },
          { name: 'priceType', description: 'fixed, variable, or market_price', required: false },
          { name: 'dietaryTags', description: 'Tags separated by | or , (vegetarian, vegan, gluten_free, etc.)', required: false },
          { name: 'allergens', description: 'Allergens separated by | or , (gluten, nuts, milk, etc.)', required: false },
          { name: 'available', description: 'true/false or yes/no', required: false },
        ],
      },
    };
  });

  // Import from photo using AI vision
  const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
  const MAX_IMAGE_SIZE = 10 * 1024 * 1024; // 10MB for vision

  app.post('/photo', async (request, reply) => {
    const { orgId, venueId, menuId } = request.params as {
      orgId: string;
      venueId: string;
      menuId: string;
    };

    // Check if AI is configured
    if (!env.ANTHROPIC_API_KEY) {
      return reply.status(503).send({
        success: false,
        error: {
          code: 'AI_NOT_CONFIGURED',
          message: 'AI vision service is not configured. Please contact support.',
        },
      });
    }

    // Get multipart file
    const data = await request.file();
    if (!data) {
      return reply.status(400).send({
        success: false,
        error: {
          code: 'NO_FILE',
          message: 'No image file uploaded',
        },
      });
    }

    // Validate file type
    if (!ALLOWED_IMAGE_TYPES.includes(data.mimetype)) {
      return reply.status(400).send({
        success: false,
        error: {
          code: 'INVALID_TYPE',
          message: `Invalid file type. Allowed types: ${ALLOWED_IMAGE_TYPES.join(', ')}`,
        },
      });
    }

    // Read file into buffer with size check
    let size = 0;
    const chunks: Buffer[] = [];
    for await (const chunk of data.file) {
      size += chunk.length;
      if (size > MAX_IMAGE_SIZE) {
        return reply.status(400).send({
          success: false,
          error: {
            code: 'FILE_TOO_LARGE',
            message: `File too large. Maximum size: ${MAX_IMAGE_SIZE / 1024 / 1024}MB`,
          },
        });
      }
      chunks.push(chunk);
    }
    const imageBuffer = Buffer.concat(chunks);

    // Get mode from form fields (defaults to append)
    const fields = data.fields as Record<string, { value: string } | undefined>;
    const mode = (fields.mode?.value || 'append') as 'append' | 'replace';

    // Verify menu exists
    const menu = await db.query.menus.findFirst({
      where: eq(menus.id, menuId),
    });
    if (!menu) {
      throw new NotFoundError('Menu');
    }

    // Extract menu data using vision AI
    let extracted: ExtractedMenu;
    try {
      extracted = await visionService.extractMenuFromImage(imageBuffer, data.mimetype);
    } catch (error) {
      return reply.status(422).send({
        success: false,
        error: {
          code: 'EXTRACTION_FAILED',
          message: error instanceof Error ? error.message : 'Failed to extract menu from image',
        },
      });
    }

    // Check if we got any data
    if (extracted.sections.length === 0) {
      return reply.status(422).send({
        success: false,
        error: {
          code: 'NO_MENU_DATA',
          message: 'Could not identify any menu items in the image. Please ensure the image shows a readable menu.',
        },
      });
    }

    // Convert extracted data to CsvRow format and import
    const rows: CsvRow[] = [];
    for (const section of extracted.sections) {
      for (const item of section.items) {
        rows.push({
          section: section.name,
          name: item.name,
          description: item.description || '',
          price: item.price || '',
          priceType: 'fixed',
          dietaryTags: item.dietaryTags?.join(',') || '',
          allergens: '',
          available: 'true',
        });
      }
    }

    // If replace mode, delete existing sections and items
    if (mode === 'replace') {
      const existingSections = await db.query.menuSections.findMany({
        where: eq(menuSections.menuId, menuId),
      });

      for (const section of existingSections) {
        await db.delete(menuItems).where(eq(menuItems.sectionId, section.id));
        await db.delete(menuSections).where(eq(menuSections.id, section.id));
      }
    }

    // Group rows by section
    const sectionMap = new Map<string, CsvRow[]>();
    for (const row of rows) {
      const sectionName = row.section.trim();
      const sectionRows = sectionMap.get(sectionName);
      if (sectionRows) {
        sectionRows.push(row);
      } else {
        sectionMap.set(sectionName, [row]);
      }
    }

    // Get existing sections for append mode
    const existingSections = await db.query.menuSections.findMany({
      where: eq(menuSections.menuId, menuId),
    });
    const existingSectionMap = new Map(existingSections.map((s) => [s.name.toLowerCase(), s]));

    // Get max sort order for sections
    let maxSectionSortOrder = existingSections.reduce(
      (max, s) => Math.max(max, s.sortOrder),
      -1
    );

    const stats = {
      sectionsCreated: 0,
      sectionsUpdated: 0,
      itemsCreated: 0,
    };

    // Process each section
    for (const [sectionName, items] of sectionMap) {
      let section = existingSectionMap.get(sectionName.toLowerCase());

      if (!section) {
        maxSectionSortOrder++;
        const [newSection] = await db
          .insert(menuSections)
          .values({
            organizationId: orgId,
            menuId,
            name: sectionName,
            sortOrder: maxSectionSortOrder,
          })
          .returning();
        section = newSection!;
        stats.sectionsCreated++;
      }

      const sectionId = section.id;
      const existingItems = await db.query.menuItems.findMany({
        where: eq(menuItems.sectionId, sectionId),
      });
      let maxItemSortOrder = existingItems.reduce((max, i) => Math.max(max, i.sortOrder), -1);

      for (const item of items) {
        maxItemSortOrder++;
        const priceAmount = parsePrice(item.price);

        await db.insert(menuItems).values({
          organizationId: orgId,
          sectionId,
          name: item.name.trim(),
          description: item.description?.trim() || null,
          priceType: 'fixed',
          priceAmount,
          dietaryTags: parseTags(item.dietaryTags || ''),
          allergens: [],
          isAvailable: true,
          sortOrder: maxItemSortOrder,
        });
        stats.itemsCreated++;
      }
    }

    // Audit log
    request.audit({
      action: 'menu.import_photo',
      resourceType: 'menu',
      resourceId: menuId,
      resourceName: menu.name,
      metadata: {
        itemsImported: stats.itemsCreated,
        sectionsCreated: stats.sectionsCreated,
        confidence: extracted.confidence,
        mode,
      },
    }).catch(() => {});

    return {
      success: true,
      data: {
        message: `Import complete: ${stats.sectionsCreated} sections created, ${stats.itemsCreated} items created`,
        stats,
        extracted: {
          sections: extracted.sections,
          confidence: extracted.confidence,
          warnings: extracted.warnings,
        },
      },
    };
  });

  // Preview extraction from photo (returns extracted data without importing)
  app.post('/photo/preview', async (request, reply) => {
    const { orgId, menuId } = request.params as {
      orgId: string;
      menuId: string;
    };

    // Check if AI is configured
    if (!env.ANTHROPIC_API_KEY) {
      return reply.status(503).send({
        success: false,
        error: {
          code: 'AI_NOT_CONFIGURED',
          message: 'AI vision service is not configured. Please contact support.',
        },
      });
    }

    // Get multipart file
    const data = await request.file();
    if (!data) {
      return reply.status(400).send({
        success: false,
        error: {
          code: 'NO_FILE',
          message: 'No image file uploaded',
        },
      });
    }

    // Validate file type
    if (!ALLOWED_IMAGE_TYPES.includes(data.mimetype)) {
      return reply.status(400).send({
        success: false,
        error: {
          code: 'INVALID_TYPE',
          message: `Invalid file type. Allowed types: ${ALLOWED_IMAGE_TYPES.join(', ')}`,
        },
      });
    }

    // Read file into buffer with size check
    let size = 0;
    const chunks: Buffer[] = [];
    for await (const chunk of data.file) {
      size += chunk.length;
      if (size > MAX_IMAGE_SIZE) {
        return reply.status(400).send({
          success: false,
          error: {
            code: 'FILE_TOO_LARGE',
            message: `File too large. Maximum size: ${MAX_IMAGE_SIZE / 1024 / 1024}MB`,
          },
        });
      }
      chunks.push(chunk);
    }
    const imageBuffer = Buffer.concat(chunks);

    // Extract menu data using vision AI
    let extracted: ExtractedMenu;
    try {
      extracted = await visionService.extractMenuFromImage(imageBuffer, data.mimetype);
    } catch (error) {
      return reply.status(422).send({
        success: false,
        error: {
          code: 'EXTRACTION_FAILED',
          message: error instanceof Error ? error.message : 'Failed to extract menu from image',
        },
      });
    }

    // Convert to rows format for preview
    const rows: CsvRow[] = [];
    for (const section of extracted.sections) {
      for (const item of section.items) {
        rows.push({
          section: section.name,
          name: item.name,
          description: item.description || '',
          price: item.price || '',
          priceType: 'fixed',
          dietaryTags: item.dietaryTags?.join(',') || '',
          allergens: '',
          available: 'true',
        });
      }
    }

    return {
      success: true,
      data: {
        rows,
        sections: extracted.sections,
        confidence: extracted.confidence,
        warnings: extracted.warnings,
        totalItems: rows.length,
        totalSections: extracted.sections.length,
      },
    };
  });
}
