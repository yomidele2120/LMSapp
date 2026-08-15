"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireProfile } from "@/lib/supabase/require-profile";
import type { CaseStatus, TaskPriority } from "@/types/database";

export interface ActionState {
  error: string | null;
}

function nextCaseNumber(): string {
  const year = new Date().getFullYear();
  const stamp = Date.now().toString(36).toUpperCase().slice(-5);
  return `LOS/${year}/${stamp}`;
}

export async function createCase(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const { supabase, profile, firmId } = await requireProfile();

  const title = String(formData.get("title") ?? "").trim();
  const clientId = String(formData.get("clientId") ?? "");
  const practiceArea = String(formData.get("practiceArea") ?? "").trim();
  const opposingParties = String(formData.get("opposingParties") ?? "").trim() || null;
  const courtName = String(formData.get("courtName") ?? "").trim() || null;
  const description = String(formData.get("description") ?? "").trim() || null;

  if (!title || !clientId || !practiceArea) {
    return { error: "Title, client, and practice area are required." };
  }

  const { data, error } = await supabase
    .from("cases")
    .insert({
      firm_id: firmId,
      case_number: nextCaseNumber(),
      title,
      practice_area: practiceArea,
      client_id: clientId,
      lead_lawyer_id: profile.id,
      opposing_parties: opposingParties,
      court_name: courtName,
      description,
      created_by: profile.id,
    })
    .select("id")
    .single();

  if (error || !data) {
    return { error: "Couldn't create the case. Check the details and try again." };
  }

  revalidatePath("/dashboard/cases");
  redirect(`/dashboard/cases/${data.id}`);
}

export async function updateCaseStatus(caseId: string, status: CaseStatus) {
  const { supabase } = await requireProfile();
  await supabase.from("cases").update({ status }).eq("id", caseId);
  revalidatePath(`/dashboard/cases/${caseId}`);
  revalidatePath("/dashboard/cases");
}

export async function addTimelineNote(caseId: string, formData: FormData) {
  const { supabase, profile } = await requireProfile();
  const title = String(formData.get("title") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim() || null;
  if (!title) return;

  await supabase.from("case_timeline_events").insert({
    case_id: caseId,
    event_type: "note",
    title,
    description,
    created_by: profile.id,
  });

  revalidatePath(`/dashboard/cases/${caseId}`);
}

export async function createTask(caseId: string, firmId: string, formData: FormData) {
  const { supabase, profile } = await requireProfile();
  const title = String(formData.get("title") ?? "").trim();
  const priority = String(formData.get("priority") ?? "medium");
  const dueDate = String(formData.get("dueDate") ?? "") || null;
  if (!title) return;

  await supabase.from("tasks").insert({
    firm_id: firmId,
    case_id: caseId,
    title,
    priority: priority as TaskPriority,
    due_date: dueDate,
    assigned_to: profile.id,
    created_by: profile.id,
  });

  revalidatePath(`/dashboard/cases/${caseId}`);
}

export async function toggleTaskDone(taskId: string, caseId: string, done: boolean) {
  const { supabase } = await requireProfile();
  await supabase
    .from("tasks")
    .update({ status: done ? "done" : "todo", completed_at: done ? new Date().toISOString() : null })
    .eq("id", taskId);
  revalidatePath(`/dashboard/cases/${caseId}`);
}
