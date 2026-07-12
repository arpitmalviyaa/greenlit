// Grounded statutory compliance check. Server-only (service role).
//
// Runs ON TOP of counsel.analyse / counsel.redflags as an always-on extra pass
// (behind FLAGS.complianceCheck until the authority corpus is populated).
//
// Grounding contract — the invariant this module exists to enforce:
//   every finding MUST cite at least one retrieved authority chunk. Findings
//   whose citations don't resolve to the retrieved set are DROPPED, and when
//   nothing relevant is retrieved we return "no_authority_matched" instead of
//   letting a model invent law.

import { randomUUID } from "crypto";
import { z } from "zod";
import { createServiceClient } from "@/lib/supabase/server";
import { callStructured, AIOutputError } from "@/lib/anthropic/structured";
import { MODELS } from "@/lib/anthropic/utils";
import { FLAGS } from "@/lib/flags";
import { search, logRefs, type CorpusHit } from "./retrieve";
import { AUTHORITY_KINDS } from "./authority";
import { type Vertical } from "./vertical";

export interface ComplianceCitation {
  chunk_id: string;
  citation: string | null;
  section_ref: string | null;
  source_url: string | null;
}

export interface ComplianceFinding {
  id: string; // pre-generated; anchors finding_feedback rows
  issue: string;
  severity: "low" | "medium" | "high" | "critical";
  statute_citation: string;
  section_ref: string | null;
  explanation: string;
  suggested_fix: string | null;
  confidence: number;
  citations: ComplianceCitation[];
}

export interface ComplianceResult {
  status: "disabled" | "no_authority_matched" | "ok" | "failed";
  findings: ComplianceFinding[];
}

// ── model schemas ─────────────────────────────────────────────────────────────

const TriageSchema = z.object({
  // Chunk indexes (into the numbered authority list) that plausibly bear on the
  // input. Empty = nothing to check in depth.
  relevant_chunks: z.array(z.number().int()).max(24),
});

const FindingsSchema = z.object({
  findings: z.array(z.object({
    issue: z.string().max(200),
    severity: z.enum(["low", "medium", "high", "critical"]),
    statute_citation: z.string().max(300),
    section_ref: z.string().max(60).nullable().optional(),
    explanation: z.string().max(1200),
    suggested_fix: z.string().max(800).nullable().optional(),
    confidence: z.number().min(0).max(1),
    cited_chunks: z.array(z.number().int()).min(1).max(8), // grounding: required
  })).max(12),
});

const TRIAGE_SYSTEM =
  "You are a fast legal-compliance triager for Indian law. Given a document and a " +
  "numbered list of legal-authority extracts, return the indexes of extracts that " +
  "plausibly bear on the document. Only pick extracts with a real connection — an " +
  "empty list is a correct answer.";

const DEPTH_SYSTEM =
  "You are an Indian-law compliance checker. Check the document ONLY against the " +
  "numbered authority extracts provided. Every finding MUST cite the extract index(es) " +
  "it is grounded in (cited_chunks) and quote the statute citation from that extract. " +
  "NEVER assert a legal requirement that is not supported by a provided extract — if " +
  "the extracts don't support a finding, don't emit it. Findings must be specific, " +
  "actionable, and terse. suggested_fix is concrete replacement/added wording or a " +
  "concrete action, not generic advice.";

function numberedBlock(hits: CorpusHit[]): string {
  return hits.map((h, i) => {
    const cite = [h.citation, h.section_ref].filter(Boolean).join(", ");
    return `[${i}]${cite ? ` (${cite})` : ""} ${h.content.slice(0, 1800)}`;
  }).join("\n\n");
}

// ── main entry ────────────────────────────────────────────────────────────────

