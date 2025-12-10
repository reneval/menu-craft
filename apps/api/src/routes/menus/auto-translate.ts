/**
 * Auto-translation routes using DeepL API with Redis caching
 */

import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { translationService } from '../../lib/translation-service.js';
import { db, menus, menuSections, menuItems, menuItemOptions, eq, and, inArray } from '@menucraft/database';
import { validate } from '../../utils/validation.js';

const AutoTranslateRequestSchema = z.object({
  targetLanguage: z.string().length(2, 'Target language must be a 2-letter ISO 639-1 code'),
  entities: z.object({
    menu: z.boolean().default(false),
    sections: z.boolean().default(false),
    items: z.boolean().default(false),
    options: z.boolean().default(false),
  }),
  config: z.object({
    preserveFormatting: z.boolean().default(true),
    formality: z.enum(['default', 'more', 'less', 'prefer_more', 'prefer_less']).default('default'),
    overwriteExisting: z.boolean().default(false),
  }).optional(),
});

const BatchTranslateRequestSchema = z.object({
  menuIds: z.array(z.string().uuid()).min(1, 'Must specify at least one menu').max(10, 'Cannot translate more than 10 menus at once'),
  targetLanguage: z.string().length(2, 'Target language must be a 2-letter ISO 639-1 code'),
  entities: z.object({
    menu: z.boolean().default(false),
    sections: z.boolean().default(false),
    items: z.boolean().default(false),
    options: z.boolean().default(false),
  }),
  config: z.object({
    preserveFormatting: z.boolean().default(true),
    formality: z.enum(['default', 'more', 'less', 'prefer_more', 'prefer_less']).default('default'),
    overwriteExisting: z.boolean().default(false),
  }).optional(),
});

