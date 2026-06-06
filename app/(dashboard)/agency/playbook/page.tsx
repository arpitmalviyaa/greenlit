"use client";

import { useState, useEffect, useCallback } from "react";
import { JurisdictionSelector } from "@/components/ui/jurisdiction-selector";

type PlaybookCategory = "negotiation_rule" | "red_line" | "standard_position" | "escalation_protocol" | "approved_language" | "jurisdiction_note";
type ClauseRiskLevel = "standard" | "favourable" | "unfavourable" | "red_line";

interface PlaybookEntry {
  id: string;
  title: string;
  category: PlaybookCategory;
  content: string;
  jurisdiction: string;
  tags: string[];
}

interface ClauseLibraryItem {
  id: string;
  clause_name: string;
  clause_type: string;
  jurisdiction: string;
  risk_level: ClauseRiskLevel;
  notes: string | null;
  approved: boolean;
}

interface PlaybookSuggestion {
  title: string;
  category: PlaybookCategory;
  content: string;
  jurisdiction: string;
}

const CATEGORIES: PlaybookCategory[] = ["negotiation_rule", "red_line", "standard_position", "escalation_protocol", "approved_language", "jurisdiction_note"];

const CATEGORY_COLOURS: Record<PlaybookCategory, string> = {
  negotiation_rule: "bg-blue-100 text-blue-700",
  red_line: "bg-red-100 text-red-700",
  standard_position: "bg-green-100 text-green-700",
  escalation_protocol: "bg-orange-100 text-orange-700",
  approved_language: "bg-purple-100 text-purple-700",
  jurisdiction_note: "bg-gray-100 text-gray-700",
};

const RISK_COLOURS: Record<ClauseRiskLevel, string> = {
  standard: "bg-gray-100 text-gray-600",
  favourable: "bg-green-100 text-green-700",
  unfavourable: "bg-amber-100 text-amber-700",
  red_line: "bg-red-100 text-red-700",
};

const CLAUSE_TYPES = ["exclusivity", "payment", "ip_ownership", "indemnity", "termination", "usage_rights", "confidentiality", "dispute_resolution", "governing_law", "other"];

