import { describe, it, expect } from "vitest";
import { formatNaira, formatDocketDate } from "@/lib/utils";

describe("formatNaira", () => {
  it("converts kobo to a naira display string", () => {
    // Intl output uses a non-breaking space before the amount in some Node
    // ICU builds — normalize whitespace rather than match it exactly.
    expect(formatNaira(50000).replace(/\s/g, " ")).toContain("500");
  });

  it("drops the minor unit (whole naira only)", () => {
    expect(formatNaira(50099)).not.toMatch(/\.\d/);
  });

  it("handles zero", () => {
    expect(formatNaira(0)).toContain("0");
  });
});

describe("formatDocketDate", () => {
  it("formats an ISO date as DD Mon YYYY", () => {
    expect(formatDocketDate("2026-03-14T09:00:00.000Z")).toBe("14 Mar 2026");
  });

  it("returns an em dash for null", () => {
    expect(formatDocketDate(null)).toBe("—");
  });
});
