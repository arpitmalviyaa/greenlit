// Corpus ingest pipeline. Server-only (service role).
//
// One document → extract text → clause-aware chunk → one structured AI classify
// call per batch → save chunks. Runs synchronously inside its caller (admin
// upload route or seed script); the founder uploads a handful at a time, so a
// per-file wait beats building a job queue tonight.
// ponytail: synchronous per-document; add a background job table if bulk 50+
// uploads in one request ever become the norm.

import { z } from "zod";
import { createServiceClient } from "@/lib/supabase/server";
import { extractTextFromBuffer } from "@/lib/utils/extract-text";
import { callStructured, AIOutputError } from "@/lib/anthropic/structured";
import { MODELS } from "@/lib/anthropic/utils";
import { chunkText, chunkSections } from "./chunk";
import { isAuthorityKind, defaultAuthorityWeight } from "./authority";
import { embedTexts } from "./embed";

const CLAUSE_TYPES = [
  "usage_rights", "exclusivity", "payment_terms", "indemnity", "termination",
  "morality", "ip_assignment", "confidentiality", "deliverables", "other",
] as const;

const STANCES = [
  "market_standard", "creator_favorable", "brand_aggressive",
  "dispute_source", "founder_approved",
] as const;

const ClassifySchema = z.object({
  chunks: z.array(z.object({
    index: z.number().int(),
    clause_type: z.enum(CLAUSE_TYPES),
    stance: z.enum(STANCES),
    confidence: z.number().min(0).max(1),
    risk_note: z.string().max(400).nullable().optional(),
  })),
});
type Classification = z.infer<typeof ClassifySchema>["chunks"][number];

const CLASSIFY_SYSTEM =
  "You are a contract-clause classifier for a creator-economy legal knowledge base. " +
  "For each numbered chunk, identify the clause_type, judge whose interest the wording " +
  "favours (stance), give a 0-1 confidence, and add a short risk_note only when the clause " +
  "is unusual, aggressive, or dispute-worthy. Be terse and precise.";

const CONFIDENCE_FLOOR = 0.6;
const CLASSIFY_BATCH = 20;

async function classifyBatch(chunks: string[], offset: number): Promise<Classification[]> {
  const user =
    "Classify these contract chunks. Return one entry per chunk by index.\n\n" +
    chunks.map((c, i) => `[chunk ${offset + i}]\n${c.slice(0, 2500)}`).join("\n\n");
  try {
    const res = await callStructured({
      feature: "corpus.classify",
      promptVersion: "v1",
      model: MODELS.HAIKU,
      maxTokens: 2000,
      system: CLASSIFY_SYSTEM,
      user,
      schema: ClassifySchema,
      toolName: "classify_chunks",
    });
    return res.chunks;
  } catch (err) {
    // Classification failure is non-fatal: chunks get saved as needs_review with
    // safe defaults so the founder can fix them in the panel.
    if (!(err instanceof AIOutputError)) throw err;
    return [];
  }
}

// Classify chunks in batches → index→classification map. Pure (no DB); exported
// for the ingest/reprocess paths and for direct verification harnesses.
export async function classifyChunks(chunks: string[]): Promise<Map<number, Classification>> {
  const byIndex = new Map<number, Classification>();
  for (let off = 0; off < chunks.length; off += CLASSIFY_BATCH) {
    const results = await classifyBatch(chunks.slice(off, off + CLASSIFY_BATCH), off);
    for (const r of results) byIndex.set(r.index, r);
  }
  return byIndex;
}

