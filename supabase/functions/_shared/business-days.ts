/**
 * Business-day helpers (Mon–Fri). Used for payment deadlines,
 * reminder escalation and automatic cancellation of unpaid orders.
 */

const isWeekend = (d: Date) => d.getUTCDay() === 0 || d.getUTCDay() === 6;

/** Adds `n` business days to `from` (weekends skipped). */
export function addBusinessDays(from: Date | string, n: number): Date {
  const d = new Date(from);
  let left = n;
  while (left > 0) {
    d.setUTCDate(d.getUTCDate() + 1);
    if (!isWeekend(d)) left--;
  }
  return d;
}

/** Whole business days elapsed between `from` and `to` (default now). */
export function businessDaysSince(from: Date | string, to: Date | string = new Date()): number {
  const start = new Date(from);
  const end = new Date(to);
  if (end <= start) return 0;
  let count = 0;
  const cursor = new Date(start);
  while (true) {
    cursor.setUTCDate(cursor.getUTCDate() + 1);
    if (cursor > end) break;
    if (!isWeekend(cursor)) count++;
  }
  return count;
}

/** dd.mm.yyyy for Latvian copy. */
export function formatDateLv(d: Date): string {
  return `${String(d.getUTCDate()).padStart(2, "0")}.${String(d.getUTCMonth() + 1).padStart(2, "0")}.${d.getUTCFullYear()}.`;
}

/** Payment deadline used across invoices, emails and auto-cancel. */
export const PAYMENT_TERM_BUSINESS_DAYS = 5;
