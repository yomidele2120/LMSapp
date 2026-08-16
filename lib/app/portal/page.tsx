import Link from "next/link";
import { Briefcase, FileText, Receipt, Download } from "lucide-react";
import { requireClientPortalUser } from "@/lib/supabase/require-client";
import { InvoiceStatusBadge, CaseStatusBadge } from "@/components/ui/badge";
import { formatNaira, formatDocketDate } from "@/lib/utils";

export default async function PortalHomePage() {
  const { supabase, clientRecord } = await requireClientPortalUser();

  const [{ data: cases }, { data: invoices }, { data: documents }] = await Promise.all([
    supabase
      .from("cases")
      .select("id, title, case_number, status, practice_area, next_hearing_date")
      .eq("client_id", clientRecord.id)
      .order("created_at", { ascending: false }),
    supabase
      .from("invoices")
      .select("id, invoice_number, status, total_kobo, amount_paid_kobo, due_date")
      .eq("client_id", clientRecord.id)
      .order("created_at", { ascending: false }),
    supabase
      .from("documents")
      .select("id, title, category, created_at, case_id")
      .eq("client_id", clientRecord.id)
      .eq("is_client_visible", true)
      .order("created_at", { ascending: false }),
  ]);

  return (
    <div className="space-y-10">
      <div>
        <h1 className="font-display text-2xl text-ink-900">
          Welcome, {clientRecord.full_name.split(" ")[0]}
        </h1>
        <p className="text-sm text-ink-500 mt-1">
          Here&apos;s where things stand with your matters.
        </p>
      </div>

      <section>
        <div className="flex items-center gap-2 mb-3">
          <Briefcase className="h-4 w-4 text-brass" strokeWidth={1.75} />
          <h2 className="text-sm font-medium text-ink-900">Your cases</h2>
        </div>
        {!cases || cases.length === 0 ? (
          <EmptyCard message="No matters on file yet." />
        ) : (
          <div className="card-surface divide-y divide-slate-line">
            {cases.map((c) => (
              <div key={c.id} className="p-4 flex items-center justify-between gap-4 flex-wrap">
                <div>
                  <div className="text-sm font-medium text-ink-900">{c.title}</div>
                  <div className="docket mt-1">
                    {c.case_number} · {c.practice_area}
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  {c.next_hearing_date && (
                    <span className="text-xs text-ink-500">
                      Next: {formatDocketDate(c.next_hearing_date)}
                    </span>
                  )}
                  <CaseStatusBadge status={c.status} />
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section>
        <div className="flex items-center gap-2 mb-3">
          <Receipt className="h-4 w-4 text-brass" strokeWidth={1.75} />
          <h2 className="text-sm font-medium text-ink-900">Invoices</h2>
        </div>
        {!invoices || invoices.length === 0 ? (
          <EmptyCard message="No invoices yet." />
        ) : (
          <div className="card-surface divide-y divide-slate-line">
            {invoices.map((inv) => (
              <div key={inv.id} className="p-4 flex items-center justify-between gap-4 flex-wrap">
                <div>
                  <div className="text-sm font-medium text-ink-900">{inv.invoice_number}</div>
                  {inv.due_date && (
                    <div className="text-xs text-ink-500 mt-0.5">
                      Due {formatDocketDate(inv.due_date)}
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-sm text-ink-900">
                    {formatNaira(inv.total_kobo - inv.amount_paid_kobo)}{" "}
                    <span className="text-ink-300 text-xs">outstanding</span>
                  </span>
                  <InvoiceStatusBadge status={inv.status} />
                  <a
                    href={`/api/invoices/${inv.id}/pdf`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-xs text-brass hover:text-brass-dark font-medium"
                  >
                    <Download className="h-3.5 w-3.5" strokeWidth={1.75} />
                    Download
                  </a>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section>
        <div className="flex items-center gap-2 mb-3">
          <FileText className="h-4 w-4 text-brass" strokeWidth={1.75} />
          <h2 className="text-sm font-medium text-ink-900">Shared documents</h2>
        </div>
        {!documents || documents.length === 0 ? (
          <EmptyCard message="Your lawyer hasn't shared any documents yet." />
        ) : (
          <div className="card-surface divide-y divide-slate-line">
            {documents.map((d) => (
              <div key={d.id} className="p-4 flex items-center justify-between gap-4">
                <span className="text-sm text-ink-900">{d.title}</span>
                <span className="text-xs text-ink-500">{formatDocketDate(d.created_at)}</span>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function EmptyCard({ message }: { message: string }) {
  return (
    <div className="card-surface p-8 text-center">
      <p className="text-sm text-ink-300">{message}</p>
    </div>
  );
}
