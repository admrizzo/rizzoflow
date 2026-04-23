import { differenceInHours, differenceInMinutes } from 'date-fns';

export type SlaStatus = 'green' | 'yellow' | 'red';

/**
 * Calculate SLA status based on time in column and configured SLA hours.
 * Green: < 70% of SLA
 * Yellow: 70-100% of SLA
 * Red: > 100% of SLA
 */
export function getSlaStatus(columnEnteredAt: string | null, slaHours: number | null): SlaStatus {
  if (!columnEnteredAt || !slaHours || slaHours <= 0) return 'green';
  
  const hoursElapsed = differenceInHours(new Date(), new Date(columnEnteredAt));
  const ratio = hoursElapsed / slaHours;
  
  if (ratio >= 1) return 'red';
  if (ratio >= 0.7) return 'yellow';
  return 'green';
}

/**
 * Format time elapsed in a human-readable way.
 */
export function formatTimeElapsed(dateStr: string | null): string {
  if (!dateStr) return '-';
  
  const now = new Date();
  const date = new Date(dateStr);
  const totalMinutes = differenceInMinutes(now, date);
  
  if (totalMinutes < 60) return `${totalMinutes}min`;
  
  const hours = Math.floor(totalMinutes / 60);
  if (hours < 24) {
    const mins = totalMinutes % 60;
    return mins > 0 ? `${hours}h ${mins}min` : `${hours}h`;
  }
  
  const days = Math.floor(hours / 24);
  const remainingHours = hours % 24;
  if (days === 1) return remainingHours > 0 ? `1 dia ${remainingHours}h` : '1 dia';
  return remainingHours > 0 ? `${days} dias ${remainingHours}h` : `${days} dias`;
}

/**
 * Get SLA color classes for backgrounds and text.
 */
export function getSlaColors(status: SlaStatus) {
  switch (status) {
    case 'green':
      return { bg: 'bg-emerald-100', text: 'text-emerald-700', dot: 'bg-emerald-500', border: 'border-emerald-200' };
    case 'yellow':
      return { bg: 'bg-amber-100', text: 'text-amber-700', dot: 'bg-amber-500', border: 'border-amber-200' };
    case 'red':
      return { bg: 'bg-red-100', text: 'text-red-700', dot: 'bg-red-500', border: 'border-red-200' };
  }
}