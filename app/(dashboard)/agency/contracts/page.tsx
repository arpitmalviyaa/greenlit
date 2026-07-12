"use client";

import { useState, useRef, useCallback, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils/cn";
import { JurisdictionSelector } from "@/components/ui/jurisdiction-selector";
import { ResultScreen, type ResultData, type ResultIssue, type StatutoryFinding } from "@/components/analysis/result-screen";
import { analysisToResult, type AnyAnalysis } from "@/lib/utils/analysis-map";
import { DEMO_ANALYSIS, DEMO_CONTRACT_TITLE } from "@/lib/demo-analysis";
import { verdictFromRisk, VERDICT_CHIP, VERDICT_LABEL } from "@/lib/utils/verdict";
import {
  Upload, FileText, GitCompare, Search, Flag, Loader2, Sparkles, X,
} from "lucide-react";

// ─── Types ───────────────────────────────────────────────────────────────────

interface ContractRecord {
  id: string;
  title: string;
  status: string;
  risk_score: number | null;
  analysis_json: AnyAnalysis | null;
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

interface NdaTrap {
  clause_excerpt: string;
  trap_type: string;
  explanation: string;
  severity: "low" | "medium" | "high" | "critical";
}

type DocType = "contract" | "nda";
type Tab = "analyse" | "decoder" | "compare" | "redflags";
type UploadState = "idle" | "uploading" | "analysing" | "done" | "error";

// ─── Small shared bits ───────────────────────────────────────────────────────

const inputCls =
  "w-full bg-white border border-gray-300 text-gray-900 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[#1D9E75]";

function ErrorNote({ message }: { message: string }) {
  if (!message) return null;
  return (
    <div className="rounded-lg border border-amber-300 bg-amber-50 p-3">
      <p className="text-sm text-amber-900">{message}</p>
    </div>
  );
}

function ContractSelect({
  contracts, value, onChange, label,
}: {
  contracts: ContractRecord[]; value: string; onChange: (id: string) => void; label: string;
}) {
  return (
    <div>
      <label className="text-xs text-gray-500 font-medium block mb-1">{label}</label>
      <select value={value} onChange={(e) => onChange(e.target.value)} className={inputCls}>
        <option value="">Select a contract…</option>
        {contracts.map((c) => (
          <option key={c.id} value={c.id}>{c.title}</option>
        ))}
      </select>
    </div>
  );
}

// ─── Upload zone ─────────────────────────────────────────────────────────────

function UploadZone({ onFileSelected, disabled }: { onFileSelected: (file: File, title: string) => void; disabled: boolean }) {
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
          "border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-colors bg-white",
          dragOver ? "border-[#1D9E75] bg-[#1D9E75]/5" : "border-gray-300 hover:border-gray-400",
          disabled && "opacity-50 cursor-not-allowed"
        )}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".pdf,.docx,image/*"
          className="hidden"
          disabled={disabled}
          onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
        />
        <Upload className="w-10 h-10 text-gray-300 mx-auto mb-3" />
        {selectedFile ? (
          <>
            <p className="text-[#157A5B] font-medium">{selectedFile.name}</p>
            <p className="text-gray-400 text-sm mt-1">{(selectedFile.size / 1024).toFixed(0)} KB</p>
          </>
        ) : (
          <>
            <p className="text-gray-700 font-medium">Drop a contract, or take a photo</p>
            <p className="text-gray-400 text-sm mt-1">PDF, DOCX, or a photo · max 15 MB</p>
          </>
        )}
      </div>

      {selectedFile && (
        <div className="space-y-3">
          <div>
            <label className="text-xs text-gray-500 font-medium block mb-1">Contract title</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Brand Deal — Myntra Summer 2026"
              className={inputCls}
            />
          </div>
          <button
            className="w-full bg-[#1D9E75] text-white rounded-md py-2.5 text-sm font-medium hover:opacity-90 disabled:opacity-50"
            disabled={disabled || !title.trim()}
            onClick={() => onFileSelected(selectedFile, title.trim())}
          >
            Upload and analyse
          </button>
        </div>
      )}
    </div>
  );
}

// ─── NDA scan (document-type choice inside Contracts) ────────────────────────

