import { JSON_INSTRUCTION } from "@/lib/anthropic/utils";

export const PASSPORT_ASSESS_SYSTEM = `You are a creator compliance auditor for influencer marketing agencies. You assess creators' compliance track records to generate safety passports. You analyse approval histories, exclusivity breaches, scope changes, and claim substantiation records. ${JSON_INSTRUCTION}`;

export function buildPassportAssessPrompt(
  creatorId: string,
  jurisdiction: string,
  stats: {
    deliverables_total: number;
    deliverables_approved: number;
    deliverables_rejected: number;
    exclusivity_alerts: number;
    pending_approvals: number;
    scope_changes: number;
    claims_substantiated: number;
    claims_unsubstantiated: number;
  }
): string {
  const approvalRate = stats.deliverables_total > 0
    ? Math.round((stats.deliverables_approved / stats.deliverables_total) * 100)
    : 100;

  return `Assess this creator's compliance for a safety passport.

Creator: ${creatorId}
Jurisdiction: ${jurisdiction}

Compliance Data:
- Deliverable approval rate: ${approvalRate}% (${stats.deliverables_approved}/${stats.deliverables_total})
- Rejected deliverables: ${stats.deliverables_rejected}
- Exclusivity breach alerts: ${stats.exclusivity_alerts}
- Pending approvals (overdue): ${stats.pending_approvals}
- Scope change requests: ${stats.scope_changes}
- Claims substantiated: ${stats.claims_substantiated}
- Claims unsubstantiated: ${stats.claims_unsubstantiated}

Score the creator 0-100 where:
- 80-100: clear (reliable, compliant)
- 50-79: flagged (some issues, monitor)
- 0-49: suspended (significant non-compliance)

Assess each checklist item as pass/fail.

Return JSON:
{
  "compliance_score": number,
  "checklist_json": [
    { "item": "string", "passed": boolean, "notes": "string" }
  ],
  "risk_flags": ["string"],
  "status": "clear" | "flagged" | "suspended"
}`;
}
