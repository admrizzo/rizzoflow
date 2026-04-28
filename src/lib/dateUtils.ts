import { endOfDay, format, isAfter, isValid } from 'date-fns';
import { ptBR } from 'date-fns/locale';

/**
 * Checks if a deadline date is overdue.
 * - If the date has a specific time (not midnight), compares against now() exactly.
 * - If it is a date-only value (midnight), only considers overdue AFTER end of day.
 */
export function isDateOverdue(date: Date | string): boolean {
  const d = typeof date === 'string' ? parseDatabaseDate(date) : date;
  if (!d || !isValid(d)) return false;
  const hasTime = d.getHours() !== 0 || d.getMinutes() !== 0 || d.getSeconds() !== 0;
  return hasTime ? isAfter(new Date(), d) : isAfter(new Date(), endOfDay(d));
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
  // Full ISO timestamp (e.g. "2026-04-28T15:30:00+00:00") — let JS parse with timezone
  if (/T\d{2}:\d{2}/.test(value)) {
    const parsed = new Date(value);
    return isValid(parsed) ? parsed : null;
  }
  // Date-only string (e.g. "2026-04-28") — preserve local day, noon to avoid TZ shift
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

/**
 * Returns true if the parsed date carries a meaningful time component
 * (anything other than 00:00:00).
 */
export function hasTimeComponent(date: Date): boolean {
  return date.getHours() !== 0 || date.getMinutes() !== 0 || date.getSeconds() !== 0;
}

/**
 * Standard Brazilian date/time formatter for any deadline coming from the DB.
 * - With time:  "29/04/2026 às 12:00"
 * - Without:    "29/04/2026"
 * Pass `compact: true` for tight spaces (Kanban card):
 * - With time:  "29/04 12:00"
 * - Without:    "29/04"
 */
export function formatDateTimeBR(
  value: string | Date | null | undefined,
  options: { compact?: boolean } = {},
): string {
  const d = typeof value === 'string' ? parseDatabaseDate(value) : value ?? null;
  if (!d || !isValid(d)) return '';
  const withTime = hasTimeComponent(d);
  if (options.compact) {
    return format(d, withTime ? "dd/MM HH:mm" : 'dd/MM', { locale: ptBR });
  }
  return format(d, withTime ? "dd/MM/yyyy 'às' HH:mm" : 'dd/MM/yyyy', { locale: ptBR });
}
