import type { MenuSchedule } from '@menucraft/database';

/**
 * Check if a time string (HH:MM) is within a range
 * Handles overnight ranges (e.g., 22:00 to 02:00)
 */
function isTimeInRange(now: Date, startTime: string | null, endTime: string | null): boolean {
  if (!startTime || !endTime) return true;

  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  const startParts = startTime.split(':');
  const endParts = endTime.split(':');
  const startH = parseInt(startParts[0] || '0', 10);
  const startM = parseInt(startParts[1] || '0', 10);
  const endH = parseInt(endParts[0] || '0', 10);
  const endM = parseInt(endParts[1] || '0', 10);
  const startMinutes = startH * 60 + startM;
  const endMinutes = endH * 60 + endM;

  // Handle overnight range (e.g., 22:00 to 02:00)
  if (startMinutes > endMinutes) {
    return currentMinutes >= startMinutes || currentMinutes < endMinutes;
  }

  return currentMinutes >= startMinutes && currentMinutes < endMinutes;
}

/**
 * Check if current day is in the list of allowed days
 * Days are 0=Sunday, 6=Saturday
 */
function isDayIncluded(now: Date, daysOfWeek: number[] | null): boolean {
  if (!daysOfWeek || daysOfWeek.length === 0) return true;
  return daysOfWeek.includes(now.getDay());
}

/**
 * Check if current date is within a date range
 */
function isDateInRange(now: Date, startDate: string | null, endDate: string | null): boolean {
  const todayParts = now.toISOString().split('T');
  const today = todayParts[0] || '';

  if (startDate && today < startDate) return false;
  if (endDate && today > endDate) return false;

  return true;
}

/**
 * Check if a schedule is currently active
 */
export function isScheduleActive(schedule: MenuSchedule, now: Date = new Date()): boolean {
  if (!schedule.isActive) return false;

  switch (schedule.scheduleType) {
    case 'always':
      return true;

    case 'time_range':
      // Time range with optional day filter
      return isTimeInRange(now, schedule.startTime, schedule.endTime) &&
             isDayIncluded(now, schedule.daysOfWeek);

    case 'day_of_week':
      // Active all day on specific days
      return isDayIncluded(now, schedule.daysOfWeek);

    case 'date_range':
      // Active during specific date range (can combine with time)
      return isDateInRange(now, schedule.startDate, schedule.endDate) &&
             isTimeInRange(now, schedule.startTime, schedule.endTime);

    default:
      return false;
  }
}

/**
 * Get the highest priority active schedule for a menu
 * Returns null if no schedule is active
 */
export function getActiveSchedule(schedules: MenuSchedule[], now: Date = new Date()): MenuSchedule | null {
  if (!schedules || schedules.length === 0) return null;

  // Sort by priority (highest first)
  const sorted = [...schedules].sort((a, b) => b.priority - a.priority);

  // Return first active schedule (highest priority that matches)
  return sorted.find(s => isScheduleActive(s, now)) || null;
}

/**
 * Check if a menu should be visible based on its schedules
 * A menu is visible if:
 * - It has no schedules (always visible)
 * - At least one of its schedules is currently active
 */
export function isMenuScheduleActive(schedules: MenuSchedule[], now: Date = new Date()): boolean {
  // No schedules means always visible
  if (!schedules || schedules.length === 0) return true;

  // At least one schedule must be active
  return schedules.some(s => isScheduleActive(s, now));
}

/**
 * Filter a list of menus to only those with active schedules
 */
export function filterActiveMenus<T extends { schedules?: MenuSchedule[] }>(
  menus: T[],
  now: Date = new Date()
): T[] {
  return menus.filter(menu => isMenuScheduleActive(menu.schedules || [], now));
}
