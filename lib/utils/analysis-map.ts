// Maps contract analysis JSON (new v3 shape or legacy) to the ResultScreen model.
import type { ResultData, ResultIssue } from "@/components/analysis/result-screen";
import { verdictFromRisk } from "@/lib/utils/verdict";

interface AnyRiskyClause {
  clause_text?: string;
  issue?: string;
  why_it_matters?: string;
  severity?: ResultIssue["severity"];
  negotiation_value?: ResultIssue["negotiation_value"];
  question_to_ask?: string;
  suggestion?: string;
  safer_wording?: string;
}

export interface AnyAnalysis {
  risk_score?: number;
  summary?: string;
  risky_clauses?: AnyRiskyClause[];
  missing_clauses?: Array<{ clause_type?: string; why_needed?: string }>;
  red_flags?: Array<{ flag?: string; explanation?: string }>;
  standard_terms?: string[];
  lawyer_escalation_required?: boolean;
  payment_risk?: "low" | "medium" | "high";
  ip_risk?: "low" | "medium" | "high";
  termination_risk?: "low" | "medium" | "high";
  lawyer_escalation_reasons?: string[];
  verdict?: string;
}

const SEVERITY_ORDER = { critical: 4, high: 3, medium: 2, low: 1 } as const;

export function analysisToResult(a: AnyAnalysis, jurisdiction?: string): ResultData {
  const risky = (a.risky_clauses ?? []).map<ResultIssue>((c) => ({
    title: c.issue ?? "Clause worth attention",
    why: c.why_it_matters ?? c.suggestion ?? "",
    clause_text: c.clause_text,
    severity: c.severity ?? "medium",
    negotiation_value: c.negotiation_value,
    question: c.question_to_ask,
    wording: c.suggestion,
    rewrite: c.safer_wording,
  }));
  risky.sort((x, y) => SEVERITY_ORDER[y.severity] - SEVERITY_ORDER[x.severity]);

  const extras: ResultIssue[] = [
    ...(a.red_flags ?? []).map<ResultIssue>((f) => ({
      title: f.flag ?? "Pattern worth attention",
      why: f.explanation ?? "",
      severity: "high",
    })),
    ...(a.missing_clauses ?? []).map<ResultIssue>((m) => ({
      title: `No ${m.clause_type ?? "protective"} clause`,
      why: m.why_needed ?? "",
      severity: "medium",
    })),
  ];

  const top = risky.slice(0, 3);
  const reviewing = [...risky.slice(3), ...extras];

  const verdict = a.lawyer_escalation_required ? "hold" : verdictFromRisk(a.risk_score);

  const fallbackSummary =
    top.length === 0
      ? "Nothing stood out as unusual — the terms read like standard market practice."
      : `${top.length} term${top.length !== 1 ? "s" : ""} worth your attention before you sign.`;

  return {
    verdict,
    summary: a.summary ?? fallbackSummary,
    top,
    reviewing,
    standardTerms: a.standard_terms ?? [],
    jurisdictionNote: jurisdiction ? `Read against ${jurisdiction === "IN" ? "Indian" : jurisdiction} market norms.` : undefined,
  };
}
