import { requireClientPortalUser } from "@/lib/supabase/require-client";
import { logout } from "@/lib/actions/auth";
import { Button } from "@/components/ui/button";

export default async function PortalLayout({ children }: { children: React.ReactNode }) {
  const { profile, clientRecord } = await requireClientPortalUser();
  const firmName = (clientRecord.firms as unknown as { name: string } | null)?.name ?? "Your firm";

  return (
    <div className="min-h-screen bg-parchment-50">
      <header className="h-16 border-b border-slate-line bg-white flex items-center justify-between px-6">
        <div>
          <div className="font-display text-lg text-ink-900 leading-none">{firmName}</div>
          <div className="text-xs text-ink-500 mt-0.5">Client portal</div>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-sm text-ink-500 hidden sm:inline">{profile.full_name}</span>
          <form action={logout}>
            <Button type="submit" variant="ghost" size="sm">
              Sign out
            </Button>
          </form>
        </div>
      </header>
      <main className="max-w-4xl mx-auto p-6 lg:p-10">{children}</main>
    </div>
  );
}
