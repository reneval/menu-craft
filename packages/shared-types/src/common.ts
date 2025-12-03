import { z } from 'zod';

// API Response envelope types
export const ApiSuccessSchema = <T extends z.ZodTypeAny>(dataSchema: T) =>
  z.object({
    success: z.literal(true),
    data: dataSchema,
  });

export const ApiErrorSchema = z.object({
  success: z.literal(false),
  error: z.object({
    code: z.string(),
    message: z.string(),
    details: z.record(z.array(z.string())).optional(),
    requestId: z.string().optional(),
  }),
});

export type ApiSuccess<T> = {
  success: true;
  data: T;
};

export type ApiError = z.infer<typeof ApiErrorSchema>;

export type ApiResponse<T> = ApiSuccess<T> | ApiError;

// Pagination
export const PaginationParamsSchema = z.object({
  cursor: z.string().optional(),
  limit: z.coerce.number().min(1).max(100).default(20),
});

export type PaginationParams = z.infer<typeof PaginationParamsSchema>;

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    nextCursor: string | null;
    hasMore: boolean;
  };
}

// Common error codes
export const ErrorCodes = {
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  NOT_FOUND: 'NOT_FOUND',
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  CONFLICT: 'CONFLICT',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  RATE_LIMITED: 'RATE_LIMITED',
} as const;

export type ErrorCode = (typeof ErrorCodes)[keyof typeof ErrorCodes];

// Common field schemas
export const SlugSchema = z
  .string()
  .min(2, 'Slug must be at least 2 characters')
  .max(100, 'Slug must not exceed 100 characters')
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Slug must be lowercase with hyphens only')
  .refine(val => !val.startsWith('-') && !val.endsWith('-'), 'Slug cannot start or end with hyphen');

export const TimestampSchema = z.coerce.date();

export const SoftDeleteSchema = z.object({
  deletedAt: TimestampSchema.nullable(),
});

// Enhanced validation schemas
export const UrlSchema = z
  .string()
  .url('Must be a valid URL')
  .max(2048, 'URL must not exceed 2048 characters')
  .refine(url => {
    // Simple protocol validation without URL constructor
    return url.startsWith('http://') || url.startsWith('https://');
  }, 'URL must use HTTP or HTTPS protocol');

export const EmailSchema = z
  .string()
  .email('Must be a valid email address')
  .max(254, 'Email must not exceed 254 characters')
  .toLowerCase();

export const PhoneSchema = z
  .string()
  .regex(/^\+?[1-9]\d{1,14}$/, 'Must be a valid phone number in E.164 format')
  .max(18, 'Phone number must not exceed 18 characters');

// Price validation (in cents)
export const PriceSchema = z
  .number()
  .int('Price must be a whole number (in cents)')
  .min(0, 'Price cannot be negative')
  .max(1000000, 'Price cannot exceed $10,000'); // 10k USD in cents

// Text content schemas with XSS protection
export const SafeTextSchema = (maxLength: number = 1000) => z
  .string()
  .max(maxLength, `Text must not exceed ${maxLength} characters`)
  .refine(text => !/<script|javascript:|on\w+=/i.test(text), 'Text contains potentially dangerous content');

export const NameSchema = z
  .string()
  .min(1, 'Name is required')
  .max(100, 'Name must not exceed 100 characters')
  .regex(/^[a-zA-Z0-9\s\-&'.,()]+$/, 'Name contains invalid characters');

export const DescriptionSchema = z
  .string()
  .max(1000, 'Description must not exceed 1000 characters')
  .refine(text => !/<script|javascript:|on\w+=/i.test(text), 'Description contains potentially dangerous content');
