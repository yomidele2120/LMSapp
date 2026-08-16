"use server";

import { revalidatePath } from "next/cache";
import { requireProfile } from "@/lib/supabase/require-profile";
import type { TaskPriority, TaskStatus } from "@/types/database";

export interface ActionState {
  error: string | null;
}

export async function createStandaloneTask(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const { supabase, profile, firmId } = await requireProfile();

  const title = String(formData.get("title") ?? "").trim();
  const priority = String(formData.get("priority") ?? "medium") as TaskPriority;
  const dueDate = String(formData.get("dueDate") ?? "") || null;
  const caseId = String(formData.get("caseId") ?? "") || null;
  const assignedTo = String(formData.get("assignedTo") ?? "") || profile.id;

  if (!title) {
    return { error: "Give the task a title." };
  }

  const { error } = await supabase.from("tasks").insert({
    firm_id: firmId,
    case_id: caseId,
    title,
    priority,
    due_date: dueDate,
    assigned_to: assignedTo,
    created_by: profile.id,
  });

  if (error) {
    return { error: "Couldn't create the task. Try again." };
  }

  revalidatePath("/dashboard/tasks");
  return { error: null };
}

export async function setTaskStatus(taskId: string, status: TaskStatus) {
  const { supabase } = await requireProfile();
  await supabase
    .from("tasks")
    .update({
      status,
      completed_at: status === "done" ? new Date().toISOString() : null,
    })
    .eq("id", taskId);
  revalidatePath("/dashboard/tasks");
}
