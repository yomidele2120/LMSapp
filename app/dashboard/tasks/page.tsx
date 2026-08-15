import { requireProfile } from "@/lib/supabase/require-profile";
import { NewTaskForm } from "@/components/tasks/new-task-form";
import { TaskColumn } from "@/components/tasks/task-column";

const COLUMNS = [
  { status: "todo" as const, label: "To do" },
  { status: "in_progress" as const, label: "In progress" },
  { status: "blocked" as const, label: "Blocked" },
  { status: "done" as const, label: "Done" },
];

export default async function TasksPage() {
  const { supabase, firmId } = await requireProfile();

  const [{ data: tasks }, { data: cases }, { data: colleagues }] = await Promise.all([
    supabase
      .from("tasks")
      .select("id, title, status, priority, due_date, case_id, cases(title, case_number)")
      .eq("firm_id", firmId)
      .order("due_date", { ascending: true, nullsFirst: false }),
    supabase.from("cases").select("id, title, case_number").eq("firm_id", firmId).order("title"),
    supabase.from("profiles").select("id, full_name").eq("firm_id", firmId).neq("role", "client"),
  ]);

  const allTasks = (tasks ?? []).map((t) => ({
    ...t,
    cases: Array.isArray(t.cases) ? (t.cases[0] ?? null) : t.cases,
  }));

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-6 flex-wrap">
        <div>
          <h1 className="font-display text-2xl text-ink-900">Tasks</h1>
          <p className="text-sm text-ink-500 mt-1">Every open item across the practice, not just one case.</p>
        </div>
        <NewTaskForm cases={cases ?? []} colleagues={colleagues ?? []} />
      </div>

      <div className="grid md:grid-cols-2 xl:grid-cols-4 gap-4">
        {COLUMNS.map((col) => (
          <TaskColumn
            key={col.status}
            status={col.status}
            label={col.label}
            tasks={allTasks.filter((t) => t.status === col.status)}
          />
        ))}
      </div>
    </div>
  );
}
