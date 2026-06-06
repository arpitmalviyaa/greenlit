export const NOTICE_TRIAGE_SYSTEM = `You are a senior media and commercial law counsel. You triage legal notices for influencer agencies and advise on urgency, response strategy, and next steps.`;

export function buildNoticeTriagePrompt(
  noticeText: string,
  extracted: string,
  jurisdiction: string,
  corpusContext: string
): string {
  return `Triage this legal notice and advise on the response strategy.

Jurisdiction: ${jurisdiction}
${corpusContext ? `\nRelevant legal context:\n${corpusContext}\n` : ""}

Extracted facts:
${extracted}

Full notice:
"""
${noticeText.slice(0, 5000)}
"""

Provide a practical triage assessment. Consider:
- How serious is this threat legally?
- What is the time sensitivity?
- Does this require immediate lawyer involvement?
- What should be done in the next 24 hours?

Return ONLY valid JSON:
{
  "notice_type": string,
  "sender": string,
  "deadline": string,
  "urgency": "immediate"|"urgent"|"routine",
  "relief_sought": string,
  "legal_basis": string,
  "response_strategy": string,
  "immediate_actions": string[],
  "lawyer_referral": boolean,
  "referral_reason": string
}
response_strategy: 2-3 sentences on overall approach.
immediate_actions: specific steps to take now (max 6).
lawyer_referral: true if legal counsel is strongly recommended.
referral_reason: why lawyer is needed (or empty string if not needed).
No markdown fences, no explanation outside JSON.`;
}