// Classify a document's chunks and insert them; returns the rolled-up status.
// Shared by first ingest and reprocess.
async function classifyAndSave(
  supabase: Awaited<ReturnType<typeof createServiceClient>>,
  documentId: string,
  chunks: string[],
  vertical: string
): Promise<{ status: "ready" | "needs_review"; count: number }> {
  const [byIndex, embeddings] = await Promise.all([
    classifyChunks(chunks),
    embedTexts(chunks), // null when OPENAI_API_KEY absent — tsv-only, never fails ingest
  ]);
  let anyReview = false;
  const rows = chunks.map((content, i) => {
    const c = byIndex.get(i);
    const low = !c || c.confidence < CONFIDENCE_FLOOR;
    if (low) anyReview = true;
    return {
      document_id: documentId, chunk_index: i, content, vertical,
      clause_type: c?.clause_type ?? null, risk_note: c?.risk_note ?? null,
      stance: c?.stance ?? "market_standard", status: low ? "needs_review" : "ready",
      embedding: embeddings?.[i] ?? null,
    };
  });
  await supabase.from("corpus_chunks").insert(rows);
  return { status: anyReview ? "needs_review" : "ready", count: rows.length };
}

// Save an authority document's chunks: section-aware, no AI classification
// (statutes have no stance), citation + section_ref on every chunk.
async function saveAuthorityChunks(
  supabase: Awaited<ReturnType<typeof createServiceClient>>,
  documentId: string,
  text: string,
  vertical: string,
  citation: string | null
): Promise<{ status: "ready" | "needs_review"; count: number }> {
  const sections = chunkSections(text);
  if (!sections.length) throw new Error("chunking produced no content");
  const embeddings = await embedTexts(sections.map((s) => s.content));
  const rows = sections.map((s, i) => ({
    document_id: documentId, chunk_index: i, content: s.content, vertical,
    clause_type: null, risk_note: null, stance: "market_standard", status: "ready",
    citation, section_ref: s.section_ref,
    embedding: embeddings?.[i] ?? null,
  }));
  await supabase.from("corpus_chunks").insert(rows);
  return { status: "ready", count: rows.length };
}

export interface IngestInput {
  uploaded_by: string | null;
  doc_kind: string;
  deal_type: string;
  vertical?: string;   // defaults to 'creator' — safe: no caller can leak another vertical's corpus
  title?: string | null;
  source_note?: string | null;
  founder_note?: string | null;
  // File-backed document:
  file?: { buffer: Buffer; fileName: string; mimeType: string; storageKey: string };
  // Note-only document (quick-add founder annotation):
  noteText?: string;
  // Legal-authority metadata (acts/statutes/rules/…): see lib/corpus/authority.ts
  authority?: {
    citation?: string | null;      // "Consumer Protection Act, 2019"
    section_ref?: string | null;   // when the doc IS one provision
    jurisdiction?: string | null;  // default 'IN' (DB default)
    issuing_body?: string | null;
    effective_date?: string | null; // ISO date
    source_url?: string | null;
    authority_weight?: number | null; // defaults by kind
  };
}

export interface IngestResult {
  id: string;
  status: "ready" | "needs_review" | "failed";
  chunk_count: number;
  error?: string;
}

