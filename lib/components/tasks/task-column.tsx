"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { setTaskStatus } from "@/lib/actions/tasks";
import { PriorityBadge } from "@/components/ui/badge";
import { formatDocketDate, cn } from "@/lib/utils";
import type { TaskStatus } from "@/types/database";

type BoardTask = {
  id: string;
  title: string;
  status: string;
  priority: string;
  due_date: string | null;
  case_id: string | null;
  cases: { title: string; case_number: string } | null;
};

const NEXT_STATUS: Record<string, TaskStatus | null> = {
  todo: "in_progress",
  in_progress: "done",
  blocked: "in_progress",
  done: null,
};

export function TaskColumn({
  status,
  label,
  tasks,
}: {
  status: string;
  label: string;
  tasks: BoardTask[];
}) {
  return (
    <div className="card-surface p-3 flex flex-col">
      <div className="flex items-center justify-between px-1.5 py-1.5 mb-1">
        <h2 className="text-xs font-medium uppercase tracking-wide text-ink-500">{label}</h2>
        <span className="text-xs text-ink-300">{tasks.length}</span>
      </div>

      {tasks.length === 0 ? (
        <p className="text-xs text-ink-300 px-1.5 py-4">Nothing here.</p>
      ) : (
        <ul className="space-y-2">
          {tasks.map((t) => (
            <TaskCard key={t.id} task={t} />
          ))}
        </ul>
      )}
    </div>
  );
}

function TaskCard({ task }: { task: BoardTask }) {
  const next = NEXT_STATUS[task.status];
  const overdue =
    task.due_date && task.status !== "done" && new Date(task.due_date) < new Date();

  async function advance() {
    if (next) await setTaskStatus(task.id, next);
  }

  return (
    <li className="rounded border border-slate-line bg-white p-3 text-sm">
      <div className="flex items-start justify-between gap-2">
        <span className={cn("text-ink-900", task.status === "done" && "line-through text-ink-300")}>
          {task.title}
        </span>
        <PriorityBadge priority={task.priority} />
      </div>

      {task.cases && task.case_id && (
        <Link
          href={`/dashboard/cases/${task.case_id}`}
          className="docket mt-2 inline-block hover:text-brass-dark"
        >
          {task.cases.case_number}
        </Link>
      )}

      <div className="flex items-center justify-between mt-2.5">
        <span className={cn("text-xs", overdue ? "text-seal" : "text-ink-500")}>
          {task.due_date ? formatDocketDate(task.due_date) : "No due date"}
        </span>
        {next && (
          <form action={advance}>
            <button
              type="submit"
              className="flex items-center gap-1 text-xs text-brass hover:text-brass-dark font-medium"
            >
              {next === "done" ? "Mark done" : "Move on"}
              <ArrowRight className="h-3 w-3" strokeWidth={2} />
            </button>
          </form>
        )}
      </div>
    </li>
  );
}
