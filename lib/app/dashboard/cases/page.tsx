import Link from "next/link";
import { Plus } from "lucide-react";
import { requireProfile } from "@/lib/supabase/require-profile";
import { Button } from "@/components/ui/button";
import { CaseStatusBadge } from "@/components/ui/badge";
import { formatDocketDate } from "@/lib/utils";
import { cn } from "@/lib/utils";

const STATUS_FILTERS = [
  { value: "", label: "All" },
  { value: "intake", label: "Intake" },
  { value: "active", label: "Active" },
  { value: "in_trial", label: "In trial" },
  { value: "on_hold", label: "On hold" },
  { value: "closed", label: "Closed" },
  { value: "settled", label: "Settled" },
];

export default async function CasesPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { supabase, firmId } = await requireProfile();
  const { status } = await searchParams;

  let query = supabase
    .from("v_case_summary")
    .select("*")
    .eq("firm_id", firmId)
    .order("next_hearing_date", { ascending: true, nullsFirst: false });

  if (status) query = query.eq("status", status);

  const { data: cases } = await query;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl text-ink-900">Cases</h1>
          <p className="text-sm text-ink-500 mt-1">Every active and past matter the firm is handling.</p>
        </div>
        <Link href="/dashboard/cases/new">
          <Button>
            <Plus className="h-4 w-4" strokeWidth={2} />
            New case
          </Button>
        </Link>
      </div>

      <div className="flex gap-1.5 flex-wrap">
        {STATUS_FILTERS.map((f) => (
          <Link
            key={f.value}
            href={f.value ? `/dashboard/cases?status=${f.value}` : "/dashboard/cases"}
            className={cn(
              "px-3 py-1.5 rounded-full text-xs font-medium border",
              (status ?? "") === f.value
                ? "bg-ink text-parchment-50 border-ink"
                : "bg-white text-ink-500 border-slate-line hover:border-ink-300"
            )}
          >
            {f.label}
          </Link>
        ))}
      </div>

      <div className="card-surface overflow-hidden">
        {!cases || cases.length === 0 ? (
          <p className="text-sm text-ink-300 py-12 text-center">No cases match this filter.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-line text-left text-xs uppercase tracking-wide text-ink-500">
                <th className="px-5 py-3 font-medium">Case</th>
                <th className="px-5 py-3 font-medium">Client</th>
                <th className="px-5 py-3 font-medium">Lead lawyer</th>
                <th className="px-5 py-3 font-medium">Status</th>
                <th className="px-5 py-3 font-medium">Next hearing</th>
                <th className="px-5 py-3 font-medium">Open tasks</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-line">
              {cases.map((c) => (
                <tr key={c.id} className="hover:bg-parchment-50">
                  <td className="px-5 py-3">
                    <Link href={`/dashboard/cases/${c.id}`} className="text-ink-900 hover:text-brass-dark font-medium">
                      {c.title}
                    </Link>
                    <div className="docket mt-1">{c.case_number}</div>
                  </td>
                  <td className="px-5 py-3 text-ink-500">{c.client_name ?? "—"}</td>
                  <td className="px-5 py-3 text-ink-500">{c.lead_lawyer_name ?? "Unassigned"}</td>
                  <td className="px-5 py-3"><CaseStatusBadge status={c.status} /></td>
                  <td className="px-5 py-3 text-ink-500">{formatDocketDate(c.next_hearing_date)}</td>
                  <td className="px-5 py-3 text-ink-500">{c.open_tasks}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
