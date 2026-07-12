"use client";

// The analysis result screen (spec 1.4). Shared by contract analysis,
// content checks, and the creator mobile view — pass a ResultData.

import { useState } from "react";
import { cn } from "@/lib/utils/cn";
import { type Verdict, VERDICT_BAND, VERDICT_LABEL } from "@/lib/utils/verdict";
import {
  Check,
  ChevronDown,
  ChevronRight,
  Copy,
  MessageCircleQuestion,
  PenLine,
  ThumbsDown,
  ThumbsUp,
} from "lucide-react";

export interface ResultIssue {
  title: string;
  why: string;
  clause_text?: string;
  severity: "low" | "medium" | "high" | "critical";
  negotiation_value?: "low" | "medium" | "high";
  question?: string;
  wording?: string;
  rewrite?: string;
}

// Client-safe mirror of lib/corpus/compliance.ts ComplianceFinding (that module
// is server-only; this is the wire shape the counsel APIs return).
export interface StatutoryFinding {
  id: string;
  issue: string;
  severity: "low" | "medium" | "high" | "critical";
  statute_citation: string;
  section_ref: string | null;
  explanation: string;
  suggested_fix: string | null;
  confidence: number;
  citations: { chunk_id: string; citation: string | null; section_ref: string | null; source_url: string | null }[];
}

export interface ResultData {
  verdict: Verdict;
  summary: string;
  top: ResultIssue[]; // max 3 shown
  reviewing: ResultIssue[];
  standardTerms: string[];
  confidenceNote?: string;
  jurisdictionNote?: string;
  /** Grounded statutory-check findings (flag-gated; absent = feature off / nothing found) */
  statutory?: StatutoryFinding[];
  /** Optional extra element rendered prominently under the verdict band (e.g. certificate button) */
  hero?: React.ReactNode;
}

const SEVERITY_TAG: Record<ResultIssue["severity"], string> = {
  low: "bg-gray-100 text-gray-600",
  medium: "bg-amber-100 text-amber-800",
  high: "bg-amber-100 text-amber-900",
  critical: "bg-red-100 text-red-800",
};

const SEVERITY_LABEL: Record<ResultIssue["severity"], string> = {
  low: "Minor",
  medium: "Worth a look",
  high: "Significant",
  critical: "Material",
};

const NEGOTIATION_LABEL: Record<string, string> = {
  low: "Low negotiation value",
  medium: "Worth raising",
  high: "High negotiation value",
};

function useCopy() {
  const [copied, setCopied] = useState<string | null>(null);
  async function copy(key: string, text: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(key);
      setTimeout(() => setCopied(null), 2000);
    } catch {
      // clipboard unavailable — no toast, button just doesn't confirm
    }
  }
  return { copied, copy };
}

