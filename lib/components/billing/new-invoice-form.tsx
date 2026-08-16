"use client";

import { useMemo, useState } from "react";
import { useActionState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { createInvoice, type ActionState } from "@/lib/actions/invoices";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { formatNaira } from "@/lib/utils";
import { minutesToHours, formatHours } from "@/lib/time";
import { calculateLineAmountKobo, sumLineItemsKobo, nairaToKobo } from "@/lib/billing";

const initialState: ActionState = { error: null };

interface LineItem {
  description: string;
  quantity: string;
  unitPriceNaira: string;
}

interface UnbilledTimeEntry {
  id: string;
  description: string;
  minutes: number;
  hourly_rate_kobo: number;
  entry_date: string;
}

const EMPTY_ITEM: LineItem = { description: "", quantity: "1", unitPriceNaira: "" };

export function NewInvoiceForm({
  clients,
  cases,
  defaultClientId,
  defaultCaseId,
  unbilledTime = [],
}: {
  clients: { id: string; full_name: string; company_name: string | null }[];
  cases: { id: string; title: string; case_number: string; client_id: string }[];
  defaultClientId?: string;
  defaultCaseId?: string;
  unbilledTime?: UnbilledTimeEntry[];
}) {
  const [state, formAction, pending] = useActionState(createInvoice, initialState);
  const [clientId, setClientId] = useState(defaultClientId ?? "");
  const [items, setItems] = useState<LineItem[]>([{ ...EMPTY_ITEM }]);
  const [selectedTimeIds, setSelectedTimeIds] = useState<Set<string>>(new Set());

  const casesForClient = useMemo(
    () => cases.filter((c) => !clientId || c.client_id === clientId),
    [cases, clientId]
  );

  function toggleTimeEntry(id: string) {
    setSelectedTimeIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const timeLineItems = unbilledTime
    .filter((t) => selectedTimeIds.has(t.id))
    .map((t) => ({
      description: `${t.description} (${formatHours(t.minutes)}, ${t.entry_date})`,
      quantity: minutesToHours(t.minutes),
      unitPriceKobo: t.hourly_rate_kobo,
    }));

  const manualLineTotal = sumLineItemsKobo(
    items.map((i) => ({
      quantity: Number(i.quantity) || 0,
      unitPriceKobo: nairaToKobo(Number(i.unitPriceNaira) || 0),
    }))
  );
  const timeLineTotal = sumLineItemsKobo(timeLineItems);
  const totalKobo = manualLineTotal + timeLineTotal;

  function updateItem(index: number, patch: Partial<LineItem>) {
    setItems((prev) => prev.map((it, i) => (i === index ? { ...it, ...patch } : it)));
  }

  function submit(formData: FormData) {
    const manualPayload = items.map((i) => ({
      description: i.description,
      quantity: Number(i.quantity) || 0,
      unitPriceKobo: nairaToKobo(Number(i.unitPriceNaira) || 0),
    }));
    formData.set("items", JSON.stringify([...timeLineItems, ...manualPayload]));
    formData.set("timeEntryIds", JSON.stringify(Array.from(selectedTimeIds)));
    formAction(formData);
  }

  return (
    <form action={submit} className="space-y-5">
      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-medium text-ink-500 mb-1.5">Client</label>
          <Select
            name="clientId"
            value={clientId}
            onChange={(e) => setClientId(e.target.value)}
            required
          >
            <option value="">Select a client…</option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.full_name}
                {c.company_name ? ` (${c.company_name})` : ""}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <label className="block text-xs font-medium text-ink-500 mb-1.5">Case (optional)</label>
          <Select name="caseId" defaultValue={defaultCaseId ?? ""}>
            <option value="">Not tied to a specific case</option>
            {casesForClient.map((c) => (
              <option key={c.id} value={c.id}>
                {c.case_number} — {c.title}
              </option>
            ))}
          </Select>
        </div>
      </div>

      <div>
        <label className="block text-xs font-medium text-ink-500 mb-1.5">Due date</label>
        <Input name="dueDate" type="date" className="max-w-[200px]" />
      </div>

      {unbilledTime.length > 0 && (
        <div className="card-surface p-4 space-y-2">
          <h2 className="text-sm font-medium text-ink-900 mb-1">Unbilled time on this case</h2>
          <p className="text-xs text-ink-500 mb-3">
            Select entries to pull them in as line items. Selected entries are marked billed
            once this invoice is created.
          </p>
          <div className="space-y-1.5">
            {unbilledTime.map((t) => (
              <label
                key={t.id}
                className="flex items-center gap-3 text-sm py-1.5 px-2 rounded hover:bg-parchment-100 cursor-pointer"
              >
                <input
                  type="checkbox"
                  checked={selectedTimeIds.has(t.id)}
                  onChange={() => toggleTimeEntry(t.id)}
                  className="h-4 w-4 accent-brass"
                />
                <span className="flex-1 text-ink-900">{t.description}</span>
                <span className="text-ink-500 text-xs">{t.entry_date}</span>
                <span className="text-ink-500 text-xs w-16 text-right">
                  {formatHours(t.minutes)}
                </span>
                <span className="text-ink-900 text-xs w-24 text-right">
                  {formatNaira(calculateLineAmountKobo({ quantity: minutesToHours(t.minutes), unitPriceKobo: t.hourly_rate_kobo }))}
                </span>
              </label>
            ))}
          </div>
        </div>
      )}

      <div className="card-surface p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-medium text-ink-900">Line items</h2>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setItems((prev) => [...prev, { ...EMPTY_ITEM }])}
          >
            <Plus className="h-3.5 w-3.5" strokeWidth={2} />
            Add line
          </Button>
        </div>

        <div className="space-y-2">
          {items.map((item, idx) => (
            <div key={idx} className="flex gap-2 items-start">
              <Input
                placeholder="Description — e.g. Court appearance, 12 Aug"
                value={item.description}
                onChange={(e) => updateItem(idx, { description: e.target.value })}
                className="flex-1"
              />
              <Input
                type="number"
                min="0"
                step="1"
                placeholder="Qty"
                value={item.quantity}
                onChange={(e) => updateItem(idx, { quantity: e.target.value })}
                className="w-20"
              />
              <Input
                type="number"
                min="0"
                step="0.01"
                placeholder="Unit price (₦)"
                value={item.unitPriceNaira}
                onChange={(e) => updateItem(idx, { unitPriceNaira: e.target.value })}
                className="w-32"
              />
              <button
                type="button"
                aria-label="Remove line"
                onClick={() => setItems((prev) => prev.filter((_, i) => i !== idx))}
                disabled={items.length === 1}
                className="p-2 text-ink-300 hover:text-seal disabled:opacity-30 disabled:hover:text-ink-300"
              >
                <Trash2 className="h-4 w-4" strokeWidth={1.75} />
              </button>
            </div>
          ))}
        </div>

        <div className="flex justify-end pt-2 border-t border-slate-line">
          <div className="text-sm">
            <span className="text-ink-500 mr-3">Total</span>
            <span className="font-display text-lg text-ink-900">{formatNaira(totalKobo)}</span>
          </div>
        </div>
      </div>

      <div>
        <label className="block text-xs font-medium text-ink-500 mb-1.5">Notes (optional)</label>
        <Textarea name="notes" placeholder="Payment instructions, terms, etc." rows={3} />
      </div>

      {state.error && <p className="text-sm text-seal">{state.error}</p>}

      <Button type="submit" disabled={pending}>
        {pending ? "Creating…" : "Create invoice"}
      </Button>
    </form>
  );
}
