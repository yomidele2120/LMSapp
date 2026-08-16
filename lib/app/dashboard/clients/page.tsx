import Link from "next/link";
import { Plus, Search } from "lucide-react";
import { requireProfile } from "@/lib/supabase/require-profile";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export default async function ClientsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { supabase, firmId } = await requireProfile();
  const { q } = await searchParams;

  let query = supabase
    .from("clients")
    .select("id, full_name, company_name, client_type, email, phone, tags, is_archived")
    .eq("firm_id", firmId)
    .eq("is_archived", false)
    .order("full_name");

  if (q) {
    query = query.or(`full_name.ilike.%${q}%,company_name.ilike.%${q}%,email.ilike.%${q}%`);
  }

  const { data: clients } = await query;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl text-ink-900">Clients</h1>
          <p className="text-sm text-ink-500 mt-1">Every individual and company the firm represents.</p>
        </div>
        <Link href="/dashboard/clients/new">
          <Button>
            <Plus className="h-4 w-4" strokeWidth={2} />
            New client
          </Button>
        </Link>
      </div>

      <form className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-ink-300" strokeWidth={1.75} />
        <input
          type="search"
          name="q"
          defaultValue={q}
          placeholder="Search clients…"
          className="w-full h-10 rounded border border-slate-line bg-white pl-9 pr-3 text-sm placeholder:text-ink-300 focus:outline-none focus:border-brass"
        />
      </form>

      <div className="card-surface overflow-hidden">
        {!clients || clients.length === 0 ? (
          <p className="text-sm text-ink-300 py-12 text-center">
            {q ? `No clients match "${q}".` : "No clients yet — add your first one to get started."}
          </p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-line text-left text-xs uppercase tracking-wide text-ink-500">
                <th className="px-5 py-3 font-medium">Name</th>
                <th className="px-5 py-3 font-medium">Type</th>
                <th className="px-5 py-3 font-medium">Contact</th>
                <th className="px-5 py-3 font-medium">Tags</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-line">
              {clients.map((c) => (
                <tr key={c.id} className="hover:bg-parchment-50">
                  <td className="px-5 py-3">
                    <Link href={`/dashboard/clients/${c.id}`} className="text-ink-900 hover:text-brass-dark font-medium">
                      {c.full_name}
                    </Link>
                    {c.company_name && <div className="text-xs text-ink-500">{c.company_name}</div>}
                  </td>
                  <td className="px-5 py-3 capitalize text-ink-500">{c.client_type}</td>
                  <td className="px-5 py-3 text-ink-500">
                    {c.email || c.phone || "—"}
                  </td>
                  <td className="px-5 py-3">
                    <div className="flex gap-1 flex-wrap">
                      {(c.tags ?? []).map((t: string) => (
                        <Badge key={t} tone="neutral">{t}</Badge>
                      ))}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
