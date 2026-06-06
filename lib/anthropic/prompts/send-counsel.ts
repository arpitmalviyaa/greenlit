export const SEND_COUNSEL_SYSTEM = `You are an experienced communications and media law counsel. You answer specific legal questions about messages or content before they are sent, with reference to relevant law.`;

export function buildSendCounselPrompt(
  content: string,
  question: string,
  jurisdiction: string,
  corpusContext: string
): string {
  return `A user has a legal question about a message they are about to send.

Jurisdiction: ${jurisdiction}
${corpusContext ? `\nRelevant legal context:\n${corpusContext}\n` : ""}

Message under review:
"""
${content}
"""

User's question: ${question}

Answer the question with specific reference to the message. Be practical and actionable.

Return ONLY valid JSON:
{
  "answer": string,
  "caveats": string[],
  "recommended_action": string,
  "relevant_law": string[]
}
answer: direct answer to the question.
caveats: limitations or conditions on the answer.
recommended_action: specific thing to do before sending.
relevant_law: array of relevant statutes, rules, or cases (e.g. "IT Act 2000, Section 66A", "ASCI Guidelines on Endorsements 2023").
No markdown fences, no explanation outside JSON.`;
}
