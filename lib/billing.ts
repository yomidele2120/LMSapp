export interface LineItemAmountInput {
  quantity: number;
  unitPriceKobo: number;
}

/**
 * Every place that touches an invoice total — the client-side form preview,
 * createInvoice's server-side recompute, and 004_invoice_items_recalc.sql's
 * trigger — needs to agree on this rounding rule. Kobo amounts are always
 * whole integers (no fractional kobo), so round once here rather than
 * trusting float arithmetic to land on a whole number on its own.
 */
export function calculateLineAmountKobo({ quantity, unitPriceKobo }: LineItemAmountInput): number {
  if (!Number.isFinite(quantity) || !Number.isFinite(unitPriceKobo)) return 0;
  return Math.round(quantity * unitPriceKobo);
}

export function sumLineItemsKobo(items: LineItemAmountInput[]): number {
  return items.reduce((sum, item) => sum + calculateLineAmountKobo(item), 0);
}

/** ₦ input fields are decimal naira; storage and math are always in kobo. */
export function nairaToKobo(naira: number): number {
  if (!Number.isFinite(naira) || naira <= 0) return 0;
  return Math.round(naira * 100);
}
