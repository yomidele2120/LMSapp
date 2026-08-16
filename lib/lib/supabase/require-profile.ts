import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

/**
 * Fetches the signed-in user's profile row. Every dashboard page needs
 * firm_id to scope its queries, so this is the one place that lookup lives.
 * Middleware already guarantees a session exists on dashboard routes; this
 * only re-checks in case a profile row is somehow missing (mid-signup).
 */
export async function requireProfile() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, firm_id, role, full_name, title")
    .eq("id", user.id)
    .single();

  if (!profile || !profile.firm_id) redirect("/login");

  return { supabase, profile, firmId: profile.firm_id as string };
}
