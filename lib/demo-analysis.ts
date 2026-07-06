// Canned sample-contract analysis for the first-run demo (dashboard "try a
// sample" card). Rendered instantly client-side — no upload, no tokens.
import type { AnyAnalysis } from "@/lib/utils/analysis-map";

export const DEMO_CONTRACT_TITLE = "Sample — GlowUp Cosmetics x Creator Agreement";

export const DEMO_ANALYSIS: AnyAnalysis = {
  risk_score: 58,
  summary:
    "Mostly a normal brand deal, but three terms give the brand more than market norm — worth a short negotiation before signing.",
  risky_clauses: [
    {
      clause_text:
        "Creator shall indemnify and hold harmless the Brand from any and all claims, losses and expenses of whatever nature arising out of or related to this Agreement, without limitation.",
      issue: "Your liability has no upper limit",
      why_it_matters:
        "If anything goes wrong — even something outside your control — you could owe far more than the deal pays you. Most deals cap this at the fee amount.",
      severity: "critical",
      negotiation_value: "high",
      question_to_ask:
        "Could we cap the indemnity at the total fee payable under this agreement? That's the structure we normally work with.",
      suggestion:
        "Each party's total liability under this Agreement shall not exceed the total fees payable to the Creator hereunder.",
      safer_wording:
        "Creator shall indemnify the Brand against third-party claims arising from Creator's breach of this Agreement, provided that Creator's total liability shall not exceed the total fees paid under this Agreement.",
    },
    {
      clause_text:
        "All Content shall be assigned to the Brand in perpetuity, throughout the universe, in all media now known or hereafter devised.",
      issue: "The brand keeps your content forever",
      why_it_matters:
        "They can reuse your face and work in future campaigns indefinitely without paying you again. Usage is normally limited to the campaign period plus a paid extension option.",
      severity: "high",
      negotiation_value: "high",
      question_to_ask:
        "Can we limit usage rights to 12 months from first publication, with an option to extend at an agreed fee?",
      suggestion:
        "Brand's licence to use the Content is limited to 12 months from first publication. Extensions require Creator's written consent and an additional fee to be agreed.",
      safer_wording:
        "Creator grants the Brand a licence to use the Content for the Campaign for 12 months from first publication. Any further use requires a separate written agreement.",
    },
    {
      clause_text:
        "Payment shall be released within ninety (90) days after the Brand confirms satisfaction with the deliverables at its sole discretion.",
      issue: "Payment waits on the brand feeling satisfied — for up to 90 days",
      why_it_matters:
        "\"Sole discretion\" means they decide when (or whether) you get paid, and 90 days is well past the 30–45 day market norm. This is a cash-flow risk, not just an inconvenience.",
      severity: "high",
      negotiation_value: "medium",
      question_to_ask:
        "Could we move to 45-day payment terms tied to delivery, with approval not to be unreasonably withheld?",
      suggestion:
        "Payment shall be made within 45 days of delivery of the deliverables. Approval shall not be unreasonably withheld or delayed.",
      safer_wording:
        "Brand shall pay the Fee within 45 days of Creator's delivery of the deliverables. Deliverables are deemed accepted unless Brand provides specific written objections within 7 days of delivery.",
    },
  ],
  missing_clauses: [
    {
      clause_type: "termination for convenience (creator side)",
      why_needed: "The brand can exit at any time but you cannot — a mutual exit right keeps the deal balanced.",
    },
  ],
  red_flags: [
    {
      flag: "24-month all-category exclusivity",
      explanation:
        "You could not work with any other brand in any category for two years. Exclusivity is normally limited to direct competitors during the campaign window. You can accept broad exclusivity if the fee genuinely covers the income you'd give up.",
    },
  ],
  standard_terms: [
    "Deliverables schedule",
    "Content approval rounds (2)",
    "Confidentiality (mutual)",
    "FTC/ASCI disclosure requirement",
    "Force majeure",
    "Independent contractor status",
    "Notices",
    "Entire agreement",
    "Severability",
    "Counterparts",
    "Governing law named",
    "Brand brief compliance",
    "Reshoot terms",
    "Invoice requirements",
  ],
  payment_risk: "high",
  ip_risk: "high",
  termination_risk: "medium",
  lawyer_escalation_required: false,
  lawyer_escalation_reasons: [],
};
