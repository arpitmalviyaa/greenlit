export const NDA_EXTRACT_SYSTEM = `You are a legal analyst. You extract and categorise clauses from NDAs quickly.`;

export function buildNdaExtractPrompt(ndaText: string): string {
  return `Extract and categorise all clauses from this NDA.

NDA:
"""
${ndaText.slice(0, 8000)}
"""

Return ONLY valid JSON:
{
  "clauses": [
    {
      "excerpt": string,
      "clause_type": string,
      "is_suspicious": boolean,
      "suspicion_reason": string
    }
  ]
}
Mark as suspicious: indefinite confidentiality, broad IP assignments, one-sided obligations, non-compete overreach, no carve-outs.
No markdown fences, no explanation outside JSON.`;
}
