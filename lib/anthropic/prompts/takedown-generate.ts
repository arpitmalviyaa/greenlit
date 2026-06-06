export const TAKEDOWN_GENERATE_SYSTEM = `You are an IP litigation specialist. You draft precise, jurisdiction-appropriate takedown notices for online IP infringement.`;

export function buildTakedownGeneratePrompt(
  infringingUrl: string,
  platform: string,
  infringementType: string,
  ipTitle: string,
  ipType: string,
  noticeType: string,
  jurisdiction: string,
  corpusContext: string
): string {
  return `Draft a ${noticeType} takedown notice for IP infringement.

Jurisdiction: ${jurisdiction}
${corpusContext ? `\nRelevant legal context:\n${corpusContext}\n` : ""}

IP Asset: "${ipTitle}" (${ipType})
Infringing URL: ${infringingUrl}
Platform: ${platform}
Infringement Type: ${infringementType}
Notice Type: ${noticeType}

Draft a formal, complete notice. Include:
- Identification of IP owner and IP asset
- Description of infringement with URL
- Legal basis for the claim
- Specific demand (removal, takedown, cease use)
- Deadline for compliance
- Reservation of legal rights

Return ONLY valid JSON:
{
  "notice_text": string,
  "filing_instructions": string[],
  "deadline_notes": string
}
notice_text: the complete formal notice ready to send.
filing_instructions: step-by-step how to submit this notice to the platform.
deadline_notes: notes on timing, response windows, escalation.
No markdown fences, no explanation outside JSON.`;
}
