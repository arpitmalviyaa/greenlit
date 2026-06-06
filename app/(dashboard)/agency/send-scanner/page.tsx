"use client";

import { useState } from "react";
import { JurisdictionSelector } from "@/components/ui/jurisdiction-selector";

type OverallRisk = "high" | "medium" | "low" | "safe";
type SendRecommendation = "send" | "review" | "do_not_send";
type RewriteGoal = "safer" | "firmer" | "friendlier" | "formal";

interface ScanIssue {
  type: string;
  excerpt: string;
  explanation: string;
  severity: string;
}

interface ScanResult {
  overall_risk: OverallRisk;
  send_recommendation: SendRecommendation;
  issues: ScanIssue[];
  send_scan_id: string | null;
}

interface RewriteResult {
  rewritten_content: string;
  changes_made: string[];
  risk_delta: string;
}

interface CounselResult {
  answer: string;
  caveats: string[];
  recommended_action: string;
  relevant_law: string[];
}

const RISK_COLOURS: Record<OverallRisk, string> = {
  high: "bg-red-100 text-red-800 border-red-300",
  medium: "bg-amber-100 text-amber-800 border-amber-300",
  low: "bg-yellow-100 text-yellow-800 border-yellow-300",
  safe: "bg-green-100 text-green-800 border-green-300",
};

const REC_COLOURS: Record<SendRecommendation, string> = {
  send: "bg-green-50 border-green-300 text-green-800",
  review: "bg-amber-50 border-amber-300 text-amber-800",
  do_not_send: "bg-red-50 border-red-300 text-red-800",
};

const SEVERITY_COLOURS: Record<string, string> = {
  critical: "bg-red-100 text-red-800",
  high: "bg-orange-100 text-orange-800",
  medium: "bg-amber-100 text-amber-800",
  low: "bg-yellow-100 text-yellow-800",
};

const RECIPIENT_TYPES = ["brand", "creator", "lawyer", "public", "regulator", "other"];
const CHANNELS = ["email", "whatsapp", "sms", "social", "legal_filing", "other"];
const REWRITE_GOALS: RewriteGoal[] = ["safer", "firmer", "friendlier", "formal"];

