import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { requireProfile } from "@/lib/supabase/require-profile";
import { InvoiceStatusBadge } from "@/components/ui/badge";
import { InvoiceActions } from "@/components/billing/invoice-actions";
import { formatNaira, formatDocketDate } from "@/lib/utils";

export default async function InvoiceDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase, firmId } = await requireProfile();

  const { data: invoice } = await supabase
    .from("invoices")
    .select(
      "id, invoice_number, status, subtotal_kobo, tax_kobo, total_kobo, amount_paid_kobo, due_date, issued_at, notes, case_id, client_id, clients(full_name, company_name, email), cases(title, case_number)"
    )
    .eq("id", id)
    .eq("firm_id", firmId)
    .single();

  if (!invoice) notFound();

  const client = Array.isArray(invoice.clients) ? invoice.clients[0] : invoice.clients;
  const linkedCase = Array.isArray(invoice.cases) ? invoice.cases[0] : invoice.cases;

  const [{ data: items }, { data: payments }, { data: firm }] = await Promise.all([
    supabase
      .from("invoice_items")
      .select("id, description, quantity, unit_price_kobo, amount_kobo")
      .eq("invoice_id", id)
      .order("sort_order", { ascending: true }),
    supabase
      .from("payments")
      .select("id, amount_kobo, method, status, paid_at, created_at")
      .eq("invoice_id", id)
      .order("created_at", { ascending: false }),
    supabase.from("firms").select("name").eq("id", firmId).single(),
  ]);

  const balanceDue = invoice.total_kobo - invoice.amount_paid_kobo;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "";

  return (
    <div className="space-y-8 max-w-3xl">
      <div>
        <Link
          href="/dashboard/billing"
          className="inline-flex items-center gap-1.5 text-sm text-ink-500 hover:text-ink mb-4"
        >
          <ArrowLeft className="h-3.5 w-3.5" strokeWidth={2} />
          Billing
        </Link>
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="font-display text-2xl text-ink-900">{invoice.invoice_number}</h1>
              <InvoiceStatusBadge status={invoice.status} />
            </div>
            <p className="text-sm text-ink-500 mt-1">
              {client?.company_name || client?.full_name}
              {linkedCase && (
                <>
                  {" "}
                  ·{" "}
                  <Link href={`/dashboard/cases/${invoice.case_id}`} className="hover:text-brass-dark">
                    {linkedCase.case_number}
                  </Link>
                </>
              )}
            </p>
          </div>
          <div className="text-right">
            <div className="font-display text-2xl text-ink-900">{formatNaira(balanceDue)}</div>
            <div className="text-xs text-ink-500">
              {balanceDue > 0 ? "balance due" : "paid in full"}
            </div>
          </div>
        </div>
      </div>

      <InvoiceActions
        invoiceId={invoice.id}
        invoiceNumber={invoice.invoice_number}
        status={invoice.status}
        balanceDueKobo={balanceDue}
        clientEmail={client?.email ?? null}
        clientName={client?.full_name ?? "there"}
        firmName={firm?.name ?? "your firm"}
        portalUrl={appUrl ? `${appUrl}/portal` : "/portal"}
      />

      <div className="card-surface overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-line text-left text-xs uppercase tracking-wide text-ink-500">
              <th className="px-5 py-3 font-medium">Description</th>
              <th className="px-5 py-3 font-medium text-right">Qty</th>
              <th className="px-5 py-3 font-medium text-right">Unit price</th>
              <th className="px-5 py-3 font-medium text-right">Amount</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-line">
            {(items ?? []).map((item) => (
              <tr key={item.id}>
                <td className="px-5 py-3 text-ink-900">{item.description}</td>
                <td className="px-5 py-3 text-right text-ink-500">{item.quantity}</td>
                <td className="px-5 py-3 text-right text-ink-500">
                  {formatNaira(item.unit_price_kobo)}
                </td>
                <td className="px-5 py-3 text-right text-ink-900">
                  {formatNaira(item.amount_kobo)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="border-t border-slate-line p-5 flex justify-end">
          <div className="w-56 space-y-1.5 text-sm">
            <div className="flex justify-between text-ink-500">
              <span>Subtotal</span>
              <span>{formatNaira(invoice.subtotal_kobo)}</span>
            </div>
            {invoice.tax_kobo > 0 && (
              <div className="flex justify-between text-ink-500">
                <span>Tax</span>
                <span>{formatNaira(invoice.tax_kobo)}</span>
              </div>
            )}
            <div className="flex justify-between font-medium text-ink-900 pt-1.5 border-t border-slate-line">
              <span>Total</span>
              <span>{formatNaira(invoice.total_kobo)}</span>
            </div>
            {invoice.amount_paid_kobo > 0 && (
              <div className="flex justify-between text-status-active">
                <span>Paid</span>
                <span>{formatNaira(invoice.amount_paid_kobo)}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {invoice.notes && (
        <div>
          <h2 className="text-sm font-medium text-ink-900 mb-2">Notes</h2>
          <p className="text-sm text-ink-500 whitespace-pre-wrap">{invoice.notes}</p>
        </div>
      )}

      <div>
        <h2 className="text-sm font-medium text-ink-900 mb-3">Payment history</h2>
        {!payments || payments.length === 0 ? (
          <p className="text-sm text-ink-300">No payments recorded yet.</p>
        ) : (
          <div className="card-surface divide-y divide-slate-line">
            {payments.map((p) => (
              <div key={p.id} className="p-4 flex items-center justify-between text-sm">
                <div>
                  <span className="text-ink-900">{formatNaira(p.amount_kobo)}</span>
                  <span className="text-ink-500 capitalize"> · {p.method.replace("_", " ")}</span>
                </div>
                <span className="text-xs text-ink-500">
                  {formatDocketDate(p.paid_at ?? p.created_at)}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
