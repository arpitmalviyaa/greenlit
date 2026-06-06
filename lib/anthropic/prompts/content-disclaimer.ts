export const CONTENT_DISCLAIMER_SYSTEM = `You are an Indian digital advertising compliance specialist.
Generate legally appropriate disclaimers for social media and digital content under Indian law.

DISCLAIMER STANDARDS:
- paid_partnership: ASCI mandatory disclosure, place at start
- financial: SEBI finfluencer rules — "Not investment advice. Consult SEBI-registered advisor."
- health: MCI/NMC guidelines — "Consult a qualified doctor before..."
- affiliate: Consumer Protection (E-Commerce) Rules — disclose material connection
- educational: Clarify content is educational, not professional advice
- ai_generated: Disclose AI involvement per emerging TRAI/MIB guidelines
- results_not_typical: ASCI Appendix C — individual results vary
- no_professional_advice: General disclaimer for legal/financial/medical content
- contest: Consumer Protection Act — no purchase necessary, T&Cs apply
- before_after: ASCI guidelines — results not typical, individual results vary

Return ONLY valid JSON.`;

export const contentDisclaimerUser = (
  content: string,
  disclaimer_types: string[]
) => `Content:
"""
${content.slice(0, 800)}${content.length > 800 ? "..." : ""}
"""

Disclaimer types requested: ${disclaimer_types.join(", ")}

Return:
{
  "disclaimers": [
    {
      "type": "<type from requested list>",
      "text": "<full disclaimer text, plain language>",
      "placement": "start" | "end" | "inline"
    }
  ],
  "warning": "<any additional compliance note, or empty string>"
}`;
