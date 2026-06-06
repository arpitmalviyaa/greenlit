"use client";

import { useState } from "react";
import { JurisdictionSelector } from "@/components/ui/jurisdiction-selector";

type OverallRisk = "high" | "medium" | "low";

interface RiskItem {
  category: string;
  description: string;
  severity: string;
  mitigation: string;
}

interface AiRiskResult {
  risks: RiskItem[];
  overall_risk: OverallRisk;
  disclosure_obligations: string[];
  recommended_policies: string[];
}

interface VendorResult {
  risk_score: number;
  gaps: string[];
  protections: string[];
  recommended_additions: string[];
  data_processor_compliant: boolean;
}

const RISK_COLOURS: Record<OverallRisk, string> = {
  high: "bg-red-100 text-red-800 border-red-300",
  medium: "bg-amber-100 text-amber-800 border-amber-300",
  low: "bg-green-100 text-green-800 border-green-300",
};

const SEVERITY_COLOURS: Record<string, string> = {
  high: "bg-red-100 text-red-700",
  medium: "bg-amber-100 text-amber-700",
  low: "bg-yellow-100 text-yellow-700",
};

export default function AiRiskPage() {
  const [jurisdiction, setJurisdiction] = useState("IN");

  // AI Risk Scanner
  const [workflowDesc, setWorkflowDesc] = useState("");
  const [aiTools, setAiTools] = useState("");
  const [scanning, setScanning] = useState(false);
  const [aiRiskResult, setAiRiskResult] = useState<AiRiskResult | null>(null);

  // Vendor Shield
  const [vendorName, setVendorName] = useState("");
  const [contractText, setContractText] = useState("");
  const [analysing, setAnalysing] = useState(false);
  const [vendorResult, setVendorResult] = useState<VendorResult | null>(null);

  async function scanAiRisk() {
    if (!workflowDesc.trim()) return;
    setScanning(true);
    setAiRiskResult(null);
    try {
      const res = await fetch("/api/ai-risk/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workflow_description: workflowDesc,
          ai_tools_used: aiTools.split(",").map((t) => t.trim()).filter(Boolean),
          jurisdiction,
        }),
      });
      const data = await res.json() as AiRiskResult;
      setAiRiskResult(data);
    } finally {
      setScanning(false);
    }
  }

  async function analyseVendor() {
    if (!vendorName.trim() || !contractText.trim()) return;
    setAnalysing(true);
    setVendorResult(null);
    try {
      const res = await fetch("/api/vendor/shield", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ vendor_name: vendorName, contract_text: contractText, jurisdiction }),
      });
      const data = await res.json() as VendorResult;
      setVendorResult(data);
    } finally {
      setAnalysing(false);
    }
  }

  return (
    <div className="p-6 space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">AI & Vendor Risk</h1>
          <p className="text-sm text-gray-500 mt-1">Scan AI workflows for legal risks and analyse vendor contracts for protection gaps.</p>
        </div>
        <JurisdictionSelector value={jurisdiction} onChange={setJurisdiction} />
      </div>

      {/* Section 1 — AI Workflow Scanner */}
      <div className="bg-white border border-gray-200 rounded-lg p-5 space-y-4">
        <h2 className="font-semibold text-gray-800">AI Workflow Scanner</h2>
        <textarea
          className="w-full border border-gray-300 rounded-md p-3 text-sm min-h-[120px] resize-y"
          placeholder="Describe your AI workflow (e.g. 'We use ChatGPT to write first drafts of all influencer captions, then have the creator review. We also use Midjourney to generate thumbnail options for YouTube…')"
          value={workflowDesc}
          onChange={(e) => setWorkflowDesc(e.target.value)}
        />
        <input
          type="text"
          className="w-full border border-gray-300 rounded-md p-2 text-sm"
          placeholder="AI tools used, comma-separated (e.g. ChatGPT, Midjourney, ElevenLabs)"
          value={aiTools}
          onChange={(e) => setAiTools(e.target.value)}
        />
        <button
          onClick={scanAiRisk}
          disabled={scanning || !workflowDesc.trim()}
          className="bg-blue-600 text-white py-2 px-4 rounded-md text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
        >
          {scanning ? "Scanning…" : "Scan Workflow"}
        </button>

        {aiRiskResult && (
          <div className="space-y-4 mt-2">
            <div className={`border rounded-lg px-4 py-3 font-semibold capitalize ${RISK_COLOURS[aiRiskResult.overall_risk]}`}>
              Overall Risk: {aiRiskResult.overall_risk}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {aiRiskResult.risks.map((risk, i) => (
                <div key={i} className="bg-gray-50 border border-gray-200 rounded-lg p-3 space-y-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs font-semibold text-gray-700">{risk.category}</p>
                    <span className={`px-2 py-0.5 rounded text-xs ${SEVERITY_COLOURS[risk.severity] ?? "bg-gray-100 text-gray-600"}`}>{risk.severity}</span>
                  </div>
                  <p className="text-sm text-gray-700">{risk.description}</p>
                  <p className="text-xs text-blue-700 bg-blue-50 rounded p-1"><span className="font-semibold">Mitigation:</span> {risk.mitigation}</p>
                </div>
              ))}
            </div>
            {aiRiskResult.disclosure_obligations.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-gray-500 mb-1">Disclosure Obligations</p>
                <ul className="list-disc pl-4 space-y-0.5">
                  {aiRiskResult.disclosure_obligations.map((d, i) => <li key={i} className="text-sm text-gray-700">{d}</li>)}
                </ul>
              </div>
            )}
            {aiRiskResult.recommended_policies.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-gray-500 mb-1">Recommended Policies</p>
                <ul className="list-disc pl-4 space-y-0.5">
                  {aiRiskResult.recommended_policies.map((p, i) => <li key={i} className="text-sm text-gray-700">{p}</li>)}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Section 2 — Vendor Shield */}
      <div className="bg-white border border-gray-200 rounded-lg p-5 space-y-4">
        <h2 className="font-semibold text-gray-800">Vendor Shield</h2>
        <input
          type="text"
          className="w-full border border-gray-300 rounded-md p-2 text-sm"
          placeholder="Vendor name (e.g. Adobe Stock, Anthropic, AWS)"
          value={vendorName}
          onChange={(e) => setVendorName(e.target.value)}
        />
        <textarea
          className="w-full border border-gray-300 rounded-md p-3 text-sm min-h-[150px] resize-y"
          placeholder="Paste vendor contract text here…"
          value={contractText}
          onChange={(e) => setContractText(e.target.value)}
        />
        <button
          onClick={analyseVendor}
          disabled={analysing || !vendorName.trim() || !contractText.trim()}
          className="bg-orange-600 text-white py-2 px-4 rounded-md text-sm font-medium hover:bg-orange-700 disabled:opacity-50"
        >
          {analysing ? "Analysing…" : "Analyse Vendor Contract"}
        </button>

        {vendorResult && (
          <div className="space-y-4 mt-2">
            <div className="flex items-center gap-4">
              <div className="flex-1">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-semibold text-gray-600">Risk Score</span>
                  <span className="text-sm font-bold">{vendorResult.risk_score}/100</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full ${vendorResult.risk_score >= 70 ? "bg-red-500" : vendorResult.risk_score >= 40 ? "bg-amber-500" : "bg-green-500"}`}
                    style={{ width: `${vendorResult.risk_score}%` }}
                  />
                </div>
              </div>
              <span className={`px-3 py-1 rounded-full text-xs font-semibold ${vendorResult.data_processor_compliant ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
                {vendorResult.data_processor_compliant ? "DPA Compliant" : "DPA Non-Compliant"}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {vendorResult.gaps.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-red-600 mb-1">Gaps</p>
                  <ul className="list-disc pl-4 space-y-0.5">
                    {vendorResult.gaps.map((g, i) => <li key={i} className="text-sm text-red-700">{g}</li>)}
                  </ul>
                </div>
              )}
              {vendorResult.protections.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-green-600 mb-1">Protections</p>
                  <ul className="list-disc pl-4 space-y-0.5">
                    {vendorResult.protections.map((p, i) => <li key={i} className="text-sm text-green-700">{p}</li>)}
                  </ul>
                </div>
              )}
            </div>
            {vendorResult.recommended_additions.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-gray-500 mb-1">Recommended Additions</p>
                <ul className="list-disc pl-4 space-y-0.5">
                  {vendorResult.recommended_additions.map((r, i) => <li key={i} className="text-sm text-gray-700">{r}</li>)}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
