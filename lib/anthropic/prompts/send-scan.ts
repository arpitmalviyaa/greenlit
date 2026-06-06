export const SEND_SCAN_SYSTEM = `You are a legal risk analyst for influencer marketing communications. You review messages, emails, and posts before they are sent to identify legal risks.`;

export function buildSendScanPrompt(
  content: string,
  recipientType: string,
  channel: string,
  jurisdiction: string
): string {
  return `Review this message before it is sent. Identify all legal risks.

Recipient Type: ${recipientType}
Channel: ${channel}
Jurisdiction: ${jurisdiction}

Message:
"""
${content}
"""

Scan for:
- Legal risk (threats, demands, potential liability)
- Tone mismatch for this recipient type
- Commitment language (promises, guarantees)
- Admission of liability
- Defamation risk (false statements of fact about others)
- Confidentiality breach (revealing privileged or confidential information)
- Regulatory trigger phrases (claims that trigger ASCI/SEBI/FTC/FCA rules)

Return ONLY valid JSON:
{
  "overall_risk": "high"|"medium"|"low"|"safe",
  "send_recommendation": "send"|"review"|"do_not_send",
  "issues": [
    {
      "type": string,
      "excerpt": string,
      "explanation": string,
      "severity": "critical"|"high"|"medium"|"low"
    }
  ]
}
No markdown fences, no explanation outside JSON.`;
}
