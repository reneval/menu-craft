import { type ZodSchema, ZodError } from 'zod';
import { ValidationError } from './errors.js';
import { QueryParamsSchema, type QueryParams } from '@menucraft/shared-types';

export function validate<T>(schema: ZodSchema<T>, data: unknown): T {
  try {
    return schema.parse(data);
  } catch (error) {
    if (error instanceof ZodError) {
      const details: Record<string, string[]> = {};
      for (const issue of error.issues) {
        const path = issue.path.join('.') || '_root';
        if (!details[path]) {
          details[path] = [];
        }
        details[path].push(issue.message);
      }
      throw new ValidationError(details);
    }
    throw error;
  }
}

// Enhanced validation with security headers check
export function validateWithHeaders<T>(
  schema: ZodSchema<T>,
  data: unknown,
  headers?: Record<string, string>
): T {
  // Check for required security headers
  if (headers) {
    const requiredHeaders = ['user-agent', 'origin'];
    for (const header of requiredHeaders) {
      if (!headers[header] && header === 'user-agent') {
        throw new ValidationError({ '_headers': ['Missing User-Agent header'] });
      }
    }

    // Basic XSS protection in headers
    const dangerousPatterns = /<script|javascript:|data:|vbscript:/i;
    for (const [key, value] of Object.entries(headers)) {
      if (dangerousPatterns.test(value)) {
        throw new ValidationError({ [`_headers.${key}`]: ['Header contains potentially dangerous content'] });
      }
    }
  }

  return validate(schema, data);
}

// Query parameter validation helper
export function validateQueryParams(query: unknown): QueryParams {
  // Zod schema with defaults will ensure these fields are always present after parsing
  return validate(QueryParamsSchema, query) as QueryParams;
}

// File upload validation helper
export function validateFileUpload(file: unknown, allowedTypes?: string[]): void {
  if (!file || typeof file !== 'object') {
    throw new ValidationError({ file: ['File is required'] });
  }

  const fileObj = file as any;

  // Check file size (5MB limit)
  if (fileObj.size && fileObj.size > 5 * 1024 * 1024) {
    throw new ValidationError({ file: ['File size cannot exceed 5MB'] });
  }

  // Check allowed MIME types
  const defaultAllowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
  const permitted = allowedTypes || defaultAllowedTypes;

  if (fileObj.mimetype && !permitted.includes(fileObj.mimetype)) {
    throw new ValidationError({
      file: [`File type not allowed. Permitted types: ${permitted.join(', ')}`]
    });
  }
}

// Sanitization helper for user input
export function sanitizeInput(input: unknown): string {
  if (typeof input !== 'string') {
    return '';
  }

  return input
    .trim()
    .replace(/[<>]/g, '') // Remove basic HTML characters
    .substring(0, 1000); // Limit length
}

// Rate limiting validation
export interface RateLimitResult {
  allowed: boolean;
  resetTime?: Date;
  remaining?: number;
}

export function checkRateLimit(
  identifier: string,
  limit: number = 100,
  windowMs: number = 60000
): RateLimitResult {
  // This is a simple in-memory rate limiter
  // In production, use Redis or a proper rate limiting service

  const now = Date.now();
  const windowStart = now - windowMs;

  // Simple in-memory store (replace with Redis in production)
  const store = new Map<string, number[]>();

  const requests = store.get(identifier) || [];
  const validRequests = requests.filter(time => time > windowStart);

  if (validRequests.length >= limit) {
    const firstRequest = validRequests[0];
    return {
      allowed: false,
      resetTime: firstRequest ? new Date(firstRequest + windowMs) : undefined,
      remaining: 0
    };
  }

  validRequests.push(now);
  store.set(identifier, validRequests);

  return {
    allowed: true,
    remaining: limit - validRequests.length
  };
}
