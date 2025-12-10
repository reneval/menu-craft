/**
 * AI suggestion routes for menu items
 */

import { type FastifyInstance } from 'fastify';
import { z } from 'zod';
import { aiService } from '../../lib/ai-service.js';

const GenerateDescriptionSchema = z.object({
  itemName: z.string().min(1).max(200),
  category: z.string().max(100).optional(),
  venueType: z.string().max(100).optional(),
  existingDescription: z.string().max(500).optional(),
});

const SuggestPriceSchema = z.object({
  itemName: z.string().min(1).max(200),
  category: z.string().max(100).optional(),
  region: z.string().max(100).optional(),
  currency: z.string().length(3).default('USD'),
});

const SuggestTagsSchema = z.object({
  itemName: z.string().min(1).max(200),
  description: z.string().max(500).optional(),
});

export async function aiRoutes(app: FastifyInstance) {
  // Check AI service status
  app.get('/status', async () => {
    return {
      success: true,
      data: {
        available: aiService.isAvailable(),
        features: {
          generateDescription: true,
          suggestPrice: true,
          suggestTags: true,
        },
      },
    };
  });

  // Generate item description
  app.post('/generate-description', async (request, reply) => {
    if (!aiService.isAvailable()) {
      return reply.code(503).send({
        success: false,
        error: { code: 'AI_NOT_CONFIGURED', message: 'AI service is not configured' },
      });
    }

    const body = GenerateDescriptionSchema.parse(request.body);

    try {
      const description = await aiService.generateDescription({
        itemName: body.itemName,
        category: body.category,
        venueType: body.venueType,
        existingDescription: body.existingDescription,
      });

      return {
        success: true,
        data: { description },
      };
    } catch (error) {
      console.error('AI generate description error:', error);
      return reply.code(500).send({
        success: false,
        error: {
          code: 'AI_ERROR',
          message: error instanceof Error ? error.message : 'Failed to generate description',
        },
      });
    }
  });

  // Suggest price
  app.post('/suggest-price', async (request, reply) => {
    if (!aiService.isAvailable()) {
      return reply.code(503).send({
        success: false,
        error: { code: 'AI_NOT_CONFIGURED', message: 'AI service is not configured' },
      });
    }

    const body = SuggestPriceSchema.parse(request.body);

    try {
      const prices = await aiService.suggestPrice({
        itemName: body.itemName,
        category: body.category,
        region: body.region,
        currency: body.currency,
      });

      return {
        success: true,
        data: prices,
      };
    } catch (error) {
      console.error('AI suggest price error:', error);
      return reply.code(500).send({
        success: false,
        error: {
          code: 'AI_ERROR',
          message: error instanceof Error ? error.message : 'Failed to suggest price',
        },
      });
    }
  });

  // Suggest tags (dietary tags and allergens)
  app.post('/suggest-tags', async (request, reply) => {
    if (!aiService.isAvailable()) {
      return reply.code(503).send({
        success: false,
        error: { code: 'AI_NOT_CONFIGURED', message: 'AI service is not configured' },
      });
    }

    const body = SuggestTagsSchema.parse(request.body);

    try {
      const tags = await aiService.suggestTags({
        itemName: body.itemName,
        description: body.description,
      });

      return {
        success: true,
        data: tags,
      };
    } catch (error) {
      console.error('AI suggest tags error:', error);
      return reply.code(500).send({
        success: false,
        error: {
          code: 'AI_ERROR',
          message: error instanceof Error ? error.message : 'Failed to suggest tags',
        },
      });
    }
  });

  // Clear AI cache (admin only)
  app.delete('/cache', async (request, reply) => {
    try {
      const success = await aiService.clearCache();
      return {
        success,
        data: { cleared: success },
      };
    } catch (error) {
      return reply.code(500).send({
        success: false,
        error: { code: 'CACHE_ERROR', message: 'Failed to clear cache' },
      });
    }
  });
}
