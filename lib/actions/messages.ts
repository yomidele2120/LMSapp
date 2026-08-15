"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireProfile } from "@/lib/supabase/require-profile";

export interface ActionState {
  error: string | null;
}

export async function startConversation(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const { supabase, profile, firmId } = await requireProfile();

  const otherProfileId = String(formData.get("profileId") ?? "");
  const caseId = String(formData.get("caseId") ?? "") || null;
  const firstMessage = String(formData.get("message") ?? "").trim();

  if (!otherProfileId || !firstMessage) {
    return { error: "Pick who to message and write something to send." };
  }

  const { data: conversation, error: convError } = await supabase
    .from("conversations")
    .insert({ firm_id: firmId, case_id: caseId })
    .select("id")
    .single();

  if (convError || !conversation) {
    return { error: "Couldn't start the conversation. Try again." };
  }

  const { error: participantsError } = await supabase.from("conversation_participants").insert([
    { conversation_id: conversation.id, profile_id: profile.id },
    { conversation_id: conversation.id, profile_id: otherProfileId },
  ]);

  if (participantsError) {
    return { error: "Couldn't add participants to the conversation." };
  }

  await supabase.from("messages").insert({
    conversation_id: conversation.id,
    sender_id: profile.id,
    body: firstMessage,
  });

  redirect(`/dashboard/messages?c=${conversation.id}`);
}

export async function sendMessage(conversationId: string, formData: FormData): Promise<void> {
  const { supabase, profile } = await requireProfile();

  const body = String(formData.get("body") ?? "").trim();
  if (!body) return;

  await supabase.from("messages").insert({
    conversation_id: conversationId,
    sender_id: profile.id,
    body,
  });

  await supabase
    .from("conversation_participants")
    .update({ last_read_at: new Date().toISOString() })
    .eq("conversation_id", conversationId)
    .eq("profile_id", profile.id);

  revalidatePath("/dashboard/messages");
}
