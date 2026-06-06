const CATEGORY_CONTEXT: Record<string, string> = {
  finance: "SEBI Advertising Code, IRDA regulations, RBI guidelines on financial product advertising, Consumer Protection Act 2019. Claims about returns, past performance, guaranteed profits are prohibited. Risk disclaimers mandatory.",
  health: "NMC advertising guidelines, FSSAI Act, Drugs & Magic Remedies (Objectionable Advertisements) Act 1954, Consumer Protection Act 2019. No disease cure claims, no before/after for medical conditions without clinical evidence, health claims need substantiation.",
  food: "FSSAI Regulations 2011 & 2016, Food Safety & Standards Act 2006. No false nutritional claims, no misleading health benefits, allergen disclosure required, 'natural'/'organic' claims need certification.",
  gaming: "IT (Intermediary Guidelines) 2021, state-level gaming laws, Consumer Protection Act. No misleading odds claims, no targeting minors, responsible gaming disclosures required, real-money gaming restrictions vary by state.",
  pharma: "Drugs & Magic Remedies Act 1954, Drugs & Cosmetics Act 1940, UCPMP Code 2024. No direct-to-consumer Rx drug advertising, no disease cure claims for OTC, no misleading efficacy claims.",
  alcohol: "Cable TV Networks Regulation Act surrogate advertising ban, state excise policies, ASCI Code. No direct promotion in national broadcast, surrogate advertising prohibited, age-gating required for digital.",
  crypto: "RBI guidance, SEBI VDA regulations 2023, IT Act. Mandatory risk disclosures, no guaranteed returns claims, clear 'not legal tender' disclosures, KYC compliance references required.",
};

export const REGULATED_SCAN_SYSTEM = `You are a regulatory compliance expert for advertising and content in India and other jurisdictions. You analyse content against category-specific regulations.`;

export function buildRegulatedScanPrompt(
  content: string,
  category: string,
  jurisdiction: string,
  corpusContext: string
): string {
  const categoryRules = CATEGORY_CONTEXT[category] ?? "General advertising standards and consumer protection laws apply.";

  const corpusBlock = corpusContext
    ? `\nRelevant regulatory corpus:\n${corpusContext}\n`
    : "";

  return `Analyse the following content for compliance with ${category} regulations in ${jurisdiction}.

Regulatory Framework:
${categoryRules}
${corpusBlock}
Content:
"""
${content}
"""

Return:
- compliant: boolean (true if no significant violations)
- issues: array of { rule: string, severity: "high"|"medium"|"low", excerpt: string }
  where excerpt is the exact text from content triggering the issue (max 100 chars)
- required_disclosures: array of disclosure texts that must be added

Return ONLY a JSON object: { "compliant": boolean, "issues": [ { "rule": string, "severity": "high"|"medium"|"low", "excerpt": string } ], "required_disclosures": string[] }
Respond ONLY with valid JSON. No markdown fences, no explanation.`;
}
