"use client";

// Shared content-check UI — used by the agency Content Check page and the
// creator Check tab. Paste → verdict + certificate, result via ResultScreen.

import { useState } from "react";
import { cn } from "@/lib/utils/cn";
import { ResultScreen, type ResultData, type ResultIssue } from "@/components/analysis/result-screen";
import { Loader2, Award, Link2 } from "lucide-react";

interface CheckIssue {
  issue: string;
  why_it_matters: string;
  severity: ResultIssue["severity"];
  fix_suggestion: string;
  excerpt: string;
}

interface CheckResponse {
  verdict?: "greenlit" | "caution" | "blocked";
  summary?: string;
  issues?: CheckIssue[];
  safe_aspects?: string[];
  scan_id?: string | null;
  error?: string;
}

const CONTENT_TYPES: Array<[string, string]> = [
  ["caption", "Caption"],
  ["script", "Script"],
  ["reel", "Reel"],
  ["video", "Video"],
  ["ad", "Ad"],
  ["podcast", "Podcast"],
  ["carousel", "Carousel"],
];

function CertificateHero({ scanId }: { scanId: string }) {
  const [copied, setCopied] = useState(false);
  const url = typeof window !== "undefined" ? `${window.location.origin}/certificate/${scanId}` : `/certificate/${scanId}`;

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch { /* no clipboard */ }
  }

  return (
    <div className="rounded-xl border border-[#1D9E75]/30 bg-white px-5 py-4 flex flex-wrap items-center gap-3">
      <Award className="w-6 h-6 text-[#1D9E75] shrink-0" />
      <div className="flex-1 min-w-[180px]">
        <p className="text-sm font-semibold text-gray-900">Clearance recorded</p>
        <p className="text-xs text-gray-500">Verdict, date and content fingerprint are on file in your workspace.</p>
      </div>
      <a
        href={`/certificate/${scanId}`}
        target="_blank"
        rel="noopener noreferrer"
        className="text-xs font-medium bg-[#1D9E75] text-white rounded-md px-3.5 py-2 hover:opacity-90"
      >
        View record
      </a>
      <button
        onClick={copyLink}
        className="text-xs font-medium text-gray-500 hover:text-gray-700 inline-flex items-center gap-1.5"
      >
        <Link2 className="w-3.5 h-3.5" />
        {copied ? "Link copied ✓" : "Copy link"}
      </button>
    </div>
  );
}

export function ContentCheckPanel({ compact = false }: { compact?: boolean }) {
  const [content, setContent] = useState("");
  const [contentType, setContentType] = useState("caption");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ResultData | null>(null);
  const [error, setError] = useState("");

  async function handleCheck() {
    setLoading(true);
    setError("");
    setResult(null);
    try {
      const res = await fetch("/api/content/check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content, content_type: contentType }),
      });
      const data = await res.json() as CheckResponse;
      if (!res.ok || !data.verdict) {
        setError(data.error ?? "The check could not finish. Please try again.");
        return;
      }
      const issues = (data.issues ?? []).map<ResultIssue>((i) => ({
        title: i.issue,
        why: i.why_it_matters,
        clause_text: i.excerpt,
        severity: i.severity,
        wording: i.fix_suggestion,
      }));
      const verdict = data.verdict === "blocked" ? "hold" : data.verdict === "caution" ? "negotiate" : "safe";
      setResult({
        verdict,
        summary:
          data.summary ??
          (issues.length === 0 ? "Nothing stood out — this looks ready to go." : `${issues.length} thing${issues.length !== 1 ? "s" : ""} to fix before publishing.`),
        top: issues.slice(0, 3),
        reviewing: issues.slice(3),
        standardTerms: data.safe_aspects ?? [],
        confidenceNote: "AI-assisted compliance read of the content you pasted — a second pair of experienced eyes, not a law firm.",
        hero: data.verdict === "greenlit" && data.scan_id ? <CertificateHero scanId={data.scan_id} /> : undefined,
      });
    } catch {
      setError("Could not reach the service. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className={cn("space-y-4", !compact && "grid grid-cols-1 lg:grid-cols-2 gap-6 space-y-0")}>
      <div className="space-y-3">
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          rows={compact ? 8 : 12}
          placeholder="Paste your caption, script or post here…"
          className="w-full bg-white border border-gray-300 text-gray-900 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-1 focus:ring-[#1D9E75] resize-none leading-relaxed"
        />
        <div className="flex flex-wrap gap-1.5">
          {CONTENT_TYPES.map(([value, label]) => (
            <button
              key={value}
              onClick={() => setContentType(value)}
              className={cn(
                "text-xs font-medium rounded-full px-3 py-1.5 border transition-colors",
                contentType === value
                  ? "border-[#1D9E75] bg-[#1D9E75]/10 text-[#157A5B]"
                  : "border-gray-200 text-gray-500 hover:border-gray-300"
              )}
            >
              {label}
            </button>
          ))}
        </div>
        <button
          className="w-full bg-[#1D9E75] text-white rounded-md py-2.5 text-sm font-medium hover:opacity-90 disabled:opacity-50"
          disabled={loading || content.trim().length < 10}
          onClick={handleCheck}
        >
          {loading ? (
            <span className="inline-flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" />Checking…</span>
          ) : (
            "Check before it goes live"
          )}
        </button>
        {error && (
          <div className="rounded-lg border border-amber-300 bg-amber-50 p-3">
            <p className="text-sm text-amber-900">{error}</p>
          </div>
        )}
      </div>
      <div>
        {result ? (
          <ResultScreen data={result} />
        ) : (
          !compact && (
            <div className="h-full min-h-[200px] flex items-center justify-center text-center text-gray-400 text-sm border border-dashed border-gray-200 rounded-lg">
              The verdict appears here.
            </div>
          )
        )}
      </div>
    </div>
  );
}
