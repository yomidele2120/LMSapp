import { cn } from "@/lib/utils";

const TONES = {
  neutral: "bg-parchment-200 text-ink-500",
  active: "bg-status-active/10 text-status-active",
  hold: "bg-status-hold/10 text-status-hold",
  closed: "bg-parchment-200 text-ink-500",
  overdue: "bg-seal/10 text-seal",
  brass: "bg-brass/10 text-brass-dark",
} as const;

export function Badge({
  children,
  tone = "neutral",
  className,
}: {
  children: React.ReactNode;
  tone?: keyof typeof TONES;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium capitalize",
        TONES[tone],
        className
      )}
    >
      {children}
    </span>
  );
}

const CASE_STATUS_TONE: Record<string, keyof typeof TONES> = {
  intake: "brass",
  active: "active",
  on_hold: "hold",
  in_trial: "active",
  settled: "closed",
  closed: "closed",
  archived: "neutral",
};

export function CaseStatusBadge({ status }: { status: string }) {
  return <Badge tone={CASE_STATUS_TONE[status] ?? "neutral"}>{status.replace("_", " ")}</Badge>;
}

const TASK_PRIORITY_TONE: Record<string, keyof typeof TONES> = {
  urgent: "overdue",
  high: "overdue",
  medium: "brass",
  low: "neutral",
};

export function PriorityBadge({ priority }: { priority: string }) {
  return <Badge tone={TASK_PRIORITY_TONE[priority] ?? "neutral"}>{priority}</Badge>;
}

const INVOICE_STATUS_TONE: Record<string, keyof typeof TONES> = {
  draft: "neutral",
  sent: "brass",
  partially_paid: "brass",
  paid: "active",
  overdue: "overdue",
  void: "neutral",
};

export function InvoiceStatusBadge({ status }: { status: string }) {
  return <Badge tone={INVOICE_STATUS_TONE[status] ?? "neutral"}>{status.replace("_", " ")}</Badge>;
}
