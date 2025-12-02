import { describe, it, expect } from 'vitest';
import { CreateMenuSchema, UpdateMenuSchema, ThemeConfigSchema, MenuStatusSchema } from '../menus.js';

describe('MenuStatusSchema', () => {
  it('accepts valid statuses', () => {
    expect(MenuStatusSchema.parse('draft')).toBe('draft');
    expect(MenuStatusSchema.parse('published')).toBe('published');
    expect(MenuStatusSchema.parse('archived')).toBe('archived');
  });

  it('rejects invalid statuses', () => {
    expect(() => MenuStatusSchema.parse('unknown')).toThrow();
    expect(() => MenuStatusSchema.parse('')).toThrow();
  });
});

describe('ThemeConfigSchema', () => {
  it('applies defaults for empty object', () => {
    const result = ThemeConfigSchema.parse({});
    expect(result).toEqual({
      primaryColor: '#3b82f6',
      backgroundColor: '#ffffff',
      textColor: '#1f2937',
      fontFamily: 'Inter',
      borderRadius: 8,
    });
  });

  it('accepts custom values', () => {
    const config = {
      primaryColor: '#ff0000',
      backgroundColor: '#000000',
      textColor: '#ffffff',
      fontFamily: 'Roboto',
      borderRadius: 16,
    };
    const result = ThemeConfigSchema.parse(config);
    expect(result).toEqual(config);
  });

  it('allows custom CSS', () => {
    const result = ThemeConfigSchema.parse({
      customCss: '.menu-item { font-weight: bold; }',
    });
    expect(result.customCss).toBe('.menu-item { font-weight: bold; }');
  });

  it('passes through unknown properties', () => {
    const result = ThemeConfigSchema.parse({
      unknownProp: 'value',
    });
    expect((result as Record<string, unknown>).unknownProp).toBe('value');
  });
});

describe('CreateMenuSchema', () => {
  it('validates minimal required fields', () => {
    const result = CreateMenuSchema.parse({ name: 'Lunch Menu' });
    expect(result).toEqual({ name: 'Lunch Menu' });
  });

  it('validates with all fields', () => {
    const data = {
      name: 'Dinner Menu',
      slug: 'dinner-menu',
      themeConfig: { primaryColor: '#ff0000' },
    };
    const result = CreateMenuSchema.parse(data);
    expect(result.name).toBe('Dinner Menu');
    expect(result.slug).toBe('dinner-menu');
  });

  it('rejects empty name', () => {
    expect(() => CreateMenuSchema.parse({ name: '' })).toThrow();
  });

  it('rejects name over 100 characters', () => {
    const longName = 'a'.repeat(101);
    expect(() => CreateMenuSchema.parse({ name: longName })).toThrow();
  });

  it('accepts name at exactly 100 characters', () => {
    const name = 'a'.repeat(100);
    const result = CreateMenuSchema.parse({ name });
    expect(result.name).toBe(name);
  });

  it('rejects invalid slug format', () => {
    expect(() => CreateMenuSchema.parse({ name: 'Test', slug: 'Invalid Slug!' })).toThrow();
  });

  it('accepts valid slug format', () => {
    const result = CreateMenuSchema.parse({ name: 'Test', slug: 'valid-slug-123' });
    expect(result.slug).toBe('valid-slug-123');
  });
});

describe('UpdateMenuSchema', () => {
  it('accepts empty object (no updates)', () => {
    const result = UpdateMenuSchema.parse({});
    expect(result).toEqual({});
  });

  it('accepts partial updates', () => {
    const result = UpdateMenuSchema.parse({ name: 'New Name' });
    expect(result).toEqual({ name: 'New Name' });
  });

  it('accepts sort order update', () => {
    const result = UpdateMenuSchema.parse({ sortOrder: 5 });
    expect(result.sortOrder).toBe(5);
  });

  it('rejects non-integer sort order', () => {
    expect(() => UpdateMenuSchema.parse({ sortOrder: 5.5 })).toThrow();
  });

  it('accepts partial theme config update', () => {
    const result = UpdateMenuSchema.parse({
      themeConfig: { primaryColor: '#ff0000' },
    });
    expect(result.themeConfig).toEqual({ primaryColor: '#ff0000' });
  });
});
