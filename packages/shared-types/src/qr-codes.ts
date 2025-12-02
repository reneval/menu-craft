import { z } from 'zod';
import { TimestampSchema } from './common.js';

export const QrTargetTypeSchema = z.enum(['menu', 'venue']);
export type QrTargetType = z.infer<typeof QrTargetTypeSchema>;

export const QrCodeSchema = z.object({
  id: z.string().uuid(),
  organizationId: z.string().uuid(),
  targetType: QrTargetTypeSchema,
  targetId: z.string().uuid(),
  code: z.string(),
  scanCount: z.number().int(),
  lastScannedAt: TimestampSchema.nullable(),
  createdAt: TimestampSchema,
});

export type QrCode = z.infer<typeof QrCodeSchema>;

export const CreateQrCodeSchema = z.object({
  targetType: QrTargetTypeSchema,
  targetId: z.string().uuid(),
});

export type CreateQrCode = z.infer<typeof CreateQrCodeSchema>;

export const QrCodeOptionsSchema = z.object({
  width: z.number().int().min(100).max(1000).default(400),
  darkColor: z.string().default('#000000'),
  lightColor: z.string().default('#ffffff'),
  logoUrl: z.string().url().optional(),
});

export type QrCodeOptions = z.infer<typeof QrCodeOptionsSchema>;
