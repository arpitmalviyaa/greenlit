export const VENDOR_EXTRACT_SYSTEM = `You are a contract analyst. You extract key obligations, liability clauses, and data handling provisions from vendor contracts.`;

export function buildVendorExtractPrompt(contractText: string): string {
  return `Extract key provisions from this vendor contract.

Contract:
"""
${contractText.slice(0, 8000)}
"""

Return ONLY valid JSON:
{
  "vendor_obligations": string[],
  "liability_caps": string[],
  "data_handling_clauses": string[],
  "termination_rights": string[],
  "indemnity_clauses": string[],
  "sla_provisions": string[]
}
No markdown fences, no explanation outside JSON.`;
}
