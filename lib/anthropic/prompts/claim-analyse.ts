export const CLAIM_ANALYSE_SYSTEM = `You are a senior advertising law and regulatory compliance specialist. You assess whether marketing claims can be substantiated under applicable law.`;

export function buildClaimAnalysePrompt(
  claimText: string,
  category: string,
  jurisdiction: string,
  extractedJson: string,
  corpusContext: string
): string {
  const corpusBlock = corpusContext
    ? `\nRelevant regulatory context:\n${corpusContext}\n`
    : "";

  return `Analyse whether this ${category} claim is substantiated under ${jurisdiction} law.

Original Claim: "${claimText}"

Extracted claim analysis:
${extractedJson}
${corpusBlock}
Regulatory framework (${jurisdiction}):
- ASCI Code: claims must be truthful, not misleading, capable of substantiation
- Consumer Protection Act 2019: prohibits false or misleading representations
- Category-specific rules: SEBI for financial claims, NMC/FSSAI for health, etc.

Return:
- verdict: "substantiated" | "unsubstantiated" | "needs_evidence" | "misleading"
  - substantiated: claim is supportable with standard evidence
  - needs_evidence: claim is not inherently false but needs specific supporting evidence
  - unsubstantiated: claim cannot be supported as stated
  - misleading: claim is false or deceptive on its face
- risk_score: 0-100 (0 = no risk, 100 = high regulatory/legal risk)
- burden_of_proof: what evidence is specifically required
- what_evidence_needed: array of specific evidence items required (e.g. "peer-reviewed clinical trial", "SEBI-registered research")
- regulatory_risk: paragraph describing specific regulatory risk and possible enforcement action
- analysis: comprehensive analysis (3-5 sentences)

Return ONLY a JSON object: { "verdict": string, "risk_score": number, "burden_of_proof": string, "what_evidence_needed": string[], "regulatory_risk": string, "analysis": string }
Respond ONLY with valid JSON. No markdown fences, no explanation.`;
}