function IssueCard({ issue, index }: { issue: ResultIssue; index: number }) {
  const { copied, copy } = useCopy();
  const [accepted, setAccepted] = useState(false);
  const [showRewrite, setShowRewrite] = useState(false);

  if (accepted) {
    return (
      <div className="border border-gray-200 rounded-lg px-4 py-3 bg-gray-50 flex items-center gap-2">
        <Check className="w-4 h-4 text-[#1D9E75]" />
        <p className="text-sm text-gray-500">
          <span className="font-medium text-gray-700">{issue.title}</span> — accepted as-is.
        </p>
        <button onClick={() => setAccepted(false)} className="ml-auto text-xs text-gray-400 underline hover:text-gray-600">
          Undo
        </button>
      </div>
    );
  }

  return (
    <div className="border border-gray-200 rounded-lg bg-white overflow-hidden">
      <div className="p-4 space-y-3">
        <div className="flex items-start gap-2 flex-wrap">
          <h3 className="text-sm font-semibold text-gray-900 flex-1 min-w-0">{issue.title}</h3>
          <span className={cn("text-[11px] rounded-full px-2 py-0.5 font-medium", SEVERITY_TAG[issue.severity])}>
            {SEVERITY_LABEL[issue.severity]}
          </span>
          {issue.negotiation_value && (
            <span className="text-[11px] rounded-full px-2 py-0.5 font-medium bg-[#1D9E75]/10 text-[#157A5B]">
              {NEGOTIATION_LABEL[issue.negotiation_value]}
            </span>
          )}
        </div>
        <p className="text-sm text-gray-600">{issue.why}</p>
        {issue.clause_text && (
          <p className="text-xs text-gray-400 italic border-l-2 border-gray-200 pl-3">&ldquo;{issue.clause_text}&rdquo;</p>
        )}
        {showRewrite && issue.rewrite && (
          <div className="rounded-md bg-[#1D9E75]/5 border border-[#1D9E75]/20 p-3">
            <p className="text-[11px] font-medium text-[#157A5B] uppercase tracking-wide mb-1">Suggested rewrite</p>
            <p className="text-sm text-gray-700">{issue.rewrite}</p>
          </div>
        )}
      </div>
      {/* Action row — each action one tap */}
      <div className="flex flex-wrap gap-2 border-t border-gray-100 bg-gray-50/60 px-4 py-2.5">
        <button
          onClick={() => setAccepted(true)}
          className="text-xs font-medium text-gray-600 border border-gray-200 bg-white rounded-md px-3 py-1.5 hover:bg-gray-50 inline-flex items-center gap-1.5"
        >
          <Check className="w-3.5 h-3.5" /> Accept
        </button>
        {issue.question && (
          <button
            onClick={() => copy(`q${index}`, issue.question!)}
            className="text-xs font-medium text-gray-600 border border-gray-200 bg-white rounded-md px-3 py-1.5 hover:bg-gray-50 inline-flex items-center gap-1.5"
          >
            <MessageCircleQuestion className="w-3.5 h-3.5" />
            {copied === `q${index}` ? "Copied ✓" : "Ask this question"}
          </button>
        )}
        {issue.wording && (
          <button
            onClick={() => copy(`w${index}`, issue.wording!)}
            className="text-xs font-medium text-white bg-[#1D9E75] rounded-md px-3 py-1.5 hover:opacity-90 inline-flex items-center gap-1.5"
          >
            <Copy className="w-3.5 h-3.5" />
            {copied === `w${index}` ? "Copied ✓" : "Copy negotiation wording"}
          </button>
        )}
        {issue.rewrite && (
          <button
            onClick={() => setShowRewrite((v) => !v)}
            className="text-xs font-medium text-gray-600 border border-gray-200 bg-white rounded-md px-3 py-1.5 hover:bg-gray-50 inline-flex items-center gap-1.5"
          >
            <PenLine className="w-3.5 h-3.5" /> {showRewrite ? "Hide rewrite" : "Rewrite clause"}
          </button>
        )}
      </div>
    </div>
  );
}

