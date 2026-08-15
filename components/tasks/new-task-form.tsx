"use client";

import { useActionState, useState } from "react";
import { Plus, X } from "lucide-react";
import { createStandaloneTask, type ActionState } from "@/lib/actions/tasks";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";

const initialState: ActionState = { error: null };

export function NewTaskForm({
  cases,
  colleagues,
}: {
  cases: { id: string; title: string; case_number: string }[];
  colleagues: { id: string; full_name: string }[];
}) {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState(createStandaloneTask, initialState);

  if (!open) {
    return (
      <Button size="sm" onClick={() => setOpen(true)}>
        <Plus className="h-4 w-4" strokeWidth={2} />
        New task
      </Button>
    );
  }

  return (
    <form
      action={async (fd) => {
        await formAction(fd);
        setOpen(false);
      }}
      className="card-surface p-4 flex flex-wrap gap-3 items-end w-full"
    >
      <div className="flex-1 min-w-[200px]">
        <label className="block text-xs font-medium text-ink-500 mb-1.5">Task</label>
        <Input name="title" placeholder="e.g. Follow up on filing fee receipt" required />
      </div>
      <div className="w-44">
        <label className="block text-xs font-medium text-ink-500 mb-1.5">Case (optional)</label>
        <Select name="caseId" defaultValue="">
          <option value="">No case</option>
          {cases.map((c) => (
            <option key={c.id} value={c.id}>
              {c.case_number}
            </option>
          ))}
        </Select>
      </div>
      <div className="w-40">
        <label className="block text-xs font-medium text-ink-500 mb-1.5">Assign to</label>
        <Select name="assignedTo" defaultValue="">
          <option value="">Myself</option>
          {colleagues.map((c) => (
            <option key={c.id} value={c.id}>
              {c.full_name}
            </option>
          ))}
        </Select>
      </div>
      <div className="w-32">
        <label className="block text-xs font-medium text-ink-500 mb-1.5">Priority</label>
        <Select name="priority" defaultValue="medium">
          <option value="low">Low</option>
          <option value="medium">Medium</option>
          <option value="high">High</option>
          <option value="urgent">Urgent</option>
        </Select>
      </div>
      <div className="w-40">
        <label className="block text-xs font-medium text-ink-500 mb-1.5">Due date</label>
        <Input name="dueDate" type="date" />
      </div>

      {state.error && <p className="text-sm text-seal w-full">{state.error}</p>}

      <div className="flex gap-2">
        <Button type="submit" size="sm" disabled={pending}>
          {pending ? "Adding…" : "Add task"}
        </Button>
        <Button type="button" variant="ghost" size="sm" onClick={() => setOpen(false)}>
          <X className="h-4 w-4" strokeWidth={2} />
        </Button>
      </div>
    </form>
  );
}
