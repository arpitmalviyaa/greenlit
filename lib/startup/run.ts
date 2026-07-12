// Startup matter orchestration. Server-only (service role).
// Reused by the admin route and the staging verification script — so the analysis
// path is exercised identically with or without HTTP/auth.

import { createServiceClient } from "@/lib/supabase/server";
import { extractTextFromBuffer } from "@/lib/utils/extract-text";
import {
  extractDocTerms, reviewSingleDocument, reviewMatter, type Inconsistency,
} from "./analyse";
import { STARTUP_SUB_TYPES, type Memo } from "@/lib/anthropic/prompts/startup-review";

export function isStartupSubType(v: string | null | undefined): boolean {
  return !!v && (STARTUP_SUB_TYPES as readonly string[]).includes(v);
}

export interface NewDoc {
  sub_type: string;
  title?: string | null;
  file?: { buffer: Buffer; fileName: string; mimeType: string; storageKey: string };
  text?: string;                 // pre-extracted text (verification path)
}

// Create a matter, store its documents (extract text), analyse, and persist a DRAFT memo.
export async function createStartupMatter(input: {
  workspace_id?: string | null;
  created_by?: string | null;
  title: string;
  founder_context?: { stage?: string; round?: string; concerns?: string } | null;
  docs: NewDoc[];
}): Promise<{ matter_id: string; memo_id: string; inconsistencies: Inconsistency[] }> {
  const supabase = await createServiceClient();
  const isDataRoom = input.docs.length > 1;
  const matterSubType = isDataRoom ? "data_room" : (input.docs[0]?.sub_type ?? null);

  const { data: matter, error: mErr } = await supabase.from("startup_matters").insert({
    workspace_id: input.workspace_id ?? null,
    created_by: input.created_by ?? null,
    title: input.title,
    sub_type: matterSubType,
    founder_context: input.founder_context ?? null,
  }).select("id").single();
  if (mErr || !matter) throw new Error(mErr?.message ?? "matter insert failed");
  const matterId = matter.id as string;

  // Store each document (extract text if file-backed).
  const stored: { id: string; sub_type: string; title: string | null; text: string }[] = [];
  for (const d of input.docs) {
    let text = d.text ?? "";
    if (d.file) {
      await supabase.storage.from("startup-docs").upload(d.file.storageKey, d.file.buffer, {
        contentType: d.file.mimeType, upsert: true,
      });
      const ex = await extractTextFromBuffer(d.file.buffer, d.file.mimeType, d.file.fileName);
      text = ex.text ?? "";
    }
    const { data: doc } = await supabase.from("startup_documents").insert({
      matter_id: matterId, workspace_id: input.workspace_id ?? null,
      sub_type: d.sub_type, title: d.title ?? d.file?.fileName ?? null,
      file_path: d.file?.storageKey ?? null, extracted_text: text.slice(0, 200_000),
      status: text ? "ready" : "failed",
    }).select("id").single();
    if (doc) stored.push({ id: doc.id as string, sub_type: d.sub_type, title: d.title ?? d.file?.fileName ?? null, text });
  }

  // Extract structured terms per doc (for cross-doc checks + synthesis), persist them.
  const withTerms = [];
  for (const s of stored) {
    const terms = s.text ? await extractDocTerms(s.sub_type, s.text) : null;
    if (terms) await supabase.from("startup_documents").update({ doc_analysis: terms }).eq("id", s.id);
    withTerms.push({ ...s, terms });
  }

  // Analyse: single doc vs data room.
  let memo: Memo;
  let inconsistencies: Inconsistency[] = [];
  if (withTerms.length === 1) {
    memo = await reviewSingleDocument({
      subType: withTerms[0].sub_type, text: withTerms[0].text, founderContext: input.founder_context,
    });
  } else {
    const res = await reviewMatter({
      docs: withTerms.map((d) => ({ sub_type: d.sub_type, title: d.title, text: d.text, terms: d.terms })),
      founderContext: input.founder_context,
    });
    memo = res.memo;
    inconsistencies = res.inconsistencies;
  }

  const { data: memoRow, error: memoErr } = await supabase.from("startup_memos").insert({
    matter_id: matterId, workspace_id: input.workspace_id ?? null,
    memo_json: memo, status: "draft",
    document_label: isDataRoom ? `Data room — ${withTerms.length} documents` : (withTerms[0]?.title ?? matterSubType),
  }).select("id").single();
  if (memoErr || !memoRow) throw new Error(memoErr?.message ?? "memo insert failed");

  return { matter_id: matterId, memo_id: memoRow.id as string, inconsistencies };
}

// Reprocess a failed document: re-download from storage, re-extract text,
// re-run term extraction. Un-deadends startup_documents.status='failed'
// (e.g. a scanned PDF that failed before vision fallback, or a transient
// extraction error). Does NOT regenerate the matter memo — the reviewer edits
// or re-creates the matter once the text is available.
export async function reprocessStartupDocument(docId: string): Promise<{ ok: boolean; status: string; error?: string }> {
  const supabase = await createServiceClient();
  const { data: doc } = await supabase.from("startup_documents")
    .select("id, sub_type, file_path, extracted_text")
    .eq("id", docId).single();
  if (!doc) return { ok: false, status: "failed", error: "not found" };

  let text = (doc.extracted_text as string | null) ?? "";
  if (doc.file_path) {
    const { data: blob } = await supabase.storage.from("startup-docs").download(doc.file_path as string);
    if (blob) {
      const buffer = Buffer.from(await blob.arrayBuffer());
      const ex = await extractTextFromBuffer(buffer, blob.type || "application/pdf", doc.file_path as string);
      if (ex.text) text = ex.text;
    }
  }
  if (!text) {
    await supabase.from("startup_documents").update({ status: "failed" }).eq("id", docId);
    return { ok: false, status: "failed", error: "no text could be extracted" };
  }

  const terms = await extractDocTerms(doc.sub_type as string, text);
  await supabase.from("startup_documents").update({
    extracted_text: text.slice(0, 200_000),
    doc_analysis: terms ?? null,
    status: "ready",
  }).eq("id", docId);
  return { ok: true, status: "ready" };
}
