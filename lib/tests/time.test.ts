import { describe, it, expect } from "vitest";
import { hoursToMinutes, minutesToHours, formatHours } from "@/lib/time";

describe("hoursToMinutes", () => {
  it("converts whole hours", () => {
    expect(hoursToMinutes(2)).toBe(120);
  });

  it("converts fractional hours (quarter-hour billing increments)", () => {
    expect(hoursToMinutes(1.25)).toBe(75);
    expect(hoursToMinutes(0.5)).toBe(30);
  });

  it("rounds rather than truncates", () => {
    expect(hoursToMinutes(0.1)).toBe(6); // 0.1h = 6min exactly
    expect(hoursToMinutes(1 / 3)).toBe(20); // 0.333...h -> 20min, not 19
  });

  it("rejects zero and negative durations", () => {
    expect(hoursToMinutes(0)).toBe(0);
    expect(hoursToMinutes(-1)).toBe(0);
  });

  it("rejects non-finite input", () => {
    expect(hoursToMinutes(NaN)).toBe(0);
  });
});

describe("minutesToHours", () => {
  it("converts minutes back to hours", () => {
    expect(minutesToHours(90)).toBe(1.5);
    expect(minutesToHours(45)).toBe(0.75);
  });

  it("rejects zero and negative minutes", () => {
    expect(minutesToHours(0)).toBe(0);
    expect(minutesToHours(-30)).toBe(0);
  });
});

describe("formatHours", () => {
  it("formats to one decimal place with an 'h' suffix", () => {
    expect(formatHours(90)).toBe("1.5h");
    expect(formatHours(60)).toBe("1.0h");
    expect(formatHours(20)).toBe("0.3h");
  });

  it("formats zero minutes cleanly", () => {
    expect(formatHours(0)).toBe("0.0h");
  });
});
