/**
 * Pure date-math for the court calendar's list/day/week/month views. No
 * Supabase, no React — kept here rather than inline in the page component
 * so it can be unit tested directly (see tests/calendar.test.ts).
 */

export function monthRange(monthParam: string | undefined): { start: Date; year: number; month: number } {
  const now = new Date();
  let year = now.getFullYear();
  let month = now.getMonth() + 1;

  if (monthParam) {
    const parts = monthParam.split("-");
    const parsedYear = Number(parts[0]);
    const parsedMonth = Number(parts[1]);
    if (Number.isFinite(parsedYear) && Number.isFinite(parsedMonth)) {
      year = parsedYear;
      month = parsedMonth;
    }
  }

  const start = new Date(year, month - 1, 1);
  return { start, year, month };
}

export function toMonthParam(year: number, month: number): string {
  return `${year}-${String(month).padStart(2, "0")}`;
}

export function parseDateParam(dateParam: string | undefined): Date {
  if (dateParam) {
    const parts = dateParam.split("-").map(Number);
    if (parts.length === 3 && parts.every((p) => Number.isFinite(p))) {
      return new Date(parts[0]!, parts[1]! - 1, parts[2]!);
    }
  }
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

export function toDateParam(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function addDays(d: Date, n: number): Date {
  const copy = new Date(d);
  copy.setDate(copy.getDate() + n);
  return copy;
}

/** Sunday-start week containing the given date. */
export function weekStart(d: Date): Date {
  return addDays(d, -d.getDay());
}

/** Sunday-first 6-row grid, including the leading/trailing days needed to fill full weeks. */
export function buildGridDays(year: number, month: number): Date[] {
  const firstOfMonth = new Date(year, month - 1, 1);
  const gridStart = new Date(firstOfMonth);
  gridStart.setDate(gridStart.getDate() - firstOfMonth.getDay());

  return Array.from({ length: 42 }, (_, i) => {
    const d = new Date(gridStart);
    d.setDate(gridStart.getDate() + i);
    return d;
  });
}

export function dateKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
