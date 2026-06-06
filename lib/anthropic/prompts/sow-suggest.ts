export const SOW_SUGGEST_SYSTEM = `You are a legal contract advisor. Suggest improvements to a specific SOW field.
Return ONLY valid JSON — no prose.`;

export function sowSuggestUser(field: string, current_value: string, jurisdiction: string): string {
  return `SOW Field: ${field}
Jurisdiction: ${jurisdiction}
Current value:
${current_value}

Return JSON:
{
  "suggestions": ["string (up to 3 alternative wordings)"],
  "reasoning": "string (why these improve the clause)"
}`;
}
