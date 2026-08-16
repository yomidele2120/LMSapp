"use server";

import { revalidatePath } from "next/cache";
import { requireProfile } from "@/lib/supabase/require-profile";
import { getAiProvider } from "@/lib/ai/provider";
import type { DocumentCategory, EvidenceType } from "@/types/database";

export interface ActionState {
  error: string | null;
}

/**
 * The file itself is uploaded to Supabase Storage from the browser (see
 * components/documents/upload-form.tsx) so RLS on storage.objects — keyed to
 * the caller's own session — applies directly, rather than routing bytes
 * through a server action. This action only writes the metadata row once
 * the upload has already succeeded.
 */
export async function recordDocument(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const { supabase, profile, firmId } = await requireProfile();

  const title = String(formData.get("title") ?? "").trim();
  const category = String(formData.get("category") ?? "other") as DocumentCategory;
  const caseId = String(formData.get("caseId") ?? "") || null;
  const clientId = String(formData.get("clientId") ?? "") || null;
  const storagePath = String(formData.get("storagePath") ?? "");
  const mimeType = String(formData.get("mimeType") ?? "");
  const sizeBytes = Number(formData.get("sizeBytes") ?? 0);
  const isClientVisible = formData.get("isClientVisible") === "on";

  if (!title || !storagePath) {
    return { error: "Choose a file and give it a title before saving." };
  }

  const { error } = await supabase.from("documents").insert({
    firm_id: firmId,
    case_id: caseId,
    client_id: clientId,
    category,
    title,
    storage_path: storagePath,
    mime_type: mimeType || "application/octet-stream",
    size_bytes: sizeBytes,
    is_client_visible: isClientVisible,
    uploaded_by: profile.id,
  });

  if (error) {
    return { error: "Uploaded the file, but couldn't save its record. Try again." };
  }

  if (caseId) revalidatePath(`/dashboard/cases/${caseId}`);
  if (clientId) revalidatePath(`/dashboard/clients/${clientId}`);
  return { error: null };
}

export async function recordEvidence(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const { supabase, profile, firmId } = await requireProfile();

  const title = String(formData.get("title") ?? "").trim();
  const evidenceType = String(formData.get("evidenceType") ?? "other") as EvidenceType;
  const caseId = String(formData.get("caseId") ?? "");
  const source = String(formData.get("source") ?? "").trim() || null;
  const occurredAt = String(formData.get("occurredAt") ?? "") || null;
  const storagePath = String(formData.get("storagePath") ?? "") || null;

  if (!title || !caseId) {
    return { error: "Evidence needs a title and a case to attach to." };
  }

  const { error } = await supabase.from("evidence").insert({
    firm_id: firmId,
    case_id: caseId,
    evidence_type: evidenceType,
    title,
    source,
    occurred_at: occurredAt,
    storage_path: storagePath,
    uploaded_by: profile.id,
  });

  if (error) {
    return { error: "Couldn't log that evidence. Try again." };
  }

  revalidatePath(`/dashboard/cases/${caseId}`);
  return { error: null };
}

/**
 * Runs OCR (via the AI provider's vision model, see lib/ai/provider.ts) on
 * an already-uploaded document and stores the result in documents.ocr_text,
 * which is what the case/global search full-text index reads from.
 * Images go through vision OCR directly; PDFs (including scanned, no-text-
 * layer ones) go through the model's native PDF file input, which handles
 * both a real text layer and rasterizing scanned pages internally — no
 * local PDF-to-image step needed.
 */
export async function extractDocumentText(documentId: string, caseId: string): Promise<ActionState> {
  const { supabase, firmId } = await requireProfile();

  const { data: doc } = await supabase
    .from("documents")
    .select("title, storage_path, mime_type, size_bytes, firm_id")
    .eq("id", documentId)
    .eq("firm_id", firmId)
    .single();

  if (!doc) {
    return { error: "That document couldn't be found." };
  }

  const isImage = doc.mime_type.startsWith("image/");
  const isPdf = doc.mime_type === "application/pdf";

  if (!isImage && !isPdf) {
    return { error: "Text extraction currently supports image files and PDFs only." };
  }

  const MAX_OCR_BYTES = 15 * 1024 * 1024; // 15 MB — keeps the OpenAI request fast and well under its limits
  if (isPdf && doc.size_bytes > MAX_OCR_BYTES) {
    return { error: "That PDF is too large to extract text from (15 MB limit)." };
  }

  const { data: signed, error: signError } = await supabase.storage
    .from("documents")
    .createSignedUrl(doc.storage_path, 300);

  if (signError || !signed) {
    return { error: "Couldn't access that file in storage." };
  }

  try {
    const provider = getAiProvider();
    let text: string;

    if (isImage) {
      ({ text } = await provider.extractTextFromImage({ imageUrl: signed.signedUrl }));
    } else {
      const fileResponse = await fetch(signed.signedUrl);
      if (!fileResponse.ok) {
        return { error: "Couldn't download that PDF from storage to read it." };
      }
      const arrayBuffer = await fileResponse.arrayBuffer();
      const base64Pdf = Buffer.from(arrayBuffer).toString("base64");
      ({ text } = await provider.extractTextFromPdf({ base64Pdf, filename: doc.title || "document.pdf" }));
    }

    await supabase
      .from("documents")
      .update({ ocr_text: text || null })
      .eq("id", documentId);
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Text extraction failed." };
  }

  revalidatePath(`/dashboard/cases/${caseId}`);
  return { error: null };
}

/** Form-action wrapper — <form action> requires a void-returning function. */
export async function extractDocumentTextForm(documentId: string, caseId: string): Promise<void> {
  await extractDocumentText(documentId, caseId);
}