export default function SendScannerPage() {
  const [content, setContent] = useState("");
  const [recipientType, setRecipientType] = useState("brand");
  const [channel, setChannel] = useState("email");
  const [jurisdiction, setJurisdiction] = useState("IN");
  const [scanning, setScanning] = useState(false);
  const [scanResult, setScanResult] = useState<ScanResult | null>(null);

  const [rewriteGoal, setRewriteGoal] = useState<RewriteGoal>("safer");
  const [rewriting, setRewriting] = useState(false);
  const [rewriteResult, setRewriteResult] = useState<RewriteResult | null>(null);

  const [counselQ, setCounselQ] = useState("");
  const [counselling, setCounselling] = useState(false);
  const [counselResult, setCounselResult] = useState<CounselResult | null>(null);

  async function handleScan() {
    if (!content.trim()) return;
    setScanning(true);
    setScanResult(null);
    setRewriteResult(null);
    setCounselResult(null);
    try {
      const res = await fetch("/api/send/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content, recipient_type: recipientType, channel, jurisdiction }),
      });
      const data = await res.json() as ScanResult;
      setScanResult(data);
    } finally {
      setScanning(false);
    }
  }

  async function handleRewrite() {
    if (!scanResult?.send_scan_id) return;
    setRewriting(true);
    try {
      const res = await fetch("/api/send/rewrite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ send_scan_id: scanResult.send_scan_id, rewrite_goal: rewriteGoal }),
      });
      const data = await res.json() as RewriteResult;
      setRewriteResult(data);
    } finally {
      setRewriting(false);
    }
  }

  async function handleCounsel() {
    if (!counselQ.trim() || !content.trim()) return;
    setCounselling(true);
    try {
      const res = await fetch("/api/send/counsel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content,
          question: counselQ,
          jurisdiction,
          send_scan_id: scanResult?.send_scan_id,
        }),
      });
      const data = await res.json() as CounselResult;
      setCounselResult(data);
    } finally {
      setCounselling(false);
    }
  }

  return (
    <div className="max-w-3xl mx-auto space-y-8 p-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Send Scanner</h1>
        <p className="text-sm text-gray-500 mt-1">Review a message before you send it — catch legal risks, tone issues, and commitment language.</p>
      </div>

      {/* Step 1 — Input */}
      <div className="bg-white border border-gray-200 rounded-lg p-6 space-y-4">
        <textarea
          className="w-full border border-gray-300 rounded-md p-3 text-sm min-h-[140px] resize-y focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="Paste the message, email, or post you're about to send..."
          value={content}
          onChange={(e) => setContent(e.target.value)}
        />
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Recipient type</label>
            <select
              className="w-full border border-gray-300 rounded-md p-2 text-sm"
              value={recipientType}
              onChange={(e) => setRecipientType(e.target.value)}
            >
              {RECIPIENT_TYPES.map((t) => <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Channel</label>
            <select
              className="w-full border border-gray-300 rounded-md p-2 text-sm"
              value={channel}
              onChange={(e) => setChannel(e.target.value)}
            >
              {CHANNELS.map((c) => <option key={c} value={c}>{c.replace("_", " ")}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Jurisdiction</label>
            <JurisdictionSelector value={jurisdiction} onChange={setJurisdiction} />
          </div>
        </div>
        <button
          onClick={handleScan}
          disabled={scanning || !content.trim()}
          className="w-full bg-blue-600 text-white py-2 px-4 rounded-md text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
        >
          {scanning ? "Scanning…" : "Scan Now"}
        </button>
      </div>

      {/* Step 2 — Results */}
      {scanResult && (
        <div className="space-y-4">
          <div className={`border rounded-lg p-4 flex items-center gap-3 ${REC_COLOURS[scanResult.send_recommendation]}`}>
            <span className="font-semibold capitalize">{scanResult.send_recommendation.replace("_", " ")}</span>
            <span className={`ml-auto px-2 py-0.5 rounded-full text-xs font-semibold border ${RISK_COLOURS[scanResult.overall_risk]}`}>
              {scanResult.overall_risk.toUpperCase()} RISK
            </span>
          </div>

          {scanResult.issues.length > 0 && (
            <div className="space-y-3">
              <h3 className="font-semibold text-gray-800 text-sm">Issues Found</h3>
              {scanResult.issues.map((issue, i) => (
                <div key={i} className="bg-white border border-gray-200 rounded-lg p-4 space-y-2">
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-0.5 rounded text-xs font-semibold ${SEVERITY_COLOURS[issue.severity] ?? "bg-gray-100 text-gray-700"}`}>
                      {issue.severity}
                    </span>
                    <span className="text-xs font-medium text-gray-700">{issue.type}</span>
                  </div>
                  {issue.excerpt && (
                    <blockquote className="text-xs italic text-gray-600 border-l-2 border-gray-300 pl-2">
                      &ldquo;{issue.excerpt}&rdquo;
                    </blockquote>
                  )}
                  <p className="text-sm text-gray-700">{issue.explanation}</p>
                </div>
              ))}
            </div>
          )}

          {/* Rewrite */}
          <div className="bg-white border border-gray-200 rounded-lg p-4 space-y-3">
            <h3 className="font-semibold text-gray-800 text-sm">Rewrite</h3>
            <div className="flex gap-2 flex-wrap">
              {REWRITE_GOALS.map((g) => (
                <button
                  key={g}
                  onClick={() => setRewriteGoal(g)}
                  className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
                    rewriteGoal === g ? "bg-blue-600 text-white border-blue-600" : "bg-white text-gray-700 border-gray-300 hover:border-blue-400"
                  }`}
                >
                  {g.charAt(0).toUpperCase() + g.slice(1)}
                </button>
              ))}
            </div>
            <button
              onClick={handleRewrite}
              disabled={rewriting}
              className="bg-gray-900 text-white py-1.5 px-4 rounded-md text-sm font-medium hover:bg-gray-700 disabled:opacity-50"
            >
              {rewriting ? "Rewriting…" : "Rewrite"}
            </button>
            {rewriteResult && (
              <div className="space-y-3 mt-2">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <p className="text-xs font-medium text-gray-500 mb-1">Original</p>
                    <p className="text-sm text-gray-700 bg-red-50 p-2 rounded border border-red-100 whitespace-pre-wrap">{content}</p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-gray-500 mb-1">Rewritten</p>
                    <p className="text-sm text-gray-700 bg-green-50 p-2 rounded border border-green-100 whitespace-pre-wrap">{rewriteResult.rewritten_content}</p>
                  </div>
                </div>
                {rewriteResult.changes_made.length > 0 && (
                  <ul className="text-xs text-gray-600 space-y-1 list-disc pl-4">
                    {rewriteResult.changes_made.map((c, i) => <li key={i}>{c}</li>)}
                  </ul>
                )}
                {rewriteResult.risk_delta && (
                  <p className="text-xs text-gray-500 italic">{rewriteResult.risk_delta}</p>
                )}
              </div>
            )}
          </div>

          {/* WhatsApp Counsel */}
          <div className="bg-white border border-gray-200 rounded-lg p-4 space-y-3">
            <h3 className="font-semibold text-gray-800 text-sm">WhatsApp Counsel</h3>
            <div className="flex gap-2">
              <input
                type="text"
                className="flex-1 border border-gray-300 rounded-md p-2 text-sm"
                placeholder="Ask a specific legal question about this message…"
                value={counselQ}
                onChange={(e) => setCounselQ(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") void handleCounsel(); }}
              />
              <button
                onClick={handleCounsel}
                disabled={counselling || !counselQ.trim()}
                className="bg-green-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-green-700 disabled:opacity-50"
              >
                {counselling ? "Asking…" : "Ask"}
              </button>
            </div>
            {counselResult && (
              <div className="space-y-3 mt-2">
                <p className="text-sm text-gray-800">{counselResult.answer}</p>
                {counselResult.recommended_action && (
                  <div className="bg-blue-50 border border-blue-200 rounded p-3">
                    <p className="text-xs font-semibold text-blue-700 mb-1">Recommended Action</p>
                    <p className="text-sm text-blue-800">{counselResult.recommended_action}</p>
                  </div>
                )}
                {counselResult.caveats.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-gray-500 mb-1">Caveats</p>
                    <ul className="text-xs text-gray-600 space-y-1 list-disc pl-4">
                      {counselResult.caveats.map((c, i) => <li key={i}>{c}</li>)}
                    </ul>
                  </div>
                )}
                {counselResult.relevant_law.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-gray-500 mb-1">Relevant Law</p>
                    <div className="flex flex-wrap gap-1">
                      {counselResult.relevant_law.map((l, i) => (
                        <span key={i} className="px-2 py-0.5 bg-gray-100 text-gray-700 rounded text-xs">{l}</span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
