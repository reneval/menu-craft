import { z } from 'zod';
import { TimestampSchema } from './common.js';

export const SubscriptionStatusSchema = z.enum([
  'active',
  'past_due',
  'canceled',
  'incomplete',
  'trialing',
]);
export type SubscriptionStatus = z.infer<typeof SubscriptionStatusSchema>;

export const PlanSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  slug: z.string(),
  stripePriceId: z.string(),
  monthlyPrice: z.number().int(), // cents
  features: z.array(z.string()),
  limits: z.object({
    venues: z.number().int(),
    menusPerVenue: z.number().int(),
    languages: z.number().int(),
    customDomains: z.boolean(),
    apiAccess: z.boolean(),
  }),
  isActive: z.boolean(),
  createdAt: TimestampSchema,
});

export type Plan = z.infer<typeof PlanSchema>;

export const SubscriptionSchema = z.object({
  id: z.string().uuid(),
  organizationId: z.string().uuid(),
  stripeSubscriptionId: z.string(),
  status: SubscriptionStatusSchema,
  currentPeriodEnd: TimestampSchema.nullable(),
  planId: z.string().uuid(),
  plan: PlanSchema.optional(),
  createdAt: TimestampSchema,
  updatedAt: TimestampSchema,
});

export type Subscription = z.infer<typeof SubscriptionSchema>;

export const CreateCheckoutSessionSchema = z.object({
  priceId: z.string(),
  successUrl: z.string().url().optional(),
  cancelUrl: z.string().url().optional(),
});

export type CreateCheckoutSession = z.infer<typeof CreateCheckoutSessionSchema>;
