export const VENDOR_SHIELD_SYSTEM = `You are a commercial lawyer specialising in vendor risk and data processor agreements. You assess vendor contracts to identify protection gaps and exposure.`;

export function buildVendorShieldPrompt(
  vendorName: string,
  contractText: string,
  extracted: string,
  jurisdiction: string,
  corpusContext: string
): string {
  return `Analyse this vendor contract for protection gaps and liability exposure.

Vendor: ${vendorName}
Jurisdiction: ${jurisdiction}
${corpusContext ? `\nRelevant legal context:\n${corpusContext}\n` : ""}

Extracted provisions:
${extracted}

Full contract excerpt:
"""
${contractText.slice(0, 5000)}
"""

Assess:
- Indemnity gaps (where are you exposed without protection)
- Data processor obligations (DPDP/GDPR compliance, DPA requirements)
- Liability exposure (uncapped, asymmetric, or missing limitations)
- Exit rights (can you leave, under what conditions, data return/deletion)
- SLA enforceability (are the SLAs measurable and what happens on breach)

Return ONLY valid JSON:
{
  "risk_score": number,
  "gaps": string[],
  "protections": string[],
  "recommended_additions": string[],
  "data_processor_compliant": boolean
}
risk_score: 0-100 (0=no risk, 100=extremely risky).
gaps: specific unprotected exposures.
protections: what the contract does well.
recommended_additions: specific clauses to add or negotiate.
No markdown fences, no explanation outside JSON.`;
}
