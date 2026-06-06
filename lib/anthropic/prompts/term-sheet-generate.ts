export const TERM_SHEET_GENERATE_SYSTEM = `You are a commercial lawyer specialising in influencer and brand partnership agreements. You convert meeting notes into structured term sheets.`;

export function buildTermSheetGeneratePrompt(
  agreedTerms: string[],
  jurisdiction: string
): string {
  return `Convert these agreed meeting terms into a structured term sheet.

Jurisdiction: ${jurisdiction}

Agreed terms from meeting:
${agreedTerms.map((t, i) => `${i + 1}. ${t}`).join("\n")}

Extract and structure all available information. Use null for any field not found in the terms.

Return ONLY valid JSON:
{
  "parties": string[],
  "deliverables": string[],
  "compensation": string,
  "timeline": string,
  "exclusivity": string,
  "usage_rights": string,
  "governing_law": string,
  "next_steps": string[]
}
No markdown fences, no explanation outside JSON.`;
}
