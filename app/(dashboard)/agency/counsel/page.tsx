"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils/cn";
import { LEGAL_CAVEAT } from "@/lib/anthropic/utils";
import { JurisdictionSelector } from "@/components/ui/jurisdiction-selector";
import {
  Upload, FileText, AlertTriangle, CheckCircle2, XCircle,
  ChevronDown, ChevronUp, Scale, Clock, Loader2,
  ShieldAlert, ShieldCheck, ShieldQuestion, Gavel,
  TrendingUp, CreditCard, Lightbulb, Search, GitCompare, Flag,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface RiskyClause {
  clause_text: string;
  issue: string;
  severity: "low" | "medium" | "high" | "critical";
  suggestion: string;
}
interface MissingClause { clause_type: string; why_needed: string; }
interface RedFlag { flag: string; explanation: string; }

interface AnalysisResult {
  risk_score: number;
  verdict: "safe" | "caution" | "high_risk" | "lawyer_required";
  risky_clauses: RiskyClause[];
  missing_clauses: MissingClause[];
  red_flags: RedFlag[];
  payment_risk: "low" | "medium" | "high";
  ip_risk: "low" | "medium" | "high";
  termination_risk: "low" | "medium" | "high";
  lawyer_escalation_required: boolean;
  lawyer_escalation_reasons: string[];
}

interface ContractRecord {
  id: string;
  title: string;
  status: string;
  risk_score: number | null;
  analysis_json: AnalysisResult | null;
  created_at: string;
  file_name: string | null;
}

interface DecodeResult {
  plain_english: string;
  what_it_means_for_you: string;
  risk_level: "low" | "medium" | "high";
}

interface RedFlagItem {
  flag_type: string;
  clause_text: string;
  severity: "low" | "medium" | "high" | "critical";
  business_impact: string;
}

interface CompareResult {
  silent_changes: Array<{ clause_type: string; version_a: string; version_b: string; risk_change: "better" | "worse" | "neutral" }>;
  worsened_clauses: Array<{ clause_type: string; explanation: string }>;
  removed_protections: Array<{ clause_type: string; why_it_mattered: string }>;
  new_obligations: Array<{ clause_type: string; explanation: string }>;
  payment_term_changes: string[];
  overall_verdict: string;
}

interface SilentChange {
  original_wording: string;
  new_wording: string;
  what_changed: string;
  why_it_matters: string;
}

type UploadState = "idle" | "uploading" | "analysing" | "done" | "error";
type Tab = "upload" | "decoder" | "compare" | "redflags";

// ─── Helpers ─────────────────────────────────────────────────────────────────

const RISK_COLOR = (score: number) =>
  score < 30 ? "text-green-400" : score < 70 ? "text-amber-400" : "text-red-400";

const RISK_BG = (score: number) =>
  score < 30 ? "bg-green-900/30 border-green-700" : score < 70 ? "bg-amber-900/30 border-amber-700" : "bg-red-900/30 border-red-700";

const VERDICT_LABEL: Record<string, string> = {
  safe: "Safe to Review",
  caution: "Caution — Negotiate",
  high_risk: "High Risk",
  lawyer_required: "Lawyer Required",
};

const VERDICT_COLOR: Record<string, string> = {
  safe: "bg-green-900/50 text-green-300 border-green-700",
  caution: "bg-amber-900/50 text-amber-300 border-amber-700",
  high_risk: "bg-red-900/50 text-red-300 border-red-700",
  lawyer_required: "bg-purple-900/50 text-purple-300 border-purple-700",
};

const SEVERITY_COLOR: Record<string, string> = {
  low: "text-slate-400",
  medium: "text-amber-400",
  high: "text-red-400",
  critical: "text-red-300 font-semibold",
};

const SEVERITY_BADGE: Record<string, string> = {
  low: "bg-slate-800 border-slate-600 text-slate-400",
  medium: "bg-amber-900/40 border-amber-700 text-amber-300",
  high: "bg-red-900/40 border-red-700 text-red-300",
  critical: "bg-red-900/60 border-red-600 text-red-200",
};

const RISK_INDICATOR: Record<string, string> = {
  low: "text-green-400",
  medium: "text-amber-400",
  high: "text-red-400",
};

const RISK_LEVEL_COLOR: Record<string, string> = {
  low: "bg-green-900/40 border-green-700 text-green-300",
  medium: "bg-amber-900/40 border-amber-700 text-amber-300",
  high: "bg-red-900/40 border-red-700 text-red-300",
};

function RiskDot({ level }: { level: "low" | "medium" | "high" }) {
  return (
    <span className={cn("inline-block w-2 h-2 rounded-full mr-1.5",
      level === "low" ? "bg-green-400" : level === "medium" ? "bg-amber-400" : "bg-red-400"
    )} />
  );
}

function ContractSelect({
  contracts,
  value,
  onChange,
  label,
}: {
  contracts: ContractRecord[];
  value: string;
  onChange: (id: string) => void;
  label: string;
}) {
  return (
    <div>
      <label className="text-xs text-slate-400 font-medium block mb-1">{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full bg-slate-800 border border-slate-700 text-white rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-green-500"
      >
        <option value="">Select a contract…</option>
        {contracts.map((c) => (
          <option key={c.id} value={c.id}>{c.title}</option>
        ))}
      </select>
    </div>
  );
}

// ─── Sub-components (upload flow) ─────────────────────────────────────────────

function RiskyClauseRow({ clause }: { clause: RiskyClause }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border border-slate-700 rounded-lg overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-slate-700/50 transition-colors"
      >
        <div className="flex items-start gap-3 min-w-0">
          <span className={cn("text-xs font-medium uppercase mt-0.5 flex-shrink-0", SEVERITY_COLOR[clause.severity])}>
            {clause.severity}
          </span>
          <span className="text-sm text-slate-200 truncate">{clause.issue}</span>
        </div>
        {open ? <ChevronUp className="w-4 h-4 text-slate-500 flex-shrink-0" /> : <ChevronDown className="w-4 h-4 text-slate-500 flex-shrink-0" />}
      </button>
      {open && (
        <div className="px-4 pb-4 space-y-3 bg-slate-800/50">
          <div className="rounded bg-slate-900/60 p-3">
            <p className="text-xs text-slate-400 mb-1 font-medium">CLAUSE TEXT</p>
            <p className="text-sm text-slate-300 italic">{clause.clause_text}</p>
          </div>
          <div className="flex gap-2 items-start">
            <Lightbulb className="w-4 h-4 text-green-400 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-green-300">{clause.suggestion}</p>
          </div>
        </div>
      )}
    </div>
  );
}

function AnalysisPanel({ analysis }: { analysis: AnalysisResult }) {
  const riskyClauses = analysis.risky_clauses ?? [];
  const missingClauses = analysis.missing_clauses ?? [];
  const redFlags = analysis.red_flags ?? [];
  const escalationReasons = analysis.lawyer_escalation_reasons ?? [];

  return (
    <div className="space-y-6">
      {analysis.lawyer_escalation_required && (
        <div className="rounded-lg border border-purple-700 bg-purple-900/30 p-4">
          <div className="flex items-center gap-2 mb-2">
            <Gavel className="w-5 h-5 text-purple-400" />
            <span className="text-purple-300 font-semibold">Do not sign without a lawyer</span>
          </div>
          <ul className="list-disc list-inside space-y-1">
            {escalationReasons.map((r, i) => (
              <li key={i} className="text-sm text-purple-300/80">{r}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className={cn("border", RISK_BG(analysis.risk_score))}>
          <CardContent className="p-6 text-center">
            <p className={cn("text-7xl font-bold tabular-nums", RISK_COLOR(analysis.risk_score))}>
              {analysis.risk_score}
            </p>
            <p className="text-slate-400 text-sm mt-1">Risk Score / 100</p>
            <div className="mt-3">
              <span className={cn("inline-block px-3 py-1 rounded-full border text-xs font-medium", VERDICT_COLOR[analysis.verdict])}>
                {VERDICT_LABEL[analysis.verdict]}
              </span>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-3">
          {(
            [
              { label: "Payment Risk", key: "payment_risk", icon: CreditCard },
              { label: "IP Rights Risk", key: "ip_risk", icon: Scale },
              { label: "Termination Risk", key: "termination_risk", icon: TrendingUp },
            ] as const
          ).map(({ label, key, icon: Icon }) => (
            <div key={key} className="flex items-center gap-3 rounded-lg border border-slate-700 bg-slate-800 p-3">
              <Icon className={cn("w-5 h-5 flex-shrink-0", RISK_INDICATOR[analysis[key]])} />
              <div className="flex-1">
                <p className="text-xs text-slate-400">{label}</p>
                <div className="flex items-center mt-0.5">
                  <RiskDot level={analysis[key]} />
                  <span className={cn("text-sm font-medium capitalize", RISK_INDICATOR[analysis[key]])}>
                    {analysis[key]}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {riskyClauses.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-slate-300 mb-3 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-400" />
            Risky Clauses ({riskyClauses.length})
          </h3>
          <div className="space-y-2">
            {riskyClauses.map((c, i) => <RiskyClauseRow key={i} clause={c} />)}
          </div>
        </div>
      )}

      {redFlags.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-slate-300 mb-3 flex items-center gap-2">
            <XCircle className="w-4 h-4 text-red-400" />
            Red Flags ({redFlags.length})
          </h3>
          <div className="space-y-2">
            {redFlags.map((f, i) => (
              <div key={i} className="rounded-lg border border-red-900/50 bg-red-900/20 p-4">
                <p className="text-sm font-medium text-red-300 mb-1">{f.flag}</p>
                <p className="text-sm text-slate-300">{f.explanation}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {missingClauses.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-slate-300 mb-3 flex items-center gap-2">
            <ShieldQuestion className="w-4 h-4 text-slate-400" />
            Missing Clauses ({missingClauses.length})
          </h3>
          <div className="space-y-2">
            {missingClauses.map((m, i) => (
              <div key={i} className="rounded-lg border border-slate-700 bg-slate-800/50 p-3">
                <p className="text-xs font-medium text-slate-400 uppercase tracking-wide capitalize">{m.clause_type}</p>
                <p className="text-sm text-slate-300 mt-1">{m.why_needed}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      <p className="text-xs text-slate-500 border-t border-slate-800 pt-4">{LEGAL_CAVEAT}</p>
    </div>
  );
}

// ─── Upload zone ──────────────────────────────────────────────────────────────

function UploadZone({
  onFileSelected,
  disabled,
}: {
  onFileSelected: (file: File, title: string) => void;
  disabled: boolean;
}) {
  const [dragOver, setDragOver] = useState(false);
  const [title, setTitle] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = (file: File) => {
    setSelectedFile(file);
    if (!title) setTitle(file.name.replace(/\.(pdf|docx)$/i, ""));
  };

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files[0];
    if (f) handleFile(f);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="space-y-4">
      <div
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
        onClick={() => !disabled && inputRef.current?.click()}
        className={cn(
          "relative border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-colors",
          dragOver ? "border-green-500 bg-green-900/10" : "border-slate-700 hover:border-slate-500 bg-slate-800/30",
          disabled && "opacity-50 cursor-not-allowed"
        )}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".pdf,.docx"
          className="hidden"
          disabled={disabled}
          onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
        />
        <Upload className="w-10 h-10 text-slate-500 mx-auto mb-3" />
        {selectedFile ? (
          <>
            <p className="text-green-400 font-medium">{selectedFile.name}</p>
            <p className="text-slate-500 text-sm mt-1">{(selectedFile.size / 1024).toFixed(0)} KB</p>
          </>
        ) : (
          <>
            <p className="text-slate-300 font-medium">Drop a contract here</p>
            <p className="text-slate-500 text-sm mt-1">PDF or DOCX · max 10 MB</p>
          </>
        )}
      </div>

      {selectedFile && (
        <div className="space-y-3">
          <div>
            <label className="text-xs text-slate-400 font-medium block mb-1">Contract title</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Brand Deal — Myntra Summer 2026"
              className="w-full bg-slate-800 border border-slate-700 text-white rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-green-500"
            />
          </div>
          <Button
            variant="greenlit"
            className="w-full"
            disabled={disabled || !title.trim()}
            onClick={() => onFileSelected(selectedFile, title.trim())}
          >
            Upload and Analyse
          </Button>
        </div>
      )}
    </div>
  );
}

// ─── Contracts list ───────────────────────────────────────────────────────────

function ContractList({
  contracts,
  selectedId,
  onSelect,
}: {
  contracts: ContractRecord[];
  selectedId: string | null;
  onSelect: (c: ContractRecord) => void;
}) {
  if (!contracts.length) return null;

  return (
    <div className="space-y-2">
      <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Previous Contracts</h3>
      <div className="space-y-1.5">
        {contracts.map((c) => (
          <button
            key={c.id}
            onClick={() => onSelect(c)}
            className={cn(
              "w-full text-left rounded-lg border px-4 py-3 transition-colors",
              selectedId === c.id
                ? "border-green-700 bg-green-900/20"
                : "border-slate-700 bg-slate-800/50 hover:border-slate-600"
            )}
          >
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <FileText className="w-4 h-4 text-slate-500 flex-shrink-0" />
                <span className="text-sm text-slate-200 truncate">{c.title}</span>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                {c.risk_score !== null && (
                  <span className={cn("text-sm font-bold tabular-nums", RISK_COLOR(c.risk_score))}>
                    {c.risk_score}
                  </span>
                )}
                <span className={cn("text-xs px-2 py-0.5 rounded-full border capitalize",
                  c.status === "reviewed"
                    ? "bg-green-900/30 border-green-800 text-green-400"
                    : "bg-slate-800 border-slate-700 text-slate-400"
                )}>
                  {c.status.replace("_", " ")}
                </span>
              </div>
            </div>
            <p className="text-xs text-slate-500 mt-1 pl-6">
              {new Date(c.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
              {c.file_name && ` · ${c.file_name}`}
            </p>
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── Tab: Clause Decoder ──────────────────────────────────────────────────────

function ClauseDecoderTab() {
  const [clauseText, setClauseText] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<DecodeResult | null>(null);
  const [error, setError] = useState("");

  async function handleDecode() {
    if (!clauseText.trim()) return;
    setLoading(true);
    setResult(null);
    setError("");
    try {
      const res = await fetch("/api/counsel/decode", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clause_text: clauseText }),
      });
      const data = await res.json() as { result?: DecodeResult; error?: string };
      if (!res.ok || !data.result) { setError(data.error ?? "Decode failed"); return; }
      setResult(data.result);
    } catch {
      setError("Network error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <label className="text-xs text-slate-400 font-medium block mb-1">Paste a clause</label>
        <textarea
          value={clauseText}
          onChange={(e) => setClauseText(e.target.value)}
          rows={6}
          placeholder="e.g. The Creator hereby irrevocably assigns all intellectual property rights in the Content to the Brand in perpetuity worldwide…"
          className="w-full bg-slate-800 border border-slate-700 text-white rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-green-500 resize-none font-mono"
        />
      </div>
      <Button
        variant="greenlit"
        className="w-full"
        disabled={loading || !clauseText.trim()}
        onClick={handleDecode}
      >
        {loading ? <><Loader2 className="w-4 h-4 animate-spin mr-2" />Decoding…</> : "Decode Clause"}
      </Button>

      {error && (
        <div className="rounded-lg border border-red-800 bg-red-900/30 p-3 flex items-start gap-2">
          <XCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-red-300">{error}</p>
        </div>
      )}

      {result && (
        <div className="space-y-3">
          <div className="rounded-lg border border-slate-700 bg-slate-800 p-4 space-y-3">
            <div>
              <p className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-1">Plain English</p>
              <p className="text-sm text-slate-200">{result.plain_english}</p>
            </div>
            <div>
              <p className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-1">What It Means For You</p>
              <p className="text-sm text-slate-200">{result.what_it_means_for_you}</p>
            </div>
            <div className="flex items-center gap-2">
              <p className="text-xs font-medium text-slate-400 uppercase tracking-wide">Risk Level</p>
              <span className={cn("px-2 py-0.5 rounded-full border text-xs font-medium capitalize", RISK_LEVEL_COLOR[result.risk_level])}>
                {result.risk_level}
              </span>
            </div>
          </div>
          <p className="text-xs text-slate-500">{LEGAL_CAVEAT}</p>
        </div>
      )}
    </div>
  );
}

// ─── Tab: Version Comparison ──────────────────────────────────────────────────

function VersionCompareTab({ contracts }: { contracts: ContractRecord[] }) {
  const [contractA, setContractA] = useState("");
  const [contractB, setContractB] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<CompareResult | null>(null);
  const [titles, setTitles] = useState<{ a: string; b: string } | null>(null);
  const [silentChanges, setSilentChanges] = useState<SilentChange[] | null>(null);
  const [error, setError] = useState("");

  async function handleCompare() {
    if (!contractA || !contractB) return;
    setLoading(true);
    setResult(null);
    setSilentChanges(null);
    setError("");
    try {
      const [compareRes, silentRes] = await Promise.all([
        fetch("/api/counsel/compare", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ contract_id_a: contractA, contract_id_b: contractB }),
        }),
        fetch("/api/counsel/silent-changes", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ contract_id_a: contractA, contract_id_b: contractB }),
        }),
      ]);
      const compareData = await compareRes.json() as { result?: CompareResult; titles?: { a: string; b: string }; error?: string };
      const silentData = await silentRes.json() as { changes?: SilentChange[]; error?: string };

      if (!compareRes.ok || !compareData.result) { setError(compareData.error ?? "Comparison failed"); return; }
      setResult(compareData.result);
      setTitles(compareData.titles ?? null);
      if (silentRes.ok && silentData.changes) setSilentChanges(silentData.changes);
    } catch {
      setError("Network error");
    } finally {
      setLoading(false);
    }
  }

  const analysedContracts = contracts.filter((c) => c.status === "reviewed");

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <ContractSelect contracts={analysedContracts} value={contractA} onChange={setContractA} label="Version A (original)" />
        <ContractSelect contracts={analysedContracts} value={contractB} onChange={setContractB} label="Version B (revised)" />
      </div>
      {analysedContracts.length < 2 && (
        <p className="text-xs text-slate-500">You need at least 2 analysed contracts to compare.</p>
      )}
      <Button
        variant="greenlit"
        className="w-full"
        disabled={loading || !contractA || !contractB || contractA === contractB}
        onClick={handleCompare}
      >
        {loading ? <><Loader2 className="w-4 h-4 animate-spin mr-2" />Comparing (Haiku→Sonnet)…</> : "Compare Versions"}
      </Button>

      {error && (
        <div className="rounded-lg border border-red-800 bg-red-900/30 p-3 flex items-start gap-2">
          <XCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-red-300">{error}</p>
        </div>
      )}

      {result && (
        <div className="space-y-5">
          {/* Overall verdict */}
          <div className="rounded-lg border border-slate-600 bg-slate-800 p-4">
            <p className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-1">Overall Verdict</p>
            <p className="text-sm text-slate-200">{result.overall_verdict}</p>
            {titles && (
              <p className="text-xs text-slate-500 mt-2">A: {titles.a} → B: {titles.b}</p>
            )}
          </div>

          {/* Silent changes (amber) */}
          {silentChanges && silentChanges.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-amber-400 mb-2 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4" />
                Silent Wording Changes ({silentChanges.length})
              </h3>
              <div className="space-y-2">
                {silentChanges.map((c, i) => (
                  <div key={i} className="rounded-lg border border-amber-800/50 bg-amber-900/10 p-3 space-y-1.5">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <div className="rounded bg-slate-900/60 p-2">
                        <p className="text-xs text-slate-500 mb-0.5">Before</p>
                        <p className="text-xs text-slate-300">{c.original_wording}</p>
                      </div>
                      <div className="rounded bg-amber-900/30 p-2">
                        <p className="text-xs text-amber-500 mb-0.5">After</p>
                        <p className="text-xs text-amber-200">{c.new_wording}</p>
                      </div>
                    </div>
                    <p className="text-xs text-slate-400"><span className="text-amber-400 font-medium">Changed:</span> {c.what_changed}</p>
                    <p className="text-xs text-slate-400"><span className="text-amber-400 font-medium">Why it matters:</span> {c.why_it_matters}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Worsened clauses (red) */}
          {result.worsened_clauses.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-red-400 mb-2 flex items-center gap-2">
                <XCircle className="w-4 h-4" />
                Worsened Clauses ({result.worsened_clauses.length})
              </h3>
              <div className="space-y-2">
                {result.worsened_clauses.map((c, i) => (
                  <div key={i} className="rounded-lg border border-red-900/50 bg-red-900/10 p-3">
                    <p className="text-xs font-medium text-red-300 uppercase tracking-wide capitalize mb-1">{c.clause_type}</p>
                    <p className="text-sm text-slate-300">{c.explanation}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Removed protections (red) */}
          {result.removed_protections.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-red-400 mb-2 flex items-center gap-2">
                <ShieldAlert className="w-4 h-4" />
                Removed Protections ({result.removed_protections.length})
              </h3>
              <div className="space-y-2">
                {result.removed_protections.map((c, i) => (
                  <div key={i} className="rounded-lg border border-red-900/50 bg-red-900/10 p-3">
                    <p className="text-xs font-medium text-red-300 uppercase tracking-wide capitalize mb-1">{c.clause_type}</p>
                    <p className="text-sm text-slate-300">{c.why_it_mattered}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* New obligations (amber) */}
          {result.new_obligations.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-amber-400 mb-2 flex items-center gap-2">
                <Clock className="w-4 h-4" />
                New Obligations ({result.new_obligations.length})
              </h3>
              <div className="space-y-2">
                {result.new_obligations.map((c, i) => (
                  <div key={i} className="rounded-lg border border-amber-800/50 bg-amber-900/10 p-3">
                    <p className="text-xs font-medium text-amber-300 uppercase tracking-wide capitalize mb-1">{c.clause_type}</p>
                    <p className="text-sm text-slate-300">{c.explanation}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Payment term changes */}
          {result.payment_term_changes.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-slate-300 mb-2 flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-slate-400" />
                Payment Term Changes
              </h3>
              <ul className="space-y-1">
                {result.payment_term_changes.map((c, i) => (
                  <li key={i} className="text-sm text-slate-300 flex items-start gap-2">
                    <span className="text-slate-500 mt-0.5">•</span>{c}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <p className="text-xs text-slate-500 border-t border-slate-800 pt-4">{LEGAL_CAVEAT}</p>
        </div>
      )}
    </div>
  );
}

// ─── Tab: Red Flags ───────────────────────────────────────────────────────────

function RedFlagsTab({ contracts }: { contracts: ContractRecord[] }) {
  const [selectedId, setSelectedId] = useState("");
  const [loading, setLoading] = useState(false);
  const [flags, setFlags] = useState<RedFlagItem[] | null>(null);
  const [error, setError] = useState("");

  const FLAG_TYPE_LABEL: Record<string, string> = {
    uncapped_indemnity: "Uncapped Indemnity",
    unlimited_liability: "Unlimited Liability",
    one_sided_termination: "One-Sided Termination",
    payment_after_satisfaction: "Payment After Satisfaction",
    perpetual_ip_assignment: "Perpetual IP Assignment",
    broad_exclusivity: "Broad Exclusivity",
    non_compete: "Non-Compete",
    moral_clause_abuse: "Moral Clause Abuse",
    confidentiality_trap: "Confidentiality Trap",
    jurisdiction_risk: "Jurisdiction Risk",
  };

  async function handleScan() {
    if (!selectedId) return;
    setLoading(true);
    setFlags(null);
    setError("");
    try {
      const res = await fetch("/api/counsel/redflags", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contract_id: selectedId }),
      });
      const data = await res.json() as { flags?: RedFlagItem[]; error?: string };
      if (!res.ok || !data.flags) { setError(data.error ?? "Scan failed"); return; }
      setFlags(data.flags);
    } catch {
      setError("Network error");
    } finally {
      setLoading(false);
    }
  }

  const analysedContracts = contracts.filter((c) => c.status === "reviewed");

  return (
    <div className="space-y-4">
      <ContractSelect contracts={analysedContracts} value={selectedId} onChange={setSelectedId} label="Select contract to scan" />
      {analysedContracts.length === 0 && (
        <p className="text-xs text-slate-500">Analyse a contract first to enable red flag scanning.</p>
      )}
      <Button
        variant="greenlit"
        className="w-full"
        disabled={loading || !selectedId}
        onClick={handleScan}
      >
        {loading ? <><Loader2 className="w-4 h-4 animate-spin mr-2" />Scanning…</> : "Scan for Red Flags"}
      </Button>

      {error && (
        <div className="rounded-lg border border-red-800 bg-red-900/30 p-3 flex items-start gap-2">
          <XCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-red-300">{error}</p>
        </div>
      )}

      {flags !== null && (
        <div className="space-y-3">
          {flags.length === 0 ? (
            <div className="rounded-lg border border-green-800 bg-green-900/20 p-4 flex items-center gap-3">
              <ShieldCheck className="w-5 h-5 text-green-400" />
              <p className="text-sm text-green-300">No red flags detected in this contract.</p>
            </div>
          ) : (
            <>
              <p className="text-sm text-slate-400">{flags.length} flag{flags.length !== 1 ? "s" : ""} found</p>
              <div className="space-y-3">
                {flags.map((f, i) => (
                  <div key={i} className="rounded-lg border border-slate-700 bg-slate-800 p-4 space-y-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={cn("px-2 py-0.5 rounded-full border text-xs font-medium", SEVERITY_BADGE[f.severity])}>
                        {f.severity.toUpperCase()}
                      </span>
                      <span className="text-sm font-medium text-slate-200">
                        {FLAG_TYPE_LABEL[f.flag_type] ?? f.flag_type}
                      </span>
                    </div>
                    {f.clause_text && (
                      <div className="rounded bg-slate-900/60 p-2">
                        <p className="text-xs text-slate-400 mb-0.5">Clause</p>
                        <p className="text-xs text-slate-300 italic">{f.clause_text}</p>
                      </div>
                    )}
                    <p className="text-sm text-slate-300">{f.business_impact}</p>
                  </div>
                ))}
              </div>
            </>
          )}
          <p className="text-xs text-slate-500">{LEGAL_CAVEAT}</p>
        </div>
      )}
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function CounselPage() {
  const [activeTab, setActiveTab] = useState<Tab>("upload");
  const [jurisdiction, setJurisdiction] = useState("IN");
  const [uploadState, setUploadState] = useState<UploadState>("idle");
  const [statusMsg, setStatusMsg] = useState("");
  const [textPreview, setTextPreview] = useState<string | null>(null);
  const [activeContractId, setActiveContractId] = useState<string | null>(null);
  const [activeAnalysis, setActiveAnalysis] = useState<AnalysisResult | null>(null);
  const [contracts, setContracts] = useState<ContractRecord[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const { data } = await supabase
        .from("contracts")
        .select("id, title, status, risk_score, analysis_json, created_at, file_name")
        .order("created_at", { ascending: false })
        .limit(20);
      if (data) setContracts(data as ContractRecord[]);
    }
    load();
  }, []);

  async function handleUploadAndAnalyse(file: File, title: string) {
    setError("");
    setUploadState("uploading");
    setStatusMsg("Uploading contract…");
    setTextPreview(null);
    setActiveAnalysis(null);

    try {
      const form = new FormData();
      form.append("file", file);
      form.append("title", title);

      const uploadRes = await fetch("/api/counsel/upload", { method: "POST", body: form });
      const uploadData = await uploadRes.json() as {
        contract_id?: string;
        text_preview?: string | null;
        extraction_error?: string | null;
        extraction_success?: boolean;
        error?: string;
      };

      if (!uploadRes.ok || !uploadData.contract_id) {
        setError(uploadData.error ?? "Upload failed");
        setUploadState("error");
        return;
      }

      const { contract_id, text_preview, extraction_error, extraction_success } = uploadData;
      setActiveContractId(contract_id);
      setTextPreview(text_preview ?? null);

      if (!extraction_success) {
        setError(`Text extraction failed: ${extraction_error ?? "Unknown error"}. Analysis is not possible for this file.`);
        setUploadState("error");
        return;
      }

      setUploadState("analysing");
      setStatusMsg("Analysing contract (2-pass AI)…");

      const analyseRes = await fetch("/api/counsel/analyse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contract_id, jurisdiction }),
      });
      const analyseData = await analyseRes.json() as { analysis?: AnalysisResult; error?: string };

      if (!analyseRes.ok || !analyseData.analysis) {
        setError(analyseData.error ?? "Analysis failed");
        setUploadState("error");
        return;
      }

      setActiveAnalysis(analyseData.analysis);
      setUploadState("done");

      const supabase = createClient();
      const { data } = await supabase
        .from("contracts")
        .select("id, title, status, risk_score, analysis_json, created_at, file_name")
        .order("created_at", { ascending: false })
        .limit(20);
      if (data) setContracts(data as ContractRecord[]);
    } catch {
      setError("Contract upload or analysis could not reach the service. Please try again.");
      setUploadState("error");
    }
  }

  function handleSelectContract(c: ContractRecord) {
    setActiveContractId(c.id);
    setActiveAnalysis(c.analysis_json);
    setTextPreview(null);
    setError("");
    setUploadState(c.status === "reviewed" ? "done" : "idle");
  }

  const isWorking = uploadState === "uploading" || uploadState === "analysing";

  const TABS: Array<{ id: Tab; label: string; icon: React.ElementType }> = [
    { id: "upload", label: "Upload & Analyse", icon: Upload },
    { id: "decoder", label: "Clause Decoder", icon: Search },
    { id: "compare", label: "Version Compare", icon: GitCompare },
    { id: "redflags", label: "Red Flags", icon: Flag },
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-2">
            <Scale className="w-7 h-7 text-green-400" />
            <h1 className="text-3xl font-bold text-white">Counsel</h1>
          </div>
          <p className="text-slate-400">AI-powered contract analysis, clause decoding, and red flag detection.</p>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-6 bg-slate-900 rounded-lg p-1 overflow-x-auto">
          {TABS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors whitespace-nowrap flex-shrink-0",
                activeTab === id
                  ? "bg-green-600 text-white"
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-800"
              )}
            >
              <Icon className="w-4 h-4" />
              {label}
            </button>
          ))}
        </div>

        {/* Tab: Upload & Analyse */}
        {activeTab === "upload" && (
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
            <div className="lg:col-span-2 space-y-6">
              <Card className="bg-slate-800 border-slate-700">
                <CardHeader className="pb-4">
                  <CardTitle className="text-white text-base">Upload Contract</CardTitle>
                  <CardDescription className="text-slate-400">PDF or DOCX · 10 MB max</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center gap-2">
                    <JurisdictionSelector value={jurisdiction} onChange={setJurisdiction} />
                  </div>
                  <UploadZone onFileSelected={handleUploadAndAnalyse} disabled={isWorking} />
                </CardContent>
              </Card>

              {isWorking && (
                <div className="rounded-lg border border-slate-700 bg-slate-800 p-4 flex items-center gap-3">
                  <Loader2 className="w-5 h-5 text-green-400 animate-spin flex-shrink-0" />
                  <div>
                    <p className="text-sm text-white font-medium">{statusMsg}</p>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {uploadState === "analysing" ? "Haiku → Sonnet two-pass analysis running…" : "Uploading and extracting text…"}
                    </p>
                  </div>
                </div>
              )}

              {textPreview && (
                <div className="rounded-lg border border-slate-700 bg-slate-800 p-4">
                  <p className="text-xs text-slate-400 font-medium mb-2">EXTRACTED TEXT PREVIEW</p>
                  <p className="text-xs text-slate-300 font-mono leading-relaxed line-clamp-6">{textPreview}</p>
                </div>
              )}

              <ContractList
                contracts={contracts}
                selectedId={activeContractId}
                onSelect={handleSelectContract}
              />
            </div>

            <div className="lg:col-span-3">
              {error && (
                <div className="rounded-lg border border-red-800 bg-red-900/30 p-4 mb-4 flex items-start gap-3">
                  <XCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-red-300">Error</p>
                    <p className="text-sm text-red-300/80 mt-1">{error}</p>
                  </div>
                </div>
              )}

              {activeAnalysis ? (
                <Card className="bg-slate-800 border-slate-700">
                  <CardHeader className="pb-4">
                    <div className="flex items-center gap-2">
                      {activeAnalysis.lawyer_escalation_required
                        ? <ShieldAlert className="w-5 h-5 text-purple-400" />
                        : (activeAnalysis.risk_score ?? 100) < 30
                        ? <ShieldCheck className="w-5 h-5 text-green-400" />
                        : <ShieldQuestion className="w-5 h-5 text-amber-400" />
                      }
                      <CardTitle className="text-white text-base">Analysis Results</CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <AnalysisPanel analysis={activeAnalysis} />
                  </CardContent>
                </Card>
              ) : !isWorking && !error ? (
                <div className="h-full flex items-center justify-center">
                  <div className="text-center py-20">
                    <FileText className="w-16 h-16 text-slate-700 mx-auto mb-4" />
                    <p className="text-slate-500 text-lg font-medium">No contract selected</p>
                    <p className="text-slate-600 text-sm mt-2">Upload a new contract or select one from the list</p>
                  </div>
                </div>
              ) : null}

              {uploadState === "done" && activeAnalysis && (
                <div className="mt-4 rounded-lg border border-green-900/50 bg-green-900/10 p-3 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-green-400 flex-shrink-0" />
                  <p className="text-sm text-green-400">Analysis saved. Reload the page anytime — results persist.</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Tab: Clause Decoder */}
        {activeTab === "decoder" && (
          <div className="max-w-2xl">
            <Card className="bg-slate-800 border-slate-700">
              <CardHeader className="pb-4">
                <CardTitle className="text-white text-base flex items-center gap-2">
                  <Search className="w-5 h-5 text-green-400" />
                  Clause Decoder
                </CardTitle>
                <CardDescription className="text-slate-400">Paste any clause — get a plain English explanation instantly.</CardDescription>
              </CardHeader>
              <CardContent>
                <ClauseDecoderTab />
              </CardContent>
            </Card>
          </div>
        )}

        {/* Tab: Version Compare */}
        {activeTab === "compare" && (
          <div className="max-w-3xl">
            <Card className="bg-slate-800 border-slate-700">
              <CardHeader className="pb-4">
                <CardTitle className="text-white text-base flex items-center gap-2">
                  <GitCompare className="w-5 h-5 text-green-400" />
                  Version Comparison
                </CardTitle>
                <CardDescription className="text-slate-400">
                  Compare two versions of the same contract. Silent changes highlighted in amber, worsened clauses in red.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <VersionCompareTab contracts={contracts} />
              </CardContent>
            </Card>
          </div>
        )}

        {/* Tab: Red Flags */}
        {activeTab === "redflags" && (
          <div className="max-w-2xl">
            <Card className="bg-slate-800 border-slate-700">
              <CardHeader className="pb-4">
                <CardTitle className="text-white text-base flex items-center gap-2">
                  <Flag className="w-5 h-5 text-red-400" />
                  Red Flag Scanner
                </CardTitle>
                <CardDescription className="text-slate-400">
                  Deep scan for dangerous clause patterns — uncapped liability, perpetual IP, moral clause abuse, and more.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <RedFlagsTab contracts={contracts} />
              </CardContent>
            </Card>
          </div>
        )}

      </div>
    </div>
  );
}
