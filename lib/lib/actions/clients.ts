"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireProfile } from "@/lib/supabase/require-profile";

export interface ActionState {
  error: string | null;
}

export async function createClientRecord(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const { supabase, profile, firmId } = await requireProfile();

  const clientType = String(formData.get("clientType") ?? "individual") as "individual" | "company";
  const fullName = String(formData.get("fullName") ?? "").trim();
  const companyName = String(formData.get("companyName") ?? "").trim() || null;
  const email = String(formData.get("email") ?? "").trim() || null;
  const phone = String(formData.get("phone") ?? "").trim() || null;
  const address = String(formData.get("address") ?? "").trim() || null;
  const notes = String(formData.get("notes") ?? "").trim() || null;

  if (!fullName) {
    return { error: "Client name is required." };
  }
  if (clientType === "company" && !companyName) {
    return { error: "Company name is required for a company client." };
  }

  const { data, error } = await supabase
    .from("clients")
    .insert({
      firm_id: firmId,
      client_type: clientType,
      full_name: fullName,
      company_name: companyName,
      email,
      phone,
      address,
      notes,
      assigned_lawyer_id: profile.id,
      created_by: profile.id,
    })
    .select("id")
    .single();

  if (error || !data) {
    return { error: "Couldn't save this client. Check the details and try again." };
  }

  revalidatePath("/dashboard/clients");
  redirect(`/dashboard/clients/${data.id}`);
}

export async function archiveClient(clientId: string) {
  const { supabase } = await requireProfile();
  await supabase.from("clients").update({ is_archived: true }).eq("id", clientId);
  revalidatePath("/dashboard/clients");
}
