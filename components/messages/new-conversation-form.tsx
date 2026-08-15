"use client";

import { useActionState, useState } from "react";
import { Plus, X } from "lucide-react";
import { startConversation, type ActionState } from "@/lib/actions/messages";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

const initialState: ActionState = { error: null };

export function NewConversationForm({
  colleagues,
}: {
  colleagues: { id: string; full_name: string }[];
}) {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState(startConversation, initialState);

  if (!open) {
    return (
      <Button size="sm" variant="outline" className="w-full" onClick={() => setOpen(true)}>
        <Plus className="h-4 w-4" strokeWidth={2} />
        New message
      </Button>
    );
  }

  return (
    <form action={formAction} className="space-y-2.5">
      <Select name="profileId" required defaultValue="">
        <option value="" disabled>
          Message who?
        </option>
        {colleagues.map((c) => (
          <option key={c.id} value={c.id}>
            {c.full_name}
          </option>
        ))}
      </Select>
      <Textarea name="message" rows={2} placeholder="Say something…" required />
      {state.error && <p className="text-xs text-seal">{state.error}</p>}
      <div className="flex gap-2">
        <Button type="submit" size="sm" disabled={pending} className="flex-1">
          {pending ? "Sending…" : "Send"}
        </Button>
        <Button type="button" variant="ghost" size="sm" onClick={() => setOpen(false)}>
          <X className="h-4 w-4" strokeWidth={2} />
        </Button>
      </div>
    </form>
  );
}