function ndaToResult(r: {
  traps: NdaTrap[]; safe_clauses: string[]; overall_verdict: string; recommended_redlines: string[];
}): ResultData {
  const order = { critical: 4, high: 3, medium: 2, low: 1 } as const;
  const issues = [...r.traps]
    .sort((a, b) => (order[b.severity] ?? 2) - (order[a.severity] ?? 2))
    .map<ResultIssue>((t, i) => ({
      title: t.trap_type,
      why: t.explanation,
      clause_text: t.clause_excerpt,
      severity: t.severity,
      wording: r.recommended_redlines[i],
    }));
  const verdict = r.overall_verdict === "dangerous" ? "hold" : r.overall_verdict === "caution" ? "negotiate" : "safe";
  return {
    verdict,
    summary:
      issues.length === 0
        ? "This NDA reads like a standard mutual confidentiality agreement."
        : `${issues.length} term${issues.length !== 1 ? "s" : ""} in this NDA go beyond standard confidentiality — worth adjusting before you sign.`,
    top: issues.slice(0, 3),
    reviewing: issues.slice(3),
    standardTerms: r.safe_clauses,
  };
}

function NdaScan() {
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ResultData | null>(null);
  const [error, setError] = useState("");

  async function handleScan() {
    setLoading(true);
    setError("");
    setResult(null);
    try {
      const res = await fetch("/api/nda/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nda_text: text }),
      });
      const data = await res.json() as { traps?: NdaTrap[]; safe_clauses?: string[]; overall_verdict?: string; recommended_redlines?: string[]; error?: string };
      if (!res.ok) { setError(data.error ?? "The NDA check could not finish. Please try again."); return; }
      setResult(ndaToResult({
        traps: data.traps ?? [],
        safe_clauses: data.safe_clauses ?? [],
        overall_verdict: data.overall_verdict ?? "caution",
        recommended_redlines: data.recommended_redlines ?? [],
      }));
    } catch {
      setError("Could not reach the service. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div className="space-y-3">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={14}
          placeholder="Paste the NDA text here…"
          className={cn(inputCls, "resize-none font-mono text-xs leading-relaxed")}
        />
        <button
          className="w-full bg-[#1D9E75] text-white rounded-md py-2.5 text-sm font-medium hover:opacity-90 disabled:opacity-50"
          disabled={loading || text.trim().length < 100}
          onClick={handleScan}
        >
          {loading ? <span className="inline-flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" />Checking NDA…</span> : "Check this NDA"}
        </button>
        {text.trim().length > 0 && text.trim().length < 100 && (
          <p className="text-xs text-gray-400">Paste the full NDA text (at least a few paragraphs).</p>
        )}
        <ErrorNote message={error} />
      </div>
      <div>
        {result ? (
          <ResultScreen data={result} />
        ) : (
          <div className="h-full min-h-[200px] flex items-center justify-center text-center text-gray-400 text-sm border border-dashed border-gray-200 rounded-lg">
            The NDA read appears here.
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Tab: Decode a clause ────────────────────────────────────────────────────

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
      if (!res.ok || !data.result) { setError(data.error ?? "The decode could not finish. Please try again."); return; }
      setResult(data.result);
    } catch {
      setError("Could not reach the service. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  const RISK_NOTE: Record<string, string> = {
    low: "Common term — generally fine to accept.",
    medium: "Common term, but worth a closer look before accepting.",
    high: "This gives the other side more than market norm — consider negotiating.",
  };

  return (
    <div className="max-w-2xl space-y-4">
      <div>
        <label className="text-xs text-gray-500 font-medium block mb-1">Paste a clause</label>
        <textarea
          value={clauseText}
          onChange={(e) => setClauseText(e.target.value)}
          rows={6}
          placeholder="e.g. The Creator hereby irrevocably assigns all intellectual property rights in the Content to the Brand in perpetuity worldwide…"
          className={cn(inputCls, "resize-none font-mono text-xs leading-relaxed")}
        />
      </div>
      <button
        className="w-full bg-[#1D9E75] text-white rounded-md py-2.5 text-sm font-medium hover:opacity-90 disabled:opacity-50"
        disabled={loading || !clauseText.trim()}
        onClick={handleDecode}
      >
        {loading ? <span className="inline-flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" />Decoding…</span> : "Decode clause"}
      </button>

      <ErrorNote message={error} />

      {result && (
        <div className="rounded-lg border border-gray-200 bg-white p-4 space-y-3">
          <div>
            <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-1">In plain English</p>
            <p className="text-sm text-gray-800">{result.plain_english}</p>
          </div>
          <div>
            <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-1">What it means for you</p>
            <p className="text-sm text-gray-800">{result.what_it_means_for_you}</p>
          </div>
          <p className="text-sm text-gray-600 border-t border-gray-100 pt-3">{RISK_NOTE[result.risk_level]}</p>
        </div>
      )}
    </div>
  );
}

// ─── Tab: Compare versions ───────────────────────────────────────────────────

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

      if (!compareRes.ok || !compareData.result) { setError(compareData.error ?? "The comparison could not finish. Please try again."); return; }
      setResult(compareData.result);
      setTitles(compareData.titles ?? null);
      if (silentRes.ok && silentData.changes) setSilentChanges(silentData.changes);
    } catch {
      setError("Could not reach the service. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  const analysedContracts = contracts.filter((c) => c.status === "reviewed");

  return (
    <div className="max-w-3xl space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <ContractSelect contracts={analysedContracts} value={contractA} onChange={setContractA} label="Version A (original)" />
        <ContractSelect contracts={analysedContracts} value={contractB} onChange={setContractB} label="Version B (revised)" />
      </div>
      {analysedContracts.length < 2 && (
        <p className="text-xs text-gray-400">You need at least 2 analysed contracts to compare.</p>
      )}
      <button
        className="w-full bg-[#1D9E75] text-white rounded-md py-2.5 text-sm font-medium hover:opacity-90 disabled:opacity-50"
        disabled={loading || !contractA || !contractB || contractA === contractB}
        onClick={handleCompare}
      >
        {loading ? <span className="inline-flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" />Comparing…</span> : "Compare versions"}
      </button>

      <ErrorNote message={error} />

      {result && (
        <div className="space-y-5">
          <div className="rounded-lg border border-gray-200 bg-white p-4">
            <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-1">Overall read</p>
            <p className="text-sm text-gray-800">{result.overall_verdict}</p>
            {titles && <p className="text-xs text-gray-400 mt-2">A: {titles.a} → B: {titles.b}</p>}
          </div>

          {silentChanges && silentChanges.length > 0 && (
            <section>
              <h3 className="text-sm font-semibold text-gray-800 mb-2">Quiet wording changes ({silentChanges.length})</h3>
              <div className="space-y-2">
                {silentChanges.map((c, i) => (
                  <div key={i} className="rounded-lg border border-amber-200 bg-amber-50/50 p-3 space-y-1.5">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <div className="rounded bg-white border border-gray-100 p-2">
                        <p className="text-xs text-gray-400 mb-0.5">Before</p>
                        <p className="text-xs text-gray-700">{c.original_wording}</p>
                      </div>
                      <div className="rounded bg-amber-100/60 p-2">
                        <p className="text-xs text-amber-700 mb-0.5">After</p>
                        <p className="text-xs text-amber-900">{c.new_wording}</p>
                      </div>
                    </div>
                    <p className="text-xs text-gray-600"><span className="font-medium">Changed:</span> {c.what_changed}</p>
                    <p className="text-xs text-gray-600"><span className="font-medium">Why it matters:</span> {c.why_it_matters}</p>
                  </div>
                ))}
              </div>
            </section>
          )}

          {result.worsened_clauses.length > 0 && (
            <section>
              <h3 className="text-sm font-semibold text-gray-800 mb-2">Terms that moved against you ({result.worsened_clauses.length})</h3>
              <div className="space-y-2">
                {result.worsened_clauses.map((c, i) => (
                  <div key={i} className="rounded-lg border border-gray-200 bg-white p-3">
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wide capitalize mb-1">{c.clause_type}</p>
                    <p className="text-sm text-gray-700">{c.explanation}</p>
                  </div>
                ))}
              </div>
            </section>
          )}

          {result.removed_protections.length > 0 && (
            <section>
              <h3 className="text-sm font-semibold text-gray-800 mb-2">Protections that were removed ({result.removed_protections.length})</h3>
              <div className="space-y-2">
                {result.removed_protections.map((c, i) => (
                  <div key={i} className="rounded-lg border border-gray-200 bg-white p-3">
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wide capitalize mb-1">{c.clause_type}</p>
                    <p className="text-sm text-gray-700">{c.why_it_mattered}</p>
                  </div>
                ))}
              </div>
            </section>
          )}

          {result.new_obligations.length > 0 && (
            <section>
              <h3 className="text-sm font-semibold text-gray-800 mb-2">New obligations on you ({result.new_obligations.length})</h3>
              <div className="space-y-2">
                {result.new_obligations.map((c, i) => (
                  <div key={i} className="rounded-lg border border-gray-200 bg-white p-3">
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wide capitalize mb-1">{c.clause_type}</p>
                    <p className="text-sm text-gray-700">{c.explanation}</p>
                  </div>
                ))}
              </div>
            </section>
          )}

          {result.payment_term_changes.length > 0 && (
            <section>
              <h3 className="text-sm font-semibold text-gray-800 mb-2">Payment term changes</h3>
              <ul className="space-y-1">
                {result.payment_term_changes.map((c, i) => (
                  <li key={i} className="text-sm text-gray-700 flex items-start gap-2">
                    <span className="text-gray-300 mt-0.5">•</span>{c}
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Tab: Red flags ──────────────────────────────────────────────────────────

const FLAG_TYPE_LABEL: Record<string, string> = {
  uncapped_indemnity: "Liability with no upper limit",
  unlimited_liability: "Liability with no upper limit",
  one_sided_termination: "One-sided exit rights",
  payment_after_satisfaction: "Payment gated on brand satisfaction",
  perpetual_ip_assignment: "Content rights assigned forever",
  broad_exclusivity: "Exclusivity beyond market norm",
  non_compete: "Non-compete restriction",
  moral_clause_abuse: "Overly broad conduct clause",
  confidentiality_trap: "Confidentiality beyond market norm",
  jurisdiction_risk: "Disputes handled in an inconvenient forum",
};

function RedFlagsTab({ contracts }: { contracts: ContractRecord[] }) {
  const [selectedId, setSelectedId] = useState("");
  const [loading, setLoading] = useState(false);
  const [flags, setFlags] = useState<RedFlagItem[] | null>(null);
  const [error, setError] = useState("");

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
      if (!res.ok || !data.flags) { setError(data.error ?? "The scan could not finish. Please try again."); return; }
      setFlags(data.flags);
    } catch {
      setError("Could not reach the service. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  const analysedContracts = contracts.filter((c) => c.status === "reviewed");

  return (
    <div className="max-w-2xl space-y-4">
      <ContractSelect contracts={analysedContracts} value={selectedId} onChange={setSelectedId} label="Select contract to scan" />
      {analysedContracts.length === 0 && (
        <p className="text-xs text-gray-400">Analyse a contract first to enable pattern scanning.</p>
      )}
      <button
        className="w-full bg-[#1D9E75] text-white rounded-md py-2.5 text-sm font-medium hover:opacity-90 disabled:opacity-50"
        disabled={loading || !selectedId}
        onClick={handleScan}
      >
        {loading ? <span className="inline-flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" />Scanning…</span> : "Scan for known patterns"}
      </button>

      <ErrorNote message={error} />

      {flags !== null && (
        <div className="space-y-3">
          {flags.length === 0 ? (
            <div className="rounded-lg border border-[#1D9E75]/30 bg-[#1D9E75]/5 p-4">
              <p className="text-sm text-[#157A5B]">No known trap patterns found in this contract.</p>
            </div>
          ) : (
            <>
              <p className="text-sm text-gray-500">{flags.length} pattern{flags.length !== 1 ? "s" : ""} worth attention</p>
              <div className="space-y-3">
                {flags.map((f, i) => (
                  <div key={i} className="rounded-lg border border-gray-200 bg-white p-4 space-y-2">
                    <p className="text-sm font-semibold text-gray-900">{FLAG_TYPE_LABEL[f.flag_type] ?? f.flag_type}</p>
                    {f.clause_text && (
                      <p className="text-xs text-gray-400 italic border-l-2 border-gray-200 pl-3">&ldquo;{f.clause_text}&rdquo;</p>
                    )}
                    <p className="text-sm text-gray-700">{f.business_impact}</p>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Main page ───────────────────────────────────────────────────────────────

function ContractsPageInner() {
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState<Tab>("analyse");
  const [docType, setDocType] = useState<DocType>("contract");
  const [jurisdiction, setJurisdiction] = useState("IN");
  const [uploadState, setUploadState] = useState<UploadState>("idle");
  const [statusMsg, setStatusMsg] = useState("");
  const [activeContractId, setActiveContractId] = useState<string | null>(null);
  const [activeResult, setActiveResult] = useState<ResultData | null>(null);
  const [contracts, setContracts] = useState<ContractRecord[]>([]);
  const [error, setError] = useState("");
  const [demo, setDemo] = useState(searchParams.get("demo") === "1");

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
    setDemo(false);
    setUploadState("uploading");
    setStatusMsg("Uploading contract…");
    setActiveResult(null);

    try {
      const form = new FormData();
      form.append("file", file);
      form.append("title", title);

      const uploadRes = await fetch("/api/counsel/upload", { method: "POST", body: form });
      const uploadData = await uploadRes.json() as {
        contract_id?: string;
        extraction_error?: string | null;
        extraction_success?: boolean;
        error?: string;
      };

      if (!uploadRes.ok || !uploadData.contract_id) {
        setError(uploadData.error ?? "The upload could not finish. Please try again.");
        setUploadState("error");
        return;
      }

      if (!uploadData.extraction_success) {
        setError(`We couldn't read the text in this file (${uploadData.extraction_error ?? "unknown reason"}). Try a text-based PDF or DOCX.`);
        setUploadState("error");
        return;
      }

      setActiveContractId(uploadData.contract_id);
      setUploadState("analysing");
      setStatusMsg("Reading the contract…");

      const analyseRes = await fetch("/api/counsel/analyse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contract_id: uploadData.contract_id, jurisdiction }),
      });
      const analyseData = await analyseRes.json() as {
        analysis?: AnyAnalysis;
        compliance?: { status: string; findings: StatutoryFinding[] };
        error?: string;
      };

      if (!analyseRes.ok || !analyseData.analysis) {
        setError(analyseData.error ?? "The analysis could not finish. Please try again.");
        setUploadState("error");
        return;
      }

      const mapped = analysisToResult(analyseData.analysis, jurisdiction);
      if (analyseData.compliance?.findings?.length) mapped.statutory = analyseData.compliance.findings;
      setActiveResult(mapped);
      setUploadState("done");

      const supabase = createClient();
      const { data } = await supabase
        .from("contracts")
        .select("id, title, status, risk_score, analysis_json, created_at, file_name")
        .order("created_at", { ascending: false })
        .limit(20);
      if (data) setContracts(data as ContractRecord[]);
    } catch {
      setError("Could not reach the service. Please try again.");
      setUploadState("error");
    }
  }

  function handleSelectContract(c: ContractRecord) {
    setDemo(false);
    setActiveContractId(c.id);
    setActiveResult(c.analysis_json ? analysisToResult(c.analysis_json) : null);
    setError("");
    setUploadState(c.status === "reviewed" ? "done" : "idle");
  }

  const isWorking = uploadState === "uploading" || uploadState === "analysing";

  const TABS: Array<{ id: Tab; label: string; icon: React.ElementType }> = [
    { id: "analyse", label: "Analyse", icon: Upload },
    { id: "decoder", label: "Decode a clause", icon: Search },
    { id: "compare", label: "Compare versions", icon: GitCompare },
    { id: "redflags", label: "Known patterns", icon: Flag },
  ];

  return (
    <div className="p-6 max-w-6xl space-y-5">
      <h1 className="text-lg font-semibold text-gray-900">Contracts</h1>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-lg p-1 overflow-x-auto w-fit">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors whitespace-nowrap",
              activeTab === id ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-800"
            )}
          >
            <Icon className="w-4 h-4" />
            {label}
          </button>
        ))}
      </div>

      {activeTab === "analyse" && (
        <>
          {/* Document type choice */}
          <div className="flex items-center gap-2">
            {(
              [
                ["contract", "Brand deal / campaign contract"],
                ["nda", "NDA"],
              ] as Array<[DocType, string]>
            ).map(([t, label]) => (
              <button
                key={t}
                onClick={() => setDocType(t)}
                className={cn(
                  "text-xs font-medium rounded-full px-3.5 py-1.5 border transition-colors",
                  docType === t
                    ? "border-[#1D9E75] bg-[#1D9E75]/10 text-[#157A5B]"
                    : "border-gray-200 text-gray-500 hover:border-gray-300"
                )}
              >
                {label}
              </button>
            ))}
          </div>

          {docType === "nda" ? (
            <NdaScan />
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
              <div className="lg:col-span-2 space-y-5">
                <div className="space-y-4">
                  <JurisdictionSelector value={jurisdiction} onChange={setJurisdiction} />
                  <UploadZone onFileSelected={handleUploadAndAnalyse} disabled={isWorking} />
                </div>

                {isWorking && (
                  <div className="rounded-lg border border-gray-200 bg-white p-4 flex items-center gap-3">
                    <Loader2 className="w-5 h-5 text-[#1D9E75] animate-spin flex-shrink-0" />
                    <div>
                      <p className="text-sm text-gray-900 font-medium">{statusMsg}</p>
                      <p className="text-xs text-gray-400 mt-0.5">Usually under a minute.</p>
                    </div>
                  </div>
                )}

                {contracts.length > 0 && (
                  <div className="space-y-2">
                    <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Previous contracts</h3>
                    <div className="space-y-1.5">
                      {contracts.map((c) => {
                        const v = verdictFromRisk(c.risk_score);
                        return (
                          <button
                            key={c.id}
                            onClick={() => handleSelectContract(c)}
                            className={cn(
                              "w-full text-left rounded-lg border px-4 py-3 transition-colors bg-white",
                              activeContractId === c.id ? "border-[#1D9E75]" : "border-gray-200 hover:border-gray-300"
                            )}
                          >
                            <div className="flex items-center justify-between gap-2">
                              <div className="flex items-center gap-2 min-w-0">
                                <FileText className="w-4 h-4 text-gray-300 flex-shrink-0" />
                                <span className="text-sm text-gray-800 truncate">{c.title}</span>
                              </div>
                              {c.status === "reviewed" ? (
                                <span className={cn("text-[11px] px-2 py-0.5 rounded-full border shrink-0", VERDICT_CHIP[v])}>
                                  {VERDICT_LABEL[v]}
                                </span>
                              ) : (
                                <span className="text-[11px] px-2 py-0.5 rounded-full border border-gray-200 text-gray-400 capitalize shrink-0">
                                  {c.status.replace("_", " ")}
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-gray-400 mt-1 pl-6">
                              {new Date(c.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                            </p>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              <div className="lg:col-span-3 space-y-4">
                {demo && (
                  <div className="rounded-lg border border-[#1D9E75]/30 bg-[#1D9E75]/5 px-4 py-3 flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-[#1D9E75] shrink-0" />
                    <p className="text-sm text-gray-700 flex-1">
                      <span className="font-medium">Sample analysis</span> — {DEMO_CONTRACT_TITLE}. Upload your own contract to get a real one.
                    </p>
                    <button onClick={() => setDemo(false)} className="text-gray-400 hover:text-gray-600">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                )}
                <ErrorNote message={error} />
                {demo ? (
                  <ResultScreen data={analysisToResult(DEMO_ANALYSIS, "IN")} />
                ) : activeResult ? (
                  <ResultScreen data={activeResult} />
                ) : !isWorking && !error ? (
                  <div className="min-h-[300px] flex items-center justify-center text-center border border-dashed border-gray-200 rounded-lg">
                    <div>
                      <FileText className="w-12 h-12 text-gray-200 mx-auto mb-3" />
                      <p className="text-gray-500 font-medium">No contract selected</p>
                      <p className="text-gray-400 text-sm mt-1">Upload a contract or pick one from the list.</p>
                    </div>
                  </div>
                ) : null}
              </div>
            </div>
          )}
        </>
      )}

      {activeTab === "decoder" && <ClauseDecoderTab />}
      {activeTab === "compare" && <VersionCompareTab contracts={contracts} />}
      {activeTab === "redflags" && <RedFlagsTab contracts={contracts} />}
    </div>
  );
}

export default function ContractsPage() {
  return (
    <Suspense>
      <ContractsPageInner />
    </Suspense>
  );
}
