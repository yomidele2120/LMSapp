"use client";

import { useState } from "react";
import Link from "next/link";
import { CheckSquare, Square } from "lucide-react";
import { addTimelineNote, createTask, toggleTaskDone } from "@/lib/actions/cases";
import { extractDocumentTextForm } from "@/lib/actions/documents";
import { generateContractReviewForm } from "@/lib/actions/ai";
import { logTime, deleteTimeEntry } from "@/lib/actions/time-entries";
import { PriorityBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { DocumentUploadForm } from "@/components/documents/upload-form";
import { EvidenceUploadForm } from "@/components/evidence/evidence-upload-form";
import { formatDocketDate, formatNaira, cn } from "@/lib/utils";

type CaseRecord = {
  id: string;
  opposing_parties: string | null;
  court_name: string | null;
  court_location: string | null;
  filing_date: string | null;
  next_hearing_date: string | null;
  description: string | null;
};

type TimelineEvent = { id: string; event_type: string; title: string; description: string | null; event_date: string };
type TaskRow = { id: string; title: string; status: string; priority: string; due_date: string | null };
type DocRow = {
  id: string;
  title: string;
  category: string;
  created_at: string;
  storage_path: string;
  mime_type: string;
  ocr_text: string | null;
};
type EvidenceRow = { id: string; title: string; evidence_type: string; source: string | null; occurred_at: string | null };
type InvoiceRow = { id: string; invoice_number: string; status: string; total_kobo: number; amount_paid_kobo: number; due_date: string | null };
type TimeEntryRow = {
  id: string;
  description: string;
  minutes: number;
  hourly_rate_kobo: number;
  billable: boolean;
  invoiced: boolean;
  entry_date: string;
};

const TABS = ["Overview", "Timeline", "Tasks", "Time", "Documents", "Evidence", "Billing"] as const;
type Tab = (typeof TABS)[number];

export function CaseWorkspace({
  caseId,
  firmId,
  caseRecord,
  timeline,
  tasks,
  documents,
  evidence,
  invoices,
  timeEntries,
}: {
  caseId: string;
  firmId: string;
  caseRecord: CaseRecord;
  timeline: TimelineEvent[];
  tasks: TaskRow[];
  documents: DocRow[];
  evidence: EvidenceRow[];
  invoices: InvoiceRow[];
  timeEntries: TimeEntryRow[];
}) {
  const [tab, setTab] = useState<Tab>("Overview");

  return (
    <div>
      <div className="flex gap-1 border-b border-slate-line mb-6">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={cn(
              "px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors",
              tab === t
                ? "border-brass text-ink-900"
                : "border-transparent text-ink-500 hover:text-ink"
            )}
          >
            {t}
            {t === "Tasks" && tasks.some((x) => x.status !== "done") && (
              <span className="ml-1.5 text-xs text-brass">{tasks.filter((x) => x.status !== "done").length}</span>
            )}
            {t === "Time" && timeEntries.some((x) => x.billable && !x.invoiced) && (
              <span className="ml-1.5 text-xs text-brass">
                {timeEntries.filter((x) => x.billable && !x.invoiced).length}
              </span>
            )}
          </button>
        ))}
      </div>

      {tab === "Overview" && <OverviewTab caseRecord={caseRecord} />}
      {tab === "Timeline" && <TimelineTab caseId={caseId} timeline={timeline} />}
      {tab === "Tasks" && <TasksTab caseId={caseId} firmId={firmId} tasks={tasks} />}
      {tab === "Time" && <TimeTab caseId={caseId} timeEntries={timeEntries} />}
      {tab === "Documents" && <DocumentsTab documents={documents} firmId={firmId} caseId={caseId} />}
      {tab === "Evidence" && <EvidenceTab evidence={evidence} firmId={firmId} caseId={caseId} />}
      {tab === "Billing" && <BillingTab invoices={invoices} caseId={caseId} />}
    </div>
  );
}

