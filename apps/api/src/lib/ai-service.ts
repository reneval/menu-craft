/**
 * AI service for menu item suggestions using Claude API
 */

import Anthropic from '@anthropic-ai/sdk';
import { env } from '../config/env.js';
import { redisCache } from './redis-cache.js';

// Valid dietary tags from the schema
const VALID_DIETARY_TAGS = [
  'vegetarian', 'vegan', 'gluten_free', 'dairy_free', 'nut_free',
  'halal', 'kosher', 'spicy', 'organic'
] as const;

// Valid allergens from the schema
const VALID_ALLERGENS = [
  'gluten', 'crustaceans', 'eggs', 'fish', 'peanuts', 'soybeans',
  'milk', 'nuts', 'celery', 'mustard', 'sesame', 'sulphites', 'lupin', 'molluscs'
] as const;

export interface GenerateDescriptionRequest {
  itemName: string;
  category?: string;
  venueType?: string;
  existingDescription?: string;
}

export interface SuggestPriceRequest {
  itemName: string;
  category?: string;
  region?: string;
  currency?: string;
}

export interface SuggestPriceResult {
  low: number;   // Price in cents
  mid: number;
  high: number;
  currency: string;
  reasoning?: string;
}

export interface SuggestTagsRequest {
  itemName: string;
  description?: string;
}

export interface SuggestTagsResult {
  dietaryTags: string[];
  allergens: string[];
  reasoning?: string;
}

export class AIService {
  private client: Anthropic | null = null;
  private isEnabled: boolean;
  private model = 'claude-sonnet-4-20250514';

  constructor() {
    this.isEnabled = Boolean(env.ANTHROPIC_API_KEY);

    if (this.isEnabled) {
      this.client = new Anthropic({
        apiKey: env.ANTHROPIC_API_KEY,
      });
    } else {
      console.warn('Anthropic API key not configured, AI suggestions will be disabled');
    }
  }

  private buildCacheKey(type: string, ...parts: string[]): string {
    const partsHash = Buffer.from(parts.join('|')).toString('base64').slice(0, 48);
    return `ai:${type}:${partsHash}`;
  }

  /**
   * Generate an appetizing description for a menu item
   */
  async generateDescription(request: GenerateDescriptionRequest): Promise<string> {
    if (!this.isEnabled || !this.client) {
      throw new Error('AI service is not enabled');
    }

    const { itemName, category, venueType, existingDescription } = request;

    if (!itemName.trim()) {
      throw new Error('Item name is required');
    }

    const cacheKey = this.buildCacheKey('desc', itemName, category || '', venueType || '');

    return redisCache.getOrSet(
      cacheKey,
      async () => {
        const prompt = existingDescription
          ? `You are a professional menu copywriter. Improve this menu item description to be more appetizing and engaging:

Item: ${itemName}
${category ? `Category: ${category}` : ''}
${venueType ? `Restaurant type: ${venueType}` : ''}
Current description: ${existingDescription}

Write a better 1-2 sentence description that:
- Highlights key ingredients or preparation methods
- Uses sensory language (taste, texture, aroma)
- Is concise and evocative
- Maintains the essence of the original

Return ONLY the description text, no quotes or explanations.`
          : `You are a professional menu copywriter. Write an appetizing 1-2 sentence description for this menu item:

Item: ${itemName}
${category ? `Category: ${category}` : ''}
${venueType ? `Restaurant type: ${venueType}` : ''}

Guidelines:
- Be concise and evocative
- Highlight likely key ingredients or preparation methods
- Use sensory language (taste, texture, aroma)
- Make it sound delicious and enticing

Return ONLY the description text, no quotes or explanations.`;

        const response = await this.client!.messages.create({
          model: this.model,
          max_tokens: 200,
          messages: [{ role: 'user', content: prompt }],
        });

        const textBlock = response.content.find(block => block.type === 'text');
        if (!textBlock || textBlock.type !== 'text') {
          throw new Error('No text response from AI');
        }

        return textBlock.text.trim();
      },
      {
        ttl: 60 * 60, // Cache for 1 hour
        namespace: 'ai-suggestions',
      }
    );
  }

