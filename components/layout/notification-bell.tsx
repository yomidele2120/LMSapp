"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Bell } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { formatDocketDate, cn } from "@/lib/utils";

interface NotificationRow {
  id: string;
  title: string;
  body: string | null;
  link_path: string | null;
  is_read: boolean;
  created_at: string;
}

export function NotificationBell({ userId }: { userId: string }) {
  const [notifications, setNotifications] = useState<NotificationRow[]>([]);
  const [open, setOpen] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const supabase = createClient();

  async function load() {
    const { data } = await supabase
      .from("notifications")
      .select("id, title, body, link_path, is_read, created_at")
      .eq("profile_id", userId)
      .order("created_at", { ascending: false })
      .limit(15);
    setNotifications(data ?? []);
  }

  useEffect(() => {
    load();

    // Live-update as new notifications land, rather than polling.
    const channel = supabase
      .channel(`notifications:${userId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "notifications", filter: `profile_id=eq.${userId}` },
        (payload) => setNotifications((prev) => [payload.new as NotificationRow, ...prev])
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  async function handleSelect(n: NotificationRow) {
    if (!n.is_read) {
      await supabase.from("notifications").update({ is_read: true }).eq("id", n.id);
      setNotifications((prev) => prev.map((x) => (x.id === n.id ? { ...x, is_read: true } : x)));
    }
    setOpen(false);
    if (n.link_path) router.push(n.link_path);
  }

  async function markAllRead() {
    const unreadIds = notifications.filter((n) => !n.is_read).map((n) => n.id);
    if (unreadIds.length === 0) return;
    await supabase.from("notifications").update({ is_read: true }).in("id", unreadIds);
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
  }

  return (
    <div ref={boxRef} className="relative">
      <button
        aria-label="Notifications"
        onClick={() => setOpen((v) => !v)}
        className="relative text-ink-500 hover:text-ink p-1.5 rounded hover:bg-parchment-100"
      >
        <Bell className="h-4.5 w-4.5" strokeWidth={1.75} />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 h-4 min-w-[16px] px-1 rounded-full bg-seal text-white text-[10px] leading-4 text-center">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute top-full right-0 mt-2 w-80 card-surface shadow-lg py-2 max-h-96 overflow-y-auto z-20">
          <div className="flex items-center justify-between px-3 py-1.5">
            <span className="text-xs font-medium uppercase tracking-wide text-ink-500">
              Notifications
            </span>
            {unreadCount > 0 && (
              <button onClick={markAllRead} className="text-xs text-brass hover:text-brass-dark">
                Mark all read
              </button>
            )}
          </div>

          {notifications.length === 0 ? (
            <p className="text-sm text-ink-300 px-3 py-6 text-center">You&apos;re all caught up.</p>
          ) : (
            notifications.map((n) => (
              <button
                key={n.id}
                onClick={() => handleSelect(n)}
                className={cn(
                  "w-full text-left px-3 py-2.5 hover:bg-parchment-100 flex gap-2",
                  !n.is_read && "bg-brass/5"
                )}
              >
                <span className={cn("mt-1.5 h-1.5 w-1.5 rounded-full shrink-0", !n.is_read ? "bg-brass" : "bg-transparent")} />
                <span className="min-w-0">
                  <span className="block text-sm text-ink-900 truncate">{n.title}</span>
                  {n.body && <span className="block text-xs text-ink-500 truncate">{n.body}</span>}
                  <span className="block text-[11px] text-ink-300 mt-0.5">{formatDocketDate(n.created_at)}</span>
                </span>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}
