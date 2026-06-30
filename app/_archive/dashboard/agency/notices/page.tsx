"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { JurisdictionSelector } from "@/components/ui/jurisdiction-selector";

interface TriageResult {
  notice_type: string;
  sender: string;
  deadline: string;
  urgency: "immediate" | "urgent" | "routine";
  relief_sought: string;
  legal_basis: string;
  response_strategy: string;
  immediate_actions: string[];
  lawyer_referral: boolean;
  referral_reason: string;
  legal_notice_id: string | null;
}

interface LiabilityParty {
  name: string;
  role: string;
  exposure_level: string;
  exposure_reason: string;
}

interface LiabilityResult {
  parties: LiabilityParty[];
  total_exposure_estimate: string;
  mitigation_options: string[];
  indemnity_chain: string;
}

interface NoticeListItem {
  id: string;
  notice_type: string | null;
  sender: string | null;
  urgency: string | null;
  created_at: string;
}

const URGENCY_STYLES = {
  immediate: "bg-red-100 border-red-300 text-red-800",
  urgent: "bg-amber-100 border-amber-300 text-amber-800",
  routine: "bg-blue-100 border-blue-300 text-blue-800",
};

const EXPOSURE_COLOURS: Record<string, string> = {
  high: "text-red-700 font-semibold",
  medium: "text-amber-700 font-semibold",
  low: "text-yellow-700",
  none: "text-gray-400",
};

