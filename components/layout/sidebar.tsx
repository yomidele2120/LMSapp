"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  Briefcase,
  CalendarDays,
  CheckSquare,
  FileText,
  Fingerprint,
  Receipt,
  MessageSquare,
  BarChart3,
  Sparkles,
  Settings,
} from "lucide-react";
import { cn } from "@/lib/utils";

const NAV_SECTIONS = [
  {
    label: "Practice",
    items: [
      { href: "/dashboard", label: "Overview", icon: LayoutDashboard },
      { href: "/dashboard/clients", label: "Clients", icon: Users },
      { href: "/dashboard/cases", label: "Cases", icon: Briefcase },
      { href: "/dashboard/calendar", label: "Court calendar", icon: CalendarDays },
      { href: "/dashboard/tasks", label: "Tasks", icon: CheckSquare },
    ],
  },
  {
    label: "Records",
    items: [
      { href: "/dashboard/documents", label: "Documents", icon: FileText },
      { href: "/dashboard/evidence", label: "Evidence", icon: Fingerprint },
      { href: "/dashboard/messages", label: "Messages", icon: MessageSquare },
    ],
  },
  {
    label: "Business",
    items: [
      { href: "/dashboard/billing", label: "Billing", icon: Receipt },
      { href: "/dashboard/reports", label: "Reports", icon: BarChart3 },
      { href: "/dashboard/ai", label: "AI assistant", icon: Sparkles },
    ],
  },
];

export function Sidebar({ firmName }: { firmName: string }) {
  const pathname = usePathname();

  return (
    <aside className="hidden lg:flex lg:flex-col w-64 shrink-0 bg-ink text-parchment-100 h-screen sticky top-0">
      <div className="px-6 py-6 border-b border-ink-700">
        <div className="font-display text-lg text-parchment-50 tracking-tight">LegalOS</div>
        <div className="text-xs text-ink-100 truncate mt-0.5">{firmName}</div>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-6">
        {NAV_SECTIONS.map((section) => (
          <div key={section.label}>
            <div className="px-3 text-[11px] font-medium uppercase tracking-wider text-ink-300 mb-1.5">
              {section.label}
            </div>
            <div className="space-y-0.5">
              {section.items.map((item) => {
                const active = pathname === item.href;
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "flex items-center gap-2.5 rounded px-3 py-2 text-sm transition-colors",
                      active
                        ? "bg-ink-700 text-parchment-50"
                        : "text-ink-100 hover:bg-ink-700/60 hover:text-parchment-50"
                    )}
                  >
                    <Icon className="h-4 w-4 shrink-0" strokeWidth={1.75} />
                    {item.label}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      <Link
        href="/dashboard/settings"
        className="flex items-center gap-2.5 px-6 py-4 border-t border-ink-700 text-sm text-ink-100 hover:text-parchment-50"
      >
        <Settings className="h-4 w-4" strokeWidth={1.75} />
        Settings
      </Link>
    </aside>
  );
}
