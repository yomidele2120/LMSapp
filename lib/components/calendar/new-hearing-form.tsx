"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { Plus, X } from "lucide-react";
import { createCourtDate, type ActionState } from "@/lib/actions/calendar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

const initialState: ActionState = { error: null };

export function NewHearingForm({
  cases,
}: {
  cases: { id: string; title: string; case_number: string }[];
}) {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState(createCourtDate, initialState);
  const wasPending = useRef(false);

  // Close only after a submission actually completes without an error —
  // catching the pending:true -> false edge rather than closing
  // unconditionally on submit, so a validation error stays visible.
  useEffect(() => {
    if (wasPending.current && !pending && !state.error) {
      setOpen(false);
    }
    wasPending.current = pending;
  }, [pending, state.error]);

  if (!open) {
    return (
      <Button size="sm" onClick={() => setOpen(true)}>
        <Plus className="h-4 w-4" strokeWidth={2} />
        Add to calendar
      </Button>
    );
  }

  return (
    <form action={formAction} className="card-surface p-5 space-y-4 max-w-lg">
      <div className="grid sm:grid-cols-2 gap-3">
        <div className="sm:col-span-2">
          <label className="block text-xs font-medium text-ink-500 mb-1.5">Case</label>
          <Select name="caseId" required defaultValue="">
            <option value="" disabled>
              Select a case…
            </option>
            {cases.map((c) => (
              <option key={c.id} value={c.id}>
                {c.case_number} — {c.title}
              </option>
            ))}
          </Select>
        </div>
        <div className="sm:col-span-2">
          <label className="block text-xs font-medium text-ink-500 mb-1.5">Title</label>
          <Input name="title" placeholder="e.g. Hearing on preliminary objection" required />
        </div>
        <div>
          <label className="block text-xs font-medium text-ink-500 mb-1.5">Type</label>
          <Select name="eventType" defaultValue="hearing">
            <option value="hearing">Hearing</option>
            <option value="filing_deadline">Filing deadline</option>
            <option value="meeting">Meeting</option>
          </Select>
        </div>
        <div>
          <label className="block text-xs font-medium text-ink-500 mb-1.5">Location</label>
          <Input name="location" placeholder="e.g. FHC, Abuja — Court 4" />
        </div>
        <div>
          <label className="block text-xs font-medium text-ink-500 mb-1.5">Date</label>
          <Input name="date" type="date" required />
        </div>
        <div>
          <label className="block text-xs font-medium text-ink-500 mb-1.5">Time</label>
          <Input name="time" type="time" defaultValue="09:00" />
        </div>
        <div className="sm:col-span-2">
          <label className="block text-xs font-medium text-ink-500 mb-1.5">Notes (optional)</label>
          <Textarea name="notes" rows={2} />
        </div>
      </div>

      {state.error && <p className="text-sm text-seal">{state.error}</p>}

      <div className="flex gap-2 justify-end">
        <Button type="button" variant="ghost" size="sm" onClick={() => setOpen(false)}>
          <X className="h-4 w-4" strokeWidth={2} />
          Cancel
        </Button>
        <Button type="submit" size="sm" disabled={pending}>
          {pending ? "Saving…" : "Save to calendar"}
        </Button>
      </div>
    </form>
  );
}
