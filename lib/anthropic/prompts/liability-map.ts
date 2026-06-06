export const LIABILITY_MAP_SYSTEM = `You are a commercial litigation counsel. You map liability across all parties involved in a legal dispute to identify exposure, indemnity chains, and mitigation options.`;

export function buildLiabilityMapPrompt(
  noticeText: string,
  jurisdiction: string,
  corpusContext: string
): string {
  return `Map the liability across all parties for this legal notice.

Jurisdiction: ${jurisdiction}
${corpusContext ? `\nRelevant legal context:\n${corpusContext}\n` : ""}

Legal notice:
"""
${noticeText.slice(0, 5000)}
"""

Identify all parties at risk — the agency, its clients (brands/creators), individual employees, third-party vendors, and the sender.

Return ONLY valid JSON:
{
  "parties": [
    {
      "name": string,
      "role": string,
      "exposure_level": "high"|"medium"|"low"|"none",
      "exposure_reason": string
    }
  ],
  "total_exposure_estimate": string,
  "mitigation_options": string[],
  "indemnity_chain": string
}
total_exposure_estimate: qualitative estimate (e.g. "Moderate — up to ₹25 lakhs if claim succeeds").
indemnity_chain: describe who can seek indemnity from whom.
No markdown fences, no explanation outside JSON.`;
}
