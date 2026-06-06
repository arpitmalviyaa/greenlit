"use client";

import { useState, useCallback, useEffect } from "react";
import {
  Archive, CheckCircle, XCircle, AlertTriangle, HelpCircle,
  Loader2, ChevronDown, ChevronUp, Upload, Plus
} from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { JurisdictionSelector } from "@/components/ui/jurisdiction-selector";

// ── Types ──────────────────────────────────────────────────────────────────

type ClaimCategory = "performance" | "health" | "financial" | "environmental" | "comparative" | "testimonial" | "other";
type ClaimVerdict = "substantiated" | "unsubstantiated" | "needs_evidence" | "misleading";
type EvidenceType = "study" | "certification" | "test_result" | "regulatory_approval" | "screenshot" | "other";

interface ClaimAnalysisResult {
  verdict: ClaimVerdict;
  risk_score: number;
  burden_of_proof: string;
  what_evidence_needed: string[];
  regulatory_risk: string;
  analysis: string;
  claim_id: string | null;
}

interface ClaimEvidence {
  id: string;
  claim_id: string;
  evidence_type: EvidenceType;
  title: string;
  description: string | null;
  file_path: string | null;
  uploaded_by: string;
  created_at: string;
}

interface ClaimRow {
  id: string;
  claim_text: string;
  category: ClaimCategory;
  jurisdiction: string;
  verdict: ClaimVerdict | null;
  risk_score: number | null;
  created_at: string;
  updated_at: string;
  claim_evidence: ClaimEvidence[];
  claim_audit_log: Array<{ action: string; created_at: string }>;
  analysis_json?: Record<string, unknown> | null;
}

// ── Constants ──────────────────────────────────────────────────────────────

const CATEGORIES: { value: ClaimCategory; label: string }[] = [
  { value: "performance", label: "Performance" },
  { value: "health", label: "Health" },
  { value: "financial", label: "Financial" },
  { value: "environmental", label: "Environmental" },
  { value: "comparative", label: "Comparative" },
  { value: "testimonial", label: "Testimonial" },
  { value: "other", label: "Other" },
];

const EVIDENCE_TYPES: { value: EvidenceType; label: string }[] = [
  { value: "study", label: "Study / Research" },
  { value: "certification", label: "Certification" },
  { value: "test_result", label: "Test Result" },
  { value: "regulatory_approval", label: "Regulatory Approval" },
  { value: "screenshot", label: "Screenshot" },
  { value: "other", label: "Other" },
];

const VERDICT_CONFIG: Record<ClaimVerdict, { label: string; bg: string; text: string; icon: typeof CheckCircle }> = {
  substantiated:   { label: "SUBSTANTIATED",   bg: "bg-green-900/40 border-green-700",  text: "text-green-400",  icon: CheckCircle },
  unsubstantiated: { label: "UNSUBSTANTIATED", bg: "bg-red-900/40 border-red-700",      text: "text-red-400",    icon: XCircle },
  needs_evidence:  { label: "NEEDS EVIDENCE",  bg: "bg-amber-900/40 border-amber-700",  text: "text-amber-400",  icon: AlertTriangle },
  misleading:      { label: "MISLEADING",      bg: "bg-red-950/60 border-red-900",      text: "text-red-300",    icon: XCircle },
};

const RISK_BAR_COLOR = (score: number) =>
  score >= 70 ? "bg-red-500" : score >= 40 ? "bg-amber-500" : "bg-green-500";

// ── Sub-components ─────────────────────────────────────────────────────────

function VerdictBadge({ verdict, small }: { verdict: ClaimVerdict; small?: boolean }) {
  const cfg = VERDICT_CONFIG[verdict];
  const Icon = cfg.icon;
  return (
    <span className={cn(
      "inline-flex items-center gap-1.5 font-bold border rounded-md",
      cfg.bg, cfg.text,
      small ? "px-2 py-0.5 text-xs" : "px-3 py-1.5 text-sm"
    )}>
      <Icon className={small ? "w-3 h-3" : "w-4 h-4"} />
      {cfg.label}
    </span>
  );
}

