// Startup Document Review — prompts + schemas for the Founder Readiness Memo.
// Three founder-risk axes (control / economics / diligence), Indian market context
// (Companies Act 2013, SHA/SSA conventions, DPDPA 2023, FEMA). Tone: calm, specific,
// action-first, no fear-mongering.

import { z } from "zod";
import { DILIGENCE_ITEMS } from "@/lib/startup/diligence";

// Valid startup document sub_types (validated in app code, not the DB — deliberate).
export const STARTUP_SUB_TYPES = [
  "term_sheet", "sha", "ssa", "safe_ccps", "esop", "founder_agreement",
  "ip_assignment", "employment", "consultant", "nda", "dpdp_program",
  "incorporation", "data_room",
] as const;
export type StartupSubType = (typeof STARTUP_SUB_TYPES)[number];

// ── Founder Readiness Memo schema (the renderer consumes this shape) ──────────
export const MemoSchema = z.object({
  bottom_line: z.string(),                    // 2–3 sentences, verdict-first, plain language
  top_issues: z.array(z.object({
    clause_ref: z.string(),
    plain_english: z.string(),
    why_it_matters: z.enum(["control", "economics", "diligence"]),
    action: z.enum(["accept", "negotiate", "fix_now"]),
    suggested_wording: z.string(),
  })).max(3),
  diligence_flags: z.array(z.object({
    item: z.enum(DILIGENCE_ITEMS),
    status: z.enum(["green", "attention", "missing"]),
    note: z.string(),
  })),
  standard_no_action: z.string(),             // one reassuring paragraph: what is normal market
  needs_lawyer: z.array(z.object({
    item: z.string(),
    reason: z.string(),                       // one line
  })),
  next_step: z.string(),                      // exactly one action
});
export type Memo = z.infer<typeof MemoSchema>;

// ── Per-document extraction schema (feeds deterministic cross-doc checks) ─────
// The LLM extracts structured terms per doc; code compares them across the matter.
export const DocTermsSchema = z.object({
  doc_type_observed: z.string(),              // what the doc actually looks like
  parties: z.array(z.string()),               // entity + individual names as written
  company_name: z.string().nullable(),
  total_shares: z.number().nullable(),
  esop_pool_pct: z.number().nullable(),       // as % of fully-diluted cap
  esop_pool_shares: z.number().nullable(),
  liquidation_pref: z.string().nullable(),    // e.g. "1x non-participating"
  anti_dilution: z.string().nullable(),       // broad-based / narrow-based / full-ratchet
  signed_and_dated: z.boolean().nullable(),
  axis_notes: z.object({
    control: z.array(z.string()),
    economics: z.array(z.string()),
    diligence: z.array(z.string()),
  }),
});
export type DocTerms = z.infer<typeof DocTermsSchema>;

const CONTEXT_BLOCK = `Indian market context you MUST apply:
- Companies Act 2013 (board composition, reserved matters, CCPS as the standard preferred instrument).
- SHA/SSA conventions used by Indian VCs (drag/tag, ROFR/ROFO, liquidation preference, anti-dilution).
- DPDPA 2023 (consent, data-processing obligations) for diligence gaps.
- FEMA / RBI pricing rules where a foreign investor or CCPS pricing is involved.
Tone rules: calm, specific, action-first. No fear-mongering. Reassure on what is standard market.
Verdict-first: the founder should know in the first sentence whether this is broadly fine or needs work.`;

export const MEMO_SYSTEM =
  "You are a senior Indian startup lawyer preparing a Founder Readiness Memo. You analyse " +
  "investment and corporate documents along three axes — CONTROL (board rights, reserved matters/" +
  "vetoes, drag/tag, founder vesting & leaver clauses, transfer restrictions, information rights), " +
  "ECONOMICS (liquidation preference participation/multiple, anti-dilution type, ESOP pool pre/post-" +
  "money, dividends, exit waterfall), and DILIGENCE RISK (IP assignment gaps, DPDPA/consent gaps, " +
  "unsigned/undated execution, missing founder agreements, cap-table inconsistencies, FEMA flags, " +
  "CCPS pricing). Return at most three top issues — only what genuinely matters. " + CONTEXT_BLOCK;

export const DOC_TERMS_SYSTEM =
  "You extract structured facts from a single Indian startup/corporate document for cross-document " +
  "consistency checking. Report only what the document states; use null when a field is absent. " +
  "Also jot short per-axis notes (control/economics/diligence) a lawyer would care about.";

export function docTermsUser(subType: string, text: string): string {
  return `Document sub_type (as filed): ${subType}\n\nDocument text:\n${text.slice(0, 16000)}`;
}

export function memoUser(opts: {
  subType: string;
  founderContext?: { stage?: string; round?: string; concerns?: string } | null;
  houseContext?: string;
  docText?: string;              // single-doc review
  perDocSummary?: string;        // data-room synthesis: extracted terms + findings across docs
  presenceLine?: string;         // data-room: which diligence docs are present/absent (authoritative)
  consistencyLine?: string;      // data-room: code-detected cross-doc inconsistencies (authoritative)
}): string {
  const parts: string[] = [];
  parts.push(`Primary sub_type: ${opts.subType}`);
  if (opts.founderContext) {
    const fc = opts.founderContext;
    parts.push(`Founder context — stage: ${fc.stage ?? "?"}; round: ${fc.round ?? "?"}; worried about: ${fc.concerns ?? "nothing specified"}.`);
  }
  if (opts.presenceLine) parts.push(`AUTHORITATIVE document presence (use this for diligence_flags, do not infer from a single doc):\n${opts.presenceLine}`);
  if (opts.consistencyLine) parts.push(`AUTHORITATIVE cross-document findings (already verified in code — fold material ones into top_issues/needs_lawyer):\n${opts.consistencyLine}`);
  if (opts.houseContext) parts.push(opts.houseContext);
  if (opts.docText) parts.push(`Document to review:\n${opts.docText.slice(0, 20000)}`);
  if (opts.perDocSummary) parts.push(`Per-document analysis across the data room:\n${opts.perDocSummary.slice(0, 20000)}`);
  parts.push(
    "Produce the Founder Readiness Memo. bottom_line is 2–3 sentences, verdict-first. " +
    "top_issues: at most 3, each with clause_ref, plain_english, why_it_matters, action, suggested_wording. " +
    "standard_no_action reassures on what is normal market. needs_lawyer lists only genuinely material items " +
    "with a one-line reason. next_step is exactly one action. For diligence_flags, report each checklist item you " +
    "can judge; presence/absence flags will be reconciled against the authoritative list."
  );
  return parts.join("\n\n");
}
