"use server";

import { revalidatePath } from "next/cache";
import { requireProfile } from "@/lib/supabase/require-profile";
import { getAiProvider } from "@/lib/ai/provider";

export interface ActionState {
  error: string | null;
}

const SYSTEM_PROMPT =
  "You are a legal practice assistant for a Nigerian law firm. Summarize case " +
  "material factually and concisely for a busy lawyer. Never invent facts, " +
  "dates, or outcomes that are not in the material provided. If the material " +
  "is thin, say so plainly rather than padding the summary.";

export async function generateCaseSummary(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const { supabase, profile, firmId } = await requireProfile();
  const caseId = String(formData.get("caseId") ?? "");

  if (!caseId) {
    return { error: "Pick a case to summarize." };
  }

  const [{ data: caseRecord }, { data: timeline }, { data: notes }] = await Promise.all([
    supabase
      .from("cases")
      .select("title, case_number, practice_area, status, description, opposing_parties")
      .eq("id", caseId)
      .eq("firm_id", firmId)
      .single(),
    supabase
      .from("case_timeline_events")
      .select("event_date, title, description")
      .eq("case_id", caseId)
      .order("event_date", { ascending: true }),
    supabase
      .from("notes")
      .select("body, is_private, created_at")
      .eq("case_id", caseId)
      .eq("is_private", false)
      .order("created_at", { ascending: true }),
  ]);

  if (!caseRecord) {
    return { error: "That case couldn't be found." };
  }

  const inputSummary = [
    `Case: ${caseRecord.case_number} — ${caseRecord.title}`,
    `Practice area: ${caseRecord.practice_area} · Status: ${caseRecord.status}`,
    caseRecord.opposing_parties ? `Opposing: ${caseRecord.opposing_parties}` : null,
    caseRecord.description ? `Description: ${caseRecord.description}` : null,
    "",
    "Timeline:",
    ...(timeline ?? []).map((t) => `- ${t.event_date.slice(0, 10)}: ${t.title}${t.description ? ` — ${t.description}` : ""}`),
    "",
    "Notes:",
    ...(notes ?? []).map((n) => `- ${n.body}`),
  ]
    .filter((line): line is string => line !== null)
    .join("\n");

  let output = "";
  let tokensUsed: number | null = null;
  let status: "completed" | "failed" = "completed";
  let errorMessage: string | null = null;

  try {
    const provider = getAiProvider();
    const result = await provider.complete({
      system: SYSTEM_PROMPT,
      prompt: `Summarize this case in 3-5 short paragraphs, covering: current posture, key events so far, and what's outstanding.\n\n${inputSummary}`,
    });
    output = result.text;
    tokensUsed = result.tokensUsed;
  } catch (err) {
    status = "failed";
    errorMessage = err instanceof Error ? err.message : "AI request failed.";
  }

  await supabase.from("ai_requests").insert({
    firm_id: firmId,
    requested_by: profile.id,
    case_id: caseId,
    request_type: "case_summary",
    input_summary: inputSummary.slice(0, 2000),
    output: output || null,
    tokens_used: tokensUsed,
    status,
    error_message: errorMessage,
  });

  revalidatePath("/dashboard/ai");

  if (status === "failed") {
    return { error: errorMessage };
  }

  return { error: null };
}

const RESEARCH_SYSTEM_PROMPT =
  "You are a legal research assistant for a Nigerian law firm. Answer with " +
  "reference to Nigerian statutes, case law, and legal principles where you " +
  "can. Be direct about the limits of what you know — if you're not certain " +
  "of a citation, say so rather than inventing one, and recommend the lawyer " +
  "verify anything case-specific against a primary source (LawPavilion, " +
  "Nigerian Law Reports, etc.) before relying on it. This is a starting " +
  "point for research, not a substitute for it.";

export async function generateLegalResearch(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const { supabase, profile, firmId } = await requireProfile();
  const question = String(formData.get("question") ?? "").trim();
  const caseId = String(formData.get("caseId") ?? "") || null;

  if (!question) {
    return { error: "Type a research question first." };
  }

  let output = "";
  let tokensUsed: number | null = null;
  let status: "completed" | "failed" = "completed";
  let errorMessage: string | null = null;

  try {
    const provider = getAiProvider();
    const result = await provider.complete({
      system: RESEARCH_SYSTEM_PROMPT,
      prompt: question,
      maxTokens: 1000,
    });
    output = result.text;
    tokensUsed = result.tokensUsed;
  } catch (err) {
    status = "failed";
    errorMessage = err instanceof Error ? err.message : "AI request failed.";
  }

  await supabase.from("ai_requests").insert({
    firm_id: firmId,
    requested_by: profile.id,
    case_id: caseId,
    request_type: "legal_research",
    input_summary: question.slice(0, 2000),
    output: output || null,
    tokens_used: tokensUsed,
    status,
    error_message: errorMessage,
  });

  revalidatePath("/dashboard/ai");

  if (status === "failed") {
    return { error: errorMessage };
  }
  return { error: null };
}

const CONTRACT_REVIEW_SYSTEM_PROMPT =
  "You are a contract review assistant for a Nigerian law firm. Read the " +
  "document text provided and flag: unusual or one-sided clauses, missing " +
  "standard protections (indemnity, termination, dispute resolution, " +
  "governing law), ambiguous wording, and anything that looks like a typo " +
  "or drafting error. Organize findings under short headings. Don't rewrite " +
  "the contract — flag issues for a lawyer to address. If the text looks " +
  "incomplete or garbled (likely an OCR error), say so rather than reviewing " +
  "partial content as if it were the whole document.";

/**
 * Reviews a document's extracted text (documents.ocr_text — see
 * extractDocumentText in lib/actions/documents.ts). A document has to be
 * OCR'd first; this action doesn't re-derive text itself.
 */
export async function generateContractReview(documentId: string, caseId: string): Promise<ActionState> {
  const { supabase, profile, firmId } = await requireProfile();

  const { data: doc } = await supabase
    .from("documents")
    .select("title, ocr_text")
    .eq("id", documentId)
    .eq("firm_id", firmId)
    .single();

  if (!doc) {
    return { error: "That document couldn't be found." };
  }
  if (!doc.ocr_text) {
    return { error: "Extract this document's text first, then review it." };
  }

  let output = "";
  let tokensUsed: number | null = null;
  let status: "completed" | "failed" = "completed";
  let errorMessage: string | null = null;

  try {
    const provider = getAiProvider();
    const result = await provider.complete({
      system: CONTRACT_REVIEW_SYSTEM_PROMPT,
      prompt: `Document: ${doc.title}\n\n${doc.ocr_text}`,
      maxTokens: 1200,
    });
    output = result.text;
    tokensUsed = result.tokensUsed;
  } catch (err) {
    status = "failed";
    errorMessage = err instanceof Error ? err.message : "AI request failed.";
  }

  await supabase.from("ai_requests").insert({
    firm_id: firmId,
    requested_by: profile.id,
    case_id: caseId,
    request_type: "contract_review",
    input_summary: `Review: ${doc.title}`,
    output: output || null,
    tokens_used: tokensUsed,
    status,
    error_message: errorMessage,
  });

  revalidatePath("/dashboard/ai");
  revalidatePath(`/dashboard/cases/${caseId}`);

  if (status === "failed") {
    return { error: errorMessage };
  }
  return { error: null };
}

/** Form-action wrapper — <form action> requires a void-returning function. */
export async function generateContractReviewForm(documentId: string, caseId: string): Promise<void> {
  await generateContractReview(documentId, caseId);
}
