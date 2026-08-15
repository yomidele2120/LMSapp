import { requireProfile } from "@/lib/supabase/require-profile";
import { NewCaseForm } from "@/components/cases/new-case-form";

export default async function NewCasePage({
  searchParams,
}: {
  searchParams: Promise<{ clientId?: string }>;
}) {
  const { supabase, firmId } = await requireProfile();
  const { clientId } = await searchParams;

  const { data: clients } = await supabase
    .from("clients")
    .select("id, full_name, company_name")
    .eq("firm_id", firmId)
    .eq("is_archived", false)
    .order("full_name");

  return <NewCaseForm clients={clients ?? []} defaultClientId={clientId} />;
}