function ReviewRow({ issue }: { issue: ResultIssue }) {
  const [open, setOpen] = useState(false);
  const { copied, copy } = useCopy();
  return (
    <div className="border-b border-gray-100 last:border-0">
      <button onClick={() => setOpen(!open)} className="w-full flex items-center gap-2 px-4 py-3 text-left hover:bg-gray-50">
        {open ? <ChevronDown className="w-4 h-4 text-gray-400" /> : <ChevronRight className="w-4 h-4 text-gray-400" />}
        <span className="text-sm text-gray-800 flex-1 min-w-0 truncate">{issue.title}</span>
        <span className={cn("text-[11px] rounded-full px-2 py-0.5 font-medium shrink-0", SEVERITY_TAG[issue.severity])}>
          {SEVERITY_LABEL[issue.severity]}
        </span>
      </button>
      {open && (
        <div className="px-10 pb-4 space-y-2">
          <p className="text-sm text-gray-600">{issue.why}</p>
          {issue.clause_text && (
            <p className="text-xs text-gray-400 italic border-l-2 border-gray-200 pl-3">&ldquo;{issue.clause_text}&rdquo;</p>
          )}
          {issue.wording && (
            <button
              onClick={() => copy(issue.title, issue.wording!)}
              className="text-xs font-medium text-[#157A5B] underline hover:opacity-80"
            >
              {copied === issue.title ? "Copied ✓" : "Copy negotiation wording"}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function StatutoryCard({ finding: f }: { finding: StatutoryFinding }) {
  const [voted, setVoted] = useState<"accepted" | "rejected" | null>(null);

  async function vote(verdict: "accepted" | "rejected") {
    if (voted) return;
    setVoted(verdict); // optimistic — feedback is a signal, not a transaction
    try {
      await fetch("/api/compliance/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ finding_id: f.id, verdict }),
      });
    } catch { /* signal lost, card state stays — not worth surfacing */ }
  }

  return (
    <div className="border border-gray-200 rounded-lg bg-white p-4 space-y-2">
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm font-medium text-gray-900">{f.issue}</p>
        <span className={cn("shrink-0 rounded px-2 py-0.5 text-xs font-medium", SEVERITY_TAG[f.severity])}>
          {SEVERITY_LABEL[f.severity]}
        </span>
      </div>
      <p className="text-sm text-gray-600">{f.explanation}</p>
      {f.suggested_fix && (
        <p className="text-sm text-gray-700">
          <span className="font-medium">Suggested fix: </span>{f.suggested_fix}
        </p>
      )}
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs text-gray-500">
          {f.citations.map((c, j) => {
            const label = [c.citation ?? f.statute_citation, c.section_ref].filter(Boolean).join(", ");
            return (
              <span key={j}>
                {j > 0 && " · "}
                {c.source_url ? (
                  <a href={c.source_url} target="_blank" rel="noopener noreferrer" className="underline hover:text-gray-700">
                    {label}
                  </a>
                ) : (
                  label
                )}
              </span>
            );
          })}
        </p>
        <span className="flex shrink-0 items-center gap-1">
          <button
            aria-label="Mark finding correct"
            disabled={!!voted}
            onClick={() => void vote("accepted")}
            className={cn("rounded p-1 hover:bg-gray-100 disabled:hover:bg-transparent",
              voted === "accepted" ? "text-green-600" : "text-gray-400")}
          >
            <ThumbsUp className="h-3.5 w-3.5" />
          </button>
          <button
            aria-label="Mark finding wrong"
            disabled={!!voted}
            onClick={() => void vote("rejected")}
            className={cn("rounded p-1 hover:bg-gray-100 disabled:hover:bg-transparent",
              voted === "rejected" ? "text-red-500" : "text-gray-400")}
          >
            <ThumbsDown className="h-3.5 w-3.5" />
          </button>
        </span>
      </div>
    </div>
  );
}

export function ResultScreen({ data }: { data: ResultData }) {
  const [showStandard, setShowStandard] = useState(false);
  const top = data.top.slice(0, 3);

  return (
    <div className="space-y-5">
      {/* 1 — Verdict band */}
      <div className={cn("rounded-xl border px-5 py-4", VERDICT_BAND[data.verdict])}>
        <p className="text-lg font-semibold text-gray-900">{VERDICT_LABEL[data.verdict]}</p>
        <p className="text-sm text-gray-600 mt-1">{data.summary}</p>
      </div>

      {data.hero}

      {/* 2 — What matters most (max 3) */}
      {top.length > 0 && (
        <section className="space-y-2">
          <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">What matters most</h2>
          {top.map((issue, i) => (
            <IssueCard key={i} issue={issue} index={i} />
          ))}
        </section>
      )}

      {/* 3 — Worth reviewing (collapsed accordion) */}
      {data.reviewing.length > 0 && (
        <section className="border border-gray-200 rounded-lg bg-white">
          <p className="px-4 pt-3 pb-1 text-xs font-semibold text-gray-500 uppercase tracking-wide">
            Worth reviewing ({data.reviewing.length})
          </p>
          {data.reviewing.map((issue, i) => (
            <ReviewRow key={i} issue={issue} />
          ))}
        </section>
      )}

      {/* 3.5 — Statutory check (grounded compliance findings, flag-gated) */}
      {data.statutory && data.statutory.length > 0 && (
        <section className="space-y-2">
          <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
            Statutory check
          </h2>
          {data.statutory.map((f) => (
            <StatutoryCard key={f.id} finding={f} />
          ))}
          <p className="text-xs text-gray-400">
            Checked against the statutory knowledge base — every finding cites its source provision.
          </p>
        </section>
      )}

      {/* 4 — Standard terms */}
      {data.standardTerms.length > 0 && (
        <section>
          <button
            onClick={() => setShowStandard((v) => !v)}
            className="text-sm text-gray-500 hover:text-gray-800 inline-flex items-center gap-1"
          >
            <Check className="w-4 h-4 text-[#1D9E75]" />
            {data.standardTerms.length} term{data.standardTerms.length !== 1 ? "s" : ""} look like normal market
            practice <ChevronRight className={cn("w-3.5 h-3.5 transition-transform", showStandard && "rotate-90")} />
          </button>
          {showStandard && (
            <ul className="mt-2 flex flex-wrap gap-1.5">
              {data.standardTerms.map((t) => (
                <li key={t} className="text-xs text-gray-600 bg-gray-100 rounded-full px-2.5 py-1">
                  {t}
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      {/* 5 — Footer */}
      <footer className="border-t border-gray-100 pt-4 flex flex-wrap items-center gap-x-4 gap-y-2">
        <p className="text-xs text-gray-400 flex-1 min-w-[240px]">
          {data.confidenceNote ?? "AI-assisted read of the document you provided — a second pair of experienced eyes, not a law firm."}
          {data.jurisdictionNote ? ` ${data.jurisdictionNote}` : ""}
        </p>
        <a
          href="mailto:hello@getgreenlit.in?subject=Lawyer%20review%20request"
          className="text-xs text-gray-500 border border-gray-200 rounded-md px-3 py-1.5 hover:bg-gray-50"
        >
          Request lawyer review
        </a>
      </footer>
    </div>
  );
}
