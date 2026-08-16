import { CalendarClock, Briefcase, CheckSquare, Receipt } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { formatDocketDate, formatNaira } from "@/lib/utils";

async function getOverviewData(firmId: string) {
  const supabase = await createClient();

  const [activeCases, closedCases, upcomingHearings, pendingTasks, billing] = await Promise.all([
    supabase.from("cases").select("id", { count: "exact", head: true }).eq("firm_id", firmId).eq("status", "active"),
    supabase.from("cases").select("id", { count: "exact", head: true }).eq("firm_id", firmId).in("status", ["closed", "settled"]),
    supabase
      .from("court_dates")
      .select("id, title, starts_at, cases(title, case_number)")
      .eq("firm_id", firmId)
      .gte("starts_at", new Date().toISOString())
      .order("starts_at", { ascending: true })
      .limit(5),
    supabase
      .from("tasks")
      .select("id, title, due_date, priority")
      .eq("firm_id", firmId)
      .neq("status", "done")
      .order("due_date", { ascending: true, nullsFirst: false })
      .limit(5),
    supabase.from("v_firm_billing_summary").select("*").eq("firm_id", firmId).maybeSingle(),
  ]);

  return {
    activeCaseCount: activeCases.count ?? 0,
    closedCaseCount: closedCases.count ?? 0,
    upcomingHearings: upcomingHearings.data ?? [],
    pendingTasks: pendingTasks.data ?? [],
    outstandingKobo: billing.data?.outstanding_kobo ?? 0,
    collectedKobo: billing.data?.total_collected_kobo ?? 0,
  };
}

export default async function DashboardOverviewPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from("profiles")
    .select("firm_id, full_name")
    .eq("id", user!.id)
    .single();

  const firmId = profile!.firm_id as string;
  const data = await getOverviewData(firmId);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-2xl text-ink-900">
          Good day, {profile!.full_name.split(" ")[0]}
        </h1>
        <p className="text-sm text-ink-500 mt-1">Here&apos;s where the practice stands today.</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={Briefcase} label="Active cases" value={String(data.activeCaseCount)} />
        <StatCard icon={CheckSquare} label="Closed cases" value={String(data.closedCaseCount)} />
        <StatCard
          icon={Receipt}
          label="Outstanding"
          value={formatNaira(data.outstandingKobo)}
          accent="seal"
        />
        <StatCard
          icon={Receipt}
          label="Collected (all-time)"
          value={formatNaira(data.collectedKobo)}
          accent="active"
        />
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <div className="card-surface p-5">
          <div className="flex items-center gap-2 mb-4">
            <CalendarClock className="h-4 w-4 text-brass" strokeWidth={1.75} />
            <h2 className="font-medium text-ink-900 text-sm">Upcoming hearings</h2>
          </div>
          {data.upcomingHearings.length === 0 ? (
            <EmptyState message="Nothing on the docket. New hearings you add will appear here." />
          ) : (
            <ul className="divide-y divide-slate-line">
              {data.upcomingHearings.map((h) => (
                <li key={h.id} className="py-3 flex items-center justify-between text-sm">
                  <div>
                    <div className="text-ink-900">{h.title}</div>
                    <div className="docket mt-1">
                      {(h.cases as unknown as { case_number: string } | null)?.case_number ?? "—"}
                    </div>
                  </div>
                  <div className="text-ink-500 text-xs">{formatDocketDate(h.starts_at)}</div>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="card-surface p-5">
          <div className="flex items-center gap-2 mb-4">
            <CheckSquare className="h-4 w-4 text-brass" strokeWidth={1.75} />
            <h2 className="font-medium text-ink-900 text-sm">Pending tasks</h2>
          </div>
          {data.pendingTasks.length === 0 ? (
            <EmptyState message="No open tasks. Assign one from a case to track it here." />
          ) : (
            <ul className="divide-y divide-slate-line">
              {data.pendingTasks.map((t) => (
                <li key={t.id} className="py-3 flex items-center justify-between text-sm">
                  <span className="text-ink-900">{t.title}</span>
                  <span
                    className={
                      "text-xs px-2 py-0.5 rounded-full " +
                      (t.priority === "urgent" || t.priority === "high"
                        ? "bg-seal/10 text-seal"
                        : "bg-parchment-200 text-ink-500")
                    }
                  >
                    {t.priority}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  accent,
}: {
  icon: typeof Briefcase;
  label: string;
  value: string;
  accent?: "seal" | "active";
}) {
  return (
    <div className="card-surface p-4">
      <div className="flex items-center gap-2 text-ink-500 mb-2">
        <Icon className="h-3.5 w-3.5" strokeWidth={1.75} />
        <span className="text-xs uppercase tracking-wide">{label}</span>
      </div>
      <div
        className={
          "font-display text-2xl " +
          (accent === "seal" ? "text-seal" : accent === "active" ? "text-status-active" : "text-ink-900")
        }
      >
        {value}
      </div>
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return <p className="text-sm text-ink-300 py-6 text-center">{message}</p>;
}
