"use client";

import { useActionState } from "react";
import { Sparkles } from "lucide-react";
import { generateCaseSummary, type ActionState } from "@/lib/actions/ai";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";

const initialState: ActionState = { error: null };

export function GenerateSummaryForm({
  cases,
}: {
  cases: { id: string; title: string; case_number: string }[];
}) {
  const [state, formAction, pending] = useActionState(generateCaseSummary, initialState);

  return (
    <form action={formAction} className="card-surface p-5 flex items-end gap-3 flex-wrap">
      <div className="flex-1 min-w-[240px]">
        <label className="block text-xs font-medium text-ink-500 mb-1.5">
          Summarize a case
        </label>
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
      <Button type="submit" disabled={pending}>
        <Sparkles className="h-4 w-4" strokeWidth={1.75} />
        {pending ? "Generating…" : "Generate summary"}
      </Button>
      {state.error && <p className="text-sm text-seal w-full">{state.error}</p>}
    </form>
  );
}
