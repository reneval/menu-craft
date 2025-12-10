import { z } from 'zod';
import { SlugSchema, TimestampSchema } from './common.js';
import { VenueIdSchema, OrganizationIdSchema } from './branded.js';

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

// Opening hours for a single day
export const DayHoursSchema = z.object({
  open: z.string().regex(/^\d{2}:\d{2}$/, 'Must be in HH:MM format'), // e.g., "09:00"
  close: z.string().regex(/^\d{2}:\d{2}$/, 'Must be in HH:MM format'), // e.g., "22:00"
  closed: z.boolean().optional(), // If true, venue is closed this day
});

export type DayHours = z.infer<typeof DayHoursSchema>;

// Full week opening hours
export const OpeningHoursSchema = z.object({
  monday: DayHoursSchema.optional(),
  tuesday: DayHoursSchema.optional(),
  wednesday: DayHoursSchema.optional(),
  thursday: DayHoursSchema.optional(),
  friday: DayHoursSchema.optional(),
  saturday: DayHoursSchema.optional(),
  sunday: DayHoursSchema.optional(),
});

export type OpeningHours = z.infer<typeof OpeningHoursSchema>;

export const VenueSchema = z.object({
  id: VenueIdSchema,
  organizationId: OrganizationIdSchema,
  name: z.string().min(1).max(100),
  slug: SlugSchema,
  timezone: z.string().default('UTC'),
  address: AddressSchema,
  phone: z.string().nullable(),
  website: z.string().url().nullable(),
  openingHours: OpeningHoursSchema.nullable(),
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
  phone: z.string().optional(),
  website: z.string().url().optional(),
  openingHours: OpeningHoursSchema.optional(),
});

export type CreateVenue = z.infer<typeof CreateVenueSchema>;

export const UpdateVenueSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  slug: SlugSchema.optional(),
  timezone: z.string().optional(),
  address: AddressSchema.optional(),
  phone: z.string().nullable().optional(),
  website: z.string().url().nullable().optional(),
  openingHours: OpeningHoursSchema.nullable().optional(),
  logoUrl: z.string().url().nullable().optional(),
});

export type UpdateVenue = z.infer<typeof UpdateVenueSchema>;
