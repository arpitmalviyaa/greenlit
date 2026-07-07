import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { requireAdmin } from "@/lib/corpus/admin";
import { createServiceClient } from "@/lib/supabase/server";
import { ingestDocument } from "@/lib/corpus/pipeline";

const NOT_FOUND = NextResponse.json({ error: "Not found" }, { status: 404 });
const MAX_BYTES = 15 * 1024 * 1024; // 15 MB
const DOC_KINDS = ["contract", "dispute", "judgment", "negotiation", "clause_note", "founder_annotation"];
const DEAL_TYPES = ["paid_promotion", "barter", "ugc_license", "ambassadorship", "representation", "platform", "other"];

// List documents (library view).
export async function GET() {
  if (!await requireAdmin()) return NOT_FOUND;
  const service = await createServiceClient();
  const { data, error } = await service
    .from("corpus_documents")
    .select("id, doc_kind, deal_type, title, status, created_at, corpus_chunks(count)")
    .order("created_at", { ascending: false })
    .limit(500);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  const docs = (data ?? []).map((d) => ({
    ...d,
    chunk_count: Array.isArray(d.corpus_chunks) ? (d.corpus_chunks[0]?.count ?? 0) : 0,
    corpus_chunks: undefined,
  }));
  return NextResponse.json(docs);
}

// Ingest: multipart (file) OR json (note-only founder annotation).
export async function POST(request: Request) {
  const user = await requireAdmin();
  if (!user) return NOT_FOUND;

  const contentType = request.headers.get("content-type") ?? "";

  // ── Quick-add note (json) ──────────────────────────────────────────────────
  if (contentType.includes("application/json")) {
    const body = await request.json() as {
      noteText?: string; deal_type?: string; title?: string;
    };
    const noteText = body.noteText?.trim();
    if (!noteText) return NextResponse.json({ error: "noteText required" }, { status: 400 });
    const result = await ingestDocument({
      uploaded_by: user.id,
      doc_kind: "founder_annotation",
      deal_type: DEAL_TYPES.includes(body.deal_type ?? "") ? body.deal_type! : "other",
      title: body.title?.trim() || null,
      founder_note: null,
      noteText,
    });
    return NextResponse.json(result, { status: result.status === "failed" ? 500 : 201 });
  }

  // ── File upload (multipart) ────────────────────────────────────────────────
  let form: FormData;
  try { form = await request.formData(); }
  catch { return NextResponse.json({ error: "Invalid form data" }, { status: 400 }); }

  const file = form.get("file") as File | null;
  if (!file) return NextResponse.json({ error: "No file provided" }, { status: 400 });
  if (file.size > MAX_BYTES) return NextResponse.json({ error: "File exceeds 15 MB limit" }, { status: 400 });

  const doc_kind = String(form.get("doc_kind") ?? "contract");
  const deal_type = String(form.get("deal_type") ?? "other");
  if (!DOC_KINDS.includes(doc_kind)) return NextResponse.json({ error: "invalid doc_kind" }, { status: 400 });
  if (!DEAL_TYPES.includes(deal_type)) return NextResponse.json({ error: "invalid deal_type" }, { status: 400 });

  const buffer = Buffer.from(await file.arrayBuffer());
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(-80);
  const storageKey = `${randomUUID()}/${safeName}`;

  const result = await ingestDocument({
    uploaded_by: user.id,
    doc_kind,
    deal_type,
    title: (form.get("title") as string | null)?.trim() || file.name,
    source_note: (form.get("source_note") as string | null)?.trim() || null,
    founder_note: (form.get("founder_note") as string | null)?.trim() || null,
    file: { buffer, fileName: file.name, mimeType: file.type || "application/pdf", storageKey },
  });

  return NextResponse.json(result, { status: result.status === "failed" ? 422 : 201 });
}