function OverviewTab({ caseRecord }: { caseRecord: CaseRecord }) {
  const fields: [string, string | null][] = [
    ["Opposing parties", caseRecord.opposing_parties],
    ["Court", [caseRecord.court_name, caseRecord.court_location].filter(Boolean).join(", ") || null],
    ["Filing date", caseRecord.filing_date ? formatDocketDate(caseRecord.filing_date) : null],
    ["Next hearing", caseRecord.next_hearing_date ? formatDocketDate(caseRecord.next_hearing_date) : null],
  ];

  return (
    <div className="grid md:grid-cols-3 gap-6">
      <div className="md:col-span-2 card-surface p-5">
        <h2 className="text-sm font-medium text-ink-900 mb-3">Description</h2>
        <p className="text-sm text-ink-500 whitespace-pre-wrap">
          {caseRecord.description || "No description on file yet."}
        </p>
      </div>
      <div className="card-surface p-5">
        <h2 className="text-sm font-medium text-ink-900 mb-3">Details</h2>
        <dl className="space-y-3 text-sm">
          {fields.map(([label, value]) => (
            <div key={label}>
              <dt className="text-xs text-ink-500 uppercase tracking-wide">{label}</dt>
              <dd className="text-ink-900 mt-0.5">{value ?? "—"}</dd>
            </div>
          ))}
        </dl>
      </div>
    </div>
  );
}

