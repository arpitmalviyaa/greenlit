"use client";

import { useState, useEffect, useCallback } from "react";
import { JurisdictionSelector } from "@/components/ui/jurisdiction-selector";

type TabId = "records" | "tracker" | "takedowns";

interface IpRecord {
  id: string;
  title: string;
  ip_type: string;
  registration_number: string | null;
  expiry_date: string | null;
  status: string;
  created_at: string;
}

interface Infringement {
  id: string;
  ip_record_id: string;
  infringing_url: string;
  platform: string;
  infringement_type: string;
  status: string;
  detected_at: string;
  analysis_json: Record<string, unknown> | null;
}

interface TakedownNotice {
  id: string;
  platform: string;
  notice_type: string;
  status: string;
  sent_at: string | null;
  created_at: string;
}

const IP_TYPES = ["trademark", "copyright", "patent", "design"];
const PLATFORMS = ["instagram", "youtube", "twitter", "linkedin", "tiktok", "website", "other"];
const INFRINGEMENT_TYPES = ["copyright", "trademark", "passing_off", "design_right", "other"];
const NOTICE_TYPES = ["dmca", "platform_report", "cease_and_desist", "legal_demand"];

const STATUS_COLOURS: Record<string, string> = {
  active: "bg-green-100 text-green-700",
  expired: "bg-gray-100 text-gray-600",
  disputed: "bg-red-100 text-red-700",
  abandoned: "bg-gray-100 text-gray-500",
  detected: "bg-amber-100 text-amber-700",
  notice_sent: "bg-blue-100 text-blue-700",
  takedown_requested: "bg-purple-100 text-purple-700",
  taken_down: "bg-green-100 text-green-700",
  resolved: "bg-gray-100 text-gray-600",
  draft: "bg-gray-100 text-gray-600",
  sent: "bg-blue-100 text-blue-700",
  acknowledged: "bg-teal-100 text-teal-700",
  complied: "bg-green-100 text-green-700",
};

