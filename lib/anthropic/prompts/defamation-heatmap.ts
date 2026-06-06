export const DEFAMATION_HEATMAP_SYSTEM = `You are a defamation risk analyst specialising in Indian media law (Defamation Act, IPC Section 499/500, IT Act Section 66A precedents). Identify text spans carrying defamation risk.`;

export function buildDefamationHeatmapPrompt(content: string, jurisdiction: string): string {
  return `Analyse the following content for defamation risk under ${jurisdiction} law. Identify every span of text that carries defamation risk.

For each risky span return:
- text: the exact substring (verbatim, no paraphrasing)
- start: character index where the span begins (0-based)
- end: character index where the span ends (exclusive)
- risk: "high" | "medium" | "low"
- reason: one sentence explaining the defamation risk

Risk levels:
- high: false statement of fact naming an identifiable person/entity + likely to harm reputation
- medium: implied negative claim or ambiguous statement about an identifiable person/entity
- low: opinion or hyperbole that could be misread as fact

Content:
"""
${content}
"""

Return ONLY a JSON object: { "spans": [ { "text": string, "start": number, "end": number, "risk": "high"|"medium"|"low", "reason": string } ] }
Respond ONLY with valid JSON. No markdown fences, no explanation.`;
}
