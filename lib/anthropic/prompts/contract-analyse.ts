// Sonnet prompt — deep risk analysis on extracted clause list.
// Input: compact clause JSON from Haiku pass, NOT raw contract text.
// Output enforced via forced tool use + ContractAnalysisSchema (lib/anthropic/structured.ts).

import { z } from "zod";
import { JURISDICTION_MAP, type JurisdictionCode } from "@/lib/utils/jurisdictions";

const severityEnum = z.enum(["low", "medium", "high", "critical"]);
const riskEnum = z.enum(["low", "medium", "high"]);

export const ContractAnalysisSchema = z.object({
  risk_score: z.number().min(0).max(100),
  verdict: z.enum(["safe", "caution", "high_risk", "lawyer_required"]),
  summary: z.string().describe("One calm plain-English sentence summarising the read"),
  risky_clauses: z
    .array(
      z.object({
        clause_text: z.string().max(400),
        issue: z.string(),
        why_it_matters: z.string().describe("Commercial impact — money, time or rights. Never statutes."),
        severity: severityEnum,
        negotiation_value: riskEnum.describe("How much negotiating this is worth"),
        question_to_ask: z.string().describe("A polite, ready-to-send question for the counterparty"),
        suggestion: z.string().describe("Ready-to-copy negotiation wording"),
        safer_wording: z.string().describe("A rewritten version of the clause the user could propose"),
      })
    )
    .max(12),
  missing_clauses: z.array(z.object({ clause_type: z.string(), why_needed: z.string() })).max(8),
  red_flags: z.array(z.object({ flag: z.string(), explanation: z.string() })).max(8),
  standard_terms: z
    .array(z.string())
    .max(30)
    .describe("Short labels of terms that look like normal market practice"),
  payment_risk: riskEnum,
  ip_risk: riskEnum,
  termination_risk: riskEnum,
  lawyer_escalation_required: z.boolean(),
  lawyer_escalation_reasons: z.array(z.string()).max(6),
});

export type ContractAnalysis = z.infer<typeof ContractAnalysisSchema>;

export const CONTRACT_ANALYSE_SYSTEM = `You are an experienced commercial deal assistant for influencer marketing agreements.
You review contracts for creators, talent agencies, and brands. You are calm, practical and commercial — never alarmist.

KNOWN RISK PATTERNS TO FLAG:
- Uncapped indemnity: creator bears unlimited financial liability
- Perpetual IP assignment: brand owns content forever with no reversion
- One-sided termination: brand can exit with no notice, creator cannot
- Payment after brand satisfaction: payment gated on subjective approval
- Moral clause abuse: overly broad conduct clauses that trap creators
- Broad exclusivity: category restrictions beyond the campaign window
- Missing dispute clause: no arbitration or jurisdiction specified
- No payment timeline: fee without a payment schedule or milestone

SCORING GUIDE:
0-34   = Safe. Standard terms, well-balanced.
35-69  = Worth negotiating. One or more clauses need attention first.
70-100 = Hold. Material issues; may need professional review.

LANGUAGE RULES (strict):
- Plain English. Explain impact in money, time or rights — not statutes or section numbers.
- Never write "legally exposed", "dangerous", or "we cannot advise".
- Prefer framing like "This gives the brand broader rights than usual",
  "Common term, but the duration is longer than market norm",
  "You can accept this if the fee justifies it",
  "Consider asking whether this can be limited to the campaign period."
- Every flagged issue must end in an action the user can take.
- Also list what is NORMAL: put short labels for market-standard terms in standard_terms.

Report your analysis by calling the report_analysis tool.`;

export const contractAnalyseUser = (
  clauseJson: string,
  contractTitle: string,
  jurisdiction: string = "IN",
  corpus_context: string = ""
) => {
  const j = JURISDICTION_MAP[jurisdiction as JurisdictionCode];
  const jurisdictionName = j ? j.name : jurisdiction;

  const legalContext = corpus_context
    ? `Relevant legal context (for your reasoning only — do not cite statutes to the user):\n${corpus_context}`
    : jurisdiction === "IN"
    ? `Relevant legal context (for your reasoning only — do not cite statutes to the user):\nIndian law applies. ASCI Code governs influencer advertising disclosures.`
    : `Apply general contract-law principles for ${jurisdictionName}.`;

  return `Contract: "${contractTitle}"
Jurisdiction: ${jurisdictionName}
${legalContext}

Extracted clauses:
${clauseJson}

Analyse these clauses. Order risky_clauses by how much they matter commercially (most important first).`;
};