export default function NoticesPage() {
  const [noticeText, setNoticeText] = useState("");
  const [jurisdiction, setJurisdiction] = useState("IN");
  const [triaging, setTriaging] = useState(false);
  const [triage, setTriage] = useState<TriageResult | null>(null);
  const [mappingLiability, setMappingLiability] = useState(false);
  const [liability, setLiability] = useState<LiabilityResult | null>(null);
  const [history, setHistory] = useState<NoticeListItem[]>([]);
  const [creatingCrisis, setCreatingCrisis] = useState(false);
  const router = useRouter();

  const loadHistory = useCallback(async () => {
    const res = await fetch("/api/notices/list");
    if (res.ok) setHistory(await res.json() as NoticeListItem[]);
  }, []);

  useEffect(() => { void loadHistory(); }, [loadHistory]);

  async function handleTriage() {
    if (!noticeText.trim()) return;
    setTriaging(true);
    setTriage(null);
    setLiability(null);
    try {
      const res = await fetch("/api/notices/triage", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notice_text: noticeText, jurisdiction }),
      });
      const data = await res.json() as TriageResult;
      setTriage(data);
      void loadHistory();
    } finally {
      setTriaging(false);
    }
  }

  async function handleLiabilityMap() {
    if (!triage?.legal_notice_id) return;
    setMappingLiability(true);
    try {
      const res = await fetch("/api/notices/liability-map", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ legal_notice_id: triage.legal_notice_id, jurisdiction }),
      });
      const data = await res.json() as LiabilityResult;
      setLiability(data);
    } finally {
      setMappingLiability(false);
    }
  }

  async function handleOpenCrisis() {
    if (!triage) return;
    setCreatingCrisis(true);
    try {
      const res = await fetch("/api/crisis/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: `Crisis: ${triage.notice_type || "Legal Notice"}`,
          severity: triage.urgency === "immediate" ? "critical" : triage.urgency === "urgent" ? "high" : "medium",
          legal_notice_id: triage.legal_notice_id,
          jurisdiction,
        }),
      });
      if (res.ok) router.push("/agency/crisis");
    } finally {
      setCreatingCrisis(false);
    }
  }

  return (
    <div className="flex flex-col lg:flex-row gap-6 p-6 min-h-screen">
      {/* Left — Triage */}
      <div className="flex-1 space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Legal Notice Triage</h1>
          <p className="text-sm text-gray-500 mt-1">Paste a legal notice to get urgency assessment, response strategy, and liability map.</p>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-5 space-y-3">
          <textarea
            className="w-full border border-gray-300 rounded-md p-3 text-sm min-h-[180px] resize-y"
            placeholder="Paste the legal notice text here…"
            value={noticeText}
            onChange={(e) => setNoticeText(e.target.value)}
          />
          <JurisdictionSelector value={jurisdiction} onChange={setJurisdiction} />
          <button
            onClick={handleTriage}
            disabled={triaging || !noticeText.trim()}
            className="w-full bg-red-600 text-white py-2 px-4 rounded-md text-sm font-medium hover:bg-red-700 disabled:opacity-50"
          >
            {triaging ? "Triaging…" : "Triage Notice"}
          </button>
        </div>

        {triage && (
          <div className="space-y-4">
            {/* Urgency banner */}
            <div className={`border rounded-lg p-4 ${URGENCY_STYLES[triage.urgency]}`}>
              <p className="font-bold uppercase text-sm">{triage.urgency} — {triage.notice_type || "Legal Notice"}</p>
              <p className="text-sm mt-1">From: {triage.sender} · Deadline: {triage.deadline}</p>
            </div>

            <div className="bg-white border border-gray-200 rounded-lg p-4 space-y-3">
              <div><p className="text-xs font-semibold text-gray-500">Relief Sought</p><p className="text-sm text-gray-800">{triage.relief_sought}</p></div>
              <div><p className="text-xs font-semibold text-gray-500">Legal Basis</p><p className="text-sm text-gray-800">{triage.legal_basis}</p></div>
              <div><p className="text-xs font-semibold text-gray-500">Response Strategy</p><p className="text-sm text-gray-800">{triage.response_strategy}</p></div>
            </div>

            {triage.immediate_actions.length > 0 && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                <p className="text-xs font-semibold text-amber-700 mb-2">Immediate Actions</p>
                <ol className="space-y-1 list-decimal pl-4">
                  {triage.immediate_actions.map((a, i) => <li key={i} className="text-sm text-amber-800">{a}</li>)}
                </ol>
              </div>
            )}

            {triage.lawyer_referral && (
              <div className="bg-red-50 border border-red-300 rounded-lg p-4">
                <p className="font-semibold text-red-700 text-sm">Lawyer Referral Recommended</p>
                <p className="text-sm text-red-600 mt-1">{triage.referral_reason}</p>
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={handleLiabilityMap}
                disabled={mappingLiability}
                className="flex-1 border border-gray-300 text-gray-700 py-2 px-3 rounded-md text-sm font-medium hover:bg-gray-50 disabled:opacity-50"
              >
                {mappingLiability ? "Mapping…" : "Generate Liability Map"}
              </button>
              <button
                onClick={handleOpenCrisis}
                disabled={creatingCrisis}
                className="flex-1 bg-red-600 text-white py-2 px-3 rounded-md text-sm font-medium hover:bg-red-700 disabled:opacity-50"
              >
                {creatingCrisis ? "Opening…" : "Open Crisis Room"}
              </button>
            </div>

            {liability && (
              <div className="bg-white border border-gray-200 rounded-lg p-4 space-y-3">
                <h3 className="font-semibold text-gray-800 text-sm">Liability Map</h3>
                <p className="text-xs text-gray-500">Total exposure: <span className="font-semibold text-gray-800">{liability.total_exposure_estimate}</span></p>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="text-left text-gray-500 border-b">
                        <th className="pb-1 pr-3">Party</th>
                        <th className="pb-1 pr-3">Role</th>
                        <th className="pb-1 pr-3">Exposure</th>
                        <th className="pb-1">Reason</th>
                      </tr>
                    </thead>
                    <tbody>
                      {liability.parties.map((p, i) => (
                        <tr key={i} className="border-b border-gray-100">
                          <td className="py-1.5 pr-3 font-medium">{p.name}</td>
                          <td className="py-1.5 pr-3 text-gray-600">{p.role}</td>
                          <td className={`py-1.5 pr-3 ${EXPOSURE_COLOURS[p.exposure_level] ?? ""}`}>{p.exposure_level}</td>
                          <td className="py-1.5 text-gray-600">{p.exposure_reason}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {liability.mitigation_options.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-gray-500 mb-1">Mitigation Options</p>
                    <ul className="list-disc pl-4 space-y-0.5">
                      {liability.mitigation_options.map((m, i) => <li key={i} className="text-xs text-gray-700">{m}</li>)}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Right — History */}
      <div className="w-full lg:w-72 shrink-0">
        <h2 className="font-semibold text-gray-800 text-sm mb-3">Notice History</h2>
        <div className="space-y-2">
          {history.map((n) => (
            <div key={n.id} className="border border-gray-200 rounded-lg p-3">
              <p className="text-sm font-medium text-gray-800">{n.notice_type ?? "Notice"}</p>
              <p className="text-xs text-gray-500">{n.sender ?? "Unknown sender"} · {n.urgency ?? ""}</p>
              <p className="text-xs text-gray-400">{new Date(n.created_at).toLocaleDateString()}</p>
            </div>
          ))}
          {history.length === 0 && <p className="text-xs text-gray-400">No notices triaged yet.</p>}
        </div>
      </div>
    </div>
  );
}
