"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export interface AuthActionState {
  error: string | null;
}

export async function login(_prev: AuthActionState, formData: FormData): Promise<AuthActionState> {
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");
  const redirectTo = String(formData.get("redirectTo") ?? "/dashboard");

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    return { error: "That email and password don't match a LegalOS account." };
  }

  redirect(redirectTo || "/dashboard");
}

/**
 * Signup creates the authenticating user AND, for the first person from a
 * firm, the firm record itself — done in one server action so the client
 * never has to orchestrate two writes. `handle_new_user()` (see
 * complete_database.sql) reads firm_id/role/full_name out of
 * raw_user_meta_data and creates the matching `profiles` row automatically.
 */
export async function signupNewFirm(
  _prev: AuthActionState,
  formData: FormData
): Promise<AuthActionState> {
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");
  const fullName = String(formData.get("fullName") ?? "");
  const firmName = String(formData.get("firmName") ?? "");

  if (!email || !password || !fullName || !firmName) {
    return { error: "All fields are required." };
  }

  const supabase = await createClient();

  const slug = firmName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

  const { data: firmId, error: firmError } = await supabase.rpc("create_firm_for_signup", {
    p_name: firmName,
    p_slug: `${slug}-${Date.now().toString(36)}`,
  });

  if (firmError || !firmId) {
    // The previous version of this message ("try a different firm name")
    // was actively misleading — it presumes a naming collision when the
    // real cause is almost always something else entirely. This now goes
    // through create_firm_for_signup(), a SECURITY DEFINER function (see
    // complete_database.sql), specifically because a plain
    // .insert().select() from an anonymous client fails RLS: Postgres
    // checks the SELECT policy on RETURNING, not just the INSERT policy,
    // and there's no logged-in user yet for firms_select to match against.
    // Logging the real error server-side means it shows up in Vercel's
    // Runtime Logs for this request instead of vanishing.
    console.error("[signupNewFirm] create_firm_for_signup failed:", firmError);
    return {
      error:
        "Couldn't set up the firm workspace right now. If this keeps happening, " +
        "check the server logs for the specific database error.",
    };
  }

  const { error: signUpError } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        firm_id: firmId,
        role: "managing_partner",
        full_name: fullName,
      },
    },
  });

  if (signUpError) {
    return { error: signUpError.message };
  }

  redirect("/dashboard");
}

export async function logout() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
