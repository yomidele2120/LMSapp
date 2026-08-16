"use client";

import { useRef, useState } from "react";
import { Upload } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { recordDocument } from "@/lib/actions/documents";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";

const CATEGORIES = [
  ["pleading", "Pleading"],
  ["contract", "Contract"],
  ["correspondence", "Correspondence"],
  ["court_filing", "Court filing"],
  ["identification", "Identification"],
  ["evidence", "Evidence"],
  ["invoice", "Invoice"],
  ["report", "Report"],
  ["other", "Other"],
] as const;

export function DocumentUploadForm({
  firmId,
  caseId,
  clientId,
}: {
  firmId: string;
  caseId?: string;
  clientId?: string;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    const form = e.currentTarget;
    const fileInput = form.elements.namedItem("file") as HTMLInputElement;
    const file = fileInput.files?.[0];
    const title = (form.elements.namedItem("title") as HTMLInputElement).value.trim();

    if (!file || !title) {
      setError("Choose a file and give it a title.");
      return;
    }

    setBusy(true);
    try {
      const supabase = createClient();
      // Path convention "<firm_id>/..." matches the storage RLS policies in
      // complete_database.sql — anything outside the caller's own firm
      // folder is rejected by Postgres before it ever reaches disk.
      const path = `${firmId}/${caseId ?? "unfiled"}/${Date.now()}-${file.name}`;

      const { error: uploadError } = await supabase.storage
        .from("documents")
        .upload(path, file, { upsert: false });

      if (uploadError) {
        setError(`Upload failed: ${uploadError.message}`);
        setBusy(false);
        return;
      }

      const metadata = new FormData();
      metadata.set("title", title);
      metadata.set("category", (form.elements.namedItem("category") as HTMLSelectElement).value);
      metadata.set("storagePath", path);
      metadata.set("mimeType", file.type);
      metadata.set("sizeBytes", String(file.size));
      if (caseId) metadata.set("caseId", caseId);
      if (clientId) metadata.set("clientId", clientId);
      const visible = form.elements.namedItem("isClientVisible") as HTMLInputElement;
      if (visible?.checked) metadata.set("isClientVisible", "on");

      const result = await recordDocument({ error: null }, metadata);
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
          <Input name="title" placeholder="e.g. Statement of claim (filed copy)" required />
        </div>
        <div className="w-40">
          <label className="block text-xs font-medium text-ink-500 mb-1.5">Category</label>
          <Select name="category" defaultValue="other">
            {CATEGORIES.map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </Select>
        </div>
      </div>
      <div>
        <label className="block text-xs font-medium text-ink-500 mb-1.5">File</label>
        <input
          type="file"
          name="file"
          required
          className="block w-full text-sm text-ink-500 file:mr-3 file:rounded file:border file:border-slate-line file:bg-white file:px-3 file:py-1.5 file:text-sm file:text-ink-900 hover:file:bg-parchment-100"
        />
      </div>
      {clientId && (
        <label className="flex items-center gap-2 text-xs text-ink-500">
          <input type="checkbox" name="isClientVisible" className="rounded border-slate-line" />
          Visible to the client in their portal
        </label>
      )}
      {error && <p className="text-sm text-seal">{error}</p>}
      <div className="flex justify-end">
        <Button type="submit" size="sm" disabled={busy}>
          <Upload className="h-3.5 w-3.5" strokeWidth={2} />
          {busy ? "Uploading…" : "Upload"}
        </Button>
      </div>
    </form>
  );
}