  /**
   * Suggest pricing for a menu item
   */
  async suggestPrice(request: SuggestPriceRequest): Promise<SuggestPriceResult> {
    if (!this.isEnabled || !this.client) {
      throw new Error('AI service is not enabled');
    }

    const { itemName, category, region, currency = 'USD' } = request;

    if (!itemName.trim()) {
      throw new Error('Item name is required');
    }

    const cacheKey = this.buildCacheKey('price', itemName, category || '', region || '', currency);

    return redisCache.getOrSet(
      cacheKey,
      async () => {
        const prompt = `You are a restaurant pricing consultant. Suggest appropriate price points for this menu item.

Item: ${itemName}
${category ? `Category: ${category}` : ''}
${region ? `Region: ${region}` : 'Region: United States'}
Currency: ${currency}

Based on typical restaurant pricing, provide three price points:
- Low: Budget-friendly / fast-casual pricing
- Mid: Standard casual dining pricing
- High: Upscale / fine dining pricing

Return ONLY a JSON object in this exact format (prices in cents):
{"low": 899, "mid": 1299, "high": 1899, "reasoning": "Brief explanation"}`;

        const response = await this.client!.messages.create({
          model: this.model,
          max_tokens: 200,
          messages: [{ role: 'user', content: prompt }],
        });

        const textBlock = response.content.find(block => block.type === 'text');
        if (!textBlock || textBlock.type !== 'text') {
          throw new Error('No text response from AI');
        }

        try {
          const parsed = JSON.parse(textBlock.text.trim());
          return {
            low: Math.round(parsed.low),
            mid: Math.round(parsed.mid),
            high: Math.round(parsed.high),
            currency,
            reasoning: parsed.reasoning,
          };
        } catch {
          // Fallback parsing if JSON is malformed
          throw new Error('Failed to parse price suggestions');
        }
      },
      {
        ttl: 60 * 60, // Cache for 1 hour
        namespace: 'ai-suggestions',
      }
    );
  }

  /**
   * Suggest dietary tags and allergens for a menu item
   */
  async suggestTags(request: SuggestTagsRequest): Promise<SuggestTagsResult> {
    if (!this.isEnabled || !this.client) {
      throw new Error('AI service is not enabled');
    }

    const { itemName, description } = request;

    if (!itemName.trim()) {
      throw new Error('Item name is required');
    }

    const cacheKey = this.buildCacheKey('tags', itemName, description || '');

    return redisCache.getOrSet(
      cacheKey,
      async () => {
        const prompt = `You are a food safety and dietary specialist. Analyze this menu item and suggest appropriate tags.

Item: ${itemName}
${description ? `Description: ${description}` : ''}

Available dietary tags: ${VALID_DIETARY_TAGS.join(', ')}
Available allergens: ${VALID_ALLERGENS.join(', ')}

Based on the item name and description, identify:
1. Likely dietary tags (only if confident)
2. Potential allergens (be inclusive for safety)

Return ONLY a JSON object in this exact format:
{"dietaryTags": ["tag1", "tag2"], "allergens": ["allergen1"], "reasoning": "Brief explanation"}

Be conservative with dietary tags (only include if clearly applicable).
Be inclusive with allergens (include potential allergens for safety).`;

        const response = await this.client!.messages.create({
          model: this.model,
          max_tokens: 300,
          messages: [{ role: 'user', content: prompt }],
        });

        const textBlock = response.content.find(block => block.type === 'text');
        if (!textBlock || textBlock.type !== 'text') {
          throw new Error('No text response from AI');
        }

        try {
          const parsed = JSON.parse(textBlock.text.trim());

          // Filter to only valid tags
          const dietaryTags = (parsed.dietaryTags || [])
            .filter((tag: string) => VALID_DIETARY_TAGS.includes(tag as typeof VALID_DIETARY_TAGS[number]));
          const allergens = (parsed.allergens || [])
            .filter((allergen: string) => VALID_ALLERGENS.includes(allergen as typeof VALID_ALLERGENS[number]));

          return {
            dietaryTags,
            allergens,
            reasoning: parsed.reasoning,
          };
        } catch {
          throw new Error('Failed to parse tag suggestions');
        }
      },
      {
        ttl: 60 * 60, // Cache for 1 hour
        namespace: 'ai-suggestions',
      }
    );
  }

  /**
   * Check if the AI service is available
   */
  isAvailable(): boolean {
    return this.isEnabled && this.client !== null;
  }

  /**
   * Clear AI suggestion cache
   */
  async clearCache(): Promise<boolean> {
    try {
      await redisCache.flush('ai-suggestions');
      return true;
    } catch (error) {
      console.error('Failed to clear AI cache:', error);
      return false;
    }
  }
}

// Singleton instance
export const aiService = new AIService();
