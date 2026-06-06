"use client";

import { useState, useCallback } from "react";
import {
  Shield, ChevronDown, ChevronUp, AlertTriangle, CheckCircle, XCircle,
  Loader2, RotateCcw, FileText, Thermometer, Tag, Layers, AlertOctagon,
} from "lucide-react";
import { CHECKERS } from "@/lib/utils/checkers";
import { cn } from "@/lib/utils/cn";
import { JurisdictionSelector } from "@/components/ui/jurisdiction-selector";
import { DefamationHeatmap, DefamationLegend } from "@/components/content/defamation-heatmap";
import type { DefamationSpan } from "@/components/content/defamation-heatmap";

// ── Types ──────────────────────────────────────────────────────────────────

type Severity = "low" | "medium" | "high" | "critical";
type Verdict = "greenlit" | "caution" | "blocked";
type ContentType = "script" | "caption" | "reel" | "ad" | "podcast" | "carousel";
type Tone = "bold" | "luxury" | "gen_z" | "casual" | "professional" | "financial_educator";
type DisclaimerType =
  | "paid_partnership" | "financial" | "health" | "affiliate"
  | "educational" | "ai_generated" | "results_not_typical"
  | "no_professional_advice" | "contest" | "before_after";

type PlatformName = "instagram" | "youtube" | "twitter" | "linkedin" | "tiktok";
type RegulatedCategory = "finance" | "health" | "food" | "gaming" | "pharma" | "alcohol" | "crypto";

interface FlaggedIssue {
  issue: string;
  legal_basis: string;
  severity: Severity;
}

interface CheckerResult {
  checker_id: string;
  checker_name: string;
  verdict: Verdict;
  risk_score: number;
  flagged_issues: FlaggedIssue[];
  safe_to_publish: boolean;
  error?: string;
}

interface ScanOutput {
  overall_verdict: Verdict;
  overall_risk_score: number;
  results: CheckerResult[];
  top_issues: FlaggedIssue[];
  requires_lawyer: boolean;
}

interface RewriteResult {
  rewritten_content: string;
  changes_made: string[];
  still_risky: boolean;
}

interface DisclaimerItem {
  type: string;
  text: string;
  placement: "start" | "end" | "inline";
}

interface DisclaimerResult {
  disclaimers: DisclaimerItem[];
  warning: string;
}

interface BrandCompareResult {
  verdict: "safe" | "caution" | "risk";
  issues: string[];
  suggestions: string[];
}

interface PlatformResult {
  platform: string;
  verdict: "safe" | "caution" | "risk";
  flags: string[];
}

interface RegulatedIssue {
  rule: string;
  severity: "high" | "medium" | "low";
  excerpt: string;
}

interface RegulatedScanResult {
  compliant: boolean;
  issues: RegulatedIssue[];
  required_disclosures: string[];
}

interface DarkPattern {
  type: string;
  excerpt: string;
  explanation: string;
  severity: "high" | "medium" | "low";
}

// ── Constants ──────────────────────────────────────────────────────────────

const CONTENT_TYPES: { value: ContentType; label: string }[] = [
  { value: "script", label: "Script" },
  { value: "caption", label: "Caption" },
  { value: "reel", label: "Reel" },
  { value: "ad", label: "Ad Copy" },
  { value: "podcast", label: "Podcast" },
  { value: "carousel", label: "Carousel" },
];

const TONES: { value: Tone; label: string }[] = [
  { value: "bold", label: "Bold" },
  { value: "luxury", label: "Luxury" },
  { value: "gen_z", label: "Gen Z" },
  { value: "casual", label: "Casual" },
  { value: "professional", label: "Professional" },
  { value: "financial_educator", label: "Financial Educator" },
];

const DISCLAIMER_TYPES: { value: DisclaimerType; label: string }[] = [
  { value: "paid_partnership", label: "Paid Partnership" },
  { value: "financial", label: "Financial" },
  { value: "health", label: "Health" },
  { value: "affiliate", label: "Affiliate" },
  { value: "educational", label: "Educational" },
  { value: "ai_generated", label: "AI Generated" },
  { value: "results_not_typical", label: "Results Not Typical" },
  { value: "no_professional_advice", label: "No Professional Advice" },
  { value: "contest", label: "Contest" },
  { value: "before_after", label: "Before & After" },
];

const PLATFORMS: { value: PlatformName; label: string }[] = [
  { value: "instagram", label: "Instagram" },
  { value: "youtube", label: "YouTube" },
  { value: "twitter", label: "Twitter / X" },
  { value: "linkedin", label: "LinkedIn" },
  { value: "tiktok", label: "TikTok" },
];

