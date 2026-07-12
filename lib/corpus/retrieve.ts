// House-knowledge retrieval. Server-only (service role).
//
// Provider-abstracted: `search()` is the single interface the analysis
// pipelines call. Tonight it is Postgres full-text search + metadata filters.
// Week-1 can swap the body for pgvector semantic search WITHOUT touching callers
// or the schema (the embedding column already exists).

import { createServiceClient } from "@/lib/supabase/server";
import { type Vertical, verticalScope } from "./vertical";

export type CorpusStance =
  | "market_standard"
  | "creator_favorable"
  | "brand_aggressive"
  | "dispute_source"
  | "founder_approved";

export interface CorpusHit {
  id: string;
  document_id: string;
  content: string;
  clause_type: string | null;
  risk_note: string | null;
  stance: CorpusStance;
  deal_type: string;
  doc_kind: string;
  citation: string | null;      // "Consumer Protection Act, 2019"
  section_ref: string | null;   // "s.2(28)"
  source_url: string | null;    // official source (doc-level)
  authority_weight: number;     // 1.0 acts … 0.5 house knowledge
}

export interface CorpusFilters {
  deal_type?: string;
  clause_type?: string;
  // Restrict to specific doc kinds (e.g. AUTHORITY_KINDS for statutory retrieval).
  kinds?: readonly string[];
  // Which vertical is analysing. Omitted → 'creator' (safe default: an
  // un-threaded caller can never leak startup/litigation chunks).
  vertical?: Vertical;
}

// Build a websearch tsquery from free-text query + keyword list. websearch_to_tsquery
// treats spaces as AND and understands the OR keyword — we OR the terms so any
// clause keyword can match, which is the right recall behaviour for retrieval.
function toWebsearch(query: string): string {
  const terms = query
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((t) => t.length > 2)
    .slice(0, 20);
  // de-dup, join with OR
  return Array.from(new Set(terms)).join(" OR ");
}

export async function search(
  query: string,
  filters: CorpusFilters = {},
  limit = 8
): Promise<CorpusHit[]> {
  const websearch = toWebsearch(query);
  if (!websearch) return [];

  try {
    const supabase = await createServiceClient();

    // !inner join so a deal_type filter on the parent document actually restricts
    // rows (and so we can read deal_type/doc_kind back for the prompt block).
    let q = supabase
      .from("corpus_chunks")
      .select(
        "id, document_id, content, clause_type, risk_note, stance, citation, section_ref, corpus_documents!inner(deal_type, doc_kind, status, source_url, authority_weight, superseded_by)"
      )
      .eq("status", "ready")
      .eq("corpus_documents.status", "ready")
      .eq("corpus_documents.sanitized", true)   // D: unsanitized docs never retrieved
      .is("corpus_documents.superseded_by", null) // superseded authorities never retrieved
      .in("vertical", verticalScope(filters.vertical ?? "creator"))
      .textSearch("tsv", websearch, { type: "websearch" });

    if (filters.deal_type) q = q.eq("corpus_documents.deal_type", filters.deal_type);
    if (filters.clause_type) q = q.eq("clause_type", filters.clause_type);
    if (filters.kinds?.length) q = q.in("corpus_documents.doc_kind", [...filters.kinds]);

    const { data, error } = await q.limit(limit);
    if (error || !data) return [];

    const hits = (data as unknown as Array<{
      id: string;
      document_id: string;
      content: string;
      clause_type: string | null;
      risk_note: string | null;
      stance: CorpusStance;
      citation: string | null;
      section_ref: string | null;
      corpus_documents: { deal_type: string; doc_kind: string; source_url: string | null; authority_weight: number | null };
    }>).map((r) => ({
      id: r.id,
      document_id: r.document_id,
      content: r.content,
      clause_type: r.clause_type,
      risk_note: r.risk_note,
      stance: r.stance,
      deal_type: r.corpus_documents.deal_type,
      doc_kind: r.corpus_documents.doc_kind,
      citation: r.citation,
      section_ref: r.section_ref,
      source_url: r.corpus_documents.source_url,
      authority_weight: Number(r.corpus_documents.authority_weight ?? 0.5),
    }));

    // Feedback nudge: reviewer accept/reject on findings that cited a chunk
    // shifts its rank by ±0.1 max (never dominates authority weight). One extra
    // query, best-effort — a miss changes nothing.
    const feedback = new Map<string, number>();
    try {
      const { data: fb } = await supabase
        .from("chunk_feedback_scores")
        .select("chunk_id, score")
        .in("chunk_id", hits.map((h) => h.id));
      for (const r of (fb ?? []) as { chunk_id: string; score: number }[]) {
        feedback.set(r.chunk_id, Number(r.score) * 0.1);
      }
    } catch { /* view empty/missing → no nudge */ }

    // Rank: feedback-adjusted authority weight first (acts outrank house
    // knowledge), then stance (founder-approved and dispute-source carry the
    // most signal) — the top entries survive the token-cap truncation in
    // formatForPrompt.
    const weight: Record<CorpusStance, number> = {
      founder_approved: 0,
      dispute_source: 1,
      creator_favorable: 2,
      brand_aggressive: 2,
      market_standard: 3,
    };
    const eff = (h: CorpusHit) => h.authority_weight + (feedback.get(h.id) ?? 0);
    hits.sort((a, b) => (eff(b) - eff(a)) || (weight[a.stance] - weight[b.stance]));
    return hits;
  } catch {
    // Empty corpus / query failure = pipeline behaves exactly as before. No throw.
    return [];
  }
}

