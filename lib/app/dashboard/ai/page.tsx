import { requireProfile } from "@/lib/supabase/require-profile";
import { GenerateSummaryForm } from "@/components/ai/generate-summary-form";
import { LegalResearchForm } from "@/components/ai/legal-research-form";
import { formatDocketDate } from "@/lib/utils";

const REQUEST_LABEL: Record<string, string> = {
  case_summary: "Case summary",
  contract_review: "Contract review",
  legal_research: "Legal research",
  transcription: "Transcription",
  timeline_generation: "Timeline generation",
  action_item_extraction: "Action items",
  smart_search: "Smart search",
  document_summary: "Document summary",
};

export default async function AiAssistantPage() {
  const { supabase, firmId } = await requireProfile();

  const [{ data: cases }, { data: history }] = await Promise.all([
    supabase.from("cases").select("id, title, case_number").eq("firm_id", firmId).order("title"),
    supabase
      .from("ai_requests")
      .select("id, request_type, status, output, error_message, tokens_used, created_at, case_id, cases(title, case_number)")
      .eq("firm_id", firmId)
      .order("created_at", { ascending: false })
      .limit(20),
  ]);

  const requests = (history ?? []).map((r) => ({
    ...r,
    cases: Array.isArray(r.cases) ? (r.cases[0] ?? null) : r.cases,
  }));

  return (
    <div className="space-y-8 max-w-3xl">
      <div>
        <h1 className="font-display text-2xl text-ink-900">AI assistant</h1>
        <p className="text-sm text-ink-500 mt-1">
          Case summaries and contract reviews are drawn only from what&apos;s on file.
          Legal research answers general Nigerian law questions — always confirm citations
          before relying on them in a filing. Transcription and semantic smart search are
          on the roadmap.
        </p>
      </div>

      <GenerateSummaryForm cases={cases ?? []} />

      <div>
        <h2 className="text-sm font-medium text-ink-900 mb-3">Legal research</h2>
        <LegalResearchForm cases={cases ?? []} />
      </div>

      <div>
        <h2 className="text-sm font-medium text-ink-900 mb-3">Recent requests</h2>
        {requests.length === 0 ? (
          <p className="text-sm text-ink-300 py-4">No AI requests yet.</p>
        ) : (
          <div className="space-y-4">
            {requests.map((r) => (
              <div key={r.id} className="card-surface p-4">
                <div className="flex items-center justify-between gap-3 flex-wrap mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs px-2 py-0.5 rounded-full bg-brass/10 text-brass-dark">
                      {REQUEST_LABEL[r.request_type] ?? r.request_type}
                    </span>
                    {r.cases && (
                      <span className="docket">{r.cases.case_number}</span>
                    )}
                  </div>
                  <span className="text-xs text-ink-500">{formatDocketDate(r.created_at)}</span>
                </div>
                {r.status === "failed" ? (
                  <p className="text-sm text-seal">
                    {r.error_message || "This request failed. Check your OpenAI API key is configured."}
                  </p>
                ) : (
                  <p className="text-sm text-ink-900 whitespace-pre-wrap">{r.output}</p>
                )}
                {r.tokens_used != null && (
                  <p className="text-xs text-ink-300 mt-2">{r.tokens_used} tokens</p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
