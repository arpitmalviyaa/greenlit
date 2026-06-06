export const SOW_EXTRACT_SYSTEM = `You are a legal deal-structuring assistant. Extract key terms from a campaign brief.
Return ONLY valid JSON matching the schema — no prose.`;

export function sowExtractUser(brief: string, platforms: string[], budget: number, currency: string): string {
  return `Campaign Brief:
${brief}

Platforms: ${platforms.join(", ")}
Budget: ${currency} ${budget}

Extract and return JSON:
{
  "key_terms": ["string"],
  "deliverable_types": ["post|reel|story|video|blog|podcast|other"],
  "payment_structure_hints": ["string"],
  "exclusivity_indicators": ["string"],
  "jurisdiction_risks": ["string"],
  "brand_obligations": ["string"]
}`;
}