export async function complianceCheck(opts: {
  text: string;                 // contract raw text or free-text query
  vertical: Vertical;
  feature: string;              // "counsel.analyse" | "counsel.redflags" | ...
  contractId?: string | null;
}): Promise<ComplianceResult> {
  if (!FLAGS.complianceCheck) return { status: "disabled", findings: [] };

  try {
    // 1. Retrieve: authority chunks (the law) + house clauses (how it bites).
    const [authorityHits, houseHits] = await Promise.all([
      search(opts.text.slice(0, 2000), { vertical: opts.vertical, kinds: AUTHORITY_KINDS }, 12),
      search(opts.text.slice(0, 2000), { vertical: opts.vertical }, 6),
    ]);
    if (!authorityHits.length) return { status: "no_authority_matched", findings: [] };

    // 2. Haiku triage: which authority extracts plausibly apply?
    const docSlice = opts.text.slice(0, 12_000);
    const triage = await callStructured({
      feature: "compliance.triage",
      promptVersion: "v1",
      model: MODELS.HAIKU,
      maxTokens: 500,
      system: TRIAGE_SYSTEM,
      user: `DOCUMENT:\n${docSlice}\n\nAUTHORITY EXTRACTS:\n${numberedBlock(authorityHits)}`,
      schema: TriageSchema,
      toolName: "triage_authorities",
    });
    const relevant = triage.relevant_chunks.filter((i) => i >= 0 && i < authorityHits.length);
    if (!relevant.length) return { status: "ok", findings: [] };
    const scoped = relevant.map((i) => authorityHits[i]);

    // 3. Sonnet depth: grounded findings against the triaged authorities.
    const houseBlock = houseHits.length
      ? `\n\nHOUSE PRECEDENT (context only — findings must cite AUTHORITY extracts, not these):\n${houseHits.map((h) => `- ${h.content.slice(0, 500)}`).join("\n")}`
      : "";
    const depth = await callStructured({
      feature: "compliance.check",
      promptVersion: "v1",
      model: MODELS.SONNET,
      maxTokens: 4000,
      system: DEPTH_SYSTEM,
      user: `DOCUMENT:\n${docSlice}\n\nAUTHORITY EXTRACTS:\n${numberedBlock(scoped)}${houseBlock}`,
      schema: FindingsSchema,
      toolName: "report_compliance_findings",
    });

    // 4. Enforce the grounding contract: resolve cited indexes → chunk rows;
    //    findings with zero valid citations are dropped.
    const findings: ComplianceFinding[] = [];
    for (const f of depth.findings) {
      const cited = f.cited_chunks
        .filter((i) => i >= 0 && i < scoped.length)
        .map((i) => scoped[i]);
      if (!cited.length) continue; // un-grounded → dropped
      findings.push({
        id: randomUUID(),
        issue: f.issue,
        severity: f.severity,
        statute_citation: f.statute_citation,
        section_ref: f.section_ref ?? cited[0].section_ref,
        explanation: f.explanation,
        suggested_fix: f.suggested_fix ?? null,
        confidence: f.confidence,
        citations: cited.map((c) => ({
          chunk_id: c.id,
          citation: c.citation,
          section_ref: c.section_ref,
          source_url: c.source_url,
        })),
      });
    }

    // 5. Persist + provenance. Best-effort: a logging failure never breaks the check.
    if (findings.length) {
      void persistFindings(opts, findings);
      void logRefs(`compliance:${opts.feature}`, opts.contractId ?? null, scoped, opts.text.slice(0, 500));
    }
    return { status: "ok", findings };
  } catch (err) {
    // Compliance is an additive layer — it must never break the parent analysis.
    if (!(err instanceof AIOutputError)) {
      console.error(`[compliance] check failed: ${err instanceof Error ? err.message : err}`);
    }
    return { status: "failed", findings: [] };
  }
}

async function persistFindings(
  opts: { vertical: Vertical; feature: string; contractId?: string | null; text: string },
  findings: ComplianceFinding[]
): Promise<void> {
  try {
    const supabase = await createServiceClient();
    await supabase.from("compliance_findings").insert(findings.map((f) => ({
      id: f.id,
      contract_id: opts.contractId ?? null,
      feature: opts.feature,
      vertical: opts.vertical,
      issue: f.issue,
      severity: f.severity,
      statute_citation: f.statute_citation,
      section_ref: f.section_ref,
      explanation: f.explanation,
      suggested_fix: f.suggested_fix,
      confidence: f.confidence,
      chunk_ids: f.citations.map((c) => c.chunk_id),
      query: opts.contractId ? null : opts.text.slice(0, 500),
    })));
  } catch (err) {
    console.error(`[compliance] persist failed: ${err instanceof Error ? err.message : err}`);
  }
}
