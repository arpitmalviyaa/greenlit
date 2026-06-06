// Haiku prompt — extract clause list from raw contract text.
// Goal: produce a compact JSON list for Sonnet to analyse.
// Max tokens: 800

export const CONTRACT_EXTRACT_SYSTEM = `You are a legal document parser specialising in Indian influencer marketing contracts.
Extract every distinct clause from the contract text provided.
Return ONLY valid JSON — no prose, no markdown fences.
Be concise. Truncate each clause to 300 characters maximum.`;

export const contractExtractUser = (rawText: string) => `
Contract text (may be truncated):
${rawText.slice(0, 12000)}

Return this JSON structure:
{
  "clause_count": <integer>,
  "estimated_risk_level": "low" | "medium" | "high",
  "clauses": [
    {
      "id": <integer>,
      "type": "payment" | "ip_rights" | "termination" | "exclusivity" | "indemnity" | "moral_rights" | "deliverables" | "confidentiality" | "dispute" | "other",
      "text": "<clause text, max 300 chars>",
      "flags": ["uncapped_indemnity" | "perpetual_ip" | "one_sided_termination" | "payment_after_satisfaction" | "moral_clause_abuse" | "broad_exclusivity" | "none"]
    }
  ],
  "missing_types": ["payment" | "ip_rights" | "termination" | "exclusivity" | "indemnity" | "deliverables" | "dispute"]
}`;