// Delimited context block for the AI prompt. Capped by character budget
// (~2.5k tokens ≈ 10k chars), truncating by rank (lowest-signal drops first).
export function formatForPrompt(hits: CorpusHit[], maxChars = 10_000): string {
  if (!hits.length) return "";

  const blocks: string[] = [];
  let used = 0;
  for (const h of hits) {
    const parts = [
      `- [${h.stance}${h.clause_type ? `/${h.clause_type}` : ""}] ${h.content.trim()}`,
    ];
    if (h.risk_note) parts.push(`  note: ${h.risk_note.trim()}`);
    const block = parts.join("\n");
    if (used + block.length > maxChars) break;
    blocks.push(block);
    used += block.length;
  }
  if (!blocks.length) return "";

  return [
    "<house_knowledge>",
    "Precedent clauses, dispute outcomes, and reviewer notes from Greenlit's own corpus.",
    "Weigh founder_approved and dispute_source entries heavily. Do NOT quote this block",
    "to the user verbatim — use it to sharpen verdicts, market-norm judgments, and suggested wording.",
    "",
    blocks.join("\n"),
    "</house_knowledge>",
  ].join("\n");
}

// One-call convenience for the analysis pipelines: retrieve, log which chunks
// fired, and return the ready-to-inject prompt block ("" when the corpus is
// empty or unmatched — callers concatenate it and behave exactly as before).
export async function houseKnowledge(opts: {
  query: string;
  filters?: CorpusFilters;
  limit?: number;
  feature: string;
  contractId?: string | null;
}): Promise<string> {
  const hits = await search(opts.query, opts.filters ?? {}, opts.limit ?? 8);
  if (hits.length) void logRefs(opts.feature, opts.contractId ?? null, hits, opts.query);
  return formatForPrompt(hits);
}

// Fire-and-forget logging of which chunks fired for an analysis. Never throws —
// a logging failure must never break an analysis.
export async function logRefs(
  feature: string,
  contractId: string | null,
  hits: CorpusHit[],
  query: string
): Promise<void> {
  if (!hits.length) return;
  try {
    const supabase = await createServiceClient();
    await supabase.from("analysis_corpus_refs").insert({
      feature,
      contract_id: contractId,
      chunk_ids: hits.map((h) => h.id),
      query: query.slice(0, 500),
    });
  } catch {
    /* ignore */
  }
}
