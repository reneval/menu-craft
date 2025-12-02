import { type FastifyInstance } from 'fastify';
import { db, translations, menus, menuSections, menuItems, menuItemOptions, eq, and, inArray } from '@menucraft/database';
import { NotFoundError } from '../../utils/errors.js';
import { z } from 'zod';
import { validate } from '../../utils/validation.js';

const EntityTypeValues = ['menu', 'menu_section', 'menu_item', 'menu_item_option'] as const;
type EntityType = typeof EntityTypeValues[number];

const TranslationContentSchema = z.object({
  name: z.string().optional(),
  description: z.string().optional(),
  optionGroup: z.string().optional(), // for menu_item_option
});

const SaveTranslationsSchema = z.object({
  languageCode: z.string().min(2).max(10),
  translations: z.array(z.object({
    entityType: z.enum(EntityTypeValues),
    entityId: z.string().uuid(),
    content: TranslationContentSchema,
  })),
});

const UpdateMenuLanguagesSchema = z.object({
  defaultLanguage: z.string().min(2).max(10).optional(),
  enabledLanguages: z.array(z.string().min(2).max(10)).min(1).optional(),
});

export async function translationRoutes(app: FastifyInstance) {
  // Get all translations for a menu (including sections, items, options)
  app.get('/', async (request) => {
    const { orgId, menuId } = request.params as { orgId: string; menuId: string };
    const { lang } = request.query as { lang?: string };

    // Get menu to verify it exists
    const menu = await db.query.menus.findFirst({
      where: and(eq(menus.id, menuId), eq(menus.organizationId, orgId)),
    });

    if (!menu) {
      throw new NotFoundError('Menu');
    }

    // Get all entity IDs for this menu
    const sections = await db.query.menuSections.findMany({
      where: eq(menuSections.menuId, menuId),
      with: {
        items: {
          with: {
            options: true,
          },
        },
      },
    });

    const entityIds: string[] = [menuId];
    const sectionIds: string[] = [];
    const itemIds: string[] = [];
    const optionIds: string[] = [];

    sections.forEach((section) => {
      sectionIds.push(section.id);
      entityIds.push(section.id);
      section.items.forEach((item) => {
        itemIds.push(item.id);
        entityIds.push(item.id);
        item.options?.forEach((option) => {
          optionIds.push(option.id);
          entityIds.push(option.id);
        });
      });
    });

    // Build query condition
    const whereCondition = lang
      ? and(
          eq(translations.organizationId, orgId),
          inArray(translations.entityId, entityIds),
          eq(translations.languageCode, lang)
        )
      : and(
          eq(translations.organizationId, orgId),
          inArray(translations.entityId, entityIds)
        );

    const translationsList = await db.query.translations.findMany({
      where: whereCondition,
    });

    // Group by language
    const byLanguage: Record<string, Record<string, { entityType: EntityType; translations: Record<string, string> }>> = {};

    translationsList.forEach((t) => {
      if (!byLanguage[t.languageCode]) {
        byLanguage[t.languageCode] = {};
      }
      const langGroup = byLanguage[t.languageCode]!;
      langGroup[t.entityId] = {
        entityType: t.entityType as EntityType,
        translations: t.translations as Record<string, string>,
      };
    });

    return {
      success: true,
      data: {
        menu: {
          id: menu.id,
          defaultLanguage: (menu as any).defaultLanguage || 'en',
          enabledLanguages: (menu as any).enabledLanguages || ['en'],
        },
        translations: byLanguage,
      },
    };
  });

  // Save translations for a specific language
  app.post('/', async (request) => {
    const { orgId, menuId } = request.params as { orgId: string; menuId: string };
    const body = validate(SaveTranslationsSchema, request.body);

    // Verify menu exists
    const menu = await db.query.menus.findFirst({
      where: and(eq(menus.id, menuId), eq(menus.organizationId, orgId)),
    });

    if (!menu) {
      throw new NotFoundError('Menu');
    }

    // Upsert translations
    const results = await Promise.all(
      body.translations.map(async (t) => {
        const existing = await db.query.translations.findFirst({
          where: and(
            eq(translations.entityType, t.entityType),
            eq(translations.entityId, t.entityId),
            eq(translations.languageCode, body.languageCode)
          ),
        });

        if (existing) {
          const [updated] = await db
            .update(translations)
            .set({
              translations: t.content,
              updatedAt: new Date(),
            })
            .where(eq(translations.id, existing.id))
            .returning();
          return updated;
        } else {
          const [created] = await db
            .insert(translations)
            .values({
              organizationId: orgId,
              entityType: t.entityType,
              entityId: t.entityId,
              languageCode: body.languageCode,
              translations: t.content,
            })
            .returning();
          return created;
        }
      })
    );

    return { success: true, data: results };
  });

  // Update menu language settings
  app.patch('/settings', async (request) => {
    const { orgId, menuId } = request.params as { orgId: string; menuId: string };
    const body = validate(UpdateMenuLanguagesSchema, request.body);

    const updateData: Record<string, any> = { updatedAt: new Date() };
    if (body.defaultLanguage) updateData.defaultLanguage = body.defaultLanguage;
    if (body.enabledLanguages) updateData.enabledLanguages = body.enabledLanguages;

    const [menu] = await db
      .update(menus)
      .set(updateData)
      .where(and(eq(menus.id, menuId), eq(menus.organizationId, orgId)))
      .returning();

    if (!menu) {
      throw new NotFoundError('Menu');
    }

    return { success: true, data: menu };
  });

  // Delete translations for a language
  app.delete('/:languageCode', async (request) => {
    const { orgId, menuId, languageCode } = request.params as {
      orgId: string;
      menuId: string;
      languageCode: string;
    };

    // Get all entity IDs for this menu
    const sections = await db.query.menuSections.findMany({
      where: eq(menuSections.menuId, menuId),
      with: {
        items: {
          with: {
            options: true,
          },
        },
      },
    });

    const entityIds: string[] = [menuId];
    sections.forEach((section) => {
      entityIds.push(section.id);
      section.items.forEach((item) => {
        entityIds.push(item.id);
        item.options?.forEach((option) => {
          entityIds.push(option.id);
        });
      });
    });

    await db
      .delete(translations)
      .where(
        and(
          eq(translations.organizationId, orgId),
          inArray(translations.entityId, entityIds),
          eq(translations.languageCode, languageCode)
        )
      );

    return { success: true, data: { deleted: true } };
  });
}
