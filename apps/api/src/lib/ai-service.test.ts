import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock environment variables before imports
vi.mock('../config/env.js', () => ({
  env: {
    ANTHROPIC_API_KEY: 'test_api_key',
  },
}));

// Mock redis cache
vi.mock('./redis-cache.js', () => ({
  redisCache: {
    getOrSet: vi.fn((key: string, fn: () => Promise<unknown>) => fn()),
    flush: vi.fn().mockResolvedValue(undefined),
  },
}));

// Mock Anthropic
const mockCreate = vi.fn();
vi.mock('@anthropic-ai/sdk', () => ({
  default: vi.fn().mockImplementation(() => ({
    messages: {
      create: mockCreate,
    },
  })),
}));

describe('AIService', () => {
  let AIService: typeof import('./ai-service.js').AIService;

  beforeEach(async () => {
    vi.clearAllMocks();
    // Reset module cache to get fresh instance
    vi.resetModules();
    const module = await import('./ai-service.js');
    AIService = module.AIService;
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('constructor', () => {
    it('should initialize when API key is present', () => {
      const service = new AIService();
      expect(service.isAvailable()).toBe(true);
    });
  });

  describe('generateDescription', () => {
    it('should generate description for a menu item', async () => {
      mockCreate.mockResolvedValueOnce({
        content: [{ type: 'text', text: 'A delicious grilled salmon with herbs' }],
      });

      const service = new AIService();
      const result = await service.generateDescription({
        itemName: 'Grilled Salmon',
        category: 'Main Courses',
      });

      expect(result).toBe('A delicious grilled salmon with herbs');
      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          model: expect.any(String),
          max_tokens: 200,
          messages: expect.any(Array),
        })
      );
    });

    it('should throw error when item name is empty', async () => {
      const service = new AIService();

      await expect(
        service.generateDescription({ itemName: '' })
      ).rejects.toThrow('Item name is required');
    });

    it('should throw error when item name is whitespace', async () => {
      const service = new AIService();

      await expect(
        service.generateDescription({ itemName: '   ' })
      ).rejects.toThrow('Item name is required');
    });

    it('should improve existing description when provided', async () => {
      mockCreate.mockResolvedValueOnce({
        content: [{ type: 'text', text: 'Fresh Atlantic salmon, expertly grilled' }],
      });

      const service = new AIService();
      const result = await service.generateDescription({
        itemName: 'Grilled Salmon',
        existingDescription: 'Fish with sauce',
      });

      expect(result).toBe('Fresh Atlantic salmon, expertly grilled');
      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          messages: expect.arrayContaining([
            expect.objectContaining({
              content: expect.stringContaining('Improve this menu item description'),
            }),
          ]),
        })
      );
    });

    it('should throw error when no text response', async () => {
      mockCreate.mockResolvedValueOnce({
        content: [],
      });

      const service = new AIService();

      await expect(
        service.generateDescription({ itemName: 'Test Item' })
      ).rejects.toThrow('No text response from AI');
    });
  });

  describe('suggestPrice', () => {
    it('should suggest price ranges for a menu item', async () => {
      mockCreate.mockResolvedValueOnce({
        content: [{
          type: 'text',
          text: JSON.stringify({
            low: 1299,
            mid: 1899,
            high: 2499,
            reasoning: 'Based on typical salmon prices',
          }),
        }],
      });

      const service = new AIService();
      const result = await service.suggestPrice({
        itemName: 'Grilled Salmon',
        currency: 'USD',
      });

      expect(result).toEqual({
        low: 1299,
        mid: 1899,
        high: 2499,
        currency: 'USD',
        reasoning: 'Based on typical salmon prices',
      });
    });

    it('should throw error when item name is empty', async () => {
      const service = new AIService();

      await expect(
        service.suggestPrice({ itemName: '' })
      ).rejects.toThrow('Item name is required');
    });

    it('should use USD as default currency', async () => {
      mockCreate.mockResolvedValueOnce({
        content: [{
          type: 'text',
          text: JSON.stringify({ low: 999, mid: 1499, high: 1999 }),
        }],
      });

      const service = new AIService();
      const result = await service.suggestPrice({
        itemName: 'Test Item',
      });

      expect(result.currency).toBe('USD');
    });

    it('should throw error when JSON parsing fails', async () => {
      mockCreate.mockResolvedValueOnce({
        content: [{ type: 'text', text: 'invalid json' }],
      });

      const service = new AIService();

      await expect(
        service.suggestPrice({ itemName: 'Test Item' })
      ).rejects.toThrow('Failed to parse price suggestions');
    });

    it('should round prices to integers', async () => {
      mockCreate.mockResolvedValueOnce({
        content: [{
          type: 'text',
          text: JSON.stringify({ low: 999.5, mid: 1499.7, high: 1999.2 }),
        }],
      });

      const service = new AIService();
      const result = await service.suggestPrice({
        itemName: 'Test Item',
      });

      expect(result.low).toBe(1000);
      expect(result.mid).toBe(1500);
      expect(result.high).toBe(1999);
    });
  });

  describe('suggestTags', () => {
    it('should suggest dietary tags and allergens', async () => {
      mockCreate.mockResolvedValueOnce({
        content: [{
          type: 'text',
          text: JSON.stringify({
            dietaryTags: ['vegetarian', 'gluten_free'],
            allergens: ['milk', 'eggs'],
            reasoning: 'Based on typical ingredients',
          }),
        }],
      });

      const service = new AIService();
      const result = await service.suggestTags({
        itemName: 'Vegetable Quiche',
        description: 'A savory pastry with vegetables and cheese',
      });

      expect(result.dietaryTags).toContain('vegetarian');
      expect(result.dietaryTags).toContain('gluten_free');
      expect(result.allergens).toContain('milk');
      expect(result.allergens).toContain('eggs');
    });

    it('should throw error when item name is empty', async () => {
      const service = new AIService();

      await expect(
        service.suggestTags({ itemName: '' })
      ).rejects.toThrow('Item name is required');
    });

    it('should filter out invalid dietary tags', async () => {
      mockCreate.mockResolvedValueOnce({
        content: [{
          type: 'text',
          text: JSON.stringify({
            dietaryTags: ['vegetarian', 'invalid_tag', 'vegan'],
            allergens: ['milk'],
          }),
        }],
      });

      const service = new AIService();
      const result = await service.suggestTags({
        itemName: 'Test Item',
      });

      expect(result.dietaryTags).toContain('vegetarian');
      expect(result.dietaryTags).toContain('vegan');
      expect(result.dietaryTags).not.toContain('invalid_tag');
    });

    it('should filter out invalid allergens', async () => {
      mockCreate.mockResolvedValueOnce({
        content: [{
          type: 'text',
          text: JSON.stringify({
            dietaryTags: [],
            allergens: ['milk', 'invalid_allergen', 'gluten'],
          }),
        }],
      });

      const service = new AIService();
      const result = await service.suggestTags({
        itemName: 'Test Item',
      });

      expect(result.allergens).toContain('milk');
      expect(result.allergens).toContain('gluten');
      expect(result.allergens).not.toContain('invalid_allergen');
    });

    it('should throw error when JSON parsing fails', async () => {
      mockCreate.mockResolvedValueOnce({
        content: [{ type: 'text', text: 'invalid json' }],
      });

      const service = new AIService();

      await expect(
        service.suggestTags({ itemName: 'Test Item' })
      ).rejects.toThrow('Failed to parse tag suggestions');
    });
  });

  describe('isAvailable', () => {
    it('should return true when API key is configured', () => {
      const service = new AIService();
      expect(service.isAvailable()).toBe(true);
    });
  });

  describe('clearCache', () => {
    it('should clear the AI suggestions cache', async () => {
      const { redisCache } = await import('./redis-cache.js');
      const service = new AIService();

      const result = await service.clearCache();

      expect(result).toBe(true);
      expect(redisCache.flush).toHaveBeenCalledWith('ai-suggestions');
    });
  });
});

describe('AIService (disabled)', () => {
  beforeEach(async () => {
    vi.resetModules();
    // Mock env without API key
    vi.doMock('../config/env.js', () => ({
      env: {
        ANTHROPIC_API_KEY: undefined,
      },
    }));
  });

  afterEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  it('should not be available when API key is missing', async () => {
    const { AIService } = await import('./ai-service.js');
    const service = new AIService();
    expect(service.isAvailable()).toBe(false);
  });

  it('should throw error when trying to generate description', async () => {
    const { AIService } = await import('./ai-service.js');
    const service = new AIService();

    await expect(
      service.generateDescription({ itemName: 'Test' })
    ).rejects.toThrow('AI service is not enabled');
  });

  it('should throw error when trying to suggest price', async () => {
    const { AIService } = await import('./ai-service.js');
    const service = new AIService();

    await expect(
      service.suggestPrice({ itemName: 'Test' })
    ).rejects.toThrow('AI service is not enabled');
  });

  it('should throw error when trying to suggest tags', async () => {
    const { AIService } = await import('./ai-service.js');
    const service = new AIService();

    await expect(
      service.suggestTags({ itemName: 'Test' })
    ).rejects.toThrow('AI service is not enabled');
  });
});
