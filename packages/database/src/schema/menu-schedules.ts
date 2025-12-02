import { pgTable, text, timestamp, uuid, integer, boolean, time, date } from 'drizzle-orm/pg-core';
import { scheduleTypeEnum } from './enums';
import { organizations } from './organizations';
import { menus } from './menus';

export const menuSchedules = pgTable('menu_schedules', {
  id: uuid('id').primaryKey().defaultRandom(),
  organizationId: uuid('organization_id')
    .notNull()
    .references(() => organizations.id),
  menuId: uuid('menu_id')
    .notNull()
    .references(() => menus.id, { onDelete: 'cascade' }),
  scheduleType: scheduleTypeEnum('schedule_type').notNull(),
  startTime: time('start_time'),
  endTime: time('end_time'),
  daysOfWeek: integer('days_of_week').array(), // 0=Sun, 6=Sat
  startDate: date('start_date'),
  endDate: date('end_date'),
  priority: integer('priority').notNull().default(0),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export type MenuSchedule = typeof menuSchedules.$inferSelect;
export type NewMenuSchedule = typeof menuSchedules.$inferInsert;
