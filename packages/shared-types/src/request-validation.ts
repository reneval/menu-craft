/**
 * Advanced request validation schemas for API security and data integrity
 */

import { z } from 'zod';

// Query parameter validation
export const QueryParamsSchema = z.object({
  page: z.coerce.number().int().min(1).max(1000).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  sort: z.enum(['asc', 'desc']).default('asc'),
  search: z.string().max(200).optional(),
  filter: z.string().max(500).optional(),
});

export type QueryParams = z.infer<typeof QueryParamsSchema>;

// Bulk operation validation
export const BulkOperationSchema = z.object({
  action: z.enum(['delete', 'update', 'move', 'duplicate']),
  ids: z.array(z.string().uuid()).min(1, 'Must select at least one item').max(100, 'Cannot perform bulk operations on more than 100 items'),
  data: z.record(z.unknown()).optional(),
});

export type BulkOperation = z.infer<typeof BulkOperationSchema>;

// File upload validation
export const FileUploadSchema = z.object({
  filename: z.string().min(1).max(255).regex(/^[a-zA-Z0-9._-]+$/, 'Invalid filename format'),
  mimeType: z.enum([
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/gif',
    'application/pdf',
  ], { errorMap: () => ({ message: 'Invalid file type. Only images and PDFs are allowed.' }) }),
  size: z.number().int().min(1).max(5 * 1024 * 1024, 'File size cannot exceed 5MB'),
});

export type FileUpload = z.infer<typeof FileUploadSchema>;

// Search validation with security constraints
export const SearchSchema = z.object({
  query: z.string()
    .min(1, 'Search query cannot be empty')
    .max(200, 'Search query too long')
    .regex(/^[a-zA-Z0-9\s\-_.,!?'"()]+$/, 'Search query contains invalid characters'),
  filters: z.object({
    category: z.string().max(50).optional(),
    priceRange: z.object({
      min: z.number().min(0).optional(),
      max: z.number().min(0).optional(),
    }).optional(),
    tags: z.array(z.string().max(30)).max(10).optional(),
  }).optional(),
  pagination: QueryParamsSchema.pick({ page: true, limit: true }).optional(),
});

export type Search = z.infer<typeof SearchSchema>;

// Rate limiting validation
export const RateLimitSchema = z.object({
  requests: z.number().int().min(1).max(1000),
  windowMs: z.number().int().min(1000).max(3600000), // 1 second to 1 hour
  message: z.string().max(200).optional(),
});

export type RateLimit = z.infer<typeof RateLimitSchema>;

// Webhook validation
export const WebhookSchema = z.object({
  url: z.string().url().max(2048, 'Webhook URL too long').refine(url => {
    // Simple HTTPS validation
    return url.startsWith('https://');
  }, 'Webhook URL must use HTTPS'),
  events: z.array(z.string().max(50)).min(1, 'Must select at least one event').max(20, 'Cannot subscribe to more than 20 events'),
  secret: z.string().min(16, 'Webhook secret must be at least 16 characters').max(256, 'Webhook secret too long'),
  enabled: z.boolean().default(true),
  retryConfig: z.object({
    maxRetries: z.number().int().min(0).max(10).default(3),
    backoffMultiplier: z.number().min(1).max(10).default(2),
  }).optional(),
});

export type Webhook = z.infer<typeof WebhookSchema>;

// IP address validation
export const IpAddressSchema = z.string().refine(ip => {
  // Simple IPv4 validation
  const ipv4Regex = /^((25[0-5]|(2[0-4]|1\d|[1-9]|)\d)\.?\b){4}$/;
  // Simple IPv6 validation
  const ipv6Regex = /^(([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}|::1|::)$/;
  return ipv4Regex.test(ip) || ipv6Regex.test(ip);
}, 'Invalid IP address format');

// User agent validation
export const UserAgentSchema = z.string().max(512, 'User agent too long').refine(ua => {
  // Block potentially malicious user agents
  const suspiciousPatterns = /script|eval|javascript:|data:|vbscript:/i;
  return !suspiciousPatterns.test(ua);
}, 'Invalid user agent');

// Audit log validation
export const AuditLogSchema = z.object({
  action: z.string().max(100),
  resourceType: z.string().max(50),
  resourceId: z.string().uuid().optional(),
  metadata: z.record(z.unknown()).optional(),
  ipAddress: IpAddressSchema.optional(),
  userAgent: UserAgentSchema.optional(),
});

export type AuditLog = z.infer<typeof AuditLogSchema>;

// Content validation with advanced XSS protection
export const ContentSchema = z.object({
  title: z.string()
    .min(1, 'Title is required')
    .max(200, 'Title too long')
    .refine(title => !/<[^>]*>/g.test(title), 'Title cannot contain HTML tags'),
  content: z.string()
    .max(10000, 'Content too long')
    .refine(content => {
      // Advanced XSS detection
      const dangerousPatterns = [
        /<script[^>]*>.*?<\/script>/gi,
        /javascript:/gi,
        /on\w+\s*=/gi,
        /<iframe[^>]*>/gi,
        /<object[^>]*>/gi,
        /<embed[^>]*>/gi,
        /<form[^>]*>/gi,
      ];
      return !dangerousPatterns.some(pattern => pattern.test(content));
    }, 'Content contains potentially dangerous elements'),
  tags: z.array(z.string().max(30).regex(/^[a-zA-Z0-9_-]+$/)).max(20, 'Too many tags'),
});

export type Content = z.infer<typeof ContentSchema>;

// API versioning validation
export const ApiVersionSchema = z.enum(['v1', 'v2'], {
  errorMap: () => ({ message: 'Unsupported API version' })
});

export type ApiVersion = z.infer<typeof ApiVersionSchema>;

// Timezone validation
export const TimezoneSchema = z.string().refine(tz => {
  try {
    Intl.DateTimeFormat(undefined, { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}, 'Invalid timezone identifier');

// Language code validation (ISO 639-1)
export const LanguageCodeSchema = z.string().length(2).regex(/^[a-z]{2}$/, 'Must be a valid ISO 639-1 language code');

// Currency code validation (ISO 4217)
export const CurrencyCodeSchema = z.string().length(3).regex(/^[A-Z]{3}$/, 'Must be a valid ISO 4217 currency code');