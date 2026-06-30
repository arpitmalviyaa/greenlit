"use client";

import { useState } from "react";
import { Users, RefreshCw, CheckCircle, XCircle, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { JurisdictionSelector } from "@/components/ui/jurisdiction-selector";

interface ChecklistItem { item: string; passed: boolean; notes: string }
interface SafetyPassport {
  id: string;
  creator_id: string;
  compliance_score: number;
  status: "clear" | "flagged" | "suspended";
  checklist_json: ChecklistItem[];
  risk_flags: string[];
  last_assessed_at: string | null;
  jurisdiction: string;
}

const STATUS_CONFIG = {
  clear: { colour: "text-green-700", bg: "bg-green-50 border-green-200", ring: "stroke-green-500" },
  flagged: { colour: "text-yellow-700", bg: "bg-yellow-50 border-yellow-200", ring: "stroke-yellow-500" },
  suspended: { colour: "text-red-700", bg: "bg-red-50 border-red-200", ring: "stroke-red-500" },
};

const SCORE_COLOUR = (score: number) =>
  score >= 80 ? "text-green-600" : score >= 50 ? "text-yellow-600" : "text-red-600";

export default function PassportPage() {
  const [creatorId, setCreatorId] = useState("");
  const [jurisdiction, setJurisdiction] = useState("IN");
  const [passport, setPassport] = useState<SafetyPassport | null>(null);
  const [assessing, setAssessing] = useState(false);
  const [loading, setLoading] = useState(false);

  const loadPassport = async () => {
    if (!creatorId) return;
    setLoading(true);
    const res = await fetch(`/api/passport/${encodeURIComponent(creatorId)}`);
    const json = await res.json() as { passport?: SafetyPassport | null };
    setPassport(json.passport ?? null);
    setLoading(false);
  };

  const runAssessment = async () => {
    if (!creatorId) return;
    setAssessing(true);
    const res = await fetch("/api/passport/assess", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ creator_id: creatorId, jurisdiction }),
    });
    const json = await res.json() as { passport?: SafetyPassport };
    setPassport(json.passport ?? null);
    setAssessing(false);
  };

  const cfg = passport ? (STATUS_CONFIG[passport.status] ?? STATUS_CONFIG.flagged) : null;

  // SVG ring math
  const radius = 54;
  const circumference = 2 * Math.PI * radius;
  const score = passport?.compliance_score ?? 0;
  const dash = circumference - (score / 100) * circumference;

  return (
    <div className="p-6 space-y-6 bg-gray-50 min-h-screen max-w-2xl">
      <div className="flex items-center gap-2">
        <Users className="w-5 h-5" />
        <h1 className="text-xl font-bold">Creator Safety Passport</h1>
      </div>

      <Card>
        <CardContent className="pt-4 space-y-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1"><Label>Creator ID</Label><Input value={creatorId} onChange={e => setCreatorId(e.target.value)} placeholder="uuid" /></div>
            <div className="w-40"><JurisdictionSelector value={jurisdiction} onChange={setJurisdiction} /></div>
          </div>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={() => void loadPassport()} disabled={loading || !creatorId}>
              {loading ? "Loading…" : "Load Passport"}
            </Button>
            <Button size="sm" onClick={() => void runAssessment()} disabled={assessing || !creatorId}>
              <RefreshCw className={`w-4 h-4 mr-1 ${assessing ? "animate-spin" : ""}`} />
              {assessing ? "Assessing…" : "Run Assessment"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {passport && cfg && (
        <Card className={`border ${cfg.bg}`}>
          <CardHeader>
            <CardTitle className="text-base flex items-center justify-between">
              <span>Safety Passport</span>
              <span className={`text-sm font-semibold px-3 py-1 rounded-full border ${cfg.bg} ${cfg.colour}`}>
                {passport.status.toUpperCase()}
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Score ring */}
            <div className="flex items-center gap-6">
              <div className="relative w-32 h-32">
                <svg className="w-full h-full -rotate-90" viewBox="0 0 128 128">
                  <circle cx="64" cy="64" r={radius} fill="none" stroke="#e5e7eb" strokeWidth="12" />
                  <circle
                    cx="64" cy="64" r={radius} fill="none"
                    className={cfg.ring}
                    strokeWidth="12"
                    strokeDasharray={circumference}
                    strokeDashoffset={dash}
                    strokeLinecap="round"
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className={`text-3xl font-bold ${SCORE_COLOUR(score)}`}>{score}</span>
                  <span className="text-xs text-gray-400">/ 100</span>
                </div>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-gray-600">Creator: <span className="font-mono text-xs">{passport.creator_id}</span></p>
                <p className="text-sm text-gray-600">Jurisdiction: {passport.jurisdiction}</p>
                {passport.last_assessed_at && (
                  <p className="text-xs text-gray-400">Last assessed: {new Date(passport.last_assessed_at).toLocaleString()}</p>
                )}
              </div>
            </div>

            {/* Checklist */}
            {passport.checklist_json.length > 0 && (
              <div>
                <p className="font-medium text-sm mb-2">Compliance Checklist</p>
                <div className="space-y-2">
                  {passport.checklist_json.map((item, i) => (
                    <div key={i} className="flex items-start gap-2">
                      {item.passed
                        ? <CheckCircle className="w-4 h-4 text-green-500 shrink-0 mt-0.5" />
                        : <XCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />}
                      <div>
                        <p className="text-sm font-medium text-gray-800">{item.item}</p>
                        {item.notes && <p className="text-xs text-gray-500">{item.notes}</p>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Risk flags */}
            {passport.risk_flags && passport.risk_flags.length > 0 && (
              <div>
                <p className="font-medium text-sm mb-2 flex items-center gap-1">
                  <AlertTriangle className="w-4 h-4 text-orange-500" />Risk Flags
                </p>
                <ul className="space-y-1">
                  {passport.risk_flags.map((flag, i) => (
                    <li key={i} className="text-sm text-orange-700 bg-orange-50 rounded px-2 py-1">• {flag}</li>
                  ))}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {!passport && !assessing && !loading && creatorId && (
        <p className="text-sm text-gray-400 text-center">No passport found. Run an assessment to generate one.</p>
      )}
    </div>
  );
}
