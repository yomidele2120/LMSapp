"use client";

import { useActionState } from "react";
import { Search } from "lucide-react";
import { generateLegalResearch, type ActionState } from "@/lib/actions/ai";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

const initialState: ActionState = { error: null };

export function LegalResearchForm({
  cases,
}: {
  cases: { id: string; title: string; case_number: string }[];
}) {
  const [state, formAction, pending] = useActionState(generateLegalResearch, initialState);

  return (
    <form action={formAction} className="card-surface p-5 space-y-3">
      <div>
        <label className="block text-xs font-medium text-ink-500 mb-1.5">
          Ask a legal research question
        </label>
        <Textarea
          name="question"
          rows={3}
          placeholder="e.g. What's the limitation period for a simple contract claim under the Limitation Law of Lagos State?"
          required
        />
      </div>
      <div className="flex items-end gap-3">
        <div className="flex-1 max-w-xs">
          <label className="block text-xs font-medium text-ink-500 mb-1.5">
            Link to a case (optional)
          </label>
          <Select name="caseId" defaultValue="">
            <option value="">No case</option>
            {cases.map((c) => (
              <option key={c.id} value={c.id}>
                {c.case_number} — {c.title}
              </option>
            ))}
          </Select>
        </div>
        <Button type="submit" disabled={pending}>
          <Search className="h-4 w-4" strokeWidth={1.75} />
          {pending ? "Researching…" : "Ask"}
        </Button>
      </div>
      {state.error && <p className="text-sm text-seal">{state.error}</p>}
    </form>
  );
}
