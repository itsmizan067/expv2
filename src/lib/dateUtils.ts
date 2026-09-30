/**
 * Timezone-Safe Local Date Utilities
 * Ensures dates entered in Bangladesh (Dhaka, UTC+6) or anywhere else
 * never shift forward or backward due to UTC conversion (e.g. .toISOString().slice(0, 10)).
 */

/** Format any Date object to 'YYYY-MM-DD' using local device timezone */
export function formatLocalDate(d: Date = new Date()): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/** Get the local month prefix 'YYYY-MM' */
export function getLocalMonthPrefix(d: Date = new Date()): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
}

/** Parse 'YYYY-MM-DD' cleanly into a local Date without UTC midnight distortion */
export function parseLocalDate(dateStr: string): Date {
  if (!dateStr) return new Date();
  const parts = dateStr.split('-');
  if (parts.length === 3) {
    const year = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1;
    const day = parseInt(parts[2], 10);
    return new Date(year, month, day, 12, 0, 0); // Noon local avoids edge transitions
  }
  return new Date(dateStr);
}
