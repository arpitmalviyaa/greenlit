// Haiku prompt — scan a clause list for red flag patterns.
// Max tokens: 600

export const RED_FLAGS_SYSTEM = `You are a legal risk scanner for Indian influencer marketing contracts.
Given a list of extracted clauses (JSON), detect red flag patterns.
Return ONLY valid JSON. No prose, no markdown fences.`;

export const redFlagsUser = (clauseJson: string) => `
Extracted clauses:
${clauseJson.slice(0, 8000)}

Detect these flag types: uncapped_indemnity, unlimited_liability, one_sided_termination,
payment_after_satisfaction, perpetual_ip_assignment, broad_exclusivity,
non_compete, moral_clause_abuse, confidentiality_trap, jurisdiction_risk.

Return this JSON structure:
{
  "flags": [
    {
      "flag_type": "<one of the flag types above>",
      "clause_text": "<relevant clause text, max 200 chars>",
      "severity": "low" | "medium" | "high" | "critical",
      "business_impact": "<plain English explanation of the business risk, 1-2 sentences>"
    }
  ]
}

If no flags found, return { "flags": [] }.`;
