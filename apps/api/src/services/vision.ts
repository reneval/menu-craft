import Anthropic from '@anthropic-ai/sdk';
import { env } from '../config/env.js';

// Types for extracted menu data
export interface ExtractedMenuItem {
  name: string;
  description?: string;
  price?: string;
  dietaryTags?: string[];
}

export interface ExtractedMenuSection {
  name: string;
  items: ExtractedMenuItem[];
}

export interface ExtractedMenu {
  sections: ExtractedMenuSection[];
  confidence: 'high' | 'medium' | 'low';
  warnings?: string[];
}

// Vision service for menu extraction
export class VisionService {
  private client: Anthropic | null = null;

  private getClient(): Anthropic {
    if (!this.client) {
      if (!env.ANTHROPIC_API_KEY) {
        throw new Error('ANTHROPIC_API_KEY is not configured');
      }
      this.client = new Anthropic({
        apiKey: env.ANTHROPIC_API_KEY,
      });
    }
    return this.client;
  }

  async extractMenuFromImage(imageBuffer: Buffer, mimeType: string): Promise<ExtractedMenu> {
    const client = this.getClient();

    // Convert buffer to base64
    const base64Image = imageBuffer.toString('base64');

    // Map common MIME types to supported ones
    const supportedMimeTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'] as const;
    const mediaType = supportedMimeTypes.includes(mimeType as typeof supportedMimeTypes[number])
      ? (mimeType as typeof supportedMimeTypes[number])
      : 'image/jpeg';

    const systemPrompt = `You are a menu extraction specialist. Your task is to analyze images of restaurant menus and extract the menu items into a structured format.

When analyzing a menu image:
1. Identify all sections/categories (e.g., Appetizers, Main Course, Desserts, Beverages)
2. For each section, extract all menu items with their names, descriptions, and prices
3. Identify dietary indicators like V (vegetarian), VG (vegan), GF (gluten-free), etc.
4. If you cannot read some text clearly, include what you can read and note any uncertainties

Common dietary tag mappings:
- V, (V), vegetarian → vegetarian
- VG, (VG), vegan → vegan
- GF, (GF), gluten-free → gluten_free
- DF, dairy-free → dairy_free
- N, contains nuts → contains_nuts
- Spicy, hot → spicy

Price formats: Extract the price as shown (e.g., "12.99", "$15", "€8.50")

Respond ONLY with valid JSON in this exact format:
{
  "sections": [
    {
      "name": "Section Name",
      "items": [
        {
          "name": "Item Name",
          "description": "Item description if available",
          "price": "12.99",
          "dietaryTags": ["vegetarian", "gluten_free"]
        }
      ]
    }
  ],
  "confidence": "high" | "medium" | "low",
  "warnings": ["Any issues or unclear items noted here"]
}

Set confidence to:
- "high" if the image is clear and you extracted all items confidently
- "medium" if some items were unclear but most were extracted
- "low" if the image quality made extraction difficult

Include warnings for:
- Blurry or unreadable sections
- Prices that couldn't be determined
- Items that might be missing details`;

    const response = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4096,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image',
              source: {
                type: 'base64',
                media_type: mediaType,
                data: base64Image,
              },
            },
            {
              type: 'text',
              text: 'Please analyze this menu image and extract all menu items. Return the data as structured JSON only.',
            },
          ],
        },
      ],
      system: systemPrompt,
    });

    // Extract text content from response
    const textContent = response.content.find((c) => c.type === 'text');
    if (!textContent || textContent.type !== 'text') {
      throw new Error('No text response from vision API');
    }

    // Parse JSON from response
    const jsonText = textContent.text.trim();

    // Try to extract JSON if it's wrapped in markdown code blocks
    let cleanJson = jsonText;
    const jsonMatch = jsonText.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) {
      cleanJson = jsonMatch[1]!.trim();
    }

    try {
      const result = JSON.parse(cleanJson) as ExtractedMenu;

      // Validate structure
      if (!result.sections || !Array.isArray(result.sections)) {
        throw new Error('Invalid response structure: missing sections array');
      }

      // Ensure all sections have the required structure
      result.sections = result.sections.map((section) => ({
        name: section.name || 'Unnamed Section',
        items: (section.items || []).map((item) => ({
          name: item.name || 'Unnamed Item',
          description: item.description,
          price: item.price,
          dietaryTags: item.dietaryTags || [],
        })),
      }));

      // Set default confidence if not provided
      result.confidence = result.confidence || 'medium';

      return result;
    } catch (parseError) {
      throw new Error(`Failed to parse menu extraction response: ${parseError instanceof Error ? parseError.message : 'Unknown error'}`);
    }
  }
}

// Singleton instance
export const visionService = new VisionService();
