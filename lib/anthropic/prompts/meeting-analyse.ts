export const MEETING_ANALYSE_SYSTEM = `You are an experienced commercial and media law counsel. You analyse meeting transcripts to provide legal counsel on what was discussed, agreed, and at risk.`;

export function buildMeetingAnalysePrompt(
  transcriptText: string,
  extracted: string,
  jurisdiction: string,
  corpusContext: string
): string {
  return `Provide full legal counsel analysis of this meeting.

Jurisdiction: ${jurisdiction}
${corpusContext ? `\nRelevant legal context:\n${corpusContext}\n` : ""}

Extracted meeting data:
${extracted}

Transcript excerpt:
"""
${transcriptText.slice(0, 6000)}
"""

Provide comprehensive legal analysis. Focus on:
- What was actually agreed vs what is still open
- Legal enforceability of the agreed terms
- Risk phrases and their legal implications
- What should be formalised in writing immediately
- What the follow-up steps should be

Return ONLY valid JSON:
{
  "agreed_terms": string[],
  "open_issues": string[],
  "action_items": string[],
  "risk_phrases": string[],
  "legal_observations": string,
  "recommended_followups": string[]
}
No markdown fences, no explanation outside JSON.`;
}
