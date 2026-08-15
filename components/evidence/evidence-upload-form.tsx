"use client";

import { useRef, useState } from "react";
import { Upload } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { recordEvidence } from "@/lib/actions/documents";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";

const TYPES = [
  ["image", "Image"],
  ["audio", "Audio"],
  ["video", "Video"],
  ["email", "Email"],
  ["witness_statement", "Witness statement"],
  ["screenshot", "Screenshot"],
  ["report", "Report"],
  ["other", "Other"],
] as const;

export function EvidenceUploadForm({ firmId, caseId }: { firmId: string; caseId: string }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    const form = e.currentTarget;
    const title = (form.elements.namedItem("title") as HTMLInputElement).value.trim();
    if (!title) {
      setError("Give this piece of evidence a title.");
      return;
    }

    setBusy(true);
    try {
      const fileInput = form.elements.namedItem("file") as HTMLInputElement;
      const file = fileInput.files?.[0];
      let storagePath: string | null = null;

      if (file) {
        const supabase = createClient();
        const path = `${firmId}/${caseId}/${Date.now()}-${file.name}`;
        const { error: uploadError } = await supabase.storage
          .from("evidence")
          .upload(path, file, { upsert: false });
        if (uploadError) {
          setError(`Upload failed: ${uploadError.message}`);
          setBusy(false);
          return;
        }
        storagePath = path;
      }

      const metadata = new FormData();
      metadata.set("title", title);
      metadata.set("evidenceType", (form.elements.namedItem("evidenceType") as HTMLSelectElement).value);
      metadata.set("caseId", caseId);
      const source = (form.elements.namedItem("source") as HTMLInputElement).value.trim();
      if (source) metadata.set("source", source);
      const occurredAt = (form.elements.namedItem("occurredAt") as HTMLInputElement).value;
      if (occurredAt) metadata.set("occurredAt", occurredAt);
      if (storagePath) metadata.set("storagePath", storagePath);

      const result = await recordEvidence({ error: null }, metadata);
      if (result.error) {
        setError(result.error);
      } else {
        formRef.current?.reset();
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <form ref={formRef} onSubmit={handleSubmit} className="card-surface p-4 space-y-3">
      <div className="flex gap-3 flex-wrap items-end">
        <div className="flex-1 min-w-[160px]">
          <label className="block text-xs font-medium text-ink-500 mb-1.5">Title</label>
          <Input name="title" placeholder="e.g. CCTV footage, front entrance" required />
        </div>
        <div className="w-44">
          <label className="block text-xs font-medium text-ink-500 mb-1.5">Type</label>
          <Select name="evidenceType" defaultValue="other">
            {TYPES.map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </Select>
        </div>
      </div>
      <div className="flex gap-3 flex-wrap items-end">
        <div className="flex-1 min-w-[160px]">
          <label className="block text-xs font-medium text-ink-500 mb-1.5">Source (optional)</label>
          <Input name="source" placeholder="e.g. Client submission, Exhibit A" />
        </div>
        <div className="w-44">
          <label className="block text-xs font-medium text-ink-500 mb-1.5">Date occurred</label>
          <Input name="occurredAt" type="date" />
        </div>
      </div>
      <div>
        <label className="block text-xs font-medium text-ink-500 mb-1.5">
          File (optional — some evidence, like a witness account, has none yet)
        </label>
        <input
          type="file"
          name="file"
          className="block w-full text-sm text-ink-500 file:mr-3 file:rounded file:border file:border-slate-line file:bg-white file:px-3 file:py-1.5 file:text-sm file:text-ink-900 hover:file:bg-parchment-100"
        />
      </div>
      {error && <p className="text-sm text-seal">{error}</p>}
      <div className="flex justify-end">
        <Button type="submit" size="sm" disabled={busy}>
          <Upload className="h-3.5 w-3.5" strokeWidth={2} />
          {busy ? "Saving…" : "Log evidence"}
        </Button>
      </div>
    </form>
  );
}
