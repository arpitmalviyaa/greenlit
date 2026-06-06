export const NOTICE_EXTRACT_SYSTEM = `You are a legal analyst specialising in legal notices and demand letters. You extract key facts from legal notices quickly and accurately.`;

export function buildNoticeExtractPrompt(noticeText: string): string {
  return `Extract key facts from this legal notice.

Notice:
"""
${noticeText.slice(0, 6000)}
"""

Return ONLY valid JSON:
{
  "notice_type": string,
  "sender": string,
  "deadline": string,
  "relief_sought": string,
  "legal_basis": string,
  "urgency_level": "immediate"|"urgent"|"routine",
  "key_topics": string[]
}
notice_type: e.g. "Cease and Desist", "Defamation Notice", "IP Infringement Notice", "Consumer Complaint".
sender: name of sender or their lawyer.
deadline: exact date or "Not specified".
relief_sought: what the sender wants (e.g. "Remove content within 48 hours, pay ₹5 lakhs damages").
legal_basis: statutes or rights cited (e.g. "Copyright Act 1957, Section 51").
key_topics: array of legal subject areas for corpus lookup.
No markdown fences, no explanation outside JSON.`;
}
