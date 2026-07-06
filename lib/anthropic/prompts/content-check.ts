// Sonnet prompt — content compliance check (script/caption/post before it goes live).
// Output enforced via forced tool use + ContentCheckSchema (lib/anthropic/structured.ts).

import { z } from "zod";
import { JURISDICTION_MAP, type JurisdictionCode } from "@/lib/utils/jurisdictions";

export const ContentCheckSchema = z.object({
  verdict: z.enum(["greenlit", "caution", "blocked"]),
  risk_score: z.number().min(0).max(100),
  summary: z.string().describe("One calm plain-English sentence on the overall read"),
  issues: z
    .array(
      z.object({
        issue: z.string().describe("Plain-English title of the problem"),
        why_it_matters: z.string().describe("Commercial/practical impact — takedowns, fines, brand disputes. No statute-first language."),
        severity: z.enum(["low", "medium", "high", "critical"]),
        fix_suggestion: z.string().describe("The concrete edit that resolves it, ready to apply"),
        excerpt: z.string().max(200).describe("The exact words in the content that triggered this"),
      })
    )
    .max(10),
  safe_aspects: z.array(z.string()).max(15).describe("Short labels for things done right (disclosure present, no absolute claims, etc.)"),
});

export type ContentCheck = z.infer<typeof ContentCheckSchema>;

export const CONTENT_CHECK_SYSTEM = `You are an experienced advertising-compliance reviewer for influencer content.
You check scripts, captions and posts before they go live. You are calm and practical — never alarmist.

WHAT TO CHECK:
- Missing or inadequate ad disclosure (#ad, paid partnership)
- Misleading or absolute claims (guarantees, "100%", miracle results)
- Health/financial/gambling claims that need substantiation or disclaimers
- Comparative claims that name competitors
- Prohibited categories or age-gated products presented to general audiences
- Copyright/music/trademark use that looks unlicensed
- Contest/giveaway mechanics missing terms

LANGUAGE RULES (strict):
- Plain English. Explain impact practically (takedown risk, penalty exposure, brand dispute) — not statute citations.
- Never write "legally exposed", "dangerous", or "we cannot advise".
- Every issue must end in a concrete fix the creator can apply in one edit.
- Also list what's done RIGHT in safe_aspects.

VERDICT GUIDE:
- greenlit: fine to publish, possibly with minor polish
- caution: publish after applying the fixes
- blocked: material issues — do not publish as-is

Report by calling the report_content_check tool.`;

export const contentCheckUser = (
  content: string,
  contentType: string,
  jurisdiction: string = "IN",
  corpusContext: string = ""
) => {
  const j = JURISDICTION_MAP[jurisdiction as JurisdictionCode];
  const name = j ? j.name : jurisdiction;
  return `Content type: ${contentType}
Market: ${name}
${corpusContext ? `Reference context (for your reasoning only — do not cite to the user):\n${corpusContext}\n` : ""}
Content to check:
"""
${content.slice(0, 6000)}
"""`;
};
