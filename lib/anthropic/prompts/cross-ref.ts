export const CROSS_REF_SYSTEM = `You are a comparative legal specialist. You cross-reference legal questions across multiple jurisdictions and identify key differences, conflicts, and compliance requirements.`;

export function buildCrossRefPrompt(
  queryText: string,
  jurisdictions: string[],
  combinedCorpus: string
): string {
  return `Cross-reference this legal question across multiple jurisdictions.

Question: ${queryText}
Jurisdictions: ${jurisdictions.join(", ")}
${combinedCorpus ? `\nRelevant legal context:\n${combinedCorpus}\n` : ""}

For each jurisdiction, provide:
- The legal position
- Key applicable rules or statutes
- Notable cases (if known)
- Specific compliance requirement

Then identify any conflicts or material differences between jurisdictions.

Return ONLY valid JSON:
{
  "results": [
    {
      "jurisdiction": string,
      "legal_position": string,
      "key_rules": string[],
      "notable_cases": string[],
      "compliance_requirement": string
    }
  ],
  "summary": string,
  "conflicts": string[]
}
No markdown fences, no explanation outside JSON.`;
}
