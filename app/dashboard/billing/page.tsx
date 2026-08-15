import Link from "next/link";
import { Plus } from "lucide-react";
import { requireProfile } from "@/lib/supabase/require-profile";
import { Button } from "@/components/ui/button";
import { InvoiceStatusBadge } from "@/components/ui/badge";
import { formatNaira, formatDocketDate } from "@/lib/utils";

export default async function BillingPage() {
  const { supabase, firmId } = await requireProfile();

  const [{ data: invoices }, { data: summary }] = await Promise.all([
    supabase
      .from("invoices")
      .select("id, invoice_number, status, total_kobo, amount_paid_kobo, due_date, clients(full_name)")
      .eq("firm_id", firmId)
      .order("created_at", { ascending: false }),
    supabase.from("v_firm_billing_summary").select("*").eq("firm_id", firmId).maybeSingle(),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="font-display text-2xl text-ink-900">Billing</h1>
          <p className="text-sm text-ink-500 mt-1">Every invoice raised across the practice.</p>
        </div>
        <Link href="/dashboard/billing/new">
          <Button size="sm">
            <Plus className="h-4 w-4" strokeWidth={2} />
            New invoice
          </Button>
        </Link>
      </div>

      <div className="grid grid-cols-3 gap-4 max-w-xl">
        <SummaryCard label="Invoiced" value={formatNaira(summary?.total_invoiced_kobo ?? 0)} />
        <SummaryCard label="Collected" value={formatNaira(summary?.total_collected_kobo ?? 0)} tone="active" />
        <SummaryCard label="Outstanding" value={formatNaira(summary?.outstanding_kobo ?? 0)} tone="seal" />
      </div>

      <div className="card-surface overflow-hidden">
        {!invoices || invoices.length === 0 ? (
          <p className="text-sm text-ink-300 py-12 text-center">
            No invoices yet — raise your first one to start tracking receivables.
          </p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-line text-left text-xs uppercase tracking-wide text-ink-500">
                <th className="px-5 py-3 font-medium">Invoice</th>
                <th className="px-5 py-3 font-medium">Client</th>
                <th className="px-5 py-3 font-medium">Due</th>
                <th className="px-5 py-3 font-medium">Status</th>
                <th className="px-5 py-3 font-medium text-right">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-line">
              {invoices.map((inv) => (
                <tr key={inv.id} className="hover:bg-parchment-50">
                  <td className="px-5 py-3">
                    <Link
                      href={`/dashboard/billing/${inv.id}`}
                      className="docket hover:text-brass-dark"
                    >
                      {inv.invoice_number}
                    </Link>
                  </td>
                  <td className="px-5 py-3 text-ink-900">
                    {(inv.clients as unknown as { full_name: string } | null)?.full_name ?? "—"}
                  </td>
                  <td className="px-5 py-3 text-ink-500">{formatDocketDate(inv.due_date)}</td>
                  <td className="px-5 py-3">
                    <InvoiceStatusBadge status={inv.status} />
                  </td>
                  <td className="px-5 py-3 text-right text-ink-900 font-medium">
                    {formatNaira(inv.total_kobo)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

function SummaryCard({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: "active" | "seal";
}) {
  return (
    <div className="card-surface p-4">
      <div className="text-xs uppercase tracking-wide text-ink-500 mb-1.5">{label}</div>
      <div
        className={
          "font-display text-xl " +
          (tone === "active" ? "text-status-active" : tone === "seal" ? "text-seal" : "text-ink-900")
        }
      >
        {value}
      </div>
    </div>
  );
}
