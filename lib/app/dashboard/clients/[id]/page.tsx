import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Mail, Phone, MapPin } from "lucide-react";
import { requireProfile } from "@/lib/supabase/require-profile";
import { CaseStatusBadge } from "@/components/ui/badge";
import { DocumentUploadForm } from "@/components/documents/upload-form";
import { formatNaira, formatDocketDate } from "@/lib/utils";

export default async function ClientDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { supabase, firmId } = await requireProfile();

  const { data: client } = await supabase
    .from("clients")
    .select("*")
    .eq("id", id)
    .eq("firm_id", firmId)
    .single();

  if (!client) notFound();

  const [{ data: cases }, { data: invoices }, { data: documents }] = await Promise.all([
    supabase
      .from("cases")
      .select("id, case_number, title, status, next_hearing_date")
      .eq("client_id", id)
      .order("created_at", { ascending: false }),
    supabase
      .from("invoices")
      .select("id, invoice_number, status, total_kobo, amount_paid_kobo, due_date")
      .eq("client_id", id)
      .order("created_at", { ascending: false }),
    supabase
      .from("documents")
      .select("id, title, category, created_at")
      .eq("client_id", id)
      .order("created_at", { ascending: false })
      .limit(10),
  ]);

  return (
    <div className="space-y-6 max-w-4xl">
      <Link href="/dashboard/clients" className="inline-flex items-center gap-1.5 text-sm text-ink-500 hover:text-ink">
        <ArrowLeft className="h-3.5 w-3.5" strokeWidth={1.75} />
        Back to clients
      </Link>

      <div className="flex items-start justify-between">
        <div>
          <h1 className="font-display text-2xl text-ink-900">{client.full_name}</h1>
          {client.company_name && <p className="text-sm text-ink-500 mt-0.5">{client.company_name}</p>}
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        <div className="md:col-span-1 space-y-4">
          <div className="card-surface p-4 space-y-3 text-sm">
            <h2 className="text-xs font-medium uppercase tracking-wide text-ink-500 mb-1">Contact</h2>
            {client.email && (
              <div className="flex items-center gap-2 text-ink-900">
                <Mail className="h-3.5 w-3.5 text-ink-300" strokeWidth={1.75} /> {client.email}
              </div>
            )}
            {client.phone && (
              <div className="flex items-center gap-2 text-ink-900">
                <Phone className="h-3.5 w-3.5 text-ink-300" strokeWidth={1.75} /> {client.phone}
              </div>
            )}
            {client.address && (
              <div className="flex items-center gap-2 text-ink-900">
                <MapPin className="h-3.5 w-3.5 text-ink-300" strokeWidth={1.75} /> {client.address}
              </div>
            )}
            {!client.email && !client.phone && !client.address && (
              <p className="text-ink-300">No contact details on file.</p>
            )}
          </div>

          {client.notes && (
            <div className="card-surface p-4 text-sm">
              <h2 className="text-xs font-medium uppercase tracking-wide text-ink-500 mb-2">Notes</h2>
              <p className="text-ink-900 whitespace-pre-wrap">{client.notes}</p>
            </div>
          )}
        </div>

        <div className="md:col-span-2 space-y-6">
          <section className="card-surface p-5">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-medium text-ink-900">Cases</h2>
              <Link
                href={`/dashboard/cases/new?clientId=${client.id}`}
                className="text-xs text-brass hover:text-brass-dark font-medium"
              >
                + New case
              </Link>
            </div>
            {!cases || cases.length === 0 ? (
              <p className="text-sm text-ink-300 py-4">No cases yet for this client.</p>
            ) : (
              <ul className="divide-y divide-slate-line">
                {cases.map((c) => (
                  <li key={c.id} className="py-3 flex items-center justify-between text-sm">
                    <div>
                      <Link href={`/dashboard/cases/${c.id}`} className="text-ink-900 hover:text-brass-dark font-medium">
                        {c.title}
                      </Link>
                      <div className="docket mt-1">{c.case_number}</div>
                    </div>
                    <CaseStatusBadge status={c.status} />
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="card-surface p-5">
            <h2 className="text-sm font-medium text-ink-900 mb-3">Payment history</h2>
            {!invoices || invoices.length === 0 ? (
              <p className="text-sm text-ink-300 py-4">No invoices yet.</p>
            ) : (
              <ul className="divide-y divide-slate-line">
                {invoices.map((inv) => (
                  <li key={inv.id} className="py-3 flex items-center justify-between text-sm">
                    <div>
                      <div className="docket">{inv.invoice_number}</div>
                      <div className="text-xs text-ink-500 mt-1">Due {formatDocketDate(inv.due_date)}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-ink-900 font-medium">{formatNaira(inv.total_kobo)}</div>
                      <div className="text-xs text-ink-500 capitalize">{inv.status.replace("_", " ")}</div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="card-surface p-5">
            <h2 className="text-sm font-medium text-ink-900 mb-3">Documents</h2>
            <div className="mb-4">
              <DocumentUploadForm firmId={firmId} clientId={client.id} />
            </div>
            {!documents || documents.length === 0 ? (
              <p className="text-sm text-ink-300 py-4">No documents uploaded yet.</p>
            ) : (
              <ul className="divide-y divide-slate-line">
                {documents.map((d) => (
                  <li key={d.id} className="py-3 flex items-center justify-between text-sm">
                    <span className="text-ink-900">{d.title}</span>
                    <span className="text-xs text-ink-500 capitalize">{d.category.replace("_", " ")}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
