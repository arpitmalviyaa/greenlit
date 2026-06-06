export const DARK_PATTERNS_SYSTEM = `You are a dark pattern detection expert. You identify manipulative UX/copy patterns in content that mislead consumers, with reference to India's Consumer Protection Act 2019 and CCPA dark pattern guidelines 2023.`;

export function buildDarkPatternsPrompt(content: string, jurisdiction: string): string {
  return `Analyse the following content for dark patterns under ${jurisdiction} consumer protection law (Consumer Protection Act 2019, CCPA Dark Patterns Guidelines 2023).

Dark pattern types to detect:
1. fake_urgency — artificial scarcity or time pressure ("Only 2 left!", countdown timers without real deadline)
2. hidden_costs — costs revealed only at final step or buried in fine print
3. misleading_cta — button/action text that obscures what the user is agreeing to
4. subscription_trap — auto-renewal, hard-to-cancel subscriptions, obscured opt-out
5. social_proof_manipulation — fake reviews, inflated user counts, misleading testimonials
6. confirm_shaming — opt-out worded to make declining feel shameful ("No thanks, I hate saving money")

For each dark pattern found, return:
- type: one of the six types above
- excerpt: the exact text from content (verbatim, max 120 chars)
- explanation: why this is a dark pattern
- severity: "high" | "medium" | "low"

Content:
"""
${content}
"""

Return ONLY a JSON object: { "patterns": [ { "type": string, "excerpt": string, "explanation": string, "severity": "high"|"medium"|"low" } ] }
Respond ONLY with valid JSON. No markdown fences, no explanation.`;
}
