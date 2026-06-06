"use client";

import { useState, useEffect, useCallback } from "react";
import { JurisdictionSelector } from "@/components/ui/jurisdiction-selector";

interface MeetingAnalysis {
  agreed_terms: string[];
  open_issues: string[];
  action_items: string[];
  risk_phrases: string[];
  legal_observations: string;
  recommended_followups: string[];
  transcript_id: string | null;
}

interface TermSheet {
  parties?: string[];
  deliverables?: string[];
  compensation?: string;
  timeline?: string;
  exclusivity?: string;
  usage_rights?: string;
  governing_law?: string;
  next_steps?: string[];
}

interface TranscriptListItem {
  id: string;
  title: string;
  meeting_date: string | null;
  participants: string[] | null;
  created_at: string;
}

export default function MeetingPage() {
  const [title, setTitle] = useState("");
  const [meetingDate, setMeetingDate] = useState("");
  const [participants, setParticipants] = useState("");
  const [jurisdiction, setJurisdiction] = useState("IN");
  const [transcript, setTranscript] = useState("");
  const [analysing, setAnalysing] = useState(false);
  const [analysis, setAnalysis] = useState<MeetingAnalysis | null>(null);
  const [generatingTermSheet, setGeneratingTermSheet] = useState(false);
  const [termSheet, setTermSheet] = useState<TermSheet | null>(null);
  const [history, setHistory] = useState<TranscriptListItem[]>([]);

  const loadHistory = useCallback(async () => {
    const res = await fetch("/api/meeting/list");
    if (res.ok) {
      const data = await res.json() as TranscriptListItem[];
      setHistory(data);
    }
  }, []);

  useEffect(() => { void loadHistory(); }, [loadHistory]);

  async function handleAnalyse() {
    if (!transcript.trim()) return;
    setAnalysing(true);
    setAnalysis(null);
    setTermSheet(null);
    try {
      const res = await fetch("/api/meeting/analyse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title || "Meeting",
          transcript_text: transcript,
          jurisdiction,
          participants: participants.split(",").map((p) => p.trim()).filter(Boolean),
          meeting_date: meetingDate || undefined,
        }),
      });
      const data = await res.json() as MeetingAnalysis;
      setAnalysis(data);
      void loadHistory();
    } finally {
      setAnalysing(false);
    }
  }

  async function handleGenerateTermSheet() {
    if (!analysis?.transcript_id) return;
    setGeneratingTermSheet(true);
    try {
      const res = await fetch("/api/meeting/term-sheet", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transcript_id: analysis.transcript_id, jurisdiction }),
      });
      const data = await res.json() as { terms_json: TermSheet };
      setTermSheet(data.terms_json);
    } finally {
      setGeneratingTermSheet(false);
    }
  }

  async function loadTranscript(id: string) {
    const res = await fetch(`/api/meeting/${id}`);
    if (!res.ok) return;
    const data = await res.json() as {
      title: string;
      transcript_text: string;
      jurisdiction: string;
      participants: string[];
      meeting_date: string;
      analysis_json: MeetingAnalysis;
      term_sheet_json: TermSheet | null;
    };
    setTitle(data.title);
    setTranscript(data.transcript_text);
    setJurisdiction(data.jurisdiction ?? "IN");
    setParticipants((data.participants ?? []).join(", "));
    setMeetingDate(data.meeting_date ?? "");
    setAnalysis({ ...data.analysis_json, transcript_id: id });
    setTermSheet(data.term_sheet_json);
  }

  return (
    <div className="flex flex-col lg:flex-row gap-6 p-6 min-h-screen">
      {/* Left panel */}
      <div className="flex-1 space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Meeting Counsel</h1>
          <p className="text-sm text-gray-500 mt-1">Paste a meeting transcript to get legal analysis and a term sheet.</p>
          <p className="text-xs text-gray-400 mt-0.5">Voice recording? Transcribe with any tool first, paste here.</p>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-5 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Title</label>
              <input type="text" className="w-full border border-gray-300 rounded-md p-2 text-sm" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Deal discussion with Brand X" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Meeting date</label>
              <input type="date" className="w-full border border-gray-300 rounded-md p-2 text-sm" value={meetingDate} onChange={(e) => setMeetingDate(e.target.value)} />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Participants (comma-separated)</label>
            <input type="text" className="w-full border border-gray-300 rounded-md p-2 text-sm" value={participants} onChange={(e) => setParticipants(e.target.value)} placeholder="Raj Kumar, Brand Rep, Legal Counsel" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Jurisdiction</label>
            <JurisdictionSelector value={jurisdiction} onChange={setJurisdiction} />
          </div>
          <textarea
            className="w-full border border-gray-300 rounded-md p-3 text-sm min-h-[200px] resize-y"
            placeholder="Paste transcript here…"
            value={transcript}
            onChange={(e) => setTranscript(e.target.value)}
          />
          <button
            onClick={handleAnalyse}
            disabled={analysing || !transcript.trim()}
            className="w-full bg-blue-600 text-white py-2 px-4 rounded-md text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
          >
            {analysing ? "Analysing…" : "Analyse"}
          </button>
        </div>

        {analysis && (
          <div className="space-y-4">
            {analysis.agreed_terms.length > 0 && (
              <Section title="Agreed Terms" colour="green">
                {analysis.agreed_terms.map((t, i) => <li key={i} className="text-sm text-green-800">{t}</li>)}
              </Section>
            )}
            {analysis.open_issues.length > 0 && (
              <Section title="Open Issues" colour="amber">
                {analysis.open_issues.map((t, i) => <li key={i} className="text-sm text-amber-800">{t}</li>)}
              </Section>
            )}
            {analysis.action_items.length > 0 && (
              <Section title="Action Items" colour="blue">
                {analysis.action_items.map((t, i) => <li key={i} className="text-sm text-blue-800">{t}</li>)}
              </Section>
            )}
            {analysis.risk_phrases.length > 0 && (
              <Section title="Risk Phrases" colour="red">
                {analysis.risk_phrases.map((t, i) => <li key={i} className="text-sm text-red-800">{t}</li>)}
              </Section>
            )}
            {analysis.legal_observations && (
              <div className="bg-white border border-gray-200 rounded-lg p-4">
                <h3 className="font-semibold text-gray-800 text-sm mb-2">Legal Observations</h3>
                <p className="text-sm text-gray-700">{analysis.legal_observations}</p>
              </div>
            )}
            {analysis.recommended_followups.length > 0 && (
              <Section title="Recommended Follow-ups" colour="purple">
                {analysis.recommended_followups.map((t, i) => <li key={i} className="text-sm text-purple-800">{t}</li>)}
              </Section>
            )}
            <button
              onClick={handleGenerateTermSheet}
              disabled={generatingTermSheet}
              className="w-full border border-gray-300 text-gray-700 py-2 px-4 rounded-md text-sm font-medium hover:bg-gray-50 disabled:opacity-50"
            >
              {generatingTermSheet ? "Generating Term Sheet…" : "Generate Term Sheet"}
            </button>
            {termSheet && <TermSheetPreview terms={termSheet} />}
          </div>
        )}
      </div>

      {/* Right panel — history */}
      <div className="w-full lg:w-72 shrink-0">
        <h2 className="font-semibold text-gray-800 text-sm mb-3">Past Transcripts</h2>
        <div className="space-y-2">
          {history.map((t) => (
            <button
              key={t.id}
              onClick={() => void loadTranscript(t.id)}
              className="w-full text-left border border-gray-200 rounded-lg p-3 hover:bg-gray-50 transition-colors"
            >
              <p className="text-sm font-medium text-gray-800 truncate">{t.title}</p>
              <p className="text-xs text-gray-500">{t.meeting_date ?? new Date(t.created_at).toLocaleDateString()} · {(t.participants ?? []).length} participants</p>
            </button>
          ))}
          {history.length === 0 && <p className="text-xs text-gray-400">No transcripts yet.</p>}
        </div>
      </div>
    </div>
  );
}

