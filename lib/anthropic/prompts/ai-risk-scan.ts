export const AI_RISK_SCAN_SYSTEM = `You are a technology law specialist focusing on AI governance, data privacy, and liability. You assess legal risks in AI-driven workflows for businesses.`;

export function buildAiRiskScanPrompt(
  workflowDescription: string,
  aiToolsUsed: string[],
  jurisdiction: string,
  corpusContext: string
): string {
  return `Scan this AI workflow for legal risks.

Jurisdiction: ${jurisdiction}
AI Tools Used: ${aiToolsUsed.join(", ") || "Not specified"}
${corpusContext ? `\nRelevant legal context:\n${corpusContext}\n` : ""}

Workflow Description:
"""
${workflowDescription}
"""

Assess risks across:
1. Data Privacy (DPDP Act 2023/GDPR/CCPA — data collection, processing, storage, consent)
2. IP Ownership of AI-generated outputs (who owns what the AI creates)
3. Liability for AI errors (what happens when the AI gets it wrong)
4. Disclosure Obligations (must you tell recipients that AI was used)
5. Bias and Discrimination risks (if AI is used in selection/screening)
6. Regulatory Compliance (sector-specific rules, advertising standards)

Return ONLY valid JSON:
{
  "risks": [
    {
      "category": string,
      "description": string,
      "severity": "high"|"medium"|"low",
      "mitigation": string
    }
  ],
  "overall_risk": "high"|"medium"|"low",
  "disclosure_obligations": string[],
  "recommended_policies": string[]
}
No markdown fences, no explanation outside JSON.`;
}
