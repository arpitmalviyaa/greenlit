export const SCOPE_CHANGE_SYSTEM = `You are a contract risk analyst. Analyse a scope change request and return impact analysis.
Return ONLY valid JSON — no prose.`;

export function scopeChangeUser(params: {
  change_type: string;
  description: string;
  original_value: object;
  proposed_value: object;
  jurisdiction: string;
}): string {
  const { change_type, description, original_value, proposed_value, jurisdiction } = params;
  return `Change Type: ${change_type}
Jurisdiction: ${jurisdiction}
Description: ${description}
Original: ${JSON.stringify(original_value)}
Proposed: ${JSON.stringify(proposed_value)}

Return JSON:
{
  "financial_impact": "string",
  "timeline_impact": "string",
  "legal_risk": "high|medium|low",
  "recommendation": "accept|negotiate|reject",
  "reasoning": "string",
  "suggested_compensation": "string"
}`;
}