export async function autoTranslateRoutes(fastify: FastifyInstance) {
  // Auto-translate a single menu
  fastify.post('/', async (request, reply) => {
    const { orgId: organizationId, menuId } = request.params as { orgId: string; menuId: string };
    const body = validate(AutoTranslateRequestSchema, request.body);
    const { targetLanguage, entities, config } = body;

    if (!translationService.isAvailable()) {
      return reply.code(503).send({
        success: false,
        error: {
          code: 'SERVICE_UNAVAILABLE',
          message: 'Translation service is not available',
        },
      });
    }

    try {
      // Get menu data
      const menu = await db
        .select()
        .from(menus)
        .where(and(eq(menus.id, menuId), eq(menus.organizationId, organizationId)))
        .limit(1);

      if (menu.length === 0) {
        return reply.code(404).send({
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'Menu not found',
          },
        });
      }

      const translationItems: Array<{ id: string; text: string; targetLang: string; config: typeof config }> = [];

      // Prepare menu translation
      if (entities.menu && menu[0]?.name) {
        translationItems.push({
          id: `menu-${menuId}-name`,
          text: menu[0].name,
          targetLang: targetLanguage,
          config,
        });
      }

      // Get sections if needed
      let sectionsList: (typeof menuSections.$inferSelect)[] = [];
      if (entities.sections || entities.items || entities.options) {
        sectionsList = await db
          .select()
          .from(menuSections)
          .where(and(eq(menuSections.menuId, menuId), eq(menuSections.organizationId, organizationId)));

        if (entities.sections) {
          for (const section of sectionsList) {
            if (section.name) {
              translationItems.push({
                id: `section-${section.id}-name`,
                text: section.name,
                targetLang: targetLanguage,
                config,
              });
            }
            if (section.description) {
              translationItems.push({
                id: `section-${section.id}-description`,
                text: section.description,
                targetLang: targetLanguage,
                config,
              });
            }
          }
        }
      }

      // Get items if needed
      let itemsList: (typeof menuItems.$inferSelect)[] = [];
      if (entities.items || entities.options) {
        const sectionIds = sectionsList.map(s => s.id);
        if (sectionIds.length > 0) {
          itemsList = await db
            .select()
            .from(menuItems)
            .where(and(
              eq(menuItems.organizationId, organizationId),
              inArray(menuItems.sectionId, sectionIds)
            ));
        }

        if (entities.items) {
          for (const item of itemsList) {
            if (item.name) {
              translationItems.push({
                id: `item-${item.id}-name`,
                text: item.name,
                targetLang: targetLanguage,
                config,
              });
            }
            if (item.description) {
              translationItems.push({
                id: `item-${item.id}-description`,
                text: item.description,
                targetLang: targetLanguage,
                config,
              });
            }
          }
        }
      }

      // Get options if needed
      if (entities.options && itemsList.length > 0) {
        const itemIds = itemsList.map(i => i.id);
        const options = await db
          .select()
          .from(menuItemOptions)
          .where(and(
            eq(menuItemOptions.organizationId, organizationId),
            inArray(menuItemOptions.menuItemId, itemIds)
          ));

        for (const option of options) {
          if (option.name) {
            translationItems.push({
              id: `option-${option.id}-name`,
              text: option.name,
              targetLang: targetLanguage,
              config,
            });
          }
        }
      }

      if (translationItems.length === 0) {
        return reply.send({
          success: true,
          data: {
            translated: 0,
            failed: 0,
            skipped: 0,
            message: 'No translatable content found',
          },
        });
      }

      // Perform batch translation
      const results = await translationService.translateBatch(translationItems);

      // Process results and save translations
      let translated = 0;
      let failed = 0;
      let skipped = 0;

      const translations = [];

      for (const result of results) {
        if (result.error) {
          failed++;
          continue;
        }

        if (!result.result) {
          skipped++;
          continue;
        }

        // Parse entity info from ID
        const [entityType, entityId, field] = result.id.split('-');

        translations.push({
          organizationId,
          entityType,
          entityId,
          field,
          language: targetLanguage,
          translation: result.result.text,
        });

        translated++;
      }

      // Save translations to database (implement batch upsert)
      // This would need to be implemented based on your translations table schema

      return reply.send({
        success: true,
        data: {
          translated,
          failed,
          skipped,
          totalItems: translationItems.length,
        },
      });

    } catch (error) {
      console.error('Auto-translation error:', error);
      return reply.code(500).send({
        success: false,
        error: {
          code: 'TRANSLATION_ERROR',
          message: 'Failed to auto-translate menu',
        },
      });
    }
  });

  // Batch auto-translate multiple menus
  fastify.post('/batch', async (request, reply) => {
    const { orgId: organizationId } = request.params as { orgId: string };
    const body = validate(BatchTranslateRequestSchema, request.body);
    const { menuIds, targetLanguage, entities, config } = body;

    if (!translationService.isAvailable()) {
      return reply.code(503).send({
        success: false,
        error: {
          code: 'SERVICE_UNAVAILABLE',
          message: 'Translation service is not available',
        },
      });
    }

    try {
      const results = [];

      for (const menuId of menuIds) {
        // Reuse the single menu translation logic
        // This is a simplified version - in practice you'd want to optimize this
        try {
          const menuResult = await fastify.inject({
            method: 'POST',
            url: `/${menuId}/auto-translate`,
            headers: {
              authorization: request.headers.authorization,
            },
            payload: {
              targetLanguage,
              entities,
              config,
            },
          });

          results.push({
            menuId,
            success: menuResult.statusCode === 200,
            data: JSON.parse(menuResult.body),
          });
        } catch (error) {
          results.push({
            menuId,
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
          });
        }
      }

      return reply.send({
        success: true,
        data: {
          results,
          totalMenus: menuIds.length,
          successful: results.filter(r => r.success).length,
          failed: results.filter(r => !r.success).length,
        },
      });

    } catch (error) {
      console.error('Batch auto-translation error:', error);
      return reply.code(500).send({
        success: false,
        error: {
          code: 'BATCH_TRANSLATION_ERROR',
          message: 'Failed to batch auto-translate menus',
        },
      });
    }
  });

  // Get translation service status and usage
  fastify.get('/status', async (request, reply) => {
    try {
      const [usage, languages] = await Promise.all([
        translationService.getUsageStats(),
        translationService.getSupportedLanguages(),
      ]);

      return reply.send({
        success: true,
        data: {
          available: translationService.isAvailable(),
          usage,
          supportedLanguages: languages,
          // cacheStats,
        },
      });
    } catch (error) {
      console.error('Translation status error:', error);
      return reply.code(500).send({
        success: false,
        error: {
          code: 'STATUS_ERROR',
          message: 'Failed to get translation status',
        },
      });
    }
  });

  // Clear translation cache
  fastify.delete('/cache', async (request, reply) => {
    try {
      const { pattern } = request.query as { pattern?: string };
      const result = await translationService.clearCache(pattern);

      if (result) {
        return reply.send({
          success: true,
          data: {
            message: pattern ? `Cache cleared for pattern: ${pattern}` : 'All translation cache cleared',
          },
        });
      } else {
        return reply.code(500).send({
          success: false,
          error: {
            code: 'CACHE_CLEAR_ERROR',
            message: 'Failed to clear translation cache',
          },
        });
      }
    } catch (error) {
      console.error('Cache clear error:', error);
      return reply.code(500).send({
        success: false,
        error: {
          code: 'CACHE_CLEAR_ERROR',
          message: 'Failed to clear translation cache',
        },
      });
    }
  });
}