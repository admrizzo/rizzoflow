import { endOfDay, isAfter, isValid } from 'date-fns';

/**
 * Checks if a deadline date is overdue.
 * A deadline is only overdue AFTER the day has passed (end of day).
 * Today's date is still considered "in time".
 */
export function isDateOverdue(date: Date | string): boolean {
  const d = typeof date === 'string' ? parseDatabaseDate(date) : date;
  if (!d || !isValid(d)) return false;
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
  const [year, month, day] = dateStr.slice(0, 10).split('-').map(Number);
  const result = new Date(year, month - 1, day, 12, 0, 0);
  if (result.getFullYear() !== year || result.getMonth() !== month - 1 || result.getDate() !== day) {
    return new Date(NaN);
  }
  return result;
}

export function parseDatabaseDate(value: string | null | undefined): Date | null {
  if (!value) return null;
  const isoDate = value.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (isoDate) {
    const parsed = parseDateOnly(`${isoDate[1]}-${isoDate[2]}-${isoDate[3]}`);
    return isValid(parsed) ? parsed : null;
  }
  return null;
}

export function parseDateInput(value: string): Date | null {
  const trimmed = value.trim();
  if (!trimmed) return null;

  const dmy = trimmed.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{2}|\d{4})$/);
  if (dmy) {
    const day = Number(dmy[1]);
    const month = Number(dmy[2]);
    let year = Number(dmy[3]);
    if (year < 100) year += 2000;
    const result = new Date(year, month - 1, day, 12, 0, 0);
    if (result.getFullYear() === year && result.getMonth() === month - 1 && result.getDate() === day) {
      return result;
    }
  }

  return parseDatabaseDate(trimmed);
}

export function formatDateOnly(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}
