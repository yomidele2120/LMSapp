"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireProfile } from "@/lib/supabase/require-profile";
import { markTimeEntriesInvoiced } from "@/lib/actions/time-entries";
import { calculateLineAmountKobo, sumLineItemsKobo, nairaToKobo } from "@/lib/billing";

export interface ActionState {
  error: string | null;
}

interface LineItemInput {
  description: string;
  quantity: number;
  unitPriceKobo: number;
}

function nextInvoiceNumber(): string {
  const year = new Date().getFullYear();
  const stamp = Date.now().toString(36).toUpperCase().slice(-5);
  return `INV/${year}/${stamp}`;
}

export async function createInvoice(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const { supabase, profile, firmId } = await requireProfile();

  const clientId = String(formData.get("clientId") ?? "");
  const caseId = String(formData.get("caseId") ?? "") || null;
  const dueDate = String(formData.get("dueDate") ?? "") || null;
  const notes = String(formData.get("notes") ?? "").trim() || null;
  const itemsRaw = String(formData.get("items") ?? "[]");

  if (!clientId) {
    return { error: "Pick a client to bill." };
  }

  let items: LineItemInput[];
  try {
    items = JSON.parse(itemsRaw);
  } catch {
    return { error: "Something went wrong reading the line items. Try again." };
  }

  const cleanItems = items
    .map((i) => ({
      description: (i.description ?? "").trim(),
      quantity: Number(i.quantity) || 0,
      unitPriceKobo: Math.round(Number(i.unitPriceKobo) || 0),
    }))
    .filter((i) => i.description && i.quantity > 0);

  if (cleanItems.length === 0) {
    return { error: "Add at least one line item with a description and quantity." };
  }

  const subtotalKobo = sumLineItemsKobo(cleanItems);

  const { data: invoice, error: invoiceError } = await supabase
    .from("invoices")
    .insert({
      firm_id: firmId,
      client_id: clientId,
      case_id: caseId,
      invoice_number: nextInvoiceNumber(),
      status: "draft",
      due_date: dueDate,
      notes,
      created_by: profile.id,
    })
    .select("id")
    .single();

  if (invoiceError || !invoice) {
    return { error: "Couldn't create the invoice. Try again." };
  }

  const { error: itemsError } = await supabase.from("invoice_items").insert(
    cleanItems.map((i, idx) => ({
      invoice_id: invoice.id,
      description: i.description,
      quantity: i.quantity,
      unit_price_kobo: i.unitPriceKobo,
      amount_kobo: calculateLineAmountKobo(i),
      sort_order: idx,
    }))
  );

  if (itemsError) {
    // Invoice shell exists but with no line items — surface this clearly
    // rather than silently leaving a ₦0 draft invoice behind.
    return { error: "Invoice created, but the line items couldn't be saved. Edit it to add them." };
  }

  // subtotal_kobo/total_kobo are also recalculated by the invoice_items
  // trigger (004_invoice_items_recalc.sql); set them directly too so the
  // very next read after this insert is correct even before the trigger's
  // effects are visible in this same request/response cycle.
  await supabase.from("invoices").update({ subtotal_kobo: subtotalKobo, total_kobo: subtotalKobo }).eq(
    "id",
    invoice.id
  );

  const timeEntryIdsRaw = String(formData.get("timeEntryIds") ?? "[]");
  try {
    const timeEntryIds: string[] = JSON.parse(timeEntryIdsRaw);
    await markTimeEntriesInvoiced(timeEntryIds);
  } catch {
    // Non-fatal — the invoice itself is already saved correctly either way;
    // worst case a time entry stays flagged unbilled and shows up again
    // next time someone drafts an invoice for this case.
  }

  revalidatePath("/dashboard/billing");
  if (caseId) revalidatePath(`/dashboard/cases/${caseId}`);
  redirect(`/dashboard/billing/${invoice.id}`);
}

export async function markInvoiceSent(invoiceId: string) {
  const { supabase } = await requireProfile();
  await supabase.from("invoices").update({ status: "sent", issued_at: new Date().toISOString() }).eq(
    "id",
    invoiceId
  );
  revalidatePath("/dashboard/billing");
  revalidatePath(`/dashboard/billing/${invoiceId}`);
}

export async function recordManualPayment(invoiceId: string, formData: FormData) {
  const { supabase, firmId } = await requireProfile();
  const amountNaira = Number(formData.get("amountNaira") ?? 0);
  const method = String(formData.get("method") ?? "bank_transfer");

  if (!amountNaira || amountNaira <= 0) return;

  await supabase.from("payments").insert({
    firm_id: firmId,
    invoice_id: invoiceId,
    amount_kobo: nairaToKobo(amountNaira),
    method: method as "bank_transfer" | "cash" | "paystack" | "flutterwave" | "other",
    status: "successful",
    paid_at: new Date().toISOString(),
  });

  revalidatePath(`/dashboard/billing/${invoiceId}`);
  revalidatePath("/dashboard/billing");
}
