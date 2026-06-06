"use client";

import { useState } from "react";
import { JurisdictionSelector } from "@/components/ui/jurisdiction-selector";

const ADVERSARY_TYPES = ["regulator", "competitor", "consumer", "creator", "brand"] as const;
const COMPLAINT_BODIES = ["ASCI", "SEBI", "MCA", "consumer_court", "FTC", "ASA", "ICO", "other"] as const;

type AdversaryType = typeof ADVERSARY_TYPES[number];
type ComplaintBody = typeof COMPLAINT_BODIES[number];

interface AdversaryResult {
  adversary_arguments: string[];
  evidence_they_seek: string[];
  attack_vectors: string[];
  likely_outcome: string;
  your_vulnerabilities: string[];
  recommended_defence: string[];
}

interface ComplaintResult {
  grounds: string[];
  likely_outcome: string;
  case_strength: "strong" | "moderate" | "weak";
  pre_emption_steps: string[];
}

const STRENGTH_COLOURS: Record<string, string> = {
  strong: "bg-red-100 text-red-800",
  moderate: "bg-amber-100 text-amber-800",
  weak: "bg-green-100 text-green-800",
};

export default function AdversaryPage() {
  const [jurisdiction, setJurisdiction] = useState("IN");

  // Adversary Lens
  const [scenario, setScenario] = useState("");
  const [adversaryType, setAdversaryType] = useState<AdversaryType>("regulator");
  const [analysing, setAnalysing] = useState(false);
  const [adversaryResult, setAdversaryResult] = useState<AdversaryResult | null>(null);

  // Complaint Simulator
  const [contentOrPractice, setContentOrPractice] = useState("");
  const [complaintBody, setComplaintBody] = useState<ComplaintBody>("ASCI");
  const [simulating, setSimulating] = useState(false);
  const [complaintResult, setComplaintResult] = useState<ComplaintResult | null>(null);

  async function analyseAdversary() {
    if (!scenario.trim()) return;
    setAnalysing(true);
    setAdversaryResult(null);
    try {
      const res = await fetch("/api/adversary/analyse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scenario_text: scenario, adversary_type: adversaryType, jurisdiction }),
      });
      const data = await res.json() as AdversaryResult;
      setAdversaryResult(data);
    } finally {
      setAnalysing(false);
    }
  }

  async function simulateComplaint() {
    if (!contentOrPractice.trim()) return;
    setSimulating(true);
    setComplaintResult(null);
    try {
      const res = await fetch("/api/complaints/simulate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content_or_practice: contentOrPractice, complaint_body: complaintBody, jurisdiction }),
      });
      const data = await res.json() as ComplaintResult;
      setComplaintResult(data);
    } finally {
      setSimulating(false);
    }
  }

  return (
    <div className="p-6 space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Adversary Lens</h1>
          <p className="text-sm text-gray-500 mt-1">See how regulators, competitors, and complainants would attack your content or practices.</p>
        </div>
        <JurisdictionSelector value={jurisdiction} onChange={setJurisdiction} />
      </div>

      {/* Section 1 — Adversary Lens */}
      <div className="bg-white border border-gray-200 rounded-lg p-5 space-y-4">
        <h2 className="font-semibold text-gray-800">Adversary Lens</h2>
        <textarea
          className="w-full border border-gray-300 rounded-md p-3 text-sm min-h-[120px] resize-y"
          placeholder="Describe your content, campaign, or practice to be analysed from the adversary's perspective…"
          value={scenario}
          onChange={(e) => setScenario(e.target.value)}
        />
        <div className="flex flex-wrap gap-2">
          {ADVERSARY_TYPES.map((t) => (
            <button key={t} onClick={() => setAdversaryType(t)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors capitalize ${
                adversaryType === t ? "bg-gray-900 text-white border-gray-900" : "bg-white text-gray-700 border-gray-300 hover:border-gray-500"
              }`}>{t}</button>
          ))}
        </div>
        <button onClick={analyseAdversary} disabled={analysing || !scenario.trim()}
          className="bg-red-600 text-white py-2 px-4 rounded-md text-sm font-medium hover:bg-red-700 disabled:opacity-50">
          {analysing ? "Analysing…" : "Analyse from Adversary Perspective"}
        </button>

        {adversaryResult && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-2">
            <ResultList title="Adversary Arguments" items={adversaryResult.adversary_arguments} colour="red" />
            <ResultList title="Evidence They Seek" items={adversaryResult.evidence_they_seek} colour="orange" />
            <ResultList title="Attack Vectors" items={adversaryResult.attack_vectors} colour="red" />
            <ResultList title="Your Vulnerabilities" items={adversaryResult.your_vulnerabilities} colour="amber" />
            <ResultList title="Recommended Defence" items={adversaryResult.recommended_defence} colour="green" />
            {adversaryResult.likely_outcome && (
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                <p className="text-xs font-semibold text-gray-500 mb-1">Likely Outcome</p>
                <p className="text-sm text-gray-800">{adversaryResult.likely_outcome}</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Section 2 — Complaint Simulator */}
      <div className="bg-white border border-gray-200 rounded-lg p-5 space-y-4">
        <h2 className="font-semibold text-gray-800">Complaint Simulator</h2>
        <textarea
          className="w-full border border-gray-300 rounded-md p-3 text-sm min-h-[100px] resize-y"
          placeholder="Describe the content or business practice to simulate a complaint against…"
          value={contentOrPractice}
          onChange={(e) => setContentOrPractice(e.target.value)}
        />
        <div className="flex flex-wrap gap-2">
          {COMPLAINT_BODIES.map((b) => (
            <button key={b} onClick={() => setComplaintBody(b)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                complaintBody === b ? "bg-gray-900 text-white border-gray-900" : "bg-white text-gray-700 border-gray-300 hover:border-gray-500"
              }`}>{b.replace("_", " ")}</button>
          ))}
        </div>
        <button onClick={simulateComplaint} disabled={simulating || !contentOrPractice.trim()}
          className="bg-orange-600 text-white py-2 px-4 rounded-md text-sm font-medium hover:bg-orange-700 disabled:opacity-50">
          {simulating ? "Simulating…" : "Simulate Complaint"}
        </button>

        {complaintResult && (
          <div className="space-y-4 mt-2">
            <div className="flex items-center gap-3">
              <span className={`px-3 py-1 rounded-full text-xs font-semibold ${STRENGTH_COLOURS[complaintResult.case_strength] ?? "bg-gray-100"}`}>
                Case Strength: {complaintResult.case_strength}
              </span>
            </div>
            {complaintResult.grounds.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-gray-500 mb-1">Grounds</p>
                <ul className="list-disc pl-4 space-y-0.5">{complaintResult.grounds.map((g, i) => <li key={i} className="text-sm text-gray-700">{g}</li>)}</ul>
              </div>
            )}
            {complaintResult.likely_outcome && (
              <p className="text-sm text-gray-800 bg-gray-50 border border-gray-200 rounded p-3">{complaintResult.likely_outcome}</p>
            )}
            {complaintResult.pre_emption_steps.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-green-600 mb-1">Pre-emption Steps</p>
                <ul className="list-disc pl-4 space-y-0.5">{complaintResult.pre_emption_steps.map((s, i) => <li key={i} className="text-sm text-green-700">{s}</li>)}</ul>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function ResultList({ title, items, colour }: { title: string; items: string[]; colour: string }) {
  const colours: Record<string, string> = {
    red: "bg-red-50 border-red-100",
    orange: "bg-orange-50 border-orange-100",
    amber: "bg-amber-50 border-amber-100",
    green: "bg-green-50 border-green-100",
  };
  const textColours: Record<string, string> = {
    red: "text-red-700", orange: "text-orange-700", amber: "text-amber-700", green: "text-green-700",
  };
  if (!items.length) return null;
  return (
    <div className={`border rounded-lg p-4 ${colours[colour] ?? "bg-gray-50 border-gray-100"}`}>
      <p className={`text-xs font-semibold mb-2 ${textColours[colour] ?? "text-gray-600"}`}>{title}</p>
      <ul className="space-y-1 list-disc pl-4">
        {items.map((item, i) => <li key={i} className={`text-sm ${textColours[colour] ?? "text-gray-700"}`}>{item}</li>)}
      </ul>
    </div>
  );
}
