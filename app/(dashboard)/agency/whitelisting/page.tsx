"use client";

import { useState, useCallback } from "react";
import { Shield, ChevronDown, ChevronUp, AlertTriangle, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { JurisdictionSelector } from "@/components/ui/jurisdiction-selector";

const RIGHTS_OPTIONS = [
  { id: "amplify", label: "Amplify (boost posts)" },
  { id: "retarget", label: "Retarget audiences" },
  { id: "dark_post", label: "Dark post (non-organic)" },
  { id: "spark_ads", label: "Spark Ads (TikTok)" },
  { id: "allowlist", label: "Allowlist / whitelist" },
  { id: "paid_partnership_label", label: "Paid Partnership Label" },
  { id: "third_party_use", label: "Third-party use" },
  { id: "archive_rights", label: "Archive rights" },
];

const STATUS_COLOURS: Record<string, string> = {
  pending_review: "bg-yellow-100 text-yellow-800",
  approved: "bg-green-100 text-green-800",
  rejected: "bg-red-100 text-red-700",
  needs_amendment: "bg-orange-100 text-orange-800",
};

interface WhitelistingRequest {
  id: string;
  creator_id: string;
  brand_name: string;
  platform: string;
  status: string;
  created_at: string;
  analysis_json: {
    verdict?: string;
    risks?: string[];
    missing_clauses?: string[];
    recommended_amendments?: string[];
    compliance_notes?: string;
  } | null;
}

interface AnalysisResult {
  verdict: string;
  risks: string[];
  missing_clauses: string[];
  recommended_amendments: string[];
  compliance_notes: string;
}

export default function WhitelistingPage() {
  const [jurisdiction, setJurisdiction] = useState("IN");

  // Form state
  const [creatorId, setCreatorId] = useState("");
  const [brandName, setBrandName] = useState("");
  const [platform, setPlatform] = useState("instagram");
  const [contentDescription, setContentDescription] = useState("");
  const [selectedRights, setSelectedRights] = useState<string[]>([]);
  const [analysing, setAnalysing] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);

  // History
  const [requests, setRequests] = useState<WhitelistingRequest[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [historyFilter, setHistoryFilter] = useState("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const toggleRight = (id: string) =>
    setSelectedRights(prev => prev.includes(id) ? prev.filter(r => r !== id) : [...prev, id]);

  const analyse = async () => {
    if (!creatorId || !brandName || !contentDescription || selectedRights.length === 0) return;
    setAnalysing(true);
    setResult(null);
    const res = await fetch("/api/whitelisting/analyse", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ creator_id: creatorId, brand_name: brandName, platform, content_description: contentDescription, requested_rights: selectedRights, jurisdiction }),
    });
    const json = await res.json() as { analysis?: AnalysisResult };
    setResult(json.analysis ?? null);
    setAnalysing(false);
    void loadHistory();
  };

  const loadHistory = useCallback(async () => {
    setLoadingHistory(true);
    const params = new URLSearchParams();
    if (creatorId) params.set("creator_id", creatorId);
    if (historyFilter !== "all") params.set("status", historyFilter);
    const res = await fetch(`/api/whitelisting/list?${params}`);
    const json = await res.json() as { requests?: WhitelistingRequest[] };
    setRequests(json.requests ?? []);
    setLoadingHistory(false);
  }, [creatorId, historyFilter]);

  return (
    <div className="flex flex-col lg:flex-row gap-6 p-6 bg-gray-50 min-h-screen">
      {/* Left: New Request */}
      <div className="w-full lg:w-[420px] shrink-0 space-y-4">
        <div className="flex items-center gap-2">
          <Shield className="w-5 h-5" />
          <h1 className="text-xl font-bold">Whitelisting Guard</h1>
        </div>

        <Card>
          <CardHeader><CardTitle className="text-sm">New Whitelisting Request</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div><Label>Creator ID</Label><Input value={creatorId} onChange={e => setCreatorId(e.target.value)} placeholder="uuid" /></div>
            <div><Label>Brand Name</Label><Input value={brandName} onChange={e => setBrandName(e.target.value)} placeholder="Brand Inc." /></div>
            <div>
              <Label>Platform</Label>
              <select className="w-full border rounded px-2 py-1.5 text-sm mt-1" value={platform} onChange={e => setPlatform(e.target.value)}>
                <option value="instagram">Instagram</option>
                <option value="youtube">YouTube</option>
                <option value="twitter">Twitter / X</option>
                <option value="linkedin">LinkedIn</option>
                <option value="tiktok">TikTok</option>
              </select>
            </div>
            <div>
              <Label>Content Description</Label>
              <textarea
                className="w-full border rounded px-2 py-1.5 text-sm mt-1 min-h-[80px] resize-none"
                value={contentDescription}
                onChange={e => setContentDescription(e.target.value)}
                placeholder="Describe the content being whitelisted…"
              />
            </div>
            <div>
              <Label className="mb-2 block">Requested Rights</Label>
              <div className="grid grid-cols-1 gap-2">
                {RIGHTS_OPTIONS.map(r => (
                  <label key={r.id} className="flex items-center gap-2 text-sm cursor-pointer">
                    <input type="checkbox" checked={selectedRights.includes(r.id)} onChange={() => toggleRight(r.id)} className="rounded" />
                    {r.label}
                  </label>
                ))}
              </div>
            </div>
            <JurisdictionSelector value={jurisdiction} onChange={setJurisdiction} />
            <Button onClick={() => void analyse()} disabled={analysing || !creatorId || !brandName || !contentDescription || selectedRights.length === 0} className="w-full">
              {analysing ? "Analysing…" : "Analyse Request"}
            </Button>
          </CardContent>
        </Card>

        {result && (
          <Card className="border-blue-200">
            <CardHeader><CardTitle className="text-sm text-blue-700">Analysis Result</CardTitle></CardHeader>
            <CardContent className="space-y-3 text-sm">
              <p className="text-gray-800">{result.verdict}</p>
              {result.risks.length > 0 && (
                <div>
                  <p className="font-medium text-red-700 flex items-center gap-1 mb-1"><AlertTriangle className="w-3 h-3" />Risks</p>
                  <ul className="space-y-0.5 pl-3">{result.risks.map((r, i) => <li key={i} className="text-red-600 text-xs">• {r}</li>)}</ul>
                </div>
              )}
              {result.missing_clauses.length > 0 && (
                <div>
                  <p className="font-medium text-orange-700 mb-1">Missing Clauses</p>
                  <ul className="space-y-0.5 pl-3">{result.missing_clauses.map((c, i) => <li key={i} className="text-orange-600 text-xs">• {c}</li>)}</ul>
                </div>
              )}
              {result.recommended_amendments.length > 0 && (
                <div>
                  <p className="font-medium text-blue-700 mb-1">Recommended Amendments</p>
                  <ul className="space-y-0.5 pl-3">{result.recommended_amendments.map((a, i) => <li key={i} className="text-blue-600 text-xs">• {a}</li>)}</ul>
                </div>
              )}
              {result.compliance_notes && (
                <div className="bg-gray-50 rounded p-2 text-xs text-gray-600">{result.compliance_notes}</div>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      {/* Right: History */}
      <div className="flex-1 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold">Request History</h2>
          <div className="flex gap-2">
            {["all", "pending_review", "approved", "rejected", "needs_amendment"].map(s => (
              <button key={s} onClick={() => { setHistoryFilter(s); void loadHistory(); }}
                className={`px-2 py-1 rounded text-xs font-medium ${historyFilter === s ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-600"}`}>
                {s === "all" ? "All" : s.replace("_", " ")}
              </button>
            ))}
          </div>
        </div>
        <Button size="sm" variant="outline" onClick={() => void loadHistory()} disabled={loadingHistory}>
          {loadingHistory ? "Loading…" : "Load History"}
        </Button>

        {requests.length === 0 ? (
          <p className="text-sm text-gray-400">No requests yet.</p>
        ) : (
          <div className="space-y-2">
            {requests.map(req => (
              <Card key={req.id}>
                <CardContent className="pt-4">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <p className="font-medium text-sm">{req.brand_name}</p>
                      <p className="text-xs text-gray-500">{req.platform} · {new Date(req.created_at).toLocaleDateString()}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${STATUS_COLOURS[req.status] ?? "bg-gray-100"}`}>{req.status.replace("_", " ")}</span>
                      <button onClick={() => setExpandedId(expandedId === req.id ? null : req.id)}>
                        {expandedId === req.id ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                  {expandedId === req.id && req.analysis_json && (
                    <div className="mt-2 border-t pt-2 space-y-2 text-sm">
                      {req.analysis_json.verdict && <p className="text-gray-700">{req.analysis_json.verdict}</p>}
                      {(req.analysis_json.risks?.length ?? 0) > 0 && (
                        <div><p className="text-xs font-medium text-red-700 mb-1">Risks</p>
                          <ul>{req.analysis_json.risks!.map((r, i) => <li key={i} className="text-xs text-red-600">• {r}</li>)}</ul>
                        </div>
                      )}
                      {(req.analysis_json.recommended_amendments?.length ?? 0) > 0 && (
                        <div><p className="text-xs font-medium text-blue-700 mb-1">Amendments</p>
                          <ul>{req.analysis_json.recommended_amendments!.map((a, i) => <li key={i} className="text-xs text-blue-600">• {a}</li>)}</ul>
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
