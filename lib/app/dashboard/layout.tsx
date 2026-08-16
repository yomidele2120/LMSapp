import { redirect } from "next/navigation";
import { requireProfile } from "@/lib/supabase/require-profile";
import { Sidebar } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { supabase, profile, firmId } = await requireProfile();

  const { data: firm } = await supabase.from("firms").select("name").eq("id", firmId).single();
  const firmName = firm?.name ?? "Your firm";

  if (!profile.full_name) {
    // Defensive — requireProfile already redirects on a missing row.
    redirect("/login");
  }

  return (
    <div className="flex min-h-screen bg-parchment-50">
      <Sidebar firmName={firmName} />
      <div className="flex-1 flex flex-col min-w-0">
        <Topbar userId={profile.id} firmId={firmId} userName={profile.full_name} userTitle={profile.title} />
        <main className="flex-1 p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
