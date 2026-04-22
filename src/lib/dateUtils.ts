import { endOfDay, isAfter } from 'date-fns';

/**
 * Checks if a deadline date is overdue.
 * A deadline is only overdue AFTER the day has passed (end of day).
 * Today's date is still considered "in time".
 */
export function isDateOverdue(date: Date | string): boolean {
  const d = typeof date === 'string' ? new Date(date) : date;
  return isAfter(new Date(), endOfDay(d));
}

/**
 * Safely parses a date-only string (e.g. "2026-03-15") into a Date object
 * without timezone shift. Uses noon local time to prevent day-boundary issues.
 * 
 * new Date("2026-03-15") is interpreted as UTC midnight, which in BRT (UTC-3)
 * becomes March 14 at 21:00 — shifting the displayed date by one day.
 */
export function parseDateOnly(dateStr: string): Date {
  // Split "YYYY-MM-DD" and create date with local noon
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(year, month - 1, day, 12, 0, 0);
}
