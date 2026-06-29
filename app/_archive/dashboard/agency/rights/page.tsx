"use client";

import { useState, useCallback } from "react";
import { Scale } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { JurisdictionSelector } from "@/components/ui/jurisdiction-selector";

const PLATFORM_OPTIONS = ["instagram", "youtube", "twitter", "linkedin", "tiktok", "offline", "other"];
const USAGE_TYPES = [
  { id: "organic_social", label: "Organic Social" },
  { id: "paid_social", label: "Paid Social" },
  { id: "ooh", label: "OOH (Out of Home)" },
  { id: "tv", label: "TV" },
  { id: "digital_display", label: "Digital Display" },
  { id: "print", label: "Print" },
  { id: "ctv", label: "CTV (Connected TV)" },
];

interface BreakdownItem { factor: string; impact: string }
interface ValuationResult {
  suggested_range_low: number;
  suggested_range_high: number;
  reasoning: string;
  breakdown: BreakdownItem[];
}
interface HistoryRecord {
  id: string;
  creator_id: string;
  content_type: string;
  platforms: string[];
  duration_days: number;
  territory: string;
  exclusivity: boolean;
  suggested_range_low: number;
  suggested_range_high: number;
  created_at: string;
}

export default function RightsPricingPage() {
  const [jurisdiction, setJurisdiction] = useState("IN");
  const [creatorId, setCreatorId] = useState("");
  const [contentType, setContentType] = useState("");
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>([]);
  const [durationDays, setDurationDays] = useState(30);
  const [territory, setTerritory] = useState("India");
  const [exclusivity, setExclusivity] = useState(false);
  const [selectedUsage, setSelectedUsage] = useState<string[]>([]);
  const [baseFee, setBaseFee] = useState("");
  const [calculating, setCalculating] = useState(false);
  const [result, setResult] = useState<ValuationResult | null>(null);

  const [history, setHistory] = useState<HistoryRecord[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [historyCreatorId, setHistoryCreatorId] = useState("");

  const togglePlatform = (p: string) =>
    setSelectedPlatforms(prev => prev.includes(p) ? prev.filter(x => x !== p) : [...prev, p]);
  const toggleUsage = (u: string) =>
    setSelectedUsage(prev => prev.includes(u) ? prev.filter(x => x !== u) : [...prev, u]);

  const calculate = async () => {
    if (!creatorId || !contentType || selectedPlatforms.length === 0 || selectedUsage.length === 0) return;
    setCalculating(true);
    setResult(null);
    const res = await fetch("/api/rights/price", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        creator_id: creatorId, content_type: contentType, platforms: selectedPlatforms,
        duration_days: durationDays, territory, exclusivity, usage_types: selectedUsage,
        jurisdiction, base_fee: baseFee ? Number(baseFee) : undefined,
      }),
    });
    const json = await res.json() as ValuationResult;
    setResult(json);
    setCalculating(false);
  };

  const loadHistory = useCallback(async () => {
    setLoadingHistory(true);
    const params = historyCreatorId ? `?creator_id=${encodeURIComponent(historyCreatorId)}` : "";
    const res = await fetch(`/api/rights/history${params}`);
    const json = await res.json() as { valuations?: HistoryRecord[] };
    setHistory(json.valuations ?? []);
    setLoadingHistory(false);
  }, [historyCreatorId]);

  const fmt = (n: number) => new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n);

  return (
    <div className="p-6 space-y-8 bg-gray-50 min-h-screen">
      <div className="flex items-center gap-2">
        <Scale className="w-5 h-5" />
        <h1 className="text-xl font-bold">Rights Pricing Calculator</h1>
      </div>

      {/* Section 1 — Calculator */}
      <Card>
        <CardHeader><CardTitle className="text-base">Calculate Rights Value</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div><Label>Creator ID</Label><Input value={creatorId} onChange={e => setCreatorId(e.target.value)} placeholder="uuid" /></div>
            <div><Label>Content Type</Label><Input value={contentType} onChange={e => setContentType(e.target.value)} placeholder="e.g. Instagram Reel" /></div>
            <div><Label>Territory</Label><Input value={territory} onChange={e => setTerritory(e.target.value)} /></div>
            <div><Label>Base Fee (optional)</Label><Input type="number" value={baseFee} onChange={e => setBaseFee(e.target.value)} placeholder="₹" /></div>
          </div>

          <div>
            <Label className="mb-2 block">Duration: {durationDays} days</Label>
            <input type="range" min={1} max={365} value={durationDays} onChange={e => setDurationDays(Number(e.target.value))} className="w-full" />
            <div className="flex justify-between text-xs text-gray-400 mt-1"><span>1 day</span><span>365 days</span></div>
          </div>

          <div className="flex items-center gap-2">
            <input type="checkbox" id="excl" checked={exclusivity} onChange={e => setExclusivity(e.target.checked)} />
            <Label htmlFor="excl">Exclusivity</Label>
          </div>

          <div>
            <Label className="mb-2 block">Platforms</Label>
            <div className="flex flex-wrap gap-2">
              {PLATFORM_OPTIONS.map(p => (
                <button key={p} onClick={() => togglePlatform(p)}
                  className={`px-3 py-1 rounded-full text-xs font-medium border ${selectedPlatforms.includes(p) ? "bg-blue-600 text-white border-blue-600" : "bg-white text-gray-600 border-gray-300"}`}>
                  {p}
                </button>
              ))}
            </div>
          </div>

          <div>
            <Label className="mb-2 block">Usage Types</Label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {USAGE_TYPES.map(u => (
                <label key={u.id} className="flex items-center gap-2 text-sm cursor-pointer">
                  <input type="checkbox" checked={selectedUsage.includes(u.id)} onChange={() => toggleUsage(u.id)} />
                  {u.label}
                </label>
              ))}
            </div>
          </div>

          <JurisdictionSelector value={jurisdiction} onChange={setJurisdiction} />

          <Button onClick={() => void calculate()} disabled={calculating || !creatorId || !contentType || selectedPlatforms.length === 0 || selectedUsage.length === 0}>
            {calculating ? "Calculating…" : "Calculate Rights Value"}
          </Button>

          {result && (
            <div className="bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200 rounded-lg p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-500">Suggested Range</p>
                  <p className="text-2xl font-bold text-blue-700">{fmt(result.suggested_range_low)} – {fmt(result.suggested_range_high)}</p>
                </div>
              </div>
              <p className="text-sm text-gray-700">{result.reasoning}</p>
              {result.breakdown.length > 0 && (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead><tr className="border-b"><th className="text-left py-1 pr-3 text-gray-500">Factor</th><th className="text-left py-1 text-gray-500">Impact</th></tr></thead>
                    <tbody>{result.breakdown.map((b, i) => (
                      <tr key={i} className="border-b last:border-0">
                        <td className="py-1 pr-3 font-medium text-gray-700">{b.factor}</td>
                        <td className="py-1 text-gray-600">{b.impact}</td>
                      </tr>
                    ))}</tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Section 2 — History */}
      <Card>
        <CardHeader><CardTitle className="text-base">Valuation History</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="flex gap-2">
            <Input value={historyCreatorId} onChange={e => setHistoryCreatorId(e.target.value)} placeholder="Filter by creator ID" className="max-w-xs" />
            <Button size="sm" variant="outline" onClick={() => void loadHistory()} disabled={loadingHistory}>
              {loadingHistory ? "Loading…" : "Load"}
            </Button>
          </div>
          {history.length === 0 ? (
            <p className="text-sm text-gray-400">No valuations yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-xs text-gray-500">
                    <th className="text-left py-2 pr-3">Content Type</th>
                    <th className="text-left py-2 pr-3">Platforms</th>
                    <th className="text-left py-2 pr-3">Duration</th>
                    <th className="text-left py-2 pr-3">Territory</th>
                    <th className="text-left py-2 pr-3">Excl.</th>
                    <th className="text-left py-2 pr-3">Range</th>
                    <th className="text-left py-2">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {history.map(h => (
                    <tr key={h.id} className="border-b hover:bg-gray-50">
                      <td className="py-2 pr-3">{h.content_type}</td>
                      <td className="py-2 pr-3 text-gray-500 text-xs">{h.platforms.join(", ")}</td>
                      <td className="py-2 pr-3">{h.duration_days}d</td>
                      <td className="py-2 pr-3 text-gray-500">{h.territory}</td>
                      <td className="py-2 pr-3">{h.exclusivity ? "Yes" : "No"}</td>
                      <td className="py-2 pr-3 text-blue-700 font-medium">{fmt(h.suggested_range_low)}–{fmt(h.suggested_range_high)}</td>
                      <td className="py-2 text-gray-400 text-xs">{new Date(h.created_at).toLocaleDateString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
