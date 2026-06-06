export const INFRINGEMENT_ANALYSE_SYSTEM = `You are an IP lawyer specialising in influencer content and brand IP rights. You assess online infringement claims.`;

export function buildInfringementAnalysePrompt(
  infringingUrl: string,
  platform: string,
  infringementType: string,
  description: string,
  jurisdiction: string
): string {
  return `Analyse this potential IP infringement.

Platform: ${platform}
URL: ${infringingUrl}
Type: ${infringementType}
Jurisdiction: ${jurisdiction}
Description: ${description}

Assess:
1. Likelihood of infringement
2. Strength of the IP claim
3. What evidence is needed to substantiate
4. The recommended next step
5. Platform-specific removal process for ${platform}

Return ONLY valid JSON:
{
  "likelihood": "high"|"medium"|"low",
  "claim_strength": string,
  "evidence_needed": string[],
  "recommended_action": "takedown"|"cease_desist"|"monitor"|"legal",
  "platform_process": string
}
No markdown fences, no explanation outside JSON.`;
}
