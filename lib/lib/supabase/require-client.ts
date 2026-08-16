import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

/**
 * Portal counterpart to requireProfile(). A client's `profiles` row has
 * role='client' and is linked to exactly one `clients` row via
 * clients.portal_user_id — that's the record every portal query scopes to.
 * RLS (clients_self_select, cases_client_select, etc. in
 * complete_database.sql) enforces the same boundary server-side regardless
 * of what this helper returns, so this is a convenience lookup, not the
 * security boundary itself.
 */
export async function requireClientPortalUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, full_name, role, firm_id")
    .eq("id", user.id)
    .single();

  if (!profile || profile.role !== "client") redirect("/dashboard");

  const { data: clientRecord } = await supabase
    .from("clients")
    .select("id, full_name, company_name, firm_id, assigned_lawyer_id, firms:firm_id(name)")
    .eq("portal_user_id", user.id)
    .single();

  if (!clientRecord) redirect("/login");

  return { supabase, profile, clientRecord };
}
