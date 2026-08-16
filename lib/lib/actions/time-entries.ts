"use server";

import { revalidatePath } from "next/cache";
import { requireProfile } from "@/lib/supabase/require-profile";
import { hoursToMinutes } from "@/lib/time";
import { nairaToKobo } from "@/lib/billing";

export interface ActionState {
  error: string | null;
}

export async function logTime(caseId: string, formData: FormData): Promise<ActionState> {
  const { supabase, profile, firmId } = await requireProfile();

  const description = String(formData.get("description") ?? "").trim();
  const hours = Number(formData.get("hours") ?? 0);
  const hourlyRateNaira = Number(formData.get("hourlyRateNaira") ?? 0);
  const entryDate = String(formData.get("entryDate") ?? "") || new Date().toISOString().slice(0, 10);
  const billable = formData.get("billable") !== "off";

  if (!description || hours <= 0) {
    return { error: "Add a description and how many hours you spent." };
  }

  const { error } = await supabase.from("time_entries").insert({
    firm_id: firmId,
    case_id: caseId,
    profile_id: profile.id,
    description,
    minutes: hoursToMinutes(hours),
    hourly_rate_kobo: nairaToKobo(hourlyRateNaira),
    billable,
    entry_date: entryDate,
  });

  if (error) {
    return { error: "Couldn't save that time entry. Try again." };
  }

  revalidatePath(`/dashboard/cases/${caseId}`);
  return { error: null };
}

export async function deleteTimeEntry(entryId: string, caseId: string) {
  const { supabase } = await requireProfile();
  await supabase.from("time_entries").delete().eq("id", entryId).eq("invoiced", false);
  revalidatePath(`/dashboard/cases/${caseId}`);
}

/**
 * The invoice-creation flow (createInvoice in lib/actions/invoices.ts) takes
 * freeform line items from the form; this is the bridge that turns selected
 * unbilled time entries into that same line-item shape and flags them
 * invoiced so they can't be billed twice, without duplicating the invoice
 * insert logic itself.
 */
export async function getUnbilledTimeForInvoice(caseId: string) {
  const { supabase, firmId } = await requireProfile();
  const { data } = await supabase
    .from("time_entries")
    .select("id, description, minutes, hourly_rate_kobo, entry_date")
    .eq("case_id", caseId)
    .eq("firm_id", firmId)
    .eq("billable", true)
    .eq("invoiced", false)
    .order("entry_date", { ascending: true });

  return data ?? [];
}

export async function markTimeEntriesInvoiced(entryIds: string[]) {
  if (entryIds.length === 0) return;
  const { supabase } = await requireProfile();
  await supabase.from("time_entries").update({ invoiced: true }).in("id", entryIds);
}
