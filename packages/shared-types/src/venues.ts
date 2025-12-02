import { z } from 'zod';
import { SlugSchema, TimestampSchema } from './common.js';

export const AddressSchema = z
  .object({
    street: z.string().optional(),
    city: z.string().optional(),
    state: z.string().optional(),
    postalCode: z.string().optional(),
    country: z.string().optional(),
  })
  .passthrough();

export type Address = z.infer<typeof AddressSchema>;

export const VenueSchema = z.object({
  id: z.string().uuid(),
  organizationId: z.string().uuid(),
  name: z.string().min(1).max(100),
  slug: SlugSchema,
  timezone: z.string().default('UTC'),
  address: AddressSchema,
  logoUrl: z.string().url().nullable(),
  deletedAt: TimestampSchema.nullable(),
  createdAt: TimestampSchema,
  updatedAt: TimestampSchema,
});

export type Venue = z.infer<typeof VenueSchema>;

export const CreateVenueSchema = z.object({
  name: z.string().min(1).max(100),
  slug: SlugSchema.optional(),
  timezone: z.string().optional(),
  address: AddressSchema.optional(),
});

export type CreateVenue = z.infer<typeof CreateVenueSchema>;

export const UpdateVenueSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  slug: SlugSchema.optional(),
  timezone: z.string().optional(),
  address: AddressSchema.optional(),
  logoUrl: z.string().url().nullable().optional(),
});

export type UpdateVenue = z.infer<typeof UpdateVenueSchema>;
