// Sonnet prompt — deep risk analysis on extracted clause list.
// Input: compact clause JSON from Haiku pass, NOT raw contract text.
// Max tokens: 2500

import { JURISDICTION_MAP, type JurisdictionCode } from "@/lib/utils/jurisdictions";

export const CONTRACT_ANALYSE_SYSTEM = `You are a senior entertainment and digital media lawyer specialising in influencer marketing agreements.
You review contracts for creators, talent agencies, and brands.

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
0-29   = Safe. Standard terms, well-balanced.
30-59  = Caution. One or more clauses need negotiation.
60-79  = High Risk. Multiple red flags. Negotiate before signing.
80-100 = Lawyer Required. Do not sign without legal counsel.

Return ONLY valid JSON — no prose, no markdown fences.`;

export const contractAnalyseUser = (
  clauseJson: string,
  contractTitle: string,
  jurisdiction: string = 'IN',
  corpus_context: string = ''
) => {
  const j = JURISDICTION_MAP[jurisdiction as JurisdictionCode];
  const jurisdictionName = j ? j.name : jurisdiction;

  // Indian law detail as fallback when no corpus context and jurisdiction is IN
  const legalContext = corpus_context
    ? `Relevant legal context:\n${corpus_context}`
    : jurisdiction === 'IN'
    ? `Relevant legal context:\nIndian law applies. Key statutes: Indian Contract Act 1872, IT Act 2000, Consumer Protection Act 2019, SEBI guidelines. ASCI Code governs influencer advertising disclosures.`
    : `No specific legal corpus available. Apply general contract law principles for ${jurisdictionName}.`;

  return `Contract: "${contractTitle}"
Jurisdiction: ${jurisdictionName}
${legalContext}

Extracted clauses:
${clauseJson}

Analyse these clauses and return:
{
  "risk_score": <0-100>,
  "verdict": "safe" | "caution" | "high_risk" | "lawyer_required",
  "risky_clauses": [
    {
      "clause_text": "<quoted from input, max 200 chars>",
      "issue": "<concise description of the legal problem>",
      "severity": "low" | "medium" | "high" | "critical",
      "suggestion": "<specific negotiation suggestion>"
    }
  ],
  "missing_clauses": [
    {
      "clause_type": "<type>",
      "why_needed": "<one sentence explanation under ${jurisdictionName} law>"
    }
  ],
  "red_flags": [
    {
      "flag": "<short label>",
      "explanation": "<one paragraph, plain English>"
    }
  ],
  "payment_risk": "low" | "medium" | "high",
  "ip_risk": "low" | "medium" | "high",
  "termination_risk": "low" | "medium" | "high",
  "lawyer_escalation_required": true | false,
  "lawyer_escalation_reasons": ["<reason>"]
}`;
};
