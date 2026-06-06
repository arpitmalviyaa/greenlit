export const PLAYBOOK_GENERATE_SYSTEM = `You are an experienced commercial and media law counsel specialising in influencer agencies. You create legal playbook entries — practical rules, red lines, and standard positions that agencies should follow in deals.`;

export function buildPlaybookGeneratePrompt(context: string, jurisdiction: string): string {
  return `Generate legal playbook entries for this influencer agency.

Jurisdiction: ${jurisdiction}
Agency context: ${context}

Generate 8-12 practical playbook entries covering: negotiation rules, red lines, standard positions, escalation protocols, approved language, and jurisdiction notes.

Return ONLY valid JSON:
{
  "suggestions": [
    {
      "title": string,
      "category": "negotiation_rule"|"red_line"|"standard_position"|"escalation_protocol"|"approved_language"|"jurisdiction_note",
      "content": string,
      "jurisdiction": string
    }
  ]
}
Make each entry specific, actionable, and practical — not generic advice.
No markdown fences, no explanation outside JSON.`;
}
