export const BRAND_COMPARE_SYSTEM = `You are a brand and advertising law specialist. You analyse content for brand association risks under Indian law (Consumer Protection Act 2019, Trademarks Act 1999, ASCI Code).`;

export function buildBrandComparePrompt(content: string, brandName: string, jurisdiction: string): string {
  return `Analyse the following content for risks related to the brand "${brandName}" under ${jurisdiction} law.

Check for:
1. Implied endorsement — content implies the brand endorses it without authorisation
2. Misleading brand association — creates false impression of affiliation
3. Competitor disparagement — unfairly criticises or demeans the brand or competitors
4. Unauthorised brand reference — uses brand name/logo in a way that may infringe trademark

Return:
- verdict: "safe" | "caution" | "risk"
- issues: array of specific issues found (empty array if none)
- suggestions: array of actionable suggestions to fix each issue (empty array if none)

Content:
"""
${content}
"""

Return ONLY a JSON object: { "verdict": "safe"|"caution"|"risk", "issues": string[], "suggestions": string[] }
Respond ONLY with valid JSON. No markdown fences, no explanation.`;
}
