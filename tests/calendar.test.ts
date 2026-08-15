import { describe, it, expect } from "vitest";
import {
  monthRange,
  toMonthParam,
  parseDateParam,
  toDateParam,
  addDays,
  weekStart,
  buildGridDays,
  dateKey,
} from "@/lib/calendar";

describe("monthRange", () => {
  it("parses a YYYY-MM param into year/month/start", () => {
    const { year, month, start } = monthRange("2026-03");
    expect(year).toBe(2026);
    expect(month).toBe(3);
    expect(start.getFullYear()).toBe(2026);
    expect(start.getMonth()).toBe(2); // 0-indexed
    expect(start.getDate()).toBe(1);
  });

  it("falls back to the current month when no param is given", () => {
    const now = new Date();
    const { year, month } = monthRange(undefined);
    expect(year).toBe(now.getFullYear());
    expect(month).toBe(now.getMonth() + 1);
  });

  it("falls back to the current month on a malformed param", () => {
    const now = new Date();
    const { year, month } = monthRange("not-a-month");
    expect(year).toBe(now.getFullYear());
    expect(month).toBe(now.getMonth() + 1);
  });
});

describe("toMonthParam", () => {
  it("pads single-digit months", () => {
    expect(toMonthParam(2026, 3)).toBe("2026-03");
  });

  it("doesn't pad already-two-digit months", () => {
    expect(toMonthParam(2026, 12)).toBe("2026-12");
  });
});

describe("parseDateParam / toDateParam", () => {
  it("round-trips a date through the param format", () => {
    const d = parseDateParam("2026-08-15");
    expect(toDateParam(d)).toBe("2026-08-15");
  });

  it("falls back to today on a missing param", () => {
    const today = new Date();
    const d = parseDateParam(undefined);
    expect(toDateParam(d)).toBe(toDateParam(today));
  });

  it("falls back to today on a malformed param", () => {
    const today = new Date();
    const d = parseDateParam("garbage");
    expect(toDateParam(d)).toBe(toDateParam(today));
  });

  it("zero-pads single-digit month and day", () => {
    const d = new Date(2026, 0, 5); // Jan 5
    expect(toDateParam(d)).toBe("2026-01-05");
  });
});

describe("addDays", () => {
  it("adds positive days, rolling over month boundaries", () => {
    const d = new Date(2026, 0, 30); // Jan 30
    const result = addDays(d, 3);
    expect(toDateParam(result)).toBe("2026-02-02");
  });

  it("subtracts with negative days, rolling back over month boundaries", () => {
    const d = new Date(2026, 1, 1); // Feb 1
    const result = addDays(d, -1);
    expect(toDateParam(result)).toBe("2026-01-31");
  });

  it("does not mutate the input date", () => {
    const d = new Date(2026, 0, 1);
    addDays(d, 5);
    expect(d.getDate()).toBe(1);
  });
});

describe("weekStart", () => {
  it("returns the same date if it's already a Sunday", () => {
    const sunday = new Date(2026, 7, 16); // Aug 16, 2026 is a Sunday
    expect(sunday.getDay()).toBe(0);
    expect(toDateParam(weekStart(sunday))).toBe(toDateParam(sunday));
  });

  it("rolls back to the preceding Sunday for a mid-week date", () => {
    const wednesday = new Date(2026, 7, 19); // Aug 19, 2026 is a Wednesday
    const start = weekStart(wednesday);
    expect(start.getDay()).toBe(0);
    expect(toDateParam(start)).toBe("2026-08-16");
  });

  it("rolls back correctly across a month boundary", () => {
    // Sep 1, 2026 is a Tuesday; the Sunday before it is Aug 30.
    const d = new Date(2026, 8, 1);
    const start = weekStart(d);
    expect(toDateParam(start)).toBe("2026-08-30");
  });
});

describe("buildGridDays", () => {
  it("returns exactly 42 days (6 full weeks)", () => {
    expect(buildGridDays(2026, 3).length).toBe(42);
  });

  it("starts on a Sunday", () => {
    const days = buildGridDays(2026, 3);
    expect(days[0]!.getDay()).toBe(0);
  });

  it("ends on a Saturday", () => {
    const days = buildGridDays(2026, 3);
    expect(days[days.length - 1]!.getDay()).toBe(6);
  });

  it("includes the 1st of the requested month", () => {
    const days = buildGridDays(2026, 3);
    const firstOfMonth = days.find((d) => d.getMonth() === 2 && d.getDate() === 1);
    expect(firstOfMonth).toBeDefined();
  });

  it("includes leading days from the previous month when the 1st isn't a Sunday", () => {
    // March 1, 2026 is a Sunday, so pick a month that isn't — April 2026 starts on a Wednesday.
    const days = buildGridDays(2026, 4);
    expect(days[0]!.getMonth()).toBe(2); // March, spilling into the grid
  });
});

describe("dateKey", () => {
  it("matches toDateParam's format", () => {
    const d = new Date(2026, 5, 7);
    expect(dateKey(d)).toBe(toDateParam(d));
  });

  it("produces distinct keys for distinct days", () => {
    const a = new Date(2026, 0, 1);
    const b = new Date(2026, 0, 2);
    expect(dateKey(a)).not.toBe(dateKey(b));
  });
});
