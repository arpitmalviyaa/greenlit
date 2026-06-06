"use client";

import { useState } from "react";
import { JurisdictionSelector } from "@/components/ui/jurisdiction-selector";

type NdaVerdict = "safe" | "caution" | "dangerous";

interface NdaTrap {
  clause_excerpt: string;
  trap_type: string;
  explanation: string;
  severity: "critical" | "high" | "medium" | "low";
}

interface NdaScanResult {
  traps: NdaTrap[];
  safe_clauses: string[];
  overall_verdict: NdaVerdict;
  recommended_redlines: string[];
}

const VERDICT_STYLES: Record<NdaVerdict, string> = {
  safe: "bg-green-50 border-green-300 text-green-800",
  caution: "bg-amber-50 border-amber-300 text-amber-800",
  dangerous: "bg-red-50 border-red-300 text-red-800",
};

const SEVERITY_COLOURS: Record<string, string> = {
  critical: "bg-red-100 text-red-800",
  high: "bg-orange-100 text-orange-800",
  medium: "bg-amber-100 text-amber-800",
  low: "bg-yellow-100 text-yellow-800",
};

export default function NdaScannerPage() {
  const [ndaText, setNdaText] = useState("");
  const [jurisdiction, setJurisdiction] = useState("IN");
  const [scanning, setScanning] = useState(false);
  const [result, setResult] = useState<NdaScanResult | null>(null);
  const [showSafe, setShowSafe] = useState(false);

  async function handleScan() {
    if (!ndaText.trim()) return;
    setScanning(true);
    setResult(null);
    try {
      const res = await fetch("/api/nda/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nda_text: ndaText, jurisdiction }),
      });
      const data = await res.json() as NdaScanResult;
      setResult(data);
    } finally {
      setScanning(false);
    }
  }

  return (
    <div className="max-w-3xl mx-auto space-y-8 p-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">NDA Scanner</h1>
        <p className="text-sm text-gray-500 mt-1">Detect NDA traps — one-sided IP grabs, indefinite confidentiality, overreaching non-competes, and more.</p>
      </div>

      <div className="bg-white border border-gray-200 rounded-lg p-5 space-y-4">
        <textarea
          className="w-full border border-gray-300 rounded-md p-3 text-sm min-h-[200px] resize-y"
          placeholder="Paste the NDA text here…"
          value={ndaText}
          onChange={(e) => setNdaText(e.target.value)}
        />
        <JurisdictionSelector value={jurisdiction} onChange={setJurisdiction} />
        <button
          onClick={handleScan}
          disabled={scanning || !ndaText.trim()}
          className="w-full bg-red-600 text-white py-2 px-4 rounded-md text-sm font-medium hover:bg-red-700 disabled:opacity-50"
        >
          {scanning ? "Scanning NDA…" : "Scan NDA"}
        </button>
      </div>

      {result && (
        <div className="space-y-5">
          {/* Verdict */}
          <div className={`border rounded-lg p-4 ${VERDICT_STYLES[result.overall_verdict]}`}>
            <p className="font-bold text-lg capitalize">{result.overall_verdict}</p>
            <p className="text-sm mt-0.5">{result.traps.length} trap{result.traps.length !== 1 ? "s" : ""} found · {result.safe_clauses.length} safe clause{result.safe_clauses.length !== 1 ? "s" : ""}</p>
          </div>

          {/* Traps */}
          {result.traps.length > 0 && (
            <div className="space-y-3">
              <h3 className="font-semibold text-gray-800 text-sm">Traps Detected</h3>
              {result.traps.map((trap, i) => (
                <div key={i} className="bg-white border border-gray-200 rounded-lg p-4 space-y-2">
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-0.5 rounded text-xs font-semibold ${SEVERITY_COLOURS[trap.severity] ?? "bg-gray-100"}`}>{trap.severity}</span>
                    <span className="text-xs font-semibold text-gray-700">{trap.trap_type}</span>
                  </div>
                  {trap.clause_excerpt && (
                    <blockquote className="text-xs italic text-gray-600 border-l-2 border-red-300 pl-2">&ldquo;{trap.clause_excerpt}&rdquo;</blockquote>
                  )}
                  <p className="text-sm text-gray-700">{trap.explanation}</p>
                </div>
              ))}
            </div>
          )}

          {/* Recommended Redlines */}
          {result.recommended_redlines.length > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
              <h3 className="font-semibold text-amber-800 text-sm mb-2">Recommended Redlines</h3>
              <ul className="space-y-1 list-disc pl-4">
                {result.recommended_redlines.map((r, i) => <li key={i} className="text-sm text-amber-800">{r}</li>)}
              </ul>
            </div>
          )}

          {/* Safe Clauses */}
          {result.safe_clauses.length > 0 && (
            <div className="bg-white border border-gray-200 rounded-lg">
              <button
                onClick={() => setShowSafe(!showSafe)}
                className="w-full text-left px-4 py-3 text-sm font-semibold text-gray-700 flex items-center justify-between"
              >
                Safe Clauses ({result.safe_clauses.length})
                <span>{showSafe ? "▲" : "▼"}</span>
              </button>
              {showSafe && (
                <div className="px-4 pb-4 space-y-1">
                  {result.safe_clauses.map((c, i) => (
                    <p key={i} className="text-sm text-green-700 flex items-start gap-1"><span>✓</span><span>{c}</span></p>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
