export const CRISIS_PLAN_SYSTEM = `You are a crisis management and legal strategy specialist for influencer marketing agencies. You create actionable crisis response plans.`;

export function buildCrisisPlanPrompt(
  title: string,
  severity: string,
  noticeContext: string,
  jurisdiction: string
): string {
  return `Create a crisis response action plan.

Crisis: ${title}
Severity: ${severity}
Jurisdiction: ${jurisdiction}
${noticeContext ? `\nContext:\n${noticeContext}\n` : ""}

Create a structured action plan with specific, prioritised steps. Each step should be actionable and have a clear owner (e.g. "Agency Admin", "Legal Counsel", "PR Team").

Return ONLY valid JSON:
{
  "steps": [
    {
      "order": number,
      "action": string,
      "owner": string,
      "timeline": string,
      "priority": "immediate"|"high"|"medium"|"low"
    }
  ],
  "communication_guidance": string,
  "evidence_preservation_notes": string
}
No markdown fences, no explanation outside JSON.`;
}
