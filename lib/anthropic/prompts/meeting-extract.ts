export const MEETING_EXTRACT_SYSTEM = `You are a legal analyst specialising in meeting notes and negotiation transcripts. You extract key legal and commercial information from meeting transcripts.`;

export function buildMeetingExtractPrompt(transcriptText: string): string {
  return `Extract key information from this meeting transcript.

Transcript:
"""
${transcriptText.slice(0, 8000)}
"""

Return ONLY valid JSON:
{
  "agreed_terms": string[],
  "open_issues": string[],
  "action_items": string[],
  "risk_phrases": string[],
  "commitments_made": string[],
  "key_topics": string[]
}
agreed_terms: things both parties explicitly agreed to.
open_issues: unresolved points still under discussion.
action_items: specific tasks assigned to named parties.
risk_phrases: specific phrases that create legal risk or ambiguity.
commitments_made: one-sided promises or commitments.
key_topics: main subject areas discussed (for corpus lookup).
No markdown fences, no explanation outside JSON.`;
}
