export const NDA_TRAP_SYSTEM = `You are a senior commercial lawyer specialising in NDA review for talent and influencer agencies. You identify NDA traps that creators and agencies sign without understanding the implications.`;

export function buildNdaTrapPrompt(
  ndaText: string,
  extractedClauses: string,
  jurisdiction: string,
  corpusContext: string
): string {
  return `Identify all NDA traps in this agreement.

Jurisdiction: ${jurisdiction}
${corpusContext ? `\nRelevant legal context:\n${corpusContext}\n` : ""}

Extracted clauses (pre-screened):
${extractedClauses}

Full NDA:
"""
${ndaText.slice(0, 5000)}
"""

Focus on:
- One-sided IP grabs (AI-assigns all creative output to the other party)
- Indefinite confidentiality (no sunset clause)
- Overreaching non-competes (too broad in scope/duration/geography)
- No carve-outs (public domain, independently developed, already known)
- Unilateral modification rights (one party can change the NDA)
- Asymmetric obligations (one party bound, other is not)

Return ONLY valid JSON:
{
  "traps": [
    {
      "clause_excerpt": string,
      "trap_type": string,
      "explanation": string,
      "severity": "critical"|"high"|"medium"|"low"
    }
  ],
  "safe_clauses": string[],
  "overall_verdict": "safe"|"caution"|"dangerous",
  "recommended_redlines": string[]
}
No markdown fences, no explanation outside JSON.`;
}
