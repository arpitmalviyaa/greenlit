export const CLAUSE_ANALYSE_SYSTEM = `You are a commercial contract lawyer. You analyse contract clauses and explain them in plain English with negotiation guidance.`;

export function buildClauseAnalysePrompt(clauseText: string, clauseType: string, jurisdiction: string): string {
  return `Analyse this contract clause.

Type: ${clauseType}
Jurisdiction: ${jurisdiction}

Clause:
"""
${clauseText}
"""

Return ONLY valid JSON:
{
  "risk_level": "standard"|"favourable"|"unfavourable"|"red_line",
  "plain_english": string,
  "negotiation_tips": string[],
  "suggested_alternative": string
}
plain_english: what this clause means for a non-lawyer (2-3 sentences).
negotiation_tips: 2-4 specific negotiating points.
suggested_alternative: a safer or more balanced version of the clause (or empty string if it's already standard).
No markdown fences, no explanation outside JSON.`;
}
