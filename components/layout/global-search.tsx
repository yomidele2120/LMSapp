"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Search, Briefcase, Users, FileText, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

interface SearchResults {
  clients: { id: string; full_name: string; company_name: string | null }[];
  cases: { id: string; title: string; case_number: string }[];
  documents: { id: string; title: string; case_id: string | null }[];
}

const EMPTY: SearchResults = { clients: [], cases: [], documents: [] };

export function GlobalSearch({ firmId }: { firmId: string }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResults>(EMPTY);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    const term = query.trim();
    if (term.length < 2) {
      setResults(EMPTY);
      return;
    }

    setLoading(true);
    const timeout = setTimeout(async () => {
      const supabase = createClient();
      const like = `%${term}%`;

      // RLS already scopes every one of these to the caller's firm; the
      // explicit firm_id filter just avoids widening the query plan.
      const [clients, cases, documents] = await Promise.all([
        supabase
          .from("clients")
          .select("id, full_name, company_name")
          .eq("firm_id", firmId)
          .or(`full_name.ilike.${like},company_name.ilike.${like}`)
          .limit(5),
        supabase
          .from("cases")
          .select("id, title, case_number")
          .eq("firm_id", firmId)
          .or(`title.ilike.${like},case_number.ilike.${like}`)
          .limit(5),
        supabase
          .from("documents")
          .select("id, title, case_id")
          .eq("firm_id", firmId)
          .ilike("title", like)
          .limit(5),
      ]);

      setResults({
        clients: clients.data ?? [],
        cases: cases.data ?? [],
        documents: documents.data ?? [],
      });
      setLoading(false);
    }, 250);

    return () => clearTimeout(timeout);
  }, [query, firmId]);

  const hasResults = results.clients.length + results.cases.length + results.documents.length > 0;

  return (
    <div ref={boxRef} className="relative w-full max-w-md">
      <div className="flex items-center gap-2 text-ink-300">
        {loading ? (
          <Loader2 className="h-4 w-4 animate-spin" strokeWidth={1.75} />
        ) : (
          <Search className="h-4 w-4" strokeWidth={1.75} />
        )}
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setOpen(true)}
          placeholder="Search clients, cases, documents…"
          className="w-full bg-transparent text-sm placeholder:text-ink-300 focus:outline-none py-2"
        />
      </div>

      {open && query.trim().length >= 2 && (
        <div className="absolute top-full left-0 mt-1 w-[28rem] max-w-[90vw] card-surface shadow-lg py-2 max-h-96 overflow-y-auto z-20">
          {!hasResults && !loading ? (
            <p className="text-sm text-ink-300 px-4 py-6 text-center">No matches for &ldquo;{query}&rdquo;.</p>
          ) : (
            <>
              <ResultGroup icon={Users} label="Clients">
                {results.clients.map((c) => (
                  <ResultRow
                    key={c.id}
                    href={`/dashboard/clients/${c.id}`}
                    onNavigate={() => setOpen(false)}
                    primary={c.full_name}
                    secondary={c.company_name}
                  />
                ))}
              </ResultGroup>
              <ResultGroup icon={Briefcase} label="Cases">
                {results.cases.map((c) => (
                  <ResultRow
                    key={c.id}
                    href={`/dashboard/cases/${c.id}`}
                    onNavigate={() => setOpen(false)}
                    primary={c.title}
                    secondary={c.case_number}
                  />
                ))}
              </ResultGroup>
              <ResultGroup icon={FileText} label="Documents">
                {results.documents.map((d) => (
                  <ResultRow
                    key={d.id}
                    href={d.case_id ? `/dashboard/cases/${d.case_id}` : "/dashboard/clients"}
                    onNavigate={() => setOpen(false)}
                    primary={d.title}
                    secondary={null}
                  />
                ))}
              </ResultGroup>
            </>
          )}
        </div>
      )}
    </div>
  );
}

function ResultGroup({
  icon: Icon,
  label,
  children,
}: {
  icon: typeof Users;
  label: string;
  children: React.ReactNode;
}) {
  const hasChildren = Array.isArray(children) ? children.length > 0 : Boolean(children);
  if (!hasChildren) return null;

  return (
    <div className="px-2 py-1">
      <div className="flex items-center gap-1.5 px-2 py-1 text-[11px] font-medium uppercase tracking-wide text-ink-300">
        <Icon className="h-3 w-3" strokeWidth={1.75} />
        {label}
      </div>
      {children}
    </div>
  );
}

function ResultRow({
  href,
  onNavigate,
  primary,
  secondary,
}: {
  href: string;
  onNavigate: () => void;
  primary: string;
  secondary: string | null;
}) {
  return (
    <Link
      href={href}
      onClick={onNavigate}
      className="flex items-center justify-between gap-3 px-2 py-2 rounded text-sm hover:bg-parchment-100"
    >
      <span className="text-ink-900 truncate">{primary}</span>
      {secondary && <span className="docket shrink-0">{secondary}</span>}
    </Link>
  );
}