function Section({ title, colour, children }: { title: string; colour: string; children: React.ReactNode }) {
  const colours: Record<string, string> = {
    green: "bg-green-50 border-green-200",
    amber: "bg-amber-50 border-amber-200",
    blue: "bg-blue-50 border-blue-200",
    red: "bg-red-50 border-red-200",
    purple: "bg-purple-50 border-purple-200",
  };
  return (
    <div className={`border rounded-lg p-4 ${colours[colour] ?? "bg-gray-50 border-gray-200"}`}>
      <h3 className="font-semibold text-gray-800 text-sm mb-2">{title}</h3>
      <ul className="space-y-1 list-disc pl-4">{children}</ul>
    </div>
  );
}

function TermSheetPreview({ terms }: { terms: TermSheet }) {
  const rows: [string, string | string[] | null | undefined][] = [
    ["Parties", terms.parties],
    ["Deliverables", terms.deliverables],
    ["Compensation", terms.compensation],
    ["Timeline", terms.timeline],
    ["Exclusivity", terms.exclusivity],
    ["Usage Rights", terms.usage_rights],
    ["Governing Law", terms.governing_law],
    ["Next Steps", terms.next_steps],
  ];
  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4 space-y-3">
      <h3 className="font-semibold text-gray-800 text-sm">Term Sheet Preview</h3>
      <dl className="space-y-2">
        {rows.map(([label, value]) => value ? (
          <div key={label}>
            <dt className="text-xs font-semibold text-gray-500">{label}</dt>
            <dd className="text-sm text-gray-800">
              {Array.isArray(value) ? (
                <ul className="list-disc pl-4 space-y-0.5">{value.map((v, i) => <li key={i}>{v}</li>)}</ul>
              ) : value}
            </dd>
          </div>
        ) : null)}
      </dl>
    </div>
  );
}
