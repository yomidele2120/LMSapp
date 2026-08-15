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

  const { data: firm, error: firmError } = await supabase
    .from("firms")
    .insert({ name: firmName, slug: `${slug}-${Date.now().toString(36)}` })
    .select("id")
    .single();

  if (firmError || !firm) {
    return { error: "Couldn't set up the firm workspace. Try a different firm name." };
  }

  const { error: signUpError } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        firm_id: firm.id,
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
