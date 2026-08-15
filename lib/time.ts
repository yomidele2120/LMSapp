/**
 * time_entries.minutes is the source of truth in the DB (an integer, no
 * float drift). Everywhere a lawyer types hours, convert through here so
 * the rounding rule lives in one place instead of being re-implemented
 * slightly differently in the log-time form, the case workspace display,
 * and the invoice line-item conversion.
 */
export function hoursToMinutes(hours: number): number {
  if (!Number.isFinite(hours) || hours <= 0) return 0;
  return Math.round(hours * 60);
}

export function minutesToHours(minutes: number): number {
  if (!Number.isFinite(minutes) || minutes <= 0) return 0;
  return minutes / 60;
}

/** "1.5h" / "0.3h" — one decimal place, matches how hours are entered. */
export function formatHours(minutes: number): string {
  return `${minutesToHours(minutes).toFixed(1)}h`;
}
