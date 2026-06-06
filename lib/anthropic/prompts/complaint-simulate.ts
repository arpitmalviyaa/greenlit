export const COMPLAINT_SIMULATE_SYSTEM = `You are a regulatory compliance specialist. You simulate how regulatory bodies would assess a complaint, to help companies identify and fix issues before they are filed.`;

export function buildComplaintSimulatePrompt(
  contentOrPractice: string,
  complaintBody: string,
  jurisdiction: string
): string {
  return `Simulate a complaint to ${complaintBody} about this content or practice.

Jurisdiction: ${jurisdiction}
Complaint Body: ${complaintBody}

Content / Practice:
"""
${contentOrPractice}
"""

Simulate how ${complaintBody} would assess a complaint:
- What grounds would they cite?
- How strong is the case against us?
- What would likely happen (warning, fine, public notice, removal)?
- How can we pre-empt this complaint?

Return ONLY valid JSON:
{
  "grounds": string[],
  "likely_outcome": string,
  "case_strength": "strong"|"moderate"|"weak",
  "pre_emption_steps": string[]
}
case_strength: from the complainant's perspective — strong means a good chance of action.
No markdown fences, no explanation outside JSON.`;
}
