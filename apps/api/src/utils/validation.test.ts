import { describe, it, expect, vi } from 'vitest';
import { z } from 'zod';
import {
  validate,
  validateWithHeaders,
  validateFileUpload,
  sanitizeInput,
  checkRateLimit,
} from './validation.js';
import { ValidationError } from './errors.js';

describe('validate', () => {
  const testSchema = z.object({
    name: z.string().min(1),
    age: z.number().positive(),
  });

  it('should return parsed data for valid input', () => {
    const input = { name: 'John', age: 25 };
    const result = validate(testSchema, input);

    expect(result).toEqual(input);
  });

  it('should throw ValidationError for invalid input', () => {
    const input = { name: '', age: -1 };

    expect(() => validate(testSchema, input)).toThrow(ValidationError);
  });

  it('should include field paths in error details', () => {
    const input = { name: '', age: 'not a number' };

    try {
      validate(testSchema, input);
      expect.fail('Should have thrown');
    } catch (error) {
      expect(error).toBeInstanceOf(ValidationError);
      const validationError = error as ValidationError;
      expect(validationError.details).toHaveProperty('name');
      expect(validationError.details).toHaveProperty('age');
    }
  });

  it('should handle nested paths', () => {
    const nestedSchema = z.object({
      user: z.object({
        email: z.string().email(),
      }),
    });

    try {
      validate(nestedSchema, { user: { email: 'invalid' } });
      expect.fail('Should have thrown');
    } catch (error) {
      expect(error).toBeInstanceOf(ValidationError);
      const validationError = error as ValidationError;
      expect(validationError.details).toHaveProperty('user.email');
    }
  });

  it('should rethrow non-Zod errors', () => {
    const errorSchema = {
      parse: () => {
        throw new Error('Custom error');
      },
    } as unknown as z.ZodSchema;

    expect(() => validate(errorSchema, {})).toThrow('Custom error');
  });
});

describe('validateWithHeaders', () => {
  const testSchema = z.object({
    data: z.string(),
  });

  it('should validate data with valid headers', () => {
    const input = { data: 'test' };
    const headers = { 'user-agent': 'TestAgent', origin: 'http://localhost' };

    const result = validateWithHeaders(testSchema, input, headers);

    expect(result).toEqual(input);
  });

  it('should throw error when User-Agent is missing', () => {
    const input = { data: 'test' };
    const headers = { origin: 'http://localhost' };

    expect(() => validateWithHeaders(testSchema, input, headers)).toThrow(ValidationError);
  });

  it('should throw error for dangerous script content in headers', () => {
    const input = { data: 'test' };
    const headers = {
      'user-agent': 'TestAgent',
      'x-custom': '<script>alert("xss")</script>',
    };

    expect(() => validateWithHeaders(testSchema, input, headers)).toThrow(ValidationError);
  });

  it('should throw error for javascript: URLs in headers', () => {
    const input = { data: 'test' };
    const headers = {
      'user-agent': 'TestAgent',
      referer: 'javascript:alert(1)',
    };

    expect(() => validateWithHeaders(testSchema, input, headers)).toThrow(ValidationError);
  });

  it('should throw error for data: URLs in headers', () => {
    const input = { data: 'test' };
    const headers = {
      'user-agent': 'TestAgent',
      'x-custom': 'data:text/html,<script>alert(1)</script>',
    };

    expect(() => validateWithHeaders(testSchema, input, headers)).toThrow(ValidationError);
  });

  it('should work without headers', () => {
    const input = { data: 'test' };

    const result = validateWithHeaders(testSchema, input);

    expect(result).toEqual(input);
  });
});

describe('validateFileUpload', () => {
  it('should accept valid image file', () => {
    const file = {
      size: 1024 * 1024, // 1MB
      mimetype: 'image/jpeg',
    };

    expect(() => validateFileUpload(file)).not.toThrow();
  });

  it('should throw error when file is missing', () => {
    expect(() => validateFileUpload(null)).toThrow(ValidationError);
    expect(() => validateFileUpload(undefined)).toThrow(ValidationError);
  });

  it('should throw error when file is not an object', () => {
    expect(() => validateFileUpload('not an object')).toThrow(ValidationError);
  });

  it('should throw error when file exceeds 5MB', () => {
    const file = {
      size: 6 * 1024 * 1024, // 6MB
      mimetype: 'image/jpeg',
    };

    try {
      validateFileUpload(file);
      expect.fail('Should have thrown');
    } catch (error) {
      expect(error).toBeInstanceOf(ValidationError);
      const validationError = error as ValidationError;
      expect(validationError.details?.file?.[0]).toContain('5MB');
    }
  });

  it('should throw error for disallowed MIME type', () => {
    const file = {
      size: 1024,
      mimetype: 'application/pdf',
    };

    try {
      validateFileUpload(file);
      expect.fail('Should have thrown');
    } catch (error) {
      expect(error).toBeInstanceOf(ValidationError);
      const validationError = error as ValidationError;
      expect(validationError.details?.file?.[0]).toContain('not allowed');
    }
  });

  it('should accept custom allowed types', () => {
    const file = {
      size: 1024,
      mimetype: 'application/pdf',
    };

    expect(() => validateFileUpload(file, ['application/pdf'])).not.toThrow();
  });

  it('should accept all default image types', () => {
    const types = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

    for (const mimetype of types) {
      const file = { size: 1024, mimetype };
      expect(() => validateFileUpload(file)).not.toThrow();
    }
  });
});

describe('sanitizeInput', () => {
  it('should trim whitespace', () => {
    expect(sanitizeInput('  hello  ')).toBe('hello');
  });

  it('should remove HTML angle brackets', () => {
    expect(sanitizeInput('<script>alert(1)</script>')).toBe('scriptalert(1)/script');
  });

  it('should limit length to 1000 characters', () => {
    const longInput = 'a'.repeat(2000);
    const result = sanitizeInput(longInput);

    expect(result.length).toBe(1000);
  });

  it('should return empty string for non-string input', () => {
    expect(sanitizeInput(123)).toBe('');
    expect(sanitizeInput(null)).toBe('');
    expect(sanitizeInput(undefined)).toBe('');
    expect(sanitizeInput({})).toBe('');
  });

  it('should handle empty string', () => {
    expect(sanitizeInput('')).toBe('');
  });

  it('should preserve valid characters', () => {
    expect(sanitizeInput('Hello, World! 123')).toBe('Hello, World! 123');
  });
});

describe('checkRateLimit', () => {
  it('should allow requests under limit', () => {
    const result = checkRateLimit('test-user-1', 100, 60000);

    expect(result.allowed).toBe(true);
    expect(result.remaining).toBeDefined();
  });

  it('should return remaining count', () => {
    const result = checkRateLimit('test-user-2', 10, 60000);

    expect(result.remaining).toBe(9);
  });

  it('should use default limit of 100', () => {
    const result = checkRateLimit('test-user-3');

    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(99);
  });

  it('should track requests per identifier', () => {
    const result1 = checkRateLimit('user-a', 10);
    const result2 = checkRateLimit('user-b', 10);

    expect(result1.remaining).toBe(9);
    expect(result2.remaining).toBe(9);
  });
});
