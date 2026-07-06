// Haiku prompt — scan a clause list for red flag patterns.
// Output enforced via forced tool use + RedFlagsSchema (see lib/anthropic/structured.ts).

import { z } from "zod";

export const RedFlagsSchema = z.object({
  flags: z
    .array(
      z.object({
        flag_type: z.enum([
          "uncapped_indemnity",
          "unlimited_liability",
          "one_sided_termination",
          "payment_after_satisfaction",
          "perpetual_ip_assignment",
          "broad_exclusivity",
          "non_compete",
          "moral_clause_abuse",
          "confidentiality_trap",
          "jurisdiction_risk",
        ]),
        clause_text: z.string().max(400),
        severity: z.enum(["low", "medium", "high", "critical"]),
        business_impact: z.string(),
      })
    )
    .max(20),
});

export const RED_FLAGS_SYSTEM = `You are a legal risk scanner for Indian influencer marketing contracts.
Given a list of extracted clauses (JSON), detect red flag patterns.
Report findings by calling the report_red_flags tool.`;

export const redFlagsUser = (clauseJson: string) => `
Extracted clauses:
${clauseJson.slice(0, 8000)}

Detect these flag types: uncapped_indemnity, unlimited_liability, one_sided_termination,
payment_after_satisfaction, perpetual_ip_assignment, broad_exclusivity,
non_compete, moral_clause_abuse, confidentiality_trap, jurisdiction_risk.

For each flag: quote the relevant clause text (max 400 chars) and explain the
business risk in 1-2 plain-English sentences.

If no flags found, report an empty flags list.`;