const REGULATED_CATEGORIES: { value: RegulatedCategory; label: string }[] = [
  { value: "finance", label: "Finance / Investment" },
  { value: "health", label: "Health & Wellness" },
  { value: "food", label: "Food & Beverage" },
  { value: "gaming", label: "Gaming" },
  { value: "pharma", label: "Pharma / Medicine" },
  { value: "alcohol", label: "Alcohol" },
  { value: "crypto", label: "Crypto / Web3" },
];

const SEVERITY_COLORS: Record<string, string> = {
  low: "text-blue-400",
  medium: "text-amber-400",
  high: "text-orange-500",
  critical: "text-red-500",
};

const VERDICT_CONFIG: Record<Verdict, { label: string; bg: string; text: string; icon: typeof CheckCircle }> = {
  greenlit: { label: "GREENLIT", bg: "bg-green-900/40 border-green-700", text: "text-green-400", icon: CheckCircle },
  caution:  { label: "CAUTION",  bg: "bg-amber-900/40 border-amber-700", text: "text-amber-400", icon: AlertTriangle },
  blocked:  { label: "BLOCKED",  bg: "bg-red-900/40 border-red-700",     text: "text-red-400",   icon: XCircle },
};

const TRICOLOR: Record<"safe"|"caution"|"risk", string> = {
  safe:    "text-green-400",
  caution: "text-amber-400",
  risk:    "text-red-400",
};

const TRICOLOR_BADGE: Record<"safe"|"caution"|"risk", string> = {
  safe:    "bg-green-900/40 border-green-700 text-green-400",
  caution: "bg-amber-900/40 border-amber-700 text-amber-400",
  risk:    "bg-red-900/40 border-red-700 text-red-400",
};

// ── Tab config ─────────────────────────────────────────────────────────────

type Tab = "scan" | "brand" | "platform" | "regulated" | "dark";

const TABS: { id: Tab; label: string; icon: typeof Shield }[] = [
  { id: "scan",       label: "Content Scan",    icon: Shield },
  { id: "brand",      label: "Brand Check",     icon: Tag },
  { id: "platform",   label: "Platform Check",  icon: Layers },
  { id: "regulated",  label: "Regulated",        icon: AlertOctagon },
  { id: "dark",       label: "Dark Patterns",   icon: Thermometer },
];

// ── Sub-components ─────────────────────────────────────────────────────────

