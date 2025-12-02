import { describe, it, expect } from 'vitest';
import {
  CreateItemSchema,
  UpdateItemSchema,
  PriceTypeSchema,
  DietaryTagSchema,
  AllergenSchema,
  ReorderItemsSchema,
  MoveItemSchema,
  CreateItemOptionSchema,
} from '../items.js';

describe('PriceTypeSchema', () => {
  it('accepts valid price types', () => {
    expect(PriceTypeSchema.parse('fixed')).toBe('fixed');
    expect(PriceTypeSchema.parse('variable')).toBe('variable');
    expect(PriceTypeSchema.parse('market_price')).toBe('market_price');
  });

  it('rejects invalid price types', () => {
    expect(() => PriceTypeSchema.parse('free')).toThrow();
    expect(() => PriceTypeSchema.parse('')).toThrow();
  });
});

describe('DietaryTagSchema', () => {
  it('accepts all valid dietary tags', () => {
    const validTags = [
      'vegetarian', 'vegan', 'gluten_free', 'dairy_free',
      'nut_free', 'halal', 'kosher', 'spicy', 'organic',
    ];
    validTags.forEach(tag => {
      expect(DietaryTagSchema.parse(tag)).toBe(tag);
    });
  });

  it('rejects invalid dietary tags', () => {
    expect(() => DietaryTagSchema.parse('unknown')).toThrow();
    expect(() => DietaryTagSchema.parse('veg')).toThrow();
  });
});

describe('AllergenSchema', () => {
  it('accepts all valid allergens', () => {
    const validAllergens = [
      'gluten', 'crustaceans', 'eggs', 'fish', 'peanuts',
      'soybeans', 'milk', 'nuts', 'celery', 'mustard',
      'sesame', 'sulphites', 'lupin', 'molluscs',
    ];
    validAllergens.forEach(allergen => {
      expect(AllergenSchema.parse(allergen)).toBe(allergen);
    });
  });

  it('rejects invalid allergens', () => {
    expect(() => AllergenSchema.parse('unknown')).toThrow();
    expect(() => AllergenSchema.parse('nut')).toThrow(); // should be 'nuts'
  });
});

describe('CreateItemOptionSchema', () => {
  it('validates minimal option', () => {
    const result = CreateItemOptionSchema.parse({
      optionGroup: 'Size',
      name: 'Large',
    });
    expect(result).toEqual({
      optionGroup: 'Size',
      name: 'Large',
      priceModifier: 0,
    });
  });

  it('accepts price modifier', () => {
    const result = CreateItemOptionSchema.parse({
      optionGroup: 'Size',
      name: 'Extra Large',
      priceModifier: 200, // +$2.00
    });
    expect(result.priceModifier).toBe(200);
  });

  it('rejects empty option group', () => {
    expect(() => CreateItemOptionSchema.parse({
      optionGroup: '',
      name: 'Large',
    })).toThrow();
  });

  it('rejects option group over 50 characters', () => {
    expect(() => CreateItemOptionSchema.parse({
      optionGroup: 'a'.repeat(51),
      name: 'Large',
    })).toThrow();
  });
});

