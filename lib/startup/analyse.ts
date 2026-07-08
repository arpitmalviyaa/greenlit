// Startup analysis pipeline — LLM orchestration. Server-only.
// Pure logic (presence flags, cross-doc checks, memo normalization) lives in
// ./diligence and is unit-tested there.

import { MODELS } from "@/lib/anthropic/utils";
import { callStructured } from "@/lib/anthropic/structured";
import { houseKnowledge } from "@/lib/corpus/retrieve";
import {
  MemoSchema, type Memo, DocTermsSchema, type DocTerms,
  MEMO_SYSTEM, DOC_TERMS_SYSTEM, memoUser, docTermsUser,
} from "@/lib/anthropic/prompts/startup-review";
import {
  computeDiligenceFlags, crossDocChecks, normalizeMemo,
  type MatterDoc, type Inconsistency,
} from "./diligence";

export type { Inconsistency } from "./diligence";

// Extract structured terms from one document (for cross-doc checks + synthesis).
export async function extractDocTerms(subType: string, text: string): Promise<DocTerms | null> {
  try {
    return await callStructured({
      feature: "startup.doc_terms", promptVersion: "v1", model: MODELS.HAIKU, maxTokens: 1500,
      system: DOC_TERMS_SYSTEM, user: docTermsUser(subType, text),
      schema: DocTermsSchema, toolName: "extract_doc_terms",
    });
  } catch {
    return null; // extraction is best-effort; a null doc still counts for presence
  }
}

// Single-document review → memo (startup + general corpus only).
export async function reviewSingleDocument(opts: {
  subType: string; text: string;
  founderContext?: { stage?: string; round?: string; concerns?: string } | null;
}): Promise<Memo> {
  const houseContext = await houseKnowledge({
    query: opts.text.slice(0, 1500), filters: { vertical: "startup" }, feature: "startup.review",
  });
  const terms = await extractDocTerms(opts.subType, opts.text);
  const memo = await callStructured({
    feature: "startup.review", promptVersion: "v1", model: MODELS.SONNET, maxTokens: 4000,
    system: MEMO_SYSTEM,
    user: memoUser({ subType: opts.subType, founderContext: opts.founderContext, houseContext, docText: opts.text }),
    schema: MemoSchema, toolName: "report_memo",
  });
  return normalizeMemo(memo, computeDiligenceFlags([{ sub_type: opts.subType, terms }]));
}

// Data-room synthesis → one memo across N docs. Presence + consistency computed in
// code and fed as authoritative; the LLM synthesizes the narrative.
export async function reviewMatter(opts: {
  docs: { sub_type: string; title?: string | null; text: string; terms?: DocTerms | null }[];
  founderContext?: { stage?: string; round?: string; concerns?: string } | null;
}): Promise<{ memo: Memo; inconsistencies: Inconsistency[]; diligence: Memo["diligence_flags"] }> {
  const matterDocs: MatterDoc[] = opts.docs.map((d) => ({ sub_type: d.sub_type, title: d.title, terms: d.terms ?? null }));
  const diligence = computeDiligenceFlags(matterDocs);
  const inconsistencies = crossDocChecks(matterDocs);

  const query = opts.docs.map((d) => d.text.slice(0, 400)).join(" ");
  const houseContext = await houseKnowledge({ query, filters: { vertical: "startup" }, feature: "startup.dataroom" });

  const perDocSummary = opts.docs.map((d, i) =>
    `[${i + 1}] ${d.title || d.sub_type} (${d.sub_type})\n` +
    (d.terms ? `terms: ${JSON.stringify(d.terms)}` : "terms: (extraction unavailable)")
  ).join("\n\n");
  const presenceLine = diligence.map((f) => `- ${f.item}: ${f.status} — ${f.note}`).join("\n");
  const consistencyLine = inconsistencies.length
    ? inconsistencies.map((c) => `- ${c.detail}`).join("\n")
    : "None detected.";

  const memo = await callStructured({
    feature: "startup.dataroom", promptVersion: "v1", model: MODELS.SONNET, maxTokens: 4500,
    system: MEMO_SYSTEM,
    user: memoUser({
      subType: "data_room", founderContext: opts.founderContext, houseContext,
      perDocSummary, presenceLine, consistencyLine,
    }),
    schema: MemoSchema, toolName: "report_memo",
  });
  return { memo: normalizeMemo(memo, diligence), inconsistencies, diligence };
}
