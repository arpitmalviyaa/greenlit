import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/corpus/admin";
import { createServiceClient } from "@/lib/supabase/server";
import { reprocessDocument } from "@/lib/corpus/pipeline";

const NOT_FOUND = NextResponse.json({ error: "Not found" }, { status: 404 });

// Document detail + its chunks (for the drill-in view).
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!await requireAdmin()) return NOT_FOUND;
  const { id } = await params;
  const service = await createServiceClient();
  const { data: doc } = await service.from("corpus_documents")
    .select("id, doc_kind, deal_type, vertical, sanitized, title, source_note, founder_note, file_path, status, created_at")
    .eq("id", id).single();
  if (!doc) return NOT_FOUND;
  const { data: chunks } = await service.from("corpus_chunks")
    .select("id, chunk_index, content, clause_type, risk_note, stance, status")
    .eq("document_id", id).order("chunk_index", { ascending: true });
  return NextResponse.json({ document: doc, chunks: chunks ?? [] });
}

// Sanitization gate: mark a document sanitized (party names / identifying details
// confirmed removed). Until set, the doc never enters retrieval.
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!await requireAdmin()) return NOT_FOUND;
  const { id } = await params;
  const body = await request.json() as { sanitized?: boolean };
  const service = await createServiceClient();
  const { error } = await service.from("corpus_documents")
    .update({ sanitized: body.sanitized === true }).eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, sanitized: body.sanitized === true });
}

// Reprocess (re-extract + re-classify).
export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!await requireAdmin()) return NOT_FOUND;
  const { id } = await params;
  const result = await reprocessDocument(id);
  return NextResponse.json(result, { status: result.status === "failed" ? 422 : 200 });
}

// Delete document (cascades chunks) + storage object.
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!await requireAdmin()) return NOT_FOUND;
  const { id } = await params;
  const service = await createServiceClient();
  const { data: doc } = await service.from("corpus_documents").select("file_path").eq("id", id).single();
  if (doc?.file_path) await service.storage.from("corpus").remove([doc.file_path]);
  const { error } = await service.from("corpus_documents").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ deleted: true });
}
