"use client";

import { useActionState } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { createCase, type ActionState } from "@/lib/actions/cases";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";

const initialState: ActionState = { error: null };

const PRACTICE_AREAS = [
  "Litigation",
  "Corporate & Commercial",
  "Property & Real Estate",
  "Family Law",
  "Intellectual Property",
  "Employment & Labour",
  "Criminal Defence",
  "Tax",
  "Arbitration",
];

export function NewCaseForm({
  clients,
  defaultClientId,
}: {
  clients: { id: string; full_name: string; company_name: string | null }[];
  defaultClientId?: string;
}) {
  const [state, formAction, pending] = useActionState(createCase, initialState);

  return (
    <div className="max-w-2xl">
      <Link href="/dashboard/cases" className="inline-flex items-center gap-1.5 text-sm text-ink-500 hover:text-ink mb-6">
        <ArrowLeft className="h-3.5 w-3.5" strokeWidth={1.75} />
        Back to cases
      </Link>

      <h1 className="font-display text-2xl text-ink-900 mb-6">New case</h1>

      <form action={formAction} className="card-surface p-6 space-y-5">
        <div>
          <label htmlFor="title" className="block text-xs font-medium text-ink-500 mb-1.5">Case title</label>
          <Input id="title" name="title" placeholder="e.g. Adeyemi v. Coastal Properties Ltd" required />
        </div>

        <div>
          <label htmlFor="clientId" className="block text-xs font-medium text-ink-500 mb-1.5">Client</label>
          {clients.length === 0 ? (
            <p className="text-sm text-ink-500">
              No clients yet.{" "}
              <Link href="/dashboard/clients/new" className="text-brass hover:text-brass-dark font-medium">
                Add one first
              </Link>
              .
            </p>
          ) : (
            <Select id="clientId" name="clientId" defaultValue={defaultClientId ?? ""} required>
              <option value="" disabled>Select a client</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.full_name}{c.company_name ? ` — ${c.company_name}` : ""}
                </option>
              ))}
            </Select>
          )}
        </div>

        <div>
          <label htmlFor="practiceArea" className="block text-xs font-medium text-ink-500 mb-1.5">Practice area</label>
          <Select id="practiceArea" name="practiceArea" defaultValue="" required>
            <option value="" disabled>Select a practice area</option>
            {PRACTICE_AREAS.map((a) => (
              <option key={a} value={a}>{a}</option>
            ))}
          </Select>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="opposingParties" className="block text-xs font-medium text-ink-500 mb-1.5">
              Opposing parties
            </label>
            <Input id="opposingParties" name="opposingParties" />
          </div>
          <div>
            <label htmlFor="courtName" className="block text-xs font-medium text-ink-500 mb-1.5">Court</label>
            <Input id="courtName" name="courtName" />
          </div>
        </div>

        <div>
          <label htmlFor="description" className="block text-xs font-medium text-ink-500 mb-1.5">
            Description
          </label>
          <Textarea id="description" name="description" rows={4} />
        </div>

        {state.error && <p role="alert" className="text-sm text-seal">{state.error}</p>}

        <div className="flex justify-end gap-3 pt-2">
          <Link href="/dashboard/cases">
            <Button type="button" variant="outline">Cancel</Button>
          </Link>
          <Button type="submit" disabled={pending || clients.length === 0}>
            {pending ? "Creating…" : "Create case"}
          </Button>
        </div>
      </form>
    </div>
  );
}
