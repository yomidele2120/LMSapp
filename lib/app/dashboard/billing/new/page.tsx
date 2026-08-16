import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { requireProfile } from "@/lib/supabase/require-profile";
import { NewInvoiceForm } from "@/components/billing/new-invoice-form";
import { getUnbilledTimeForInvoice } from "@/lib/actions/time-entries";

export default async function NewInvoicePage({
  searchParams,
}: {
  searchParams: Promise<{ clientId?: string; caseId?: string }>;
}) {
  const { supabase, firmId } = await requireProfile();
  const { clientId, caseId } = await searchParams;

  const [{ data: clients }, { data: cases }, unbilledTime] = await Promise.all([
    supabase.from("clients").select("id, full_name, company_name").eq("firm_id", firmId).order("full_name"),
    supabase.from("cases").select("id, title, case_number, client_id").eq("firm_id", firmId).order("title"),
    caseId ? getUnbilledTimeForInvoice(caseId) : Promise.resolve([]),
  ]);

  return (
    <div className="space-y-6 max-w-2xl">
      <Link href="/dashboard/billing" className="inline-flex items-center gap-1.5 text-sm text-ink-500 hover:text-ink">
        <ArrowLeft className="h-3.5 w-3.5" strokeWidth={1.75} />
        Back to billing
      </Link>

      <div>
        <h1 className="font-display text-2xl text-ink-900">New invoice</h1>
        <p className="text-sm text-ink-500 mt-1">Bill a client for time, disbursements, or a flat fee.</p>
      </div>

      <NewInvoiceForm
        clients={clients ?? []}
        cases={cases ?? []}
        defaultClientId={clientId}
        defaultCaseId={caseId}
        unbilledTime={unbilledTime}
      />
    </div>
  );
}
