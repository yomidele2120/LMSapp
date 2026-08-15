import { logout } from "@/lib/actions/auth";
import { Button } from "@/components/ui/button";
import { GlobalSearch } from "@/components/layout/global-search";
import { NotificationBell } from "@/components/layout/notification-bell";

export function Topbar({
  userId,
  firmId,
  userName,
  userTitle,
}: {
  userId: string;
  firmId: string;
  userName: string;
  userTitle: string | null;
}) {
  const initials = userName
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <header className="h-16 border-b border-slate-line bg-white flex items-center justify-between px-6 sticky top-0 z-10">
      <GlobalSearch firmId={firmId} />

      <div className="flex items-center gap-4">
        <NotificationBell userId={userId} />

        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-full bg-brass/20 text-brass-dark flex items-center justify-center text-xs font-medium">
            {initials}
          </div>
          <div className="hidden md:block leading-tight">
            <div className="text-sm text-ink-900">{userName}</div>
            {userTitle && <div className="text-xs text-ink-500">{userTitle}</div>}
          </div>
        </div>

        <form action={logout}>
          <Button type="submit" variant="ghost" size="sm">
            Sign out
          </Button>
        </form>
      </div>
    </header>
  );
}
