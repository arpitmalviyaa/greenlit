import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { requireAdmin } from "@/lib/corpus/admin";
import { createServiceClient } from "@/lib/supabase/server";
import { ingestDocument } from "@/lib/corpus/pipeline";
import { isVertical } from "@/lib/corpus/vertical";
import { htmlToText, htmlTitle } from "@/lib/utils/html-to-text";
import { internalError } from "@/lib/api/errors";

const NOT_FOUND = NextResponse.json({ error: "Not found" }, { status: 404 });
const MAX_BYTES = 15 * 1024 * 1024; // 15 MB
const DOC_KINDS = [
  "contract", "dispute", "judgment", "negotiation", "clause_note", "founder_annotation",
  // legal-authority kinds (Stage 1)
  "act", "statute", "rule", "regulation", "notification", "circular", "case_law", "guideline",
];
const DEAL_TYPES = ["paid_promotion", "barter", "ugc_license", "ambassadorship", "representation", "platform", "other"];

// List documents (library view). Optional ?vertical= filter.
export async function GET(request: Request) {
  if (!await requireAdmin()) return NOT_FOUND;
  const service = await createServiceClient();
  let q = service
    .from("corpus_documents")
    .select("id, doc_kind, deal_type, vertical, sanitized, title, status, created_at, corpus_chunks(count)")
    .order("created_at", { ascending: false })
    .limit(500);
  const vertical = new URL(request.url).searchParams.get("vertical");
  if (isVertical(vertical)) q = q.eq("vertical", vertical);
  const { data, error } = await q;
  if (error) return internalError("app/api/admin/corpus/route.ts", { message: error.message });
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

  // ── Quick-add note / link (json) ────────────────────────────────────────────
  if (contentType.includes("application/json")) {
    const body = await request.json() as {
      noteText?: string; url?: string; doc_kind?: string;
      deal_type?: string; vertical?: string; title?: string;
    };
    const vertical = isVertical(body.vertical) ? body.vertical : "creator";

    // Blog / article link: fetch, strip to text, run the normal chunk+classify pipeline.
    const url = body.url?.trim();
    if (url) {
      let parsed: URL;
      try { parsed = new URL(url); } catch { return NextResponse.json({ error: "invalid url" }, { status: 400 }); }
      if (!/^https?:$/.test(parsed.protocol)) return NextResponse.json({ error: "url must be http(s)" }, { status: 400 });
      let html: string;
      try {
        const res = await fetch(parsed, { redirect: "follow", signal: AbortSignal.timeout(20_000) });
        if (!res.ok) return NextResponse.json({ error: `fetch failed: ${res.status}` }, { status: 422 });
        html = (await res.text()).slice(0, 2_000_000); // ponytail: cap at 2MB of HTML
      } catch {
        return NextResponse.json({ error: "Could not fetch URL" }, { status: 422 });
      }
      const text = htmlToText(html);
      if (text.length < 40) return NextResponse.json({ error: "no readable text at url" }, { status: 422 });
      const doc_kind = DOC_KINDS.includes(body.doc_kind ?? "") ? body.doc_kind! : "clause_note";
      const result = await ingestDocument({
        uploaded_by: user.id,
        doc_kind,
        deal_type: DEAL_TYPES.includes(body.deal_type ?? "") ? body.deal_type! : "other",
        vertical,
        title: body.title?.trim() || htmlTitle(html) || parsed.hostname,
        source_note: url,
        file: {
          buffer: Buffer.from(text, "utf8"),
          fileName: "link.txt",
          mimeType: "text/plain",
          storageKey: `${randomUUID()}/link.txt`,
        },
      });
      return NextResponse.json(result, { status: result.status === "failed" ? 422 : 201 });
    }

    const noteText = body.noteText?.trim();
    if (!noteText) return NextResponse.json({ error: "noteText or url required" }, { status: 400 });
    const result = await ingestDocument({
      uploaded_by: user.id,
      doc_kind: "founder_annotation",
      deal_type: DEAL_TYPES.includes(body.deal_type ?? "") ? body.deal_type! : "other",
      vertical,
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
  const verticalRaw = String(form.get("vertical") ?? "creator");
  if (!DOC_KINDS.includes(doc_kind)) return NextResponse.json({ error: "invalid doc_kind" }, { status: 400 });
  if (!DEAL_TYPES.includes(deal_type)) return NextResponse.json({ error: "invalid deal_type" }, { status: 400 });
  if (!isVertical(verticalRaw)) return NextResponse.json({ error: "invalid vertical" }, { status: 400 });

  const buffer = Buffer.from(await file.arrayBuffer());
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(-80);
  const storageKey = `${randomUUID()}/${safeName}`;

  const str = (k: string) => (form.get(k) as string | null)?.trim() || null;
  const effectiveDate = str("effective_date");
  const result = await ingestDocument({
    uploaded_by: user.id,
    doc_kind,
    deal_type,
    vertical: verticalRaw,
    title: str("title") || file.name,
    source_note: str("source_note"),
    founder_note: str("founder_note"),
    file: { buffer, fileName: file.name, mimeType: file.type || "application/pdf", storageKey },
    authority: {
      citation: str("citation"),
      jurisdiction: str("jurisdiction"),
      issuing_body: str("issuing_body"),
      effective_date: effectiveDate && /^\d{4}-\d{2}-\d{2}$/.test(effectiveDate) ? effectiveDate : null,
      source_url: str("source_url"),
    },
  });

  return NextResponse.json(result, { status: result.status === "failed" ? 422 : 201 });
}
