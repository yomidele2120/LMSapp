import { requireProfile } from "@/lib/supabase/require-profile";
import { formatNaira } from "@/lib/utils";
import type { CaseStatus } from "@/types/database";

const STATUS_LABEL: Record<CaseStatus, string> = {
  intake: "Intake",
  active: "Active",
  on_hold: "On hold",
  in_trial: "In trial",
  settled: "Settled",
  closed: "Closed",
  archived: "Archived",
};

const MONTHS_BACK = 6;

function monthKey(iso: string): string {
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function monthLabel(key: string): string {
  const parts = key.split("-");
  const y = Number(parts[0]);
  const m = Number(parts[1]);
  return new Intl.DateTimeFormat("en-NG", { month: "short", year: "2-digit" }).format(
    new Date(y, m - 1, 1)
  );
}

function lastNMonthKeys(n: number): string[] {
  const keys: string[] = [];
  const now = new Date();
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    keys.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
  }
  return keys;
}

export default async function ReportsPage() {
  const { supabase, firmId } = await requireProfile();

  const sinceDate = new Date();
  sinceDate.setMonth(sinceDate.getMonth() - (MONTHS_BACK - 1), 1);

  const [{ data: payments }, { data: cases }, { data: clients }, { data: tasks }, { data: lawyers }] =
    await Promise.all([
      supabase
        .from("payments")
        .select("amount_kobo, paid_at, status")
        .eq("firm_id", firmId)
        .eq("status", "successful")
        .gte("paid_at", sinceDate.toISOString()),
      supabase.from("cases").select("id, status, lead_lawyer_id").eq("firm_id", firmId),
      supabase
        .from("clients")
        .select("id, created_at")
        .eq("firm_id", firmId)
        .gte("created_at", sinceDate.toISOString()),
      supabase
        .from("tasks")
        .select("id, assigned_to, status")
        .eq("firm_id", firmId)
        .neq("status", "done"),
      supabase.from("profiles").select("id, full_name").eq("firm_id", firmId).neq("role", "client"),
    ]);

  const months = lastNMonthKeys(MONTHS_BACK);

  const revenueByMonth = new Map(months.map((m) => [m, 0]));
  for (const p of payments ?? []) {
    if (!p.paid_at) continue;
    const key = monthKey(p.paid_at);
    if (revenueByMonth.has(key)) revenueByMonth.set(key, revenueByMonth.get(key)! + p.amount_kobo);
  }
  const maxRevenue = Math.max(1, ...Array.from(revenueByMonth.values()));

  const clientsByMonth = new Map(months.map((m) => [m, 0]));
  for (const c of clients ?? []) {
    const key = monthKey(c.created_at);
    if (clientsByMonth.has(key)) clientsByMonth.set(key, clientsByMonth.get(key)! + 1);
  }

  const statusCounts = new Map<string, number>();
  for (const c of cases ?? []) {
    statusCounts.set(c.status, (statusCounts.get(c.status) ?? 0) + 1);
  }
  const totalCases = (cases ?? []).length || 1;

  const lawyerMap = new Map((lawyers ?? []).map((l) => [l.id, l.full_name]));
  const workload = new Map<string, number>();
  for (const t of tasks ?? []) {
    if (!t.assigned_to) continue;
    workload.set(t.assigned_to, (workload.get(t.assigned_to) ?? 0) + 1);
  }
  const workloadRows = Array.from(workload.entries())
    .map(([id, count]) => ({ name: lawyerMap.get(id) ?? "Unassigned", count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 8);
  const maxWorkload = Math.max(1, ...workloadRows.map((w) => w.count));

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-2xl text-ink-900">Reports</h1>
        <p className="text-sm text-ink-500 mt-1">The practice, in numbers, over the last six months.</p>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <div className="card-surface p-5">
          <h2 className="text-sm font-medium text-ink-900 mb-4">Revenue collected</h2>
          <div className="flex items-end gap-3 h-40">
            {months.map((m) => {
              const value = revenueByMonth.get(m) ?? 0;
              const heightPct = Math.max(4, (value / maxRevenue) * 100);
              return (
                <div key={m} className="flex-1 flex flex-col items-center gap-2 h-full justify-end">
                  <div
                    className="w-full bg-brass/70 rounded-t"
                    style={{ height: `${heightPct}%` }}
                    title={formatNaira(value)}
                  />
                  <span className="text-[11px] text-ink-500">{monthLabel(m)}</span>
                </div>
              );
            })}
          </div>
        </div>

        <div className="card-surface p-5">
          <h2 className="text-sm font-medium text-ink-900 mb-4">New clients</h2>
          <div className="flex items-end gap-3 h-40">
            {months.map((m) => {
              const value = clientsByMonth.get(m) ?? 0;
              const maxClients = Math.max(1, ...Array.from(clientsByMonth.values()));
              const heightPct = Math.max(4, (value / maxClients) * 100);
              return (
                <div key={m} className="flex-1 flex flex-col items-center gap-2 h-full justify-end">
                  <div className="w-full bg-status-active/70 rounded-t" style={{ height: `${heightPct}%` }} />
                  <span className="text-[11px] text-ink-500">{monthLabel(m)}</span>
                  <span className="text-[11px] text-ink-300 -mt-1.5">{value}</span>
                </div>
              );
            })}
          </div>
        </div>

        <div className="card-surface p-5">
          <h2 className="text-sm font-medium text-ink-900 mb-4">Cases by status</h2>
          <div className="space-y-2.5">
            {Object.entries(STATUS_LABEL).map(([status, label]) => {
              const count = statusCounts.get(status) ?? 0;
              const pct = Math.round((count / totalCases) * 100);
              return (
                <div key={status} className="flex items-center gap-3 text-sm">
                  <span className="w-24 shrink-0 text-ink-500">{label}</span>
                  <div className="flex-1 h-2 rounded-full bg-parchment-200 overflow-hidden">
                    <div className="h-full bg-ink rounded-full" style={{ width: `${pct}%` }} />
                  </div>
                  <span className="w-8 text-right text-ink-900">{count}</span>
                </div>
              );
            })}
          </div>
        </div>

        <div className="card-surface p-5">
          <h2 className="text-sm font-medium text-ink-900 mb-4">Open workload by lawyer</h2>
          {workloadRows.length === 0 ? (
            <p className="text-sm text-ink-300 py-8 text-center">No open tasks assigned yet.</p>
          ) : (
            <div className="space-y-2.5">
              {workloadRows.map((w) => (
                <div key={w.name} className="flex items-center gap-3 text-sm">
                  <span className="w-32 shrink-0 text-ink-500 truncate">{w.name}</span>
                  <div className="flex-1 h-2 rounded-full bg-parchment-200 overflow-hidden">
                    <div
                      className="h-full bg-brass rounded-full"
                      style={{ width: `${(w.count / maxWorkload) * 100}%` }}
                    />
                  </div>
                  <span className="w-8 text-right text-ink-900">{w.count}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
