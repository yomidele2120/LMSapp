"use client";

import { useState, useTransition } from "react";
import { Download, Mail, Plus, X } from "lucide-react";
import { markInvoiceSent, recordManualPayment } from "@/lib/actions/invoices";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { formatNaira } from "@/lib/utils";

export function InvoiceActions({
  invoiceId,
  invoiceNumber,
  status,
  balanceDueKobo,
  clientEmail,
  clientName,
  firmName,
  portalUrl,
}: {
  invoiceId: string;
  invoiceNumber: string;
  status: string;
  balanceDueKobo: number;
  clientEmail: string | null;
  clientName: string;
  firmName: string;
  portalUrl: string;
}) {
  const [isPending, startTransition] = useTransition();
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const pdfUrl = `/api/invoices/${invoiceId}/pdf`;

  const mailtoHref = clientEmail
    ? (() => {
        const subject = `Invoice ${invoiceNumber} from ${firmName}`;
        const body = [
          `Dear ${clientName},`,
          "",
          `Please find invoice ${invoiceNumber} for ${formatNaira(balanceDueKobo)}.`,
          `You can view and download it from your client portal: ${portalUrl}`,
          "",
          `Kind regards,`,
          firmName,
        ].join("\n");
        return `mailto:${clientEmail}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
      })()
    : null;

  function handleSend() {
    // Opens the lawyer's own mail client with the message pre-filled — this
    // app doesn't send email itself (no SMTP/provider wired up yet), so the
    // lawyer reviews and hits send from their own account. We still mark
    // the invoice as sent server-side either way, since that reflects
    // firm-side intent regardless of which mail client actually fires.
    if (mailtoHref) window.location.href = mailtoHref;
    startTransition(() => markInvoiceSent(invoiceId));
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <a href={pdfUrl} target="_blank" rel="noopener noreferrer">
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4" strokeWidth={1.75} />
            Download PDF
          </Button>
        </a>

        {status !== "paid" && status !== "void" && (
          <Button size="sm" onClick={handleSend} disabled={isPending}>
            <Mail className="h-4 w-4" strokeWidth={1.75} />
            {clientEmail ? "Email to client" : "Mark as sent"}
          </Button>
        )}

        {status !== "paid" && status !== "void" && !showPaymentForm && (
          <Button variant="outline" size="sm" onClick={() => setShowPaymentForm(true)}>
            <Plus className="h-4 w-4" strokeWidth={1.75} />
            Record payment
          </Button>
        )}
      </div>

      {!clientEmail && (
        <p className="text-xs text-ink-300">
          No email on file for this client — add one to enable one-click send.
        </p>
      )}

      {showPaymentForm && (
        <form
          action={async (formData) => {
            await recordManualPayment(invoiceId, formData);
            setShowPaymentForm(false);
          }}
          className="card-surface p-4 flex flex-wrap items-end gap-3 max-w-md"
        >
          <div className="w-40">
            <label className="block text-xs font-medium text-ink-500 mb-1.5">Amount (₦)</label>
            <Input name="amountNaira" type="number" min="1" step="0.01" required />
          </div>
          <div className="w-40">
            <label className="block text-xs font-medium text-ink-500 mb-1.5">Method</label>
            <Select name="method" defaultValue="bank_transfer">
              <option value="bank_transfer">Bank transfer</option>
              <option value="cash">Cash</option>
              <option value="paystack">Paystack</option>
              <option value="flutterwave">Flutterwave</option>
              <option value="other">Other</option>
            </Select>
          </div>
          <div className="flex gap-2">
            <Button type="submit" size="sm">
              Save payment
            </Button>
            <Button type="button" variant="ghost" size="sm" onClick={() => setShowPaymentForm(false)}>
              <X className="h-4 w-4" strokeWidth={2} />
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}
