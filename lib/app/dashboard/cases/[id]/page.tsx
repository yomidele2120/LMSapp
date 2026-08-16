import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { requireProfile } from "@/lib/supabase/require-profile";
import { CaseStatusBadge } from "@/components/ui/badge";
import { CaseWorkspace } from "@/components/cases/case-workspace";

export default async function CaseDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { supabase, firmId } = await requireProfile();

  const { data: caseRecord } = await supabase
    .from("cases")
    .select("*, clients(id, full_name, company_name)")
    .eq("id", id)
    .eq("firm_id", firmId)
    .single();

  if (!caseRecord) notFound();

  const [{ data: timeline }, { data: tasks }, { data: documents }, { data: evidence }, { data: invoices }, { data: timeEntries }] =
    await Promise.all([
      supabase
        .from("case_timeline_events")
        .select("id, event_type, title, description, event_date")
        .eq("case_id", id)
        .order("event_date", { ascending: false }),
      supabase
        .from("tasks")
        .select("id, title, status, priority, due_date")
        .eq("case_id", id)
        .order("due_date", { ascending: true, nullsFirst: false }),
      supabase
        .from("documents")
        .select("id, title, category, created_at, storage_path, mime_type, ocr_text")
        .eq("case_id", id)
        .order("created_at", { ascending: false }),
      supabase
        .from("evidence")
        .select("id, title, evidence_type, source, occurred_at")
        .eq("case_id", id)
        .order("occurred_at", { ascending: false }),
      supabase
        .from("invoices")
        .select("id, invoice_number, status, total_kobo, amount_paid_kobo, due_date")
        .eq("case_id", id)
        .order("created_at", { ascending: false }),
      supabase
        .from("time_entries")
        .select("id, description, minutes, hourly_rate_kobo, billable, invoiced, entry_date")
        .eq("case_id", id)
        .order("entry_date", { ascending: false }),
    ]);

  const client = caseRecord.clients as unknown as { id: string; full_name: string; company_name: string | null } | null;

  return (
    <div className="space-y-6">
      <Link href="/dashboard/cases" className="inline-flex items-center gap-1.5 text-sm text-ink-500 hover:text-ink">
        <ArrowLeft className="h-3.5 w-3.5" strokeWidth={1.75} />
        Back to cases
      </Link>

      <div className="flex items-start justify-between">
        <div>
          <div className="docket mb-2">{caseRecord.case_number}</div>
          <h1 className="font-display text-2xl text-ink-900">{caseRecord.title}</h1>
          <p className="text-sm text-ink-500 mt-1">
            {client && (
              <Link href={`/dashboard/clients/${client.id}`} className="hover:text-brass-dark">
                {client.full_name}
              </Link>
            )}
            {" · "}
            {caseRecord.practice_area}
          </p>
        </div>
        <CaseStatusBadge status={caseRecord.status} />
      </div>

      <CaseWorkspace
        caseId={id}
        firmId={firmId}
        caseRecord={caseRecord}
        timeline={timeline ?? []}
        tasks={tasks ?? []}
        documents={documents ?? []}
        evidence={evidence ?? []}
        invoices={invoices ?? []}
        timeEntries={timeEntries ?? []}
      />
    </div>
  );
}
