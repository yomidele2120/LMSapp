import { describe, it, expect } from "vitest";
import { calculateLineAmountKobo, sumLineItemsKobo, nairaToKobo } from "@/lib/billing";

describe("calculateLineAmountKobo", () => {
  it("multiplies quantity by unit price", () => {
    expect(calculateLineAmountKobo({ quantity: 3, unitPriceKobo: 150000 })).toBe(450000);
  });

  it("rounds to a whole kobo integer", () => {
    // 3 * 33333.33 = 99999.99 — must round, never leave a fractional kobo
    expect(calculateLineAmountKobo({ quantity: 3, unitPriceKobo: 33333.33 })).toBe(100000);
  });

  it("handles fractional quantities (e.g. 1.5 hours)", () => {
    expect(calculateLineAmountKobo({ quantity: 1.5, unitPriceKobo: 20000000 })).toBe(30000000);
  });

  it("returns 0 for non-finite input rather than NaN", () => {
    expect(calculateLineAmountKobo({ quantity: NaN, unitPriceKobo: 100 })).toBe(0);
    expect(calculateLineAmountKobo({ quantity: 1, unitPriceKobo: Infinity })).toBe(0);
  });

  it("returns 0 for zero quantity", () => {
    expect(calculateLineAmountKobo({ quantity: 0, unitPriceKobo: 500000 })).toBe(0);
  });
});

describe("sumLineItemsKobo", () => {
  it("sums multiple line items", () => {
    const items = [
      { quantity: 2, unitPriceKobo: 100000 }, // 200000
      { quantity: 1, unitPriceKobo: 50000 }, //  50000
      { quantity: 3, unitPriceKobo: 25000 }, //  75000
    ];
    expect(sumLineItemsKobo(items)).toBe(325000);
  });

  it("returns 0 for an empty list", () => {
    expect(sumLineItemsKobo([])).toBe(0);
  });

  it("never lets one bad item corrupt the whole total", () => {
    const items = [
      { quantity: 2, unitPriceKobo: 100000 },
      { quantity: NaN, unitPriceKobo: 100000 },
    ];
    expect(sumLineItemsKobo(items)).toBe(200000);
  });
});

describe("nairaToKobo", () => {
  it("converts whole naira", () => {
    expect(nairaToKobo(500)).toBe(50000);
  });

  it("converts fractional naira (kobo input)", () => {
    expect(nairaToKobo(19.99)).toBe(1999);
  });

  it("rounds sub-kobo float drift", () => {
    // classic float trap: 0.1 + 0.2 style drift in *100
    expect(nairaToKobo(19.995)).toBe(2000); // rounds, doesn't truncate to 1999
  });

  it("rejects zero and negative amounts", () => {
    expect(nairaToKobo(0)).toBe(0);
    expect(nairaToKobo(-500)).toBe(0);
  });

  it("rejects non-finite input", () => {
    expect(nairaToKobo(NaN)).toBe(0);
    expect(nairaToKobo(Infinity)).toBe(0);
  });
});