function VerdictBadge({ verdict, small }: { verdict: Verdict; small?: boolean }) {
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

function SeverityBadge({ severity }: { severity: string }) {
  return (
    <span className={cn("text-xs font-semibold uppercase", SEVERITY_COLORS[severity] ?? "text-slate-400")}>
      {severity}
    </span>
  );
}

function TriBadge({ verdict }: { verdict: "safe" | "caution" | "risk" }) {
  const icons = { safe: CheckCircle, caution: AlertTriangle, risk: XCircle };
  const Icon = icons[verdict];
  return (
    <span className={cn(
      "inline-flex items-center gap-1.5 text-xs font-bold border rounded-md px-2 py-0.5",
      TRICOLOR_BADGE[verdict]
    )}>
      <Icon className="w-3 h-3" />
      {verdict.toUpperCase()}
    </span>
  );
}

function CheckerCard({ result }: { result: CheckerResult }) {
  const hasFlagged = result.flagged_issues.length > 0 || !!result.error;
  const [open, setOpen] = useState(hasFlagged);

  return (
    <div className={cn(
      "border rounded-lg overflow-hidden",
      result.verdict === "blocked" ? "border-red-800" :
      result.verdict === "caution" ? "border-amber-800" :
      "border-slate-700"
    )}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between px-4 py-3 bg-slate-800/60 hover:bg-slate-800 transition-colors text-left"
      >
        <div className="flex items-center gap-3 min-w-0">
          <span className="text-slate-200 text-sm font-medium truncate">{result.checker_name}</span>
          {result.error && <span className="text-xs text-slate-500 italic">unavailable</span>}
        </div>
        <div className="flex items-center gap-3 flex-shrink-0 ml-3">
          <span className={cn(
            "text-sm font-bold tabular-nums",
            result.risk_score >= 70 ? "text-red-400" :
            result.risk_score >= 35 ? "text-amber-400" :
            "text-green-400"
          )}>
            {result.risk_score}
          </span>
          <VerdictBadge verdict={result.verdict} small />
          {open ? <ChevronUp className="w-4 h-4 text-slate-500" /> : <ChevronDown className="w-4 h-4 text-slate-500" />}
        </div>
      </button>

      {open && (
        <div className="px-4 py-3 space-y-2 bg-slate-900/40">
          {result.error ? (
            <p className="text-slate-500 text-sm italic">{result.error}</p>
          ) : result.flagged_issues.length === 0 ? (
            <p className="text-slate-500 text-sm">No issues found.</p>
          ) : (
            result.flagged_issues.map((issue, i) => (
              <div key={i} className="space-y-0.5">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-slate-200 text-sm">{issue.issue}</p>
                  <SeverityBadge severity={issue.severity} />
                </div>
                <p className="text-slate-500 text-xs">{issue.legal_basis}</p>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}

// ── Scan Tab ───────────────────────────────────────────────────────────────

function ScanTab({ jurisdiction }: { jurisdiction: string }) {
  const [content, setContent] = useState("");
  const [contentType, setContentType] = useState<ContentType>("caption");
  const [runAll, setRunAll] = useState(true);
  const [selectedCheckers, setSelectedCheckers] = useState<string[]>([]);
  const [scanning, setScanning] = useState(false);
  const [scanError, setScanError] = useState<string | null>(null);
  const [scanResult, setScanResult] = useState<ScanOutput | null>(null);
  const [rewriteTone, setRewriteTone] = useState<Tone>("casual");
  const [rewriting, setRewriting] = useState(false);
  const [rewriteResult, setRewriteResult] = useState<RewriteResult | null>(null);
  const [rewriteError, setRewriteError] = useState<string | null>(null);
  const [selectedDisclaimerTypes, setSelectedDisclaimerTypes] = useState<DisclaimerType[]>([]);
  const [generatingDisclaimer, setGeneratingDisclaimer] = useState(false);
  const [disclaimerResult, setDisclaimerResult] = useState<DisclaimerResult | null>(null);
  const [disclaimerError, setDisclaimerError] = useState<string | null>(null);
  // Defamation heatmap
  const [heatmapLoading, setHeatmapLoading] = useState(false);
  const [heatmapSpans, setHeatmapSpans] = useState<DefamationSpan[] | null>(null);
  const [heatmapError, setHeatmapError] = useState<string | null>(null);

  const toggleChecker = (id: string) => {
    setSelectedCheckers((prev) => prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]);
  };
  const toggleDisclaimerType = (t: DisclaimerType) => {
    setSelectedDisclaimerTypes((prev) => prev.includes(t) ? prev.filter((d) => d !== t) : [...prev, t]);
  };

  const checkerCount = runAll ? CHECKERS.length : selectedCheckers.length;

  const handleScan = useCallback(async () => {
    if (!content.trim()) return;
    setScanning(true);
    setScanError(null);
    setScanResult(null);
    setRewriteResult(null);
    setDisclaimerResult(null);
    setHeatmapSpans(null);

    try {
      const resp = await fetch("/api/content/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content, content_type: contentType, jurisdiction, run_all: runAll, checker_ids: runAll ? undefined : selectedCheckers }),
      });
      const data = await resp.json() as ScanOutput & { error?: string };
      if (!resp.ok) throw new Error(data.error ?? "Scan failed");
      setScanResult(data);
    } catch (err) {
      setScanError(err instanceof Error ? err.message : "Scan failed");
    } finally {
      setScanning(false);
    }
  }, [content, contentType, jurisdiction, runAll, selectedCheckers]);

  const handleRewrite = useCallback(async () => {
    if (!scanResult) return;
    setRewriting(true);
    setRewriteError(null);
    setRewriteResult(null);
    try {
      const resp = await fetch("/api/content/rewrite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content, content_type: contentType, issues: scanResult.top_issues.map((i) => i.issue), tone: rewriteTone }),
      });
      const data = await resp.json() as RewriteResult & { error?: string };
      if (!resp.ok) throw new Error(data.error ?? "Rewrite failed");
      setRewriteResult(data);
    } catch (err) {
      setRewriteError(err instanceof Error ? err.message : "Rewrite failed");
    } finally {
      setRewriting(false);
    }
  }, [content, contentType, rewriteTone, scanResult]);

  const handleDisclaimer = useCallback(async () => {
    if (!selectedDisclaimerTypes.length) return;
    setGeneratingDisclaimer(true);
    setDisclaimerError(null);
    setDisclaimerResult(null);
    try {
      const resp = await fetch("/api/content/disclaimer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content, content_types: selectedDisclaimerTypes }),
      });
      const data = await resp.json() as DisclaimerResult & { error?: string };
      if (!resp.ok) throw new Error(data.error ?? "Disclaimer generation failed");
      setDisclaimerResult(data);
    } catch (err) {
      setDisclaimerError(err instanceof Error ? err.message : "Disclaimer generation failed");
    } finally {
      setGeneratingDisclaimer(false);
    }
  }, [content, selectedDisclaimerTypes]);

  const handleHeatmap = useCallback(async () => {
    if (!content.trim()) return;
    setHeatmapLoading(true);
    setHeatmapError(null);
    setHeatmapSpans(null);
    try {
      const resp = await fetch("/api/content/defamation-heatmap", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content, jurisdiction }),
      });
      const data = await resp.json() as { spans: DefamationSpan[]; error?: string };
      if (!resp.ok) throw new Error(data.error ?? "Heatmap failed");
      setHeatmapSpans(data.spans);
    } catch (err) {
      setHeatmapError(err instanceof Error ? err.message : "Heatmap failed");
    } finally {
      setHeatmapLoading(false);
    }
  }, [content, jurisdiction]);

  return (
    <div className="flex flex-col lg:flex-row gap-6">
      {/* Left panel */}
      <div className="w-full lg:w-96 flex-shrink-0 space-y-4">
        <div className="space-y-1.5">
          <label className="text-sm text-slate-400">Paste script, caption, or ad copy</label>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Type or paste your content here..."
            rows={10}
            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2.5 text-sm text-slate-100 placeholder-slate-600 resize-y focus:outline-none focus:ring-1 focus:ring-green-600"
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-sm text-slate-400">Content type</label>
          <select
            value={contentType}
            onChange={(e) => setContentType(e.target.value as ContentType)}
            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-1 focus:ring-green-600"
          >
            {CONTENT_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
        </div>

        <div className="space-y-2">
          <label className="text-sm text-slate-400">Checkers</label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={runAll} onChange={(e) => setRunAll(e.target.checked)}
              className="rounded border-slate-600 bg-slate-900 text-green-500 focus:ring-green-600" />
            <span className="text-sm text-slate-300">Run all 15 checkers</span>
          </label>
          {!runAll && (
            <div className="grid grid-cols-1 gap-1 max-h-48 overflow-y-auto pr-1">
              {CHECKERS.map((c) => (
                <label key={c.id} className="flex items-start gap-2 cursor-pointer py-0.5">
                  <input type="checkbox" checked={selectedCheckers.includes(c.id)} onChange={() => toggleChecker(c.id)}
                    className="mt-0.5 rounded border-slate-600 bg-slate-900 text-green-500 focus:ring-green-600" />
                  <div>
                    <p className="text-sm text-slate-300">{c.name}</p>
                    <p className="text-xs text-slate-600">{c.category}</p>
                  </div>
                </label>
              ))}
            </div>
          )}
        </div>

        <button
          onClick={handleScan}
          disabled={scanning || !content.trim() || (!runAll && selectedCheckers.length === 0)}
          className="w-full flex items-center justify-center gap-2 bg-green-600 hover:bg-green-500 disabled:bg-slate-700 disabled:text-slate-500 text-white font-medium text-sm px-4 py-2.5 rounded-lg transition-colors"
        >
          {scanning ? (
            <><Loader2 className="w-4 h-4 animate-spin" />Scanning with {checkerCount} checker{checkerCount !== 1 ? "s" : ""}…</>
          ) : (
            <><Shield className="w-4 h-4" />Scan with {checkerCount} checker{checkerCount !== 1 ? "s" : ""}</>
          )}
        </button>
        {scanError && <p className="text-red-400 text-sm">{scanError}</p>}
      </div>

      {/* Right panel */}
      <div className="flex-1 min-w-0 space-y-6">
        {!scanResult && !scanning && (
          <div className="flex flex-col items-center justify-center h-64 border border-dashed border-slate-800 rounded-xl text-center">
            <Shield className="w-10 h-10 text-slate-700 mb-3" />
            <p className="text-slate-600 text-sm">Paste your content and run a scan to see results</p>
          </div>
        )}

        {scanResult && (
          <>
            {/* Overall verdict */}
            <div className={cn("border rounded-xl p-5 flex flex-col sm:flex-row sm:items-center gap-4", VERDICT_CONFIG[scanResult.overall_verdict].bg)}>
              <div className="flex-1 min-w-0">
                <VerdictBadge verdict={scanResult.overall_verdict} />
                <p className="text-slate-400 text-sm mt-1">Scanned {scanResult.results.length} checker{scanResult.results.length !== 1 ? "s" : ""}</p>
              </div>
              <div className="text-right">
                <span className={cn("text-5xl font-bold tabular-nums", VERDICT_CONFIG[scanResult.overall_verdict].text)}>{scanResult.overall_risk_score}</span>
                <p className="text-slate-500 text-xs mt-0.5">risk score</p>
              </div>
            </div>

            {scanResult.requires_lawyer && (
              <div className="flex items-start gap-3 bg-red-950/50 border border-red-800 rounded-lg px-4 py-3">
                <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-red-300 font-semibold text-sm">Legal review required</p>
                  <p className="text-red-400 text-xs mt-0.5">This content has critical issues. Do not publish without consulting a qualified lawyer.</p>
                </div>
              </div>
            )}

            {scanResult.top_issues.length > 0 && (
              <div className="space-y-2">
                <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider">Top Issues</h2>
                {scanResult.top_issues.map((issue, i) => (
                  <div key={i} className="bg-slate-900 border border-slate-800 rounded-lg px-4 py-3 space-y-0.5">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-slate-200 text-sm">{issue.issue}</p>
                      <SeverityBadge severity={issue.severity} />
                    </div>
                    <p className="text-slate-500 text-xs">{issue.legal_basis}</p>
                  </div>
                ))}
              </div>
            )}

            <div className="space-y-2">
              <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider">Checker Results</h2>
              {scanResult.results.map((r) => <CheckerCard key={r.checker_id} result={r} />)}
            </div>

            {/* ── Defamation Heatmap (inline below scan results) ── */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold text-slate-300 flex items-center gap-2">
                  <Thermometer className="w-4 h-4 text-red-400" />
                  Defamation Heatmap
                </h2>
                <DefamationLegend />
              </div>
              <button
                onClick={handleHeatmap}
                disabled={heatmapLoading}
                className="flex items-center gap-2 bg-slate-700 hover:bg-slate-600 disabled:opacity-50 text-slate-200 text-sm font-medium px-3 py-1.5 rounded-lg transition-colors"
              >
                {heatmapLoading ? <><Loader2 className="w-4 h-4 animate-spin" />Analysing…</> : "Run Heatmap"}
              </button>
              {heatmapError && <p className="text-red-400 text-sm">{heatmapError}</p>}
              {heatmapSpans !== null && (
                <DefamationHeatmap content={content} spans={heatmapSpans} />
              )}
            </div>

            {/* Rewrite */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
              <h2 className="text-sm font-semibold text-slate-300">Rewrite Safely</h2>
              <div className="flex gap-3">
                <select
                  value={rewriteTone}
                  onChange={(e) => setRewriteTone(e.target.value as Tone)}
                  className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-1 focus:ring-green-600"
                >
                  {TONES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
                <button
                  onClick={handleRewrite}
                  disabled={rewriting}
                  className="flex items-center gap-2 bg-slate-700 hover:bg-slate-600 disabled:opacity-50 text-slate-200 text-sm font-medium px-4 py-2 rounded-lg transition-colors"
                >
                  {rewriting ? <Loader2 className="w-4 h-4 animate-spin" /> : <RotateCcw className="w-4 h-4" />}
                  {rewriting ? "Rewriting…" : "Rewrite"}
                </button>
              </div>
              {rewriteError && <p className="text-red-400 text-sm">{rewriteError}</p>}
              {rewriteResult && (
                <div className="space-y-3">
                  <div className="bg-slate-800 rounded-lg p-4">
                    <p className="text-slate-300 text-sm whitespace-pre-wrap">{rewriteResult.rewritten_content}</p>
                  </div>
                  {rewriteResult.changes_made.length > 0 && (
                    <div>
                      <p className="text-slate-500 text-xs font-semibold uppercase mb-1">Changes made</p>
                      <ul className="space-y-0.5">
                        {rewriteResult.changes_made.map((c, i) => (
                          <li key={i} className="text-slate-400 text-sm flex items-start gap-1.5">
                            <span className="text-green-500 mt-0.5">•</span>{c}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {rewriteResult.still_risky && (
                    <p className="text-amber-400 text-xs">⚠ Some issues could not be resolved by rewriting alone. Lawyer review recommended.</p>
                  )}
                </div>
              )}
            </div>

            {/* Disclaimer */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
              <h2 className="text-sm font-semibold text-slate-300">Generate Disclaimer</h2>
              <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
                {DISCLAIMER_TYPES.map((dt) => (
                  <label key={dt.value} className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={selectedDisclaimerTypes.includes(dt.value)} onChange={() => toggleDisclaimerType(dt.value)}
                      className="rounded border-slate-600 bg-slate-800 text-green-500 focus:ring-green-600" />
                    <span className="text-sm text-slate-400">{dt.label}</span>
                  </label>
                ))}
              </div>
              <button
                onClick={handleDisclaimer}
                disabled={generatingDisclaimer || selectedDisclaimerTypes.length === 0}
                className="flex items-center gap-2 bg-slate-700 hover:bg-slate-600 disabled:opacity-50 text-slate-200 text-sm font-medium px-4 py-2 rounded-lg transition-colors"
              >
                {generatingDisclaimer
                  ? <><Loader2 className="w-4 h-4 animate-spin" />Generating…</>
                  : <><FileText className="w-4 h-4" />Generate Disclaimer</>
                }
              </button>
              {disclaimerError && <p className="text-red-400 text-sm">{disclaimerError}</p>}
              {disclaimerResult && (
                <div className="space-y-3">
                  {disclaimerResult.disclaimers.map((d, i) => (
                    <div key={i} className="bg-slate-800 rounded-lg p-4 space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-slate-500 uppercase">{d.type.replace(/_/g, " ")}</span>
                        <span className="text-xs text-slate-600 border border-slate-700 rounded px-1.5 py-0.5">{d.placement}</span>
                      </div>
                      <p className="text-slate-300 text-sm">{d.text}</p>
                    </div>
                  ))}
                  {disclaimerResult.warning && <p className="text-amber-400 text-xs">{disclaimerResult.warning}</p>}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ── Brand Check Tab ────────────────────────────────────────────────────────

function BrandCheckTab({ jurisdiction }: { jurisdiction: string }) {
  const [content, setContent] = useState("");
  const [brandName, setBrandName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<BrandCompareResult | null>(null);

  const handleCheck = async () => {
    if (!content.trim() || !brandName.trim()) return;
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const resp = await fetch("/api/content/brand-compare", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content, brand_name: brandName, jurisdiction }),
      });
      const data = await resp.json() as BrandCompareResult & { error?: string };
      if (!resp.ok) throw new Error(data.error ?? "Brand check failed");
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Brand check failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl space-y-4">
      <div className="space-y-1.5">
        <label className="text-sm text-slate-400">Content</label>
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Paste the content to check..."
          rows={8}
          className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2.5 text-sm text-slate-100 placeholder-slate-600 resize-y focus:outline-none focus:ring-1 focus:ring-green-600"
        />
      </div>
      <div className="space-y-1.5">
        <label className="text-sm text-slate-400">Brand name</label>
        <input
          type="text"
          value={brandName}
          onChange={(e) => setBrandName(e.target.value)}
          placeholder="e.g. Nike, Zomato, Paytm"
          className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-green-600"
        />
      </div>
      <button
        onClick={handleCheck}
        disabled={loading || !content.trim() || !brandName.trim()}
        className="flex items-center gap-2 bg-green-600 hover:bg-green-500 disabled:bg-slate-700 disabled:text-slate-500 text-white font-medium text-sm px-4 py-2.5 rounded-lg transition-colors"
      >
        {loading ? <><Loader2 className="w-4 h-4 animate-spin" />Checking…</> : <><Tag className="w-4 h-4" />Check Brand</>}
      </button>
      {error && <p className="text-red-400 text-sm">{error}</p>}
      {result && (
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <TriBadge verdict={result.verdict} />
            <span className={cn("text-sm font-semibold", TRICOLOR[result.verdict])}>
              {result.verdict === "safe" ? "No brand issues detected" :
               result.verdict === "caution" ? "Potential brand concerns" :
               "Brand risk identified"}
            </span>
          </div>
          {result.issues.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-semibold text-slate-500 uppercase">Issues</p>
              {result.issues.map((issue, i) => (
                <div key={i} className="bg-slate-900 border border-slate-800 rounded-lg px-4 py-3">
                  <p className="text-slate-200 text-sm">{issue}</p>
                </div>
              ))}
            </div>
          )}
          {result.suggestions.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-semibold text-slate-500 uppercase">Suggestions</p>
              {result.suggestions.map((s, i) => (
                <div key={i} className="bg-slate-900 border border-green-900/50 rounded-lg px-4 py-3 flex items-start gap-2">
                  <span className="text-green-500 mt-0.5 text-sm">•</span>
                  <p className="text-slate-300 text-sm">{s}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Platform Check Tab ─────────────────────────────────────────────────────

function PlatformCheckTab({ jurisdiction }: { jurisdiction: string }) {
  const [content, setContent] = useState("");
  const [selectedPlatforms, setSelectedPlatforms] = useState<PlatformName[]>(["instagram"]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<PlatformResult[] | null>(null);

  const toggle = (p: PlatformName) => {
    setSelectedPlatforms((prev) => prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p]);
  };

  const handleScan = async () => {
    if (!content.trim() || !selectedPlatforms.length) return;
    setLoading(true);
    setError(null);
    setResults(null);
    try {
      const resp = await fetch("/api/content/platform-scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content, platforms: selectedPlatforms, jurisdiction }),
      });
      const data = await resp.json() as { results: PlatformResult[]; error?: string };
      if (!resp.ok) throw new Error(data.error ?? "Platform scan failed");
      setResults(data.results);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Platform scan failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl space-y-4">
      <div className="space-y-1.5">
        <label className="text-sm text-slate-400">Content</label>
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Paste the content to check..."
          rows={8}
          className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2.5 text-sm text-slate-100 placeholder-slate-600 resize-y focus:outline-none focus:ring-1 focus:ring-green-600"
        />
      </div>
      <div className="space-y-2">
        <label className="text-sm text-slate-400">Platforms</label>
        <div className="flex flex-wrap gap-2">
          {PLATFORMS.map((p) => (
            <button
              key={p.value}
              onClick={() => toggle(p.value)}
              className={cn(
                "px-3 py-1.5 text-sm rounded-lg border transition-colors",
                selectedPlatforms.includes(p.value)
                  ? "bg-green-900/40 border-green-700 text-green-300"
                  : "bg-slate-900 border-slate-700 text-slate-400 hover:border-slate-500"
              )}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>
      <button
        onClick={handleScan}
        disabled={loading || !content.trim() || selectedPlatforms.length === 0}
        className="flex items-center gap-2 bg-green-600 hover:bg-green-500 disabled:bg-slate-700 disabled:text-slate-500 text-white font-medium text-sm px-4 py-2.5 rounded-lg transition-colors"
      >
        {loading ? <><Loader2 className="w-4 h-4 animate-spin" />Scanning…</> : <><Layers className="w-4 h-4" />Scan Platforms</>}
      </button>
      {error && <p className="text-red-400 text-sm">{error}</p>}
      {results && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {results.map((r) => (
            <div key={r.platform} className={cn(
              "border rounded-xl p-4 space-y-2",
              r.verdict === "risk" ? "border-red-800 bg-red-950/20" :
              r.verdict === "caution" ? "border-amber-800 bg-amber-950/20" :
              "border-slate-700 bg-slate-900"
            )}>
              <div className="flex items-center justify-between">
                <span className="font-semibold text-slate-200 capitalize">{r.platform}</span>
                <TriBadge verdict={r.verdict} />
              </div>
              {r.flags.length === 0 ? (
                <p className="text-slate-500 text-xs">No policy violations found.</p>
              ) : (
                <ul className="space-y-1">
                  {r.flags.map((f, i) => (
                    <li key={i} className="text-sm text-slate-300 flex items-start gap-1.5">
                      <span className="text-red-400 mt-0.5">•</span>{f}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Regulated Tab ──────────────────────────────────────────────────────────

function RegulatedTab({ jurisdiction }: { jurisdiction: string }) {
  const [content, setContent] = useState("");
  const [category, setCategory] = useState<RegulatedCategory>("finance");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<RegulatedScanResult | null>(null);

  const handleScan = async () => {
    if (!content.trim()) return;
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const resp = await fetch("/api/content/regulated-scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content, category, jurisdiction }),
      });
      const data = await resp.json() as RegulatedScanResult & { error?: string };
      if (!resp.ok) throw new Error(data.error ?? "Regulated scan failed");
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Regulated scan failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl space-y-4">
      <div className="space-y-1.5">
        <label className="text-sm text-slate-400">Content</label>
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Paste the content to check..."
          rows={8}
          className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2.5 text-sm text-slate-100 placeholder-slate-600 resize-y focus:outline-none focus:ring-1 focus:ring-green-600"
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <label className="text-sm text-slate-400">Category</label>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value as RegulatedCategory)}
            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-1 focus:ring-green-600"
          >
            {REGULATED_CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
          </select>
        </div>
      </div>
      <button
        onClick={handleScan}
        disabled={loading || !content.trim()}
        className="flex items-center gap-2 bg-green-600 hover:bg-green-500 disabled:bg-slate-700 disabled:text-slate-500 text-white font-medium text-sm px-4 py-2.5 rounded-lg transition-colors"
      >
        {loading ? <><Loader2 className="w-4 h-4 animate-spin" />Scanning…</> : <><AlertOctagon className="w-4 h-4" />Scan for Regulations</>}
      </button>
      {error && <p className="text-red-400 text-sm">{error}</p>}
      {result && (
        <div className="space-y-4">
          <div className={cn(
            "border rounded-xl px-4 py-3 flex items-center gap-3",
            result.compliant ? "border-green-700 bg-green-900/20" : "border-red-800 bg-red-950/20"
          )}>
            {result.compliant
              ? <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0" />
              : <XCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
            }
            <span className={cn("font-semibold text-sm", result.compliant ? "text-green-300" : "text-red-300")}>
              {result.compliant ? "Compliant — no significant violations found" : "Non-compliant — issues require attention"}
            </span>
          </div>

          {result.issues.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-semibold text-slate-500 uppercase">Issues</p>
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-slate-500 text-xs uppercase">
                    <th className="text-left pb-2 pr-4">Rule</th>
                    <th className="text-left pb-2 pr-4">Severity</th>
                    <th className="text-left pb-2">Excerpt</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {result.issues.map((issue, i) => (
                    <tr key={i}>
                      <td className="py-2 pr-4 text-slate-200">{issue.rule}</td>
                      <td className="py-2 pr-4"><SeverityBadge severity={issue.severity} /></td>
                      <td className="py-2 text-slate-500 italic text-xs">{issue.excerpt}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {result.required_disclosures.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-semibold text-slate-500 uppercase">Required Disclosures</p>
              {result.required_disclosures.map((d, i) => (
                <div key={i} className="bg-amber-950/30 border border-amber-800 rounded-lg px-4 py-3">
                  <p className="text-amber-200 text-sm">{d}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Dark Patterns Tab ──────────────────────────────────────────────────────

function DarkPatternsTab({ jurisdiction }: { jurisdiction: string }) {
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [patterns, setPatterns] = useState<DarkPattern[] | null>(null);

  const TYPE_LABELS: Record<string, string> = {
    fake_urgency: "Fake Urgency",
    hidden_costs: "Hidden Costs",
    misleading_cta: "Misleading CTA",
    subscription_trap: "Subscription Trap",
    social_proof_manipulation: "Social Proof Manipulation",
    confirm_shaming: "Confirm Shaming",
  };

  const handleScan = async () => {
    if (!content.trim()) return;
    setLoading(true);
    setError(null);
    setPatterns(null);
    try {
      const resp = await fetch("/api/content/dark-patterns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content, jurisdiction }),
      });
      const data = await resp.json() as { patterns: DarkPattern[]; error?: string };
      if (!resp.ok) throw new Error(data.error ?? "Dark patterns scan failed");
      setPatterns(data.patterns);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Dark patterns scan failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl space-y-4">
      <div className="space-y-1.5">
        <label className="text-sm text-slate-400">Content</label>
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Paste copy, ad text, or UX content..."
          rows={8}
          className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2.5 text-sm text-slate-100 placeholder-slate-600 resize-y focus:outline-none focus:ring-1 focus:ring-green-600"
        />
      </div>
      <button
        onClick={handleScan}
        disabled={loading || !content.trim()}
        className="flex items-center gap-2 bg-green-600 hover:bg-green-500 disabled:bg-slate-700 disabled:text-slate-500 text-white font-medium text-sm px-4 py-2.5 rounded-lg transition-colors"
      >
        {loading ? <><Loader2 className="w-4 h-4 animate-spin" />Scanning…</> : <><Thermometer className="w-4 h-4" />Detect Dark Patterns</>}
      </button>
      {error && <p className="text-red-400 text-sm">{error}</p>}
      {patterns !== null && (
        patterns.length === 0 ? (
          <div className="flex items-center gap-3 bg-green-950/30 border border-green-800 rounded-xl px-4 py-3">
            <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0" />
            <span className="text-green-300 text-sm font-medium">No dark patterns detected</span>
          </div>
        ) : (
          <div className="space-y-3">
            {patterns.map((p, i) => (
              <div key={i} className={cn(
                "border rounded-xl p-4 space-y-2",
                p.severity === "high" ? "border-red-800 bg-red-950/20" :
                p.severity === "medium" ? "border-amber-800 bg-amber-950/20" :
                "border-yellow-800 bg-yellow-950/10"
              )}>
                <div className="flex items-center justify-between gap-2">
                  <span className={cn(
                    "text-xs font-bold uppercase px-2 py-0.5 rounded border",
                    p.severity === "high" ? "text-red-400 border-red-700 bg-red-900/30" :
                    p.severity === "medium" ? "text-amber-400 border-amber-700 bg-amber-900/30" :
                    "text-yellow-400 border-yellow-700 bg-yellow-900/20"
                  )}>
                    {TYPE_LABELS[p.type] ?? p.type.replace(/_/g, " ")}
                  </span>
                  <SeverityBadge severity={p.severity} />
                </div>
                <blockquote className="text-slate-400 text-xs italic border-l-2 border-slate-700 pl-3">
                  &quot;{p.excerpt}&quot;
                </blockquote>
                <p className="text-slate-300 text-sm">{p.explanation}</p>
              </div>
            ))}
          </div>
        )
      )}
    </div>
  );
}

// ── Main page ──────────────────────────────────────────────────────────────

export default function ContentScannerPage() {
  const [activeTab, setActiveTab] = useState<Tab>("scan");
  const [jurisdiction, setJurisdiction] = useState("IN");

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      {/* Header */}
      <div className="border-b border-slate-800 px-6 py-4">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <Shield className="w-5 h-5 text-green-400" />
            <div>
              <h1 className="text-lg font-semibold text-slate-100">Content Shield</h1>
              <p className="text-slate-500 text-sm">Scan content for legal compliance before publishing</p>
            </div>
          </div>
          <JurisdictionSelector value={jurisdiction} onChange={setJurisdiction} />
        </div>
      </div>

      {/* Tab bar */}
      <div className="border-b border-slate-800 px-6">
        <nav className="flex gap-1 -mb-px overflow-x-auto">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "flex items-center gap-1.5 px-4 py-3 text-sm font-medium border-b-2 whitespace-nowrap transition-colors",
                  active
                    ? "border-green-500 text-green-400"
                    : "border-transparent text-slate-500 hover:text-slate-300 hover:border-slate-600"
                )}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Tab content */}
      <div className="p-6 max-w-7xl mx-auto">
        {activeTab === "scan"      && <ScanTab jurisdiction={jurisdiction} />}
        {activeTab === "brand"     && <BrandCheckTab jurisdiction={jurisdiction} />}
        {activeTab === "platform"  && <PlatformCheckTab jurisdiction={jurisdiction} />}
        {activeTab === "regulated" && <RegulatedTab jurisdiction={jurisdiction} />}
        {activeTab === "dark"      && <DarkPatternsTab jurisdiction={jurisdiction} />}
      </div>
    </div>
  );
}
