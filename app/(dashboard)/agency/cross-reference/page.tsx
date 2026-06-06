"use client";

import { useState } from "react";

const AVAILABLE_JURISDICTIONS = ["IN", "US", "UK", "UAE", "SG", "AU", "EU"];

interface JurResult {
  jurisdiction: string;
  legal_position: string;
  key_rules: string[];
  notable_cases: string[];
  compliance_requirement: string;
}

interface CrossRefResult {
  results: JurResult[];
  summary: string;
  conflicts: string[];
}

export default function CrossReferencePage() {
  const [query, setQuery] = useState("");
  const [selectedJurs, setSelectedJurs] = useState<string[]>(["IN"]);
  const [searching, setSearching] = useState(false);
  const [result, setResult] = useState<CrossRefResult | null>(null);

  function toggleJur(jur: string) {
    setSelectedJurs((prev) =>
      prev.includes(jur) ? prev.filter((j) => j !== jur) : [...prev, jur]
    );
  }

  async function handleSearch() {
    if (!query.trim() || selectedJurs.length === 0) return;
    setSearching(true);
    setResult(null);
    try {
      const res = await fetch("/api/cross-ref/query", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query_text: query, jurisdictions: selectedJurs }),
      });
      const data = await res.json() as CrossRefResult;
      setResult(data);
    } finally {
      setSearching(false);
    }
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8 p-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Cross-Reference</h1>
        <p className="text-sm text-gray-500 mt-1">Compare the legal position on any question across multiple jurisdictions.</p>
      </div>

      <div className="bg-white border border-gray-200 rounded-lg p-5 space-y-4">
        <textarea
          className="w-full border border-gray-300 rounded-md p-3 text-sm min-h-[100px] resize-y"
          placeholder="What is the legal position on… (e.g. 'mandatory disclosure requirements for paid influencer posts')"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <div>
          <label className="text-xs font-medium text-gray-700 mb-2 block">Jurisdictions</label>
          <div className="flex flex-wrap gap-2">
            {AVAILABLE_JURISDICTIONS.map((jur) => (
              <button
                key={jur}
                onClick={() => toggleJur(jur)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                  selectedJurs.includes(jur) ? "bg-blue-600 text-white border-blue-600" : "bg-white text-gray-700 border-gray-300 hover:border-blue-400"
                }`}
              >
                {jur}
              </button>
            ))}
          </div>
        </div>
        <button
          onClick={handleSearch}
          disabled={searching || !query.trim() || selectedJurs.length === 0}
          className="bg-blue-600 text-white py-2 px-6 rounded-md text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
        >
          {searching ? "Searching…" : "Search"}
        </button>
      </div>

      {result && (
        <div className="space-y-5">
          {result.summary && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-xs font-semibold text-blue-700 mb-1">Summary</p>
              <p className="text-sm text-blue-800">{result.summary}</p>
            </div>
          )}
          {result.conflicts.length > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
              <p className="text-xs font-semibold text-amber-700 mb-2">Cross-Jurisdiction Conflicts</p>
              <ul className="space-y-1 list-disc pl-4">
                {result.conflicts.map((c, i) => <li key={i} className="text-sm text-amber-800">{c}</li>)}
              </ul>
            </div>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {result.results.map((r) => (
              <div key={r.jurisdiction} className="bg-white border border-gray-200 rounded-lg p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 bg-gray-900 text-white rounded text-xs font-bold">{r.jurisdiction}</span>
                </div>
                <p className="text-sm text-gray-800">{r.legal_position}</p>
                {r.key_rules.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-gray-500 mb-1">Key Rules</p>
                    <ul className="space-y-0.5 list-disc pl-4">
                      {r.key_rules.map((rule, i) => <li key={i} className="text-xs text-gray-700">{rule}</li>)}
                    </ul>
                  </div>
                )}
                {r.notable_cases.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-gray-500 mb-1">Notable Cases</p>
                    <ul className="space-y-0.5 list-disc pl-4">
                      {r.notable_cases.map((c, i) => <li key={i} className="text-xs text-gray-600 italic">{c}</li>)}
                    </ul>
                  </div>
                )}
                {r.compliance_requirement && (
                  <div className="bg-green-50 rounded p-2">
                    <p className="text-xs font-semibold text-green-700 mb-0.5">Compliance Requirement</p>
                    <p className="text-xs text-green-800">{r.compliance_requirement}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