export async function ingestDocument(input: IngestInput): Promise<IngestResult> {
  const supabase = await createServiceClient();
  const vertical = input.vertical ?? "creator";

  // 1. Insert the document row (processing) so status is visible immediately.
  const { data: doc, error: insErr } = await supabase
    .from("corpus_documents")
    .insert({
      uploaded_by: input.uploaded_by,
      doc_kind: input.doc_kind,
      deal_type: input.deal_type,
      vertical,
      title: input.title ?? null,
      source_note: input.source_note ?? null,
      founder_note: input.founder_note ?? null,
      file_path: input.file?.storageKey ?? null,
      status: "processing",
      citation: input.authority?.citation ?? null,
      section_ref: input.authority?.section_ref ?? null,
      jurisdiction: input.authority?.jurisdiction ?? "IN",
      issuing_body: input.authority?.issuing_body ?? null,
      effective_date: input.authority?.effective_date ?? null,
      source_url: input.authority?.source_url ?? null,
      authority_weight: input.authority?.authority_weight ?? defaultAuthorityWeight(input.doc_kind),
    })
    .select("id")
    .single();

  if (insErr || !doc) {
    return { id: "", status: "failed", chunk_count: 0, error: insErr?.message ?? "insert failed" };
  }
  const documentId = doc.id as string;

  try {
    // Note-only annotation: single high-priority chunk, no extraction/AI.
    if (input.noteText && !input.file) {
      const content = input.noteText.trim();
      await supabase.from("corpus_documents")
        .update({ extracted_text: content, status: "ready" }).eq("id", documentId);
      await supabase.from("corpus_chunks").insert({
        document_id: documentId, chunk_index: 0, content, vertical,
        clause_type: null, stance: "founder_approved", status: "ready",
      });
      return { id: documentId, status: "ready", chunk_count: 1 };
    }

    // 2. Extract text.
    if (!input.file) throw new Error("no file and no note text");
    await supabase.storage.from("corpus")
      .upload(input.file.storageKey, input.file.buffer, {
        contentType: input.file.mimeType, upsert: true,
      });

    const { text, error: exErr } = await extractTextFromBuffer(
      input.file.buffer, input.file.mimeType, input.file.fileName
    );
    if (exErr || !text) throw new Error(exErr ?? "no extractable text");

    // 3-5. Chunk + classify + save. Authority docs chunk by section and skip
    // AI stance-classification (a statute has no "stance"); each chunk carries
    // the doc citation + its own section_ref so retrieval cites the provision.
    const { status, count } = isAuthorityKind(input.doc_kind)
      ? await saveAuthorityChunks(supabase, documentId, text, vertical, input.authority?.citation ?? null)
      : await (async () => {
          const chunks = chunkText(text);
          if (!chunks.length) throw new Error("chunking produced no content");
          return classifyAndSave(supabase, documentId, chunks, vertical);
        })();
    await supabase.from("corpus_documents")
      .update({ extracted_text: text.slice(0, 200_000), status }).eq("id", documentId);

    return { id: documentId, status, chunk_count: count };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "processing failed";
    await supabase.from("corpus_documents").update({ status: "failed" }).eq("id", documentId);
    return { id: documentId, status: "failed", chunk_count: 0, error: msg };
  }
}

// Reprocess: wipe existing chunks and re-run extraction+classify from stored file.
export async function reprocessDocument(documentId: string): Promise<IngestResult> {
  const supabase = await createServiceClient();
  const { data: doc } = await supabase.from("corpus_documents")
    .select("uploaded_by, doc_kind, deal_type, vertical, title, source_note, founder_note, file_path, extracted_text, citation")
    .eq("id", documentId).single();
  if (!doc) return { id: documentId, status: "failed", chunk_count: 0, error: "not found" };

  await supabase.from("corpus_chunks").delete().eq("document_id", documentId);
  await supabase.from("corpus_documents").update({ status: "processing" }).eq("id", documentId);

  // Re-chunk from the file if present, else from stored extracted_text (note docs).
  let text = doc.extracted_text as string | null;
  if (doc.file_path) {
    const { data: blob } = await supabase.storage.from("corpus").download(doc.file_path);
    if (blob) {
      const buffer = Buffer.from(await blob.arrayBuffer());
      const ex = await extractTextFromBuffer(buffer, blob.type || "application/pdf", doc.file_path);
      if (ex.text) text = ex.text;
    }
  }
  if (!text) {
    await supabase.from("corpus_documents").update({ status: "failed" }).eq("id", documentId);
    return { id: documentId, status: "failed", chunk_count: 0, error: "no text to reprocess" };
  }

  const rpVertical = (doc.vertical as string | null) ?? "creator";
  let status: "ready" | "needs_review", count: number;
  if (isAuthorityKind(doc.doc_kind as string)) {
    ({ status, count } = await saveAuthorityChunks(
      supabase, documentId, text, rpVertical, (doc.citation as string | null) ?? null
    ));
  } else {
    const chunks = chunkText(text);
    if (!chunks.length) {
      await supabase.from("corpus_documents").update({ status: "failed" }).eq("id", documentId);
      return { id: documentId, status: "failed", chunk_count: 0, error: "chunking produced no content" };
    }
    ({ status, count } = await classifyAndSave(supabase, documentId, chunks, rpVertical));
  }
  await supabase.from("corpus_documents").update({ status }).eq("id", documentId);
  return { id: documentId, status, chunk_count: count };
}