export default function IpPage() {
  const [tab, setTab] = useState<TabId>("records");
  const [records, setRecords] = useState<IpRecord[]>([]);
  const [infringements, setInfringements] = useState<Infringement[]>([]);
  const [takedowns, setTakedowns] = useState<TakedownNotice[]>([]);
  const [jurisdiction, setJurisdiction] = useState("IN");

  // Record form
  const [showRecordModal, setShowRecordModal] = useState(false);
  const [recTitle, setRecTitle] = useState("");
  const [recType, setRecType] = useState("trademark");
  const [recRegNum, setRecRegNum] = useState("");
  const [recRegDate, setRecRegDate] = useState("");
  const [recExpiry, setRecExpiry] = useState("");
  const [savingRecord, setSavingRecord] = useState(false);

  // Infringement form
  const [selectedIpId, setSelectedIpId] = useState("");
  const [infUrl, setInfUrl] = useState("");
  const [infPlatform, setInfPlatform] = useState("instagram");
  const [infType, setInfType] = useState("copyright");
  const [infDesc, setInfDesc] = useState("");
  const [analysing, setAnalysing] = useState(false);
  const [analysis, setAnalysis] = useState<Record<string, unknown> | null>(null);
  const [lastInfId, setLastInfId] = useState<string | null>(null);

  // Takedown form
  const [takedownInfId, setTakedownInfId] = useState("");
  const [noticeType, setNoticeType] = useState("dmca");
  const [generatingTakedown, setGeneratingTakedown] = useState(false);
  const [takedownResult, setTakedownResult] = useState<{ notice_text: string; filing_instructions: string[]; deadline_notes: string } | null>(null);

  const loadRecords = useCallback(async () => {
    const res = await fetch("/api/ip/records");
    if (res.ok) setRecords(await res.json() as IpRecord[]);
  }, []);

  const loadInfringements = useCallback(async () => {
    const res = await fetch("/api/ip/infringements");
    if (res.ok) setInfringements(await res.json() as Infringement[]);
  }, []);

  const loadTakedowns = useCallback(async () => {
    const res = await fetch("/api/ip/takedowns");
    if (res.ok) setTakedowns(await res.json() as TakedownNotice[]);
  }, []);

  useEffect(() => {
    void loadRecords();
    void loadInfringements();
    void loadTakedowns();
  }, [loadRecords, loadInfringements, loadTakedowns]);

  async function saveRecord() {
    setSavingRecord(true);
    try {
      await fetch("/api/ip/records", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: recTitle, ip_type: recType, registration_number: recRegNum, registration_date: recRegDate, expiry_date: recExpiry, jurisdiction }),
      });
      setShowRecordModal(false);
      setRecTitle(""); setRecType("trademark"); setRecRegNum(""); setRecRegDate(""); setRecExpiry("");
      void loadRecords();
    } finally {
      setSavingRecord(false);
    }
  }

  async function analyseInfringement() {
    if (!selectedIpId || !infUrl) return;
    setAnalysing(true);
    setAnalysis(null);
    try {
      const res = await fetch("/api/ip/analyse-infringement", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ip_record_id: selectedIpId, infringing_url: infUrl, platform: infPlatform, infringement_type: infType, description: infDesc, jurisdiction }),
      });
      const data = await res.json() as Record<string, unknown> & { infringement_record_id?: string };
      setAnalysis(data);
      setLastInfId(data.infringement_record_id ?? null);
      void loadInfringements();
    } finally {
      setAnalysing(false);
    }
  }

  async function generateTakedown() {
    if (!takedownInfId) return;
    setGeneratingTakedown(true);
    setTakedownResult(null);
    try {
      const res = await fetch("/api/ip/generate-takedown", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ infringement_record_id: takedownInfId, notice_type: noticeType, jurisdiction }),
      });
      const data = await res.json() as typeof takedownResult;
      setTakedownResult(data);
      void loadTakedowns();
    } finally {
      setGeneratingTakedown(false);
    }
  }

  const TABS: { id: TabId; label: string }[] = [
    { id: "records", label: "IP Records" },
    { id: "tracker", label: "Infringement Tracker" },
    { id: "takedowns", label: "Takedown Centre" },
  ];

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">IP & Takedowns</h1>
          <p className="text-sm text-gray-500 mt-1">Register IP assets, log infringements, and generate takedown notices.</p>
        </div>
        <div className="ml-auto">
          <JurisdictionSelector value={jurisdiction} onChange={setJurisdiction} />
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-gray-200">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              tab === t.id ? "border-blue-600 text-blue-600" : "border-transparent text-gray-500 hover:text-gray-800"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab 1: Records */}
      {tab === "records" && (
        <div className="space-y-4">
          <button onClick={() => setShowRecordModal(true)} className="bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-blue-700">
            Register IP Asset
          </button>
          {showRecordModal && (
            <div className="bg-white border border-gray-200 rounded-lg p-5 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div><label className="text-xs font-medium text-gray-700">Title</label>
                  <input type="text" className="w-full mt-1 border border-gray-300 rounded p-2 text-sm" value={recTitle} onChange={(e) => setRecTitle(e.target.value)} /></div>
                <div><label className="text-xs font-medium text-gray-700">Type</label>
                  <select className="w-full mt-1 border border-gray-300 rounded p-2 text-sm" value={recType} onChange={(e) => setRecType(e.target.value)}>
                    {IP_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}</select></div>
                <div><label className="text-xs font-medium text-gray-700">Reg. Number</label>
                  <input type="text" className="w-full mt-1 border border-gray-300 rounded p-2 text-sm" value={recRegNum} onChange={(e) => setRecRegNum(e.target.value)} /></div>
                <div><label className="text-xs font-medium text-gray-700">Reg. Date</label>
                  <input type="date" className="w-full mt-1 border border-gray-300 rounded p-2 text-sm" value={recRegDate} onChange={(e) => setRecRegDate(e.target.value)} /></div>
                <div><label className="text-xs font-medium text-gray-700">Expiry Date</label>
                  <input type="date" className="w-full mt-1 border border-gray-300 rounded p-2 text-sm" value={recExpiry} onChange={(e) => setRecExpiry(e.target.value)} /></div>
              </div>
              <div className="flex gap-2">
                <button onClick={saveRecord} disabled={savingRecord} className="bg-blue-600 text-white px-4 py-2 rounded text-sm font-medium disabled:opacity-50">Save</button>
                <button onClick={() => setShowRecordModal(false)} className="border border-gray-300 text-gray-700 px-4 py-2 rounded text-sm">Cancel</button>
              </div>
            </div>
          )}
          <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left px-4 py-2 text-xs font-semibold text-gray-500">Asset</th>
                  <th className="text-left px-4 py-2 text-xs font-semibold text-gray-500">Type</th>
                  <th className="text-left px-4 py-2 text-xs font-semibold text-gray-500">Reg. No.</th>
                  <th className="text-left px-4 py-2 text-xs font-semibold text-gray-500">Expiry</th>
                  <th className="text-left px-4 py-2 text-xs font-semibold text-gray-500">Status</th>
                </tr>
              </thead>
              <tbody>
                {records.map((r) => (
                  <tr key={r.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="px-4 py-2 font-medium">{r.title}</td>
                    <td className="px-4 py-2 capitalize text-gray-600">{r.ip_type}</td>
                    <td className="px-4 py-2 text-gray-600">{r.registration_number ?? "—"}</td>
                    <td className="px-4 py-2 text-gray-600">{r.expiry_date ?? "—"}</td>
                    <td className="px-4 py-2"><span className={`px-2 py-0.5 rounded text-xs font-semibold ${STATUS_COLOURS[r.status] ?? "bg-gray-100 text-gray-600"}`}>{r.status}</span></td>
                  </tr>
                ))}
                {records.length === 0 && <tr><td colSpan={5} className="px-4 py-4 text-center text-xs text-gray-400">No IP assets registered.</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 2: Infringement Tracker */}
      {tab === "tracker" && (
        <div className="space-y-5">
          <div className="bg-white border border-gray-200 rounded-lg p-5 space-y-3">
            <h3 className="font-semibold text-sm text-gray-800">Log Infringement</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div><label className="text-xs font-medium text-gray-700">IP Asset</label>
                <select className="w-full mt-1 border border-gray-300 rounded p-2 text-sm" value={selectedIpId} onChange={(e) => setSelectedIpId(e.target.value)}>
                  <option value="">Select IP asset…</option>
                  {records.map((r) => <option key={r.id} value={r.id}>{r.title}</option>)}
                </select></div>
              <div><label className="text-xs font-medium text-gray-700">Platform</label>
                <select className="w-full mt-1 border border-gray-300 rounded p-2 text-sm" value={infPlatform} onChange={(e) => setInfPlatform(e.target.value)}>
                  {PLATFORMS.map((p) => <option key={p} value={p}>{p}</option>)}
                </select></div>
              <div><label className="text-xs font-medium text-gray-700">Infringing URL</label>
                <input type="text" className="w-full mt-1 border border-gray-300 rounded p-2 text-sm" value={infUrl} onChange={(e) => setInfUrl(e.target.value)} placeholder="https://…" /></div>
              <div><label className="text-xs font-medium text-gray-700">Infringement Type</label>
                <select className="w-full mt-1 border border-gray-300 rounded p-2 text-sm" value={infType} onChange={(e) => setInfType(e.target.value)}>
                  {INFRINGEMENT_TYPES.map((t) => <option key={t} value={t}>{t.replace("_", " ")}</option>)}
                </select></div>
            </div>
            <textarea className="w-full border border-gray-300 rounded p-2 text-sm" placeholder="Describe the infringement…" value={infDesc} onChange={(e) => setInfDesc(e.target.value)} rows={2} />
            <button onClick={analyseInfringement} disabled={analysing || !selectedIpId || !infUrl}
              className="bg-orange-600 text-white px-4 py-2 rounded text-sm font-medium hover:bg-orange-700 disabled:opacity-50">
              {analysing ? "Analysing…" : "Analyse Infringement"}
            </button>
            {analysis && (
              <div className="bg-amber-50 border border-amber-200 rounded p-4 space-y-2">
                <div className="flex gap-2 items-center">
                  <span className="text-xs font-semibold text-amber-700">Likelihood:</span>
                  <span className="text-sm font-bold capitalize">{analysis.likelihood as string}</span>
                </div>
                <p className="text-sm text-gray-700">{analysis.claim_strength as string}</p>
                {Array.isArray(analysis.evidence_needed) && analysis.evidence_needed.length > 0 && (
                  <div><p className="text-xs font-semibold text-gray-500">Evidence Needed</p>
                    <ul className="list-disc pl-4">{(analysis.evidence_needed as string[]).map((e, i) => <li key={i} className="text-xs">{e}</li>)}</ul></div>
                )}
                <p className="text-xs text-gray-600"><span className="font-semibold">Platform Process:</span> {analysis.platform_process as string}</p>
              </div>
            )}
          </div>
          <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b"><tr>
                <th className="text-left px-4 py-2 text-xs font-semibold text-gray-500">URL</th>
                <th className="text-left px-4 py-2 text-xs font-semibold text-gray-500">Platform</th>
                <th className="text-left px-4 py-2 text-xs font-semibold text-gray-500">Type</th>
                <th className="text-left px-4 py-2 text-xs font-semibold text-gray-500">Status</th>
                <th className="text-left px-4 py-2 text-xs font-semibold text-gray-500">Date</th>
              </tr></thead>
              <tbody>
                {infringements.map((inf) => (
                  <tr key={inf.id} className="border-b border-gray-100">
                    <td className="px-4 py-2 max-w-[200px] truncate text-blue-600">{inf.infringing_url}</td>
                    <td className="px-4 py-2 capitalize">{inf.platform}</td>
                    <td className="px-4 py-2 capitalize">{inf.infringement_type.replace("_", " ")}</td>
                    <td className="px-4 py-2"><span className={`px-2 py-0.5 rounded text-xs font-semibold ${STATUS_COLOURS[inf.status] ?? "bg-gray-100 text-gray-600"}`}>{inf.status}</span></td>
                    <td className="px-4 py-2 text-gray-500 text-xs">{new Date(inf.detected_at).toLocaleDateString()}</td>
                  </tr>
                ))}
                {infringements.length === 0 && <tr><td colSpan={5} className="px-4 py-4 text-center text-xs text-gray-400">No infringements logged.</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 3: Takedown Centre */}
      {tab === "takedowns" && (
        <div className="space-y-5">
          <div className="bg-white border border-gray-200 rounded-lg p-5 space-y-3">
            <h3 className="font-semibold text-sm text-gray-800">Generate Takedown Notice</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div><label className="text-xs font-medium text-gray-700">Infringement</label>
                <select className="w-full mt-1 border border-gray-300 rounded p-2 text-sm" value={takedownInfId} onChange={(e) => setTakedownInfId(e.target.value)}>
                  <option value="">Select infringement…</option>
                  {infringements.map((inf) => <option key={inf.id} value={inf.id}>{inf.infringing_url.slice(0, 40)}</option>)}
                </select></div>
              <div><label className="text-xs font-medium text-gray-700">Notice Type</label>
                <select className="w-full mt-1 border border-gray-300 rounded p-2 text-sm" value={noticeType} onChange={(e) => setNoticeType(e.target.value)}>
                  {NOTICE_TYPES.map((t) => <option key={t} value={t}>{t.replace("_", " ").toUpperCase()}</option>)}
                </select></div>
            </div>
            <button onClick={generateTakedown} disabled={generatingTakedown || !takedownInfId}
              className="bg-red-600 text-white px-4 py-2 rounded text-sm font-medium hover:bg-red-700 disabled:opacity-50">
              {generatingTakedown ? "Generating…" : "Generate Notice"}
            </button>
            {takedownResult && (
              <div className="space-y-3 mt-2">
                <div className="relative">
                  <pre className="bg-gray-50 border border-gray-200 rounded p-3 text-xs text-gray-800 whitespace-pre-wrap overflow-auto max-h-80">{takedownResult.notice_text}</pre>
                  <button onClick={() => void navigator.clipboard.writeText(takedownResult.notice_text)}
                    className="absolute top-2 right-2 text-xs bg-white border border-gray-300 px-2 py-1 rounded hover:bg-gray-50">Copy</button>
                </div>
                {takedownResult.filing_instructions.length > 0 && (
                  <div><p className="text-xs font-semibold text-gray-500 mb-1">Filing Instructions</p>
                    <ol className="list-decimal pl-4 space-y-0.5">{takedownResult.filing_instructions.map((f, i) => <li key={i} className="text-xs text-gray-700">{f}</li>)}</ol></div>
                )}
                {takedownResult.deadline_notes && (
                  <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded p-2">{takedownResult.deadline_notes}</p>
                )}
              </div>
            )}
          </div>
          <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b"><tr>
                <th className="text-left px-4 py-2 text-xs font-semibold text-gray-500">Platform</th>
                <th className="text-left px-4 py-2 text-xs font-semibold text-gray-500">Type</th>
                <th className="text-left px-4 py-2 text-xs font-semibold text-gray-500">Status</th>
                <th className="text-left px-4 py-2 text-xs font-semibold text-gray-500">Sent</th>
              </tr></thead>
              <tbody>
                {takedowns.map((t) => (
                  <tr key={t.id} className="border-b border-gray-100">
                    <td className="px-4 py-2 capitalize">{t.platform}</td>
                    <td className="px-4 py-2 uppercase text-xs">{t.notice_type.replace("_", " ")}</td>
                    <td className="px-4 py-2"><span className={`px-2 py-0.5 rounded text-xs font-semibold ${STATUS_COLOURS[t.status] ?? "bg-gray-100"}`}>{t.status}</span></td>
                    <td className="px-4 py-2 text-gray-500 text-xs">{t.sent_at ? new Date(t.sent_at).toLocaleDateString() : "—"}</td>
                  </tr>
                ))}
                {takedowns.length === 0 && <tr><td colSpan={4} className="px-4 py-4 text-center text-xs text-gray-400">No takedown notices generated.</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