function RiskBar({ score }: { score: number }) {
  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs text-slate-500">Risk score</span>
        <span className={cn(
          "text-sm font-bold tabular-nums",
          score >= 70 ? "text-red-400" : score >= 40 ? "text-amber-400" : "text-green-400"
        )}>{score}</span>
      </div>
      <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
        <div
          className={cn("h-full rounded-full transition-all", RISK_BAR_COLOR(score))}
          style={{ width: `${score}%` }}
        />
      </div>
    </div>
  );
}

// ── Evidence Upload ────────────────────────────────────────────────────────

function EvidenceUpload({ claimId, onSuccess }: { claimId: string; onSuccess: () => void }) {
  const [evidenceType, setEvidenceType] = useState<EvidenceType>("study");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);

  const handleSubmit = async () => {
    if (!title.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const fd = new FormData();
      fd.append("claim_id", claimId);
      fd.append("evidence_type", evidenceType);
      fd.append("title", title.trim());
      if (description.trim()) fd.append("description", description.trim());
      if (file) fd.append("file", file);

      const resp = await fetch("/api/claims/evidence", { method: "POST", body: fd });
      const data = await resp.json() as { error?: string };
      if (!resp.ok) throw new Error(data.error ?? "Upload failed");

      setTitle("");
      setDescription("");
      setFile(null);
      setOpen(false);
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setLoading(false);
    }
  };

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 text-xs text-green-400 hover:text-green-300 transition-colors"
      >
        <Plus className="w-3.5 h-3.5" />Add Evidence
      </button>
    );
  }

  return (
    <div className="border border-slate-700 rounded-lg p-4 space-y-3 bg-slate-900/50">
      <p className="text-xs font-semibold text-slate-400 uppercase">Add Evidence</p>
      <select
        value={evidenceType}
        onChange={(e) => setEvidenceType(e.target.value as EvidenceType)}
        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-1 focus:ring-green-600"
      >
        {EVIDENCE_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
      </select>
      <input
        type="text"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Evidence title"
        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-green-600"
      />
      <textarea
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        placeholder="Description (optional)"
        rows={2}
        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 placeholder-slate-600 resize-none focus:outline-none focus:ring-1 focus:ring-green-600"
      />
      <label className="flex items-center gap-2 cursor-pointer text-sm text-slate-400 hover:text-slate-300">
        <Upload className="w-4 h-4" />
        {file ? file.name : "Attach file (max 20MB, optional)"}
        <input
          type="file"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0] ?? null;
            if (f && f.size > 20 * 1024 * 1024) { setError("File exceeds 20MB"); return; }
            setFile(f);
            setError(null);
          }}
        />
      </label>
      {error && <p className="text-red-400 text-xs">{error}</p>}
      <div className="flex gap-2">
        <button
          onClick={handleSubmit}
          disabled={loading || !title.trim()}
          className="flex items-center gap-1.5 bg-green-600 hover:bg-green-500 disabled:bg-slate-700 disabled:text-slate-500 text-white text-sm font-medium px-3 py-1.5 rounded-lg transition-colors"
        >
          {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
          {loading ? "Uploading…" : "Submit"}
        </button>
        <button onClick={() => setOpen(false)} className="text-sm text-slate-500 hover:text-slate-300 px-2">Cancel</button>
      </div>
    </div>
  );
}

// ── Vault claim row ────────────────────────────────────────────────────────