function TimelineTab({ caseId, timeline }: { caseId: string; timeline: TimelineEvent[] }) {
  const addNote = addTimelineNote.bind(null, caseId);

  return (
    <div className="max-w-2xl space-y-6">
      <form action={addNote} className="card-surface p-4 space-y-3">
        <Input name="title" placeholder="Event title, e.g. Statement of claim filed" required />
        <Textarea name="description" placeholder="Details (optional)" rows={2} />
        <div className="flex justify-end">
          <Button type="submit" size="sm">Add to timeline</Button>
        </div>
      </form>

      {timeline.length === 0 ? (
        <p className="text-sm text-ink-300 py-4">Nothing recorded yet.</p>
      ) : (
        <ol className="relative border-l border-slate-line ml-2 space-y-6">
          {timeline.map((e) => (
            <li key={e.id} className="ml-5">
              <span className="absolute -ml-[26px] mt-1 h-2.5 w-2.5 rounded-full bg-brass" />
              <div className="docket mb-1">{formatDocketDate(e.event_date)}</div>
              <div className="text-sm text-ink-900 font-medium">{e.title}</div>
              {e.description && <p className="text-sm text-ink-500 mt-0.5">{e.description}</p>}
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}

function TasksTab({ caseId, firmId, tasks }: { caseId: string; firmId: string; tasks: TaskRow[] }) {
  const addTask = createTask.bind(null, caseId, firmId);

  return (
    <div className="max-w-2xl space-y-6">
      <form action={addTask} className="card-surface p-4 flex gap-3 items-end flex-wrap">
        <div className="flex-1 min-w-[180px]">
          <label className="block text-xs font-medium text-ink-500 mb-1.5">Task</label>
          <Input name="title" placeholder="e.g. Draft reply to defence" required />
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
        <Button type="submit" size="sm">Add task</Button>
      </form>

      {tasks.length === 0 ? (
        <p className="text-sm text-ink-300 py-4">No tasks yet.</p>
      ) : (
        <ul className="divide-y divide-slate-line card-surface">
          {tasks.map((t) => (
            <TaskRow key={t.id} task={t} caseId={caseId} />
          ))}
        </ul>
      )}
    </div>
  );
}

function TaskRow({ task, caseId }: { task: TaskRow; caseId: string }) {
  const done = task.status === "done";
  const toggle = toggleTaskDone.bind(null, task.id, caseId, !done);

  return (
    <li className="flex items-center justify-between px-4 py-3 text-sm">
      <form action={toggle} className="flex items-center gap-3 flex-1">
        <button type="submit" aria-label={done ? "Mark as not done" : "Mark as done"}>
          {done ? (
            <CheckSquare className="h-4 w-4 text-status-active" strokeWidth={1.75} />
          ) : (
            <Square className="h-4 w-4 text-ink-300" strokeWidth={1.75} />
          )}
        </button>
        <span className={cn("text-ink-900", done && "line-through text-ink-300")}>{task.title}</span>
      </form>
      <div className="flex items-center gap-3">
        {task.due_date && <span className="text-xs text-ink-500">{formatDocketDate(task.due_date)}</span>}
        <PriorityBadge priority={task.priority} />
      </div>
    </li>
  );
}

function TimeTab({ caseId, timeEntries }: { caseId: string; timeEntries: TimeEntryRow[] }) {
  async function addEntry(formData: FormData) {
    await logTime(caseId, formData);
  }
  const unbilled = timeEntries.filter((t) => t.billable && !t.invoiced);
  const unbilledTotal = unbilled.reduce((sum, t) => sum + (t.minutes / 60) * t.hourly_rate_kobo, 0);

  return (
    <div className="max-w-2xl space-y-6">
      <form action={addEntry} className="card-surface p-4 space-y-3">
        <div className="flex gap-3 flex-wrap">
          <div className="flex-1 min-w-[200px]">
            <label className="block text-xs font-medium text-ink-500 mb-1.5">What did you work on</label>
            <Input name="description" placeholder="e.g. Reviewed and marked up draft agreement" required />
          </div>
        </div>
        <div className="flex gap-3 flex-wrap items-end">
          <div className="w-28">
            <label className="block text-xs font-medium text-ink-500 mb-1.5">Hours</label>
            <Input name="hours" type="number" min="0.1" step="0.1" placeholder="1.5" required />
          </div>
          <div className="w-36">
            <label className="block text-xs font-medium text-ink-500 mb-1.5">Rate (₦/hr)</label>
            <Input name="hourlyRateNaira" type="number" min="0" step="500" placeholder="25000" required />
          </div>
          <div className="w-40">
            <label className="block text-xs font-medium text-ink-500 mb-1.5">Date</label>
            <Input name="entryDate" type="date" defaultValue={new Date().toISOString().slice(0, 10)} />
          </div>
          <label className="flex items-center gap-2 text-sm text-ink-500 pb-2">
            <input type="checkbox" name="billable" defaultChecked className="h-4 w-4 accent-brass" />
            Billable
          </label>
          <Button type="submit" size="sm">Log time</Button>
        </div>
      </form>

      {timeEntries.length === 0 ? (
        <p className="text-sm text-ink-300 py-4">No time logged on this case yet.</p>
      ) : (
        <>
          <ul className="divide-y divide-slate-line card-surface">
            {timeEntries.map((t) => (
              <li key={t.id} className="flex items-center justify-between px-4 py-3 text-sm gap-3">
                <div className="min-w-0">
                  <div className="text-ink-900 truncate">{t.description}</div>
                  <div className="text-xs text-ink-500 mt-0.5">
                    {formatDocketDate(t.entry_date)} · {(t.minutes / 60).toFixed(1)}h
                    {!t.billable && " · non-billable"}
                  </div>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <span className="text-ink-900 font-medium">
                    {formatNaira((t.minutes / 60) * t.hourly_rate_kobo)}
                  </span>
                  <span
                    className={cn(
                      "text-xs px-2 py-0.5 rounded-full",
                      t.invoiced ? "bg-status-active/10 text-status-active" : "bg-brass/10 text-brass-dark"
                    )}
                  >
                    {t.invoiced ? "Invoiced" : "Unbilled"}
                  </span>
                  {!t.invoiced && (
                    <form action={deleteTimeEntry.bind(null, t.id, caseId)}>
                      <button
                        type="submit"
                        aria-label="Delete entry"
                        className="text-ink-300 hover:text-seal text-xs"
                      >
                        Remove
                      </button>
                    </form>
                  )}
                </div>
              </li>
            ))}
          </ul>

          {unbilled.length > 0 && (
            <div className="flex items-center justify-between card-surface p-4">
              <div className="text-sm">
                <span className="text-ink-500">{unbilled.length} unbilled {unbilled.length === 1 ? "entry" : "entries"}, </span>
                <span className="text-ink-900 font-medium">{formatNaira(unbilledTotal)}</span>
              </div>
              <Link
                href={`/dashboard/billing/new?caseId=${caseId}`}
                className="text-sm text-brass hover:text-brass-dark font-medium"
              >
                Raise invoice from this time →
              </Link>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function DocumentsTab({
  documents,
  firmId,
  caseId,
}: {
  documents: DocRow[];
  firmId: string;
  caseId: string;
}) {
  return (
    <div className="max-w-2xl space-y-6">
      <DocumentUploadForm firmId={firmId} caseId={caseId} />
      {documents.length === 0 ? (
        <p className="text-sm text-ink-300 py-4">No documents yet.</p>
      ) : (
        <ul className="divide-y divide-slate-line card-surface">
          {documents.map((d) => (
            <li key={d.id} className="px-4 py-3 text-sm space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-ink-900">{d.title}</span>
                <span className="text-xs text-ink-500 capitalize">{d.category.replace("_", " ")}</span>
              </div>
              {(d.mime_type.startsWith("image/") || d.mime_type === "application/pdf") && (
                <div>
                  {d.ocr_text ? (
                    <details className="text-xs">
                      <summary className="text-brass cursor-pointer select-none">
                        Extracted text ({d.ocr_text.length.toLocaleString()} chars)
                      </summary>
                      <p className="mt-1.5 text-ink-500 whitespace-pre-wrap max-h-40 overflow-y-auto">
                        {d.ocr_text}
                      </p>
                    </details>
                  ) : (
                    <form
                      action={async () => {
                        await extractDocumentTextForm(d.id, caseId);
                      }}
                    >
                      <button
                        type="submit"
                        className="text-xs text-brass hover:text-brass-dark font-medium"
                      >
                        Extract text (OCR)
                      </button>
                    </form>
                  )}
                </div>
              )}
              {d.ocr_text && (
                <form
                  action={async () => {
                    await generateContractReviewForm(d.id, caseId);
                  }}
                >
                  <button
                    type="submit"
                    className="text-xs text-brass hover:text-brass-dark font-medium"
                  >
                    Ask AI to review this document →
                  </button>
                </form>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function EvidenceTab({
  evidence,
  firmId,
  caseId,
}: {
  evidence: EvidenceRow[];
  firmId: string;
  caseId: string;
}) {
  return (
    <div className="max-w-2xl space-y-6">
      <EvidenceUploadForm firmId={firmId} caseId={caseId} />
      {evidence.length === 0 ? (
        <p className="text-sm text-ink-300 py-4">No evidence logged yet.</p>
      ) : (
        <ul className="divide-y divide-slate-line card-surface">
          {evidence.map((e) => (
            <li key={e.id} className="px-4 py-3 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-ink-900">{e.title}</span>
                <span className="text-xs text-ink-500 capitalize">{e.evidence_type.replace("_", " ")}</span>
              </div>
              {e.source && <div className="text-xs text-ink-500 mt-0.5">Source: {e.source}</div>}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function BillingTab({ invoices, caseId }: { invoices: InvoiceRow[]; caseId: string }) {
  return (
    <div className="max-w-2xl">
      {invoices.length === 0 ? (
        <p className="text-sm text-ink-300 py-4">No invoices raised on this case yet.</p>
      ) : (
        <ul className="divide-y divide-slate-line card-surface">
          {invoices.map((inv) => (
            <li key={inv.id} className="flex items-center justify-between px-4 py-3 text-sm">
              <div>
                <div className="docket">{inv.invoice_number}</div>
                <div className="text-xs text-ink-500 mt-1">Due {formatDocketDate(inv.due_date)}</div>
              </div>
              <div className="text-right">
                <div className="text-ink-900 font-medium">{formatNaira(inv.total_kobo)}</div>
                <div className="text-xs text-ink-500 capitalize">{inv.status.replace("_", " ")}</div>
              </div>
            </li>
          ))}
        </ul>
      )}
      <div className="flex items-center gap-4 mt-4">
        <Link
          href={`/dashboard/billing/new?caseId=${caseId}`}
          className="text-sm text-brass hover:text-brass-dark font-medium"
        >
          Raise invoice for this case →
        </Link>
        <Link href="/dashboard/billing" className="text-sm text-ink-500 hover:text-ink">
          Go to billing
        </Link>
      </div>
    </div>
  );
}
