"use server";

import { revalidatePath } from "next/cache";
import { requireProfile } from "@/lib/supabase/require-profile";

export interface ActionState {
  error: string | null;
}

/**
 * Also mirrors the date onto cases.next_hearing_date when the new event is
 * sooner than what's currently stored, so the dashboard overview and case
 * list — which read next_hearing_date directly rather than joining
 * court_dates — stay in sync without a trigger.
 */
export async function createCourtDate(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const { supabase, profile, firmId } = await requireProfile();

  const caseId = String(formData.get("caseId") ?? "");
  const title = String(formData.get("title") ?? "").trim();
  const eventType = String(formData.get("eventType") ?? "hearing");
  const date = String(formData.get("date") ?? "");
  const time = String(formData.get("time") ?? "09:00");
  const location = String(formData.get("location") ?? "").trim() || null;
  const notes = String(formData.get("notes") ?? "").trim() || null;

  if (!caseId || !title || !date) {
    return { error: "Pick a case, a title, and a date." };
  }

  const startsAt = new Date(`${date}T${time}:00`).toISOString();

  const { error } = await supabase.from("court_dates").insert({
    firm_id: firmId,
    case_id: caseId,
    event_type: eventType,
    title,
    starts_at: startsAt,
    location,
    notes,
    created_by: profile.id,
  });

  if (error) {
    return { error: "Couldn't save that date. Try again." };
  }

  const { data: existingCase } = await supabase
    .from("cases")
    .select("next_hearing_date")
    .eq("id", caseId)
    .single();

  if (
    !existingCase?.next_hearing_date ||
    new Date(startsAt) < new Date(existingCase.next_hearing_date)
  ) {
    await supabase.from("cases").update({ next_hearing_date: startsAt }).eq("id", caseId);
  }

  revalidatePath("/dashboard/calendar");
  revalidatePath("/dashboard");
  revalidatePath(`/dashboard/cases/${caseId}`);
  return { error: null };
}