export default function PlaybookPage() {
  const [jurisdiction, setJurisdiction] = useState("IN");
  const [filterCategory, setFilterCategory] = useState<string>("");
  const [entries, setEntries] = useState<PlaybookEntry[]>([]);
  const [generateContext, setGenerateContext] = useState("");
  const [generating, setGenerating] = useState(false);
  const [suggestions, setSuggestions] = useState<PlaybookSuggestion[]>([]);
  const [savingId, setSavingId] = useState<number | null>(null);

  // Clause library
  const [clauses, setClauses] = useState<ClauseLibraryItem[]>([]);
  const [showAddClause, setShowAddClause] = useState(false);
  const [clauseName, setClauseName] = useState("");
  const [clauseType, setClauseType] = useState("exclusivity");
  const [clauseText, setClauseText] = useState("");
  const [clauseRisk, setClauseRisk] = useState("standard");
  const [clauseNotes, setClauseNotes] = useState("");
  const [analysingClause, setAnalysingClause] = useState(false);
  const [clauseAnalysis, setClauseAnalysis] = useState<Record<string, unknown> | null>(null);
  const [savingClause, setSavingClause] = useState(false);

  const loadEntries = useCallback(async () => {
    const params = filterCategory ? `?category=${filterCategory}` : "";
    const res = await fetch(`/api/playbook/entries${params}`);
    if (res.ok) setEntries(await res.json() as PlaybookEntry[]);
  }, [filterCategory]);

  const loadClauses = useCallback(async () => {
    const res = await fetch("/api/clauses/library");
    if (res.ok) setClauses(await res.json() as ClauseLibraryItem[]);
  }, []);

  useEffect(() => { void loadEntries(); }, [loadEntries]);
  useEffect(() => { void loadClauses(); }, [loadClauses]);

  async function generateSuggestions() {
    if (!generateContext.trim()) return;
    setGenerating(true);
    setSuggestions([]);
    try {
      const res = await fetch("/api/playbook/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ context: generateContext, jurisdiction }),
      });
      const data = await res.json() as { suggestions: PlaybookSuggestion[] };
      setSuggestions(data.suggestions ?? []);
    } finally {
      setGenerating(false);
    }
  }

  async function addSuggestion(i: number, s: PlaybookSuggestion) {
    setSavingId(i);
    try {
      await fetch("/api/playbook/entries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(s),
      });
      void loadEntries();
    } finally {
      setSavingId(null);
    }
  }

  async function analyseClause() {
    if (!clauseText.trim()) return;
    setAnalysingClause(true);
    try {
      const res = await fetch("/api/clauses/analyse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clause_text: clauseText, clause_type: clauseType, jurisdiction }),
      });
      const data = await res.json() as Record<string, unknown>;
      setClauseAnalysis(data);
      if (data.risk_level) setClauseRisk(data.risk_level as string);
    } finally {
      setAnalysingClause(false);
    }
  }

  async function saveClause() {
    setSavingClause(true);
    try {
      await fetch("/api/clauses/library", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clause_name: clauseName,
          clause_type: clauseType,
          clause_text: clauseText,
          jurisdiction,
          risk_level: clauseRisk,
          notes: clauseNotes,
          analysis_json: clauseAnalysis,
        }),
      });
      setShowAddClause(false);
      setClauseName(""); setClauseText(""); setClauseNotes(""); setClauseAnalysis(null);
      void loadClauses();
    } finally {
      setSavingClause(false);
    }
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Legal Playbook</h1>
          <p className="text-sm text-gray-500 mt-1">Agency-specific legal rules, standard positions, and approved language.</p>
        </div>
        <JurisdictionSelector value={jurisdiction} onChange={setJurisdiction} />
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Left — Playbook */}
        <div className="flex-1 space-y-4">
          <div className="bg-white border border-gray-200 rounded-lg p-4 space-y-3">
            <h3 className="font-semibold text-sm text-gray-800">Generate Suggestions</h3>
            <textarea
              className="w-full border border-gray-300 rounded p-2 text-sm min-h-[80px]"
              placeholder="Describe your agency and typical deals (e.g. 'Mid-size influencer agency, mainly fashion and beauty brands, deals range ₹1L–₹50L…')"
              value={generateContext}
              onChange={(e) => setGenerateContext(e.target.value)}
            />
            <button onClick={generateSuggestions} disabled={generating || !generateContext.trim()}
              className="bg-blue-600 text-white px-4 py-2 rounded text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
              {generating ? "Generating…" : "Generate Suggestions"}
            </button>
            {suggestions.map((s, i) => (
              <div key={i} className="border border-dashed border-gray-300 rounded p-3 space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <p className="text-sm font-medium text-gray-800">{s.title}</p>
                    <span className={`px-2 py-0.5 rounded text-xs font-semibold ${CATEGORY_COLOURS[s.category]}`}>{s.category.replace("_", " ")}</span>
                  </div>
                  <button onClick={() => void addSuggestion(i, s)} disabled={savingId === i}
                    className="shrink-0 text-xs bg-green-600 text-white px-3 py-1.5 rounded hover:bg-green-700 disabled:opacity-50">
                    {savingId === i ? "Adding…" : "Add to Playbook"}
                  </button>
                </div>
                <p className="text-xs text-gray-600">{s.content}</p>
              </div>
            ))}
          </div>

          {/* Category filter */}
          <div className="flex gap-1 flex-wrap">
            <button onClick={() => setFilterCategory("")} className={`px-3 py-1 rounded-full text-xs font-medium border ${!filterCategory ? "bg-gray-900 text-white border-gray-900" : "bg-white text-gray-600 border-gray-300"}`}>All</button>
            {CATEGORIES.map((c) => (
              <button key={c} onClick={() => setFilterCategory(c === filterCategory ? "" : c)}
                className={`px-3 py-1 rounded-full text-xs font-medium border ${filterCategory === c ? "bg-gray-900 text-white border-gray-900" : "bg-white text-gray-600 border-gray-300"}`}>
                {c.replace("_", " ")}
              </button>
            ))}
          </div>

          <div className="space-y-2">
            {entries.map((entry) => (
              <div key={entry.id} className="bg-white border border-gray-200 rounded-lg p-4">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-semibold text-gray-800">{entry.title}</p>
                    <div className="flex gap-1 mt-0.5">
                      <span className={`px-2 py-0.5 rounded text-xs font-semibold ${CATEGORY_COLOURS[entry.category]}`}>{entry.category.replace("_", " ")}</span>
                      <span className="text-xs text-gray-400">{entry.jurisdiction}</span>
                    </div>
                  </div>
                </div>
                <p className="text-sm text-gray-700 mt-2">{entry.content}</p>
              </div>
            ))}
            {entries.length === 0 && <p className="text-xs text-gray-400">No playbook entries yet. Generate suggestions above.</p>}
          </div>
        </div>

        {/* Right — Clause Library */}
        <div className="w-full lg:w-80 shrink-0 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-gray-800 text-sm">Clause Library</h2>
            <button onClick={() => setShowAddClause(!showAddClause)} className="text-xs bg-blue-600 text-white px-3 py-1.5 rounded hover:bg-blue-700">Add Clause</button>
          </div>

          {showAddClause && (
            <div className="bg-white border border-gray-200 rounded-lg p-4 space-y-3">
              <input type="text" className="w-full border border-gray-300 rounded p-2 text-sm" placeholder="Clause name" value={clauseName} onChange={(e) => setClauseName(e.target.value)} />
              <select className="w-full border border-gray-300 rounded p-2 text-sm" value={clauseType} onChange={(e) => setClauseType(e.target.value)}>
                {CLAUSE_TYPES.map((t) => <option key={t} value={t}>{t.replace("_", " ")}</option>)}
              </select>
              <textarea className="w-full border border-gray-300 rounded p-2 text-sm min-h-[80px]" placeholder="Clause text…" value={clauseText} onChange={(e) => setClauseText(e.target.value)} />
              <textarea className="w-full border border-gray-300 rounded p-2 text-sm" placeholder="Notes (optional)" value={clauseNotes} onChange={(e) => setClauseNotes(e.target.value)} rows={2} />
              <div className="flex gap-2">
                <button onClick={analyseClause} disabled={analysingClause || !clauseText}
                  className="flex-1 border border-blue-400 text-blue-600 py-1.5 rounded text-xs font-medium hover:bg-blue-50 disabled:opacity-50">
                  {analysingClause ? "Analysing…" : "Analyse with AI"}
                </button>
                <button onClick={saveClause} disabled={savingClause || !clauseName}
                  className="flex-1 bg-gray-900 text-white py-1.5 rounded text-xs font-medium disabled:opacity-50">
                  {savingClause ? "Saving…" : "Save"}
                </button>
              </div>
              {clauseAnalysis && (
                <div className="bg-amber-50 border border-amber-200 rounded p-2 space-y-1">
                  <p className="text-xs font-semibold text-amber-700">Risk: {clauseAnalysis.risk_level as string}</p>
                  <p className="text-xs text-gray-700">{clauseAnalysis.plain_english as string}</p>
                </div>
              )}
            </div>
          )}

          <div className="space-y-2">
            {clauses.map((c) => (
              <div key={c.id} className="bg-white border border-gray-200 rounded-lg p-3">
                <div className="flex items-start justify-between gap-1">
                  <p className="text-sm font-medium text-gray-800">{c.clause_name}</p>
                  {c.approved && <span className="text-xs bg-green-100 text-green-700 px-1.5 py-0.5 rounded">✓ Approved</span>}
                </div>
                <div className="flex gap-1 mt-1">
                  <span className="text-xs text-gray-500">{c.clause_type.replace("_", " ")}</span>
                  <span className={`ml-auto px-1.5 py-0.5 rounded text-xs ${RISK_COLOURS[c.risk_level]}`}>{c.risk_level.replace("_", " ")}</span>
                </div>
                {c.notes && <p className="text-xs text-gray-500 mt-1">{c.notes}</p>}
              </div>
            ))}
            {clauses.length === 0 && <p className="text-xs text-gray-400">No clauses saved yet.</p>}
          </div>
        </div>
      </div>
    </div>
  );
}
