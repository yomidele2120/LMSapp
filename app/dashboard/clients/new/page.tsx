"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { createClientRecord, type ActionState } from "@/lib/actions/clients";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";

const initialState: ActionState = { error: null };

export default function NewClientPage() {
  const [state, formAction, pending] = useActionState(createClientRecord, initialState);
  const [clientType, setClientType] = useState<"individual" | "company">("individual");

  return (
    <div className="max-w-2xl">
      <Link href="/dashboard/clients" className="inline-flex items-center gap-1.5 text-sm text-ink-500 hover:text-ink mb-6">
        <ArrowLeft className="h-3.5 w-3.5" strokeWidth={1.75} />
        Back to clients
      </Link>

      <h1 className="font-display text-2xl text-ink-900 mb-6">New client</h1>

      <form action={formAction} className="card-surface p-6 space-y-5">
        <div>
          <label className="block text-xs font-medium text-ink-500 mb-1.5">Client type</label>
          <Select
            name="clientType"
            value={clientType}
            onChange={(e) => setClientType(e.target.value as "individual" | "company")}
          >
            <option value="individual">Individual</option>
            <option value="company">Company</option>
          </Select>
        </div>

        <div>
          <label htmlFor="fullName" className="block text-xs font-medium text-ink-500 mb-1.5">
            {clientType === "company" ? "Contact person's name" : "Full name"}
          </label>
          <Input id="fullName" name="fullName" required />
        </div>

        {clientType === "company" && (
          <div>
            <label htmlFor="companyName" className="block text-xs font-medium text-ink-500 mb-1.5">
              Company name
            </label>
            <Input id="companyName" name="companyName" required />
          </div>
        )}

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="email" className="block text-xs font-medium text-ink-500 mb-1.5">Email</label>
            <Input id="email" name="email" type="email" />
          </div>
          <div>
            <label htmlFor="phone" className="block text-xs font-medium text-ink-500 mb-1.5">Phone</label>
            <Input id="phone" name="phone" type="tel" />
          </div>
        </div>

        <div>
          <label htmlFor="address" className="block text-xs font-medium text-ink-500 mb-1.5">Address</label>
          <Input id="address" name="address" />
        </div>

        <div>
          <label htmlFor="notes" className="block text-xs font-medium text-ink-500 mb-1.5">Notes</label>
          <Textarea id="notes" name="notes" rows={3} />
        </div>

        {state.error && (
          <p role="alert" className="text-sm text-seal">{state.error}</p>
        )}

        <div className="flex justify-end gap-3 pt-2">
          <Link href="/dashboard/clients">
            <Button type="button" variant="outline">Cancel</Button>
          </Link>
          <Button type="submit" disabled={pending}>
            {pending ? "Saving…" : "Save client"}
          </Button>
        </div>
      </form>
    </div>
  );
}
