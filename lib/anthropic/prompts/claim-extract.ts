export const CLAIM_EXTRACT_SYSTEM = `You are a legal and marketing compliance expert. You extract structured information from advertising claims.`;

export function buildClaimExtractPrompt(claimText: string, category: string): string {
  return `Extract structured information from this advertising/marketing claim.

Category: ${category}
Claim: "${claimText}"

Return:
- claim_type: specific type (e.g. "efficacy claim", "comparative claim", "statistical claim", "testimonial", "guarantee")
- implicit_assertions: array of implied sub-claims not stated explicitly (e.g. "implies clinically tested")
- burden_of_proof_standard: what evidence standard applies (e.g. "randomised controlled trial", "independent lab test", "regulatory approval")
- keywords: array of key terms that trigger regulatory scrutiny (e.g. "proven", "guaranteed", "best", "fastest")

Return ONLY a JSON object: { "claim_type": string, "implicit_assertions": string[], "burden_of_proof_standard": string, "keywords": string[] }
Respond ONLY with valid JSON. No markdown fences, no explanation.`;
}