function VaultClaimRow({ claim, onRefresh }: { claim: ClaimRow; onRefresh: () => void }) {
  const [expanded, setExpanded] = useState(false);
  const [fullClaim, setFullClaim] = useState<ClaimRow | null>(null);
  const [loadingFull, setLoadingFull] = useState(false);

  const loadFull = useCallback(async () => {
    if (fullClaim) return;
    setLoadingFull(true);
    try {
      const resp = await fetch(`/api/claims/${claim.id}`);
      const data = await resp.json() as ClaimRow;
      setFullClaim(data);
    } catch { /* ignore */ } finally {
      setLoadingFull(false);
    }
  }, [claim.id, fullClaim]);

  const handleExpand = () => {
    if (!expanded) loadFull();
    setExpanded((e) => !e);
  };

  const displayed = fullClaim ?? claim;

  return (
    <div className="border border-slate-800 rounded-xl overflow-hidden">
      <button
        onClick={handleExpand}
        className="w-full flex items-start gap-4 px-5 py-4 bg-slate-900 hover:bg-slate-800/60 transition-colors text-left"
      >
        <div className="flex-1 min-w-0 space-y-1">
          <p className="text-slate-200 text-sm font-medium line-clamp-2">{claim.claim_text}</p>
          <div className="flex items-center gap-3 flex-wrap">
            <span className="text-xs text-slate-500 capitalize">{claim.category}</span>
            <span className="text-xs text-slate-600">·</span>
            <span className="text-xs text-slate-500">{claim.jurisdiction}</span>
            <span className="text-xs text-slate-600">·</span>
            <span className="text-xs text-slate-500">{claim.claim_evidence.length} evidence</span>
          </div>
        </div>
        <div className="flex items-center gap-3 flex-shrink-0">
          {claim.verdict && <VerdictBadge verdict={claim.verdict} small />}
          {claim.risk_score !== null && (
            <span className={cn("text-sm font-bold tabular-nums",
              claim.risk_score >= 70 ? "text-red-400" : claim.risk_score >= 40 ? "text-amber-400" : "text-green-400"
            )}>{claim.risk_score}</span>
          )}
          {expanded ? <ChevronUp className="w-4 h-4 text-slate-500" /> : <ChevronDown className="w-4 h-4 text-slate-500" />}
        </div>
      </button>

      {expanded && (
        <div className="px-5 py-4 border-t border-slate-800 space-y-5 bg-slate-950/40">
          {loadingFull && <Loader2 className="w-4 h-4 animate-spin text-slate-500" />}

          {/* Analysis */}
          {displayed.analysis_json && (
            <div className="space-y-3">
              {(displayed.analysis_json as Partial<ClaimAnalysisResult>).analysis && (
                <p className="text-slate-300 text-sm">{(displayed.analysis_json as Partial<ClaimAnalysisResult>).analysis}</p>
              )}
              {(displayed.analysis_json as Partial<ClaimAnalysisResult>).burden_of_proof && (
                <div className="text-xs text-slate-500">
                  <span className="font-semibold text-slate-400">Burden of proof: </span>
                  {(displayed.analysis_json as Partial<ClaimAnalysisResult>).burden_of_proof}
                </div>
              )}
              {Array.isArray((displayed.analysis_json as Partial<ClaimAnalysisResult>).what_evidence_needed) &&
                ((displayed.analysis_json as Partial<ClaimAnalysisResult>).what_evidence_needed?.length ?? 0) > 0 && (
                <div className="space-y-1">
                  <p className="text-xs font-semibold text-slate-500 uppercase">Evidence Required</p>
                  <ul className="space-y-0.5">
                    {(displayed.analysis_json as Partial<ClaimAnalysisResult>).what_evidence_needed!.map((e, i) => (
                      <li key={i} className="text-slate-400 text-sm flex items-start gap-1.5">
                        <HelpCircle className="w-3.5 h-3.5 text-amber-400 mt-0.5 flex-shrink-0" />{e}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {(displayed.analysis_json as Partial<ClaimAnalysisResult>).regulatory_risk && (
                <div className="bg-red-950/30 border border-red-900/50 rounded-lg px-3 py-2">
                  <p className="text-red-300 text-xs">{(displayed.analysis_json as Partial<ClaimAnalysisResult>).regulatory_risk}</p>
                </div>
              )}
            </div>
          )}

          {/* Evidence list */}
          <div className="space-y-2">
            <p className="text-xs font-semibold text-slate-500 uppercase">Evidence</p>
            {displayed.claim_evidence.length === 0 ? (
              <p className="text-slate-600 text-sm">No evidence added yet.</p>
            ) : (
              displayed.claim_evidence.map((ev) => (
                <div key={ev.id} className="bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 flex items-start gap-3">
                  <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
                  <div className="min-w-0">
                    <p className="text-slate-200 text-sm font-medium">{ev.title}</p>
                    <p className="text-slate-500 text-xs capitalize">{ev.evidence_type.replace(/_/g, " ")}</p>
                    {ev.description && <p className="text-slate-400 text-xs mt-0.5">{ev.description}</p>}
                    {ev.file_path && (
                      <p className="text-xs text-slate-600 mt-0.5 font-mono truncate">{ev.file_path.split("/").pop()}</p>
                    )}
                  </div>
                </div>
              ))
            )}
            <EvidenceUpload
              claimId={claim.id}
              onSuccess={() => { setFullClaim(null); loadFull(); onRefresh(); }}
            />
          </div>

          {/* Audit log */}
          {fullClaim?.claim_audit_log && fullClaim.claim_audit_log.length > 0 && (
            <div className="space-y-1">
              <p className="text-xs font-semibold text-slate-600 uppercase">Audit</p>
              {fullClaim.claim_audit_log.map((entry, i) => (
                <div key={i} className="flex items-center gap-2 text-xs text-slate-600">
                  <span className="capitalize">{entry.action.replace(/_/g, " ")}</span>
                  <span>·</span>
                  <span>{new Date(entry.created_at).toLocaleDateString()}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Main page ──────────────────────────────────────────────────────────────

export default function ClaimsPage() {
  const [jurisdiction, setJurisdiction] = useState("IN");
  const [claimText, setClaimText] = useState("");
  const [category, setCategory] = useState<ClaimCategory>("performance");
  const [analysing, setAnalysing] = useState(false);
  const [analyseError, setAnalyseError] = useState<string | null>(null);
  const [analysisResult, setAnalysisResult] = useState<ClaimAnalysisResult | null>(null);

  const [vault, setVault] = useState<ClaimRow[]>([]);
  const [vaultLoading, setVaultLoading] = useState(true);

  const loadVault = useCallback(async () => {
    setVaultLoading(true);
    try {
      const resp = await fetch("/api/claims/list");
      const data = await resp.json() as ClaimRow[];
      if (Array.isArray(data)) setVault(data);
    } catch { /* ignore */ } finally {
      setVaultLoading(false);
    }
  }, []);

  useEffect(() => { loadVault(); }, [loadVault]);

  const handleAnalyse = async () => {
    if (!claimText.trim()) return;
    setAnalysing(true);
    setAnalyseError(null);
    setAnalysisResult(null);
    try {
      const resp = await fetch("/api/claims/analyse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ claim_text: claimText, category, jurisdiction }),
      });
      const data = await resp.json() as ClaimAnalysisResult & { error?: string };
      if (!resp.ok) throw new Error(data.error ?? "Analysis failed");
      setAnalysisResult(data);
      // Refresh vault so the new claim appears
      loadVault();
    } catch (err) {
      setAnalyseError(err instanceof Error ? err.message : "Analysis failed");
    } finally {
      setAnalysing(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      {/* Header */}
      <div className="border-b border-slate-800 px-6 py-4">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <Archive className="w-5 h-5 text-green-400" />
            <div>
              <h1 className="text-lg font-semibold text-slate-100">Claim Vault</h1>
              <p className="text-slate-500 text-sm">Substantiate advertising claims before you publish</p>
            </div>
          </div>
          <JurisdictionSelector value={jurisdiction} onChange={setJurisdiction} />
        </div>
      </div>

      {/* Two-panel layout */}
      <div className="flex flex-col lg:flex-row gap-6 p-6 max-w-7xl mx-auto">

        {/* ── Left: Analyser ── */}
        <div className="w-full lg:w-[480px] flex-shrink-0 space-y-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
            <h2 className="text-sm font-semibold text-slate-300">Analyse a Claim</h2>

            <div className="space-y-1.5">
              <label className="text-sm text-slate-400">Claim text</label>
              <textarea
                value={claimText}
                onChange={(e) => setClaimText(e.target.value)}
                placeholder="Enter the claim you want to substantiate..."
                rows={5}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2.5 text-sm text-slate-100 placeholder-slate-600 resize-y focus:outline-none focus:ring-1 focus:ring-green-600"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-sm text-slate-400">Category</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as ClaimCategory)}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-1 focus:ring-green-600"
              >
                {CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
              </select>
            </div>

            <button
              onClick={handleAnalyse}
              disabled={analysing || !claimText.trim()}
              className="w-full flex items-center justify-center gap-2 bg-green-600 hover:bg-green-500 disabled:bg-slate-700 disabled:text-slate-500 text-white font-medium text-sm px-4 py-2.5 rounded-lg transition-colors"
            >
              {analysing ? (
                <><Loader2 className="w-4 h-4 animate-spin" />Analysing…</>
              ) : (
                <><Archive className="w-4 h-4" />Analyse Claim</>
              )}
            </button>

            {analyseError && <p className="text-red-400 text-sm">{analyseError}</p>}
          </div>

          {/* Analysis result */}
          {analysisResult && (
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
              <div className="flex items-center justify-between gap-3">
                <VerdictBadge verdict={analysisResult.verdict} />
              </div>

              <RiskBar score={analysisResult.risk_score} />

              {analysisResult.burden_of_proof && (
                <div>
                  <p className="text-xs font-semibold text-slate-500 uppercase mb-1">Burden of Proof</p>
                  <p className="text-slate-300 text-sm">{analysisResult.burden_of_proof}</p>
                </div>
              )}

              {analysisResult.what_evidence_needed.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-slate-500 uppercase mb-2">Evidence Required</p>
                  <ul className="space-y-1">
                    {analysisResult.what_evidence_needed.map((e, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-slate-300">
                        <HelpCircle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />{e}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {analysisResult.regulatory_risk && (
                <div className="bg-red-950/30 border border-red-900/50 rounded-lg px-3 py-2">
                  <p className="text-xs font-semibold text-red-400 uppercase mb-1">Regulatory Risk</p>
                  <p className="text-red-200 text-sm">{analysisResult.regulatory_risk}</p>
                </div>
              )}

              {analysisResult.analysis && (
                <details className="group">
                  <summary className="text-xs font-semibold text-slate-500 uppercase cursor-pointer hover:text-slate-300">
                    Full Analysis
                  </summary>
                  <p className="text-slate-400 text-sm mt-2 leading-relaxed">{analysisResult.analysis}</p>
                </details>
              )}
            </div>
          )}
        </div>

        {/* ── Right: Vault ── */}
        <div className="flex-1 min-w-0 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider">Saved Claims</h2>
            <span className="text-xs text-slate-600">{vault.length} claims</span>
          </div>

          {vaultLoading && (
            <div className="flex items-center gap-2 text-slate-500 text-sm">
              <Loader2 className="w-4 h-4 animate-spin" />Loading vault…
            </div>
          )}

          {!vaultLoading && vault.length === 0 && (
            <div className="flex flex-col items-center justify-center h-48 border border-dashed border-slate-800 rounded-xl text-center">
              <Archive className="w-8 h-8 text-slate-700 mb-2" />
              <p className="text-slate-600 text-sm">No claims yet. Analyse a claim to add it here.</p>
            </div>
          )}

          <div className="space-y-3">
            {vault.map((claim) => (
              <VaultClaimRow key={claim.id} claim={claim} onRefresh={loadVault} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
