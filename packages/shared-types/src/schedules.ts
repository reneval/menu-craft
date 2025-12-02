import { z } from 'zod';
import { TimestampSchema } from './common.js';

export const ScheduleTypeSchema = z.enum(['always', 'time_range', 'day_of_week', 'date_range']);
export type ScheduleType = z.infer<typeof ScheduleTypeSchema>;

export const MenuScheduleSchema = z.object({
  id: z.string().uuid(),
  organizationId: z.string().uuid(),
  menuId: z.string().uuid(),
  scheduleType: ScheduleTypeSchema,
  startTime: z.string().nullable(), // HH:MM format
  endTime: z.string().nullable(),
  daysOfWeek: z.array(z.number().int().min(0).max(6)).nullable(), // 0=Sun, 6=Sat
  startDate: z.string().nullable(), // YYYY-MM-DD format
  endDate: z.string().nullable(),
  priority: z.number().int(),
  isActive: z.boolean(),
  createdAt: TimestampSchema,
  updatedAt: TimestampSchema,
});

export type MenuSchedule = z.infer<typeof MenuScheduleSchema>;

export const CreateScheduleSchema = z.object({
  scheduleType: ScheduleTypeSchema,
  startTime: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  endTime: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  daysOfWeek: z.array(z.number().int().min(0).max(6)).optional(),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  priority: z.number().int().default(0),
  isActive: z.boolean().default(true),
});

export type CreateSchedule = z.infer<typeof CreateScheduleSchema>;

export const UpdateScheduleSchema = CreateScheduleSchema.partial();

export type UpdateSchedule = z.infer<typeof UpdateScheduleSchema>;