describe('CreateItemSchema', () => {
  it('validates minimal item', () => {
    const result = CreateItemSchema.parse({ name: 'Burger' });
    expect(result).toEqual({
      name: 'Burger',
      priceType: 'fixed',
      dietaryTags: [],
      allergens: [],
      isAvailable: true,
    });
  });

  it('validates complete item', () => {
    const data = {
      name: 'Veggie Burger',
      description: 'Delicious plant-based burger',
      priceType: 'fixed',
      priceAmount: 1499, // $14.99
      dietaryTags: ['vegetarian', 'vegan'],
      allergens: ['gluten', 'soybeans'],
      imageUrl: 'https://example.com/burger.jpg',
      isAvailable: true,
    };
    const result = CreateItemSchema.parse(data);
    expect(result.name).toBe('Veggie Burger');
    expect(result.dietaryTags).toEqual(['vegetarian', 'vegan']);
    expect(result.priceAmount).toBe(1499);
  });

  it('validates item with options', () => {
    const data = {
      name: 'Coffee',
      options: [
        { optionGroup: 'Size', name: 'Small', priceModifier: 0 },
        { optionGroup: 'Size', name: 'Large', priceModifier: 100 },
      ],
    };
    const result = CreateItemSchema.parse(data);
    expect(result.options).toHaveLength(2);
  });

  it('rejects empty name', () => {
    expect(() => CreateItemSchema.parse({ name: '' })).toThrow();
  });

  it('rejects name over 100 characters', () => {
    expect(() => CreateItemSchema.parse({ name: 'a'.repeat(101) })).toThrow();
  });

  it('rejects description over 500 characters', () => {
    expect(() => CreateItemSchema.parse({
      name: 'Item',
      description: 'a'.repeat(501),
    })).toThrow();
  });

  it('rejects invalid image URL', () => {
    expect(() => CreateItemSchema.parse({
      name: 'Item',
      imageUrl: 'not-a-url',
    })).toThrow();
  });

  it('rejects invalid dietary tags', () => {
    expect(() => CreateItemSchema.parse({
      name: 'Item',
      dietaryTags: ['invalid-tag'],
    })).toThrow();
  });

  it('rejects non-integer price', () => {
    expect(() => CreateItemSchema.parse({
      name: 'Item',
      priceAmount: 14.99, // should be integer in cents
    })).toThrow();
  });
});

describe('UpdateItemSchema', () => {
  it('accepts empty object', () => {
    const result = UpdateItemSchema.parse({});
    expect(result).toEqual({});
  });

  it('accepts partial update', () => {
    const result = UpdateItemSchema.parse({
      name: 'New Name',
      isAvailable: false,
    });
    expect(result).toEqual({
      name: 'New Name',
      isAvailable: false,
    });
  });

  it('allows setting description to null', () => {
    const result = UpdateItemSchema.parse({ description: null });
    expect(result.description).toBeNull();
  });

  it('allows setting price to null (for market_price)', () => {
    const result = UpdateItemSchema.parse({
      priceType: 'market_price',
      priceAmount: null,
    });
    expect(result.priceAmount).toBeNull();
  });

  it('allows updating options', () => {
    const result = UpdateItemSchema.parse({
      options: [
        { optionGroup: 'Size', name: 'Small' },
      ],
    });
    expect(result.options).toHaveLength(1);
  });
});

describe('ReorderItemsSchema', () => {
  it('validates array of UUIDs', () => {
    const data = {
      itemIds: [
        '550e8400-e29b-41d4-a716-446655440000',
        '550e8400-e29b-41d4-a716-446655440001',
      ],
    };
    const result = ReorderItemsSchema.parse(data);
    expect(result.itemIds).toHaveLength(2);
  });

  it('accepts empty array', () => {
    const result = ReorderItemsSchema.parse({ itemIds: [] });
    expect(result.itemIds).toEqual([]);
  });

  it('rejects non-UUID strings', () => {
    expect(() => ReorderItemsSchema.parse({
      itemIds: ['not-a-uuid'],
    })).toThrow();
  });
});

describe('MoveItemSchema', () => {
  it('validates target section ID', () => {
    const result = MoveItemSchema.parse({
      targetSectionId: '550e8400-e29b-41d4-a716-446655440000',
    });
    expect(result.targetSectionId).toBe('550e8400-e29b-41d4-a716-446655440000');
  });

  it('accepts optional sort order', () => {
    const result = MoveItemSchema.parse({
      targetSectionId: '550e8400-e29b-41d4-a716-446655440000',
      sortOrder: 5,
    });
    expect(result.sortOrder).toBe(5);
  });

  it('rejects non-integer sort order', () => {
    expect(() => MoveItemSchema.parse({
      targetSectionId: '550e8400-e29b-41d4-a716-446655440000',
      sortOrder: 5.5,
    })).toThrow();
  });

  it('rejects invalid UUID', () => {
    expect(() => MoveItemSchema.parse({
      targetSectionId: 'invalid',
    })).toThrow();
  });
});
