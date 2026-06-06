"use client";

import { useState, useEffect, useCallback } from "react";

interface Alert {
  id: string;
  sow_id: string;
  alert_type: string;
  severity: "high" | "medium" | "low";
  message: string;
  created_at: string;
  sows: { title: string; brand_name: string } | null;
}

interface ChangeRequest {
  id: string;
  sow_id: string;
  change_type: string;
  description: string;
  status: string;
  impact_analysis_json: {
    financial_impact: string;
    timeline_impact: string;
    legal_risk: string;
    recommendation: string;
    reasoning: string;
    suggested_compensation: string;
  } | null;
  created_at: string;
}

interface SowOption { id: string; title: string; brand_name: string }

const SEVERITY_COLORS: Record<string, string> = {
  high: "bg-red-900/50 border-red-700 text-red-300",
  medium: "bg-yellow-900/50 border-yellow-700 text-yellow-300",
  low: "bg-slate-700 border-slate-600 text-slate-300",
};

const SEVERITY_BADGE: Record<string, string> = {
  high: "bg-red-700 text-red-100",
  medium: "bg-yellow-700 text-yellow-100",
  low: "bg-slate-600 text-slate-200",
};

const STATUS_BADGE: Record<string, string> = {
  pending: "bg-slate-700 text-slate-300",
  approved: "bg-green-900 text-green-300",
  rejected: "bg-red-900 text-red-300",
  negotiating: "bg-yellow-900 text-yellow-300",
};

const RECOMMENDATION_BADGE: Record<string, string> = {
  accept: "bg-green-900 text-green-300",
  negotiate: "bg-yellow-900 text-yellow-300",
  reject: "bg-red-900 text-red-300",
};

const CHANGE_TYPES = [
  "add_deliverable", "modify_deliverable", "remove_deliverable",
  "extend_timeline", "increase_budget", "platform_change", "other",
];

export default function ScopeMonitorPage() {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [sowOptions, setSowOptions] = useState<SowOption[]>([]);
  const [selectedSowId, setSelectedSowId] = useState("");
  const [changeRequests, setChangeRequests] = useState<ChangeRequest[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Modal form
  const [changeType, setChangeType] = useState("add_deliverable");
  const [description, setDescription] = useState("");
  const [originalValue, setOriginalValue] = useState("");
  const [proposedValue, setProposedValue] = useState("");
  const [impact, setImpact] = useState<ChangeRequest["impact_analysis_json"] | null>(null);
  const [analysing, setAnalysing] = useState(false);
  const [modalError, setModalError] = useState("");

  const loadAlerts = useCallback(async () => {
    const res = await fetch("/api/scope/alerts");
    if (res.ok) { const d = await res.json(); setAlerts(d.alerts ?? []); }
  }, []);

  const loadSows = useCallback(async () => {
    const res = await fetch("/api/sow/list");
    if (res.ok) { const d = await res.json(); setSowOptions(d.sows ?? []); }
  }, []);

  const loadChangeRequests = useCallback(async (sowId: string) => {
    const res = await fetch(`/api/scope/change-requests?sow_id=${sowId}`);
    if (res.ok) { const d = await res.json(); setChangeRequests(d.requests ?? []); }
  }, []);

  useEffect(() => {
    loadAlerts();
    loadSows();
  }, [loadAlerts, loadSows]);

  useEffect(() => {
    if (selectedSowId) {
      loadChangeRequests(selectedSowId);
      // Auto-detect on SOW select
      fetch("/api/scope/detect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sow_id: selectedSowId }),
      }).then(() => loadAlerts());
    }
  }, [selectedSowId, loadChangeRequests, loadAlerts]);

  async function handleResolveAlert(id: string) {
    const res = await fetch("/api/scope/alerts", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ alert_id: id }),
    });
    if (res.ok) loadAlerts();
  }

  async function handleAnalyseImpact() {
    if (!selectedSowId || !description) return;
    setAnalysing(true);
    setModalError("");
    const res = await fetch("/api/scope/analyse-change", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sow_id: selectedSowId,
        change_type: changeType,
        description,
        original_value: originalValue ? { text: originalValue } : {},
        proposed_value: proposedValue ? { text: proposedValue } : {},
        jurisdiction: "IN",
      }),
    });
    if (res.ok) {
      const d = await res.json();
      setImpact(d.impact);
      await loadChangeRequests(selectedSowId);
    } else {
      setModalError("Analysis failed");
    }
    setAnalysing(false);
  }

  async function handleSubmitRequest() {
    if (!impact) { setModalError("Analyse impact first"); return; }
    setSubmitting(false);
    setShowModal(false);
    resetModal();
    await loadChangeRequests(selectedSowId);
  }

  async function handleUpdateStatus(reqId: string, status: string) {
    const res = await fetch("/api/scope/change-requests", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ request_id: reqId, status }),
    });
    if (res.ok && selectedSowId) loadChangeRequests(selectedSowId);
  }

  function resetModal() {
    setChangeType("add_deliverable");
    setDescription("");
    setOriginalValue("");
    setProposedValue("");
    setImpact(null);
    setModalError("");
  }

  const grouped = {
    high: alerts.filter((a) => a.severity === "high"),
    medium: alerts.filter((a) => a.severity === "medium"),
    low: alerts.filter((a) => a.severity === "low"),
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Scope Monitor</h1>
        <p className="text-slate-400 text-sm mt-1">Track scope drift, alert on violations, and manage change requests across all SOWs.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left — Alert Feed */}
        <div className="bg-slate-800 rounded-xl border border-slate-700 p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-white">Alert Feed</h2>
            <span className="bg-red-700 text-red-100 text-xs px-2 py-0.5 rounded-full">{alerts.length} active</span>
          </div>

          {alerts.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-slate-400 text-sm">No active scope alerts</p>
            </div>
          ) : (
            <div className="space-y-3">
              {(["high", "medium", "low"] as const).map((sev) =>
                grouped[sev].map((alert) => (
                  <div key={alert.id} className={`rounded-lg border p-3 space-y-1.5 ${SEVERITY_COLORS[sev]}`}>
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${SEVERITY_BADGE[sev]}`}>{sev}</span>
                        <span className="text-xs text-slate-400 capitalize">{alert.alert_type.replace(/_/g, " ")}</span>
                      </div>
                      <button onClick={() => handleResolveAlert(alert.id)}
                        className="text-xs text-slate-400 hover:text-white shrink-0">Resolve</button>
                    </div>
                    <p className="text-sm">{alert.message}</p>
                    {alert.sows && (
                      <p className="text-xs text-slate-500">{alert.sows.title} · {alert.sows.brand_name}</p>
                    )}
                    <p className="text-xs text-slate-500">{new Date(alert.created_at).toLocaleDateString("en-IN")}</p>
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        {/* Right — Change Request Manager */}
        <div className="bg-slate-800 rounded-xl border border-slate-700 p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-white">Change Requests</h2>
            {selectedSowId && (
              <button onClick={() => { resetModal(); setShowModal(true); }}
                className="bg-green-600 hover:bg-green-500 text-white px-3 py-1.5 rounded-lg text-xs font-medium">
                + Log Change
              </button>
            )}
          </div>

          <select value={selectedSowId} onChange={(e) => setSelectedSowId(e.target.value)}
            className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none">
            <option value="">— Select a SOW —</option>
            {sowOptions.map((s) => <option key={s.id} value={s.id}>{s.title} · {s.brand_name}</option>)}
          </select>

          {changeRequests.length === 0 ? (
            <p className="text-slate-400 text-sm text-center py-4">{selectedSowId ? "No change requests for this SOW." : "Select a SOW to view requests."}</p>
          ) : (
            <div className="space-y-3">
              {changeRequests.map((cr) => (
                <div key={cr.id} className="bg-slate-700/50 rounded-lg p-3 space-y-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs text-slate-300 capitalize font-medium">{cr.change_type.replace(/_/g, " ")}</span>
                    <span className={`text-xs px-1.5 py-0.5 rounded ${STATUS_BADGE[cr.status]}`}>{cr.status}</span>
                    {cr.impact_analysis_json?.recommendation && (
                      <span className={`text-xs px-1.5 py-0.5 rounded ${RECOMMENDATION_BADGE[cr.impact_analysis_json.recommendation]}`}>
                        {cr.impact_analysis_json.recommendation}
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-slate-200">{cr.description}</p>
                  {cr.impact_analysis_json && (
                    <p className="text-xs text-slate-400">{cr.impact_analysis_json.reasoning}</p>
                  )}
                  {cr.status === "pending" && (
                    <div className="flex gap-2 pt-1">
                      <button onClick={() => handleUpdateStatus(cr.id, "approved")}
                        className="bg-green-700 hover:bg-green-600 text-white text-xs px-2 py-1 rounded">Approve</button>
                      <button onClick={() => handleUpdateStatus(cr.id, "rejected")}
                        className="bg-red-800 hover:bg-red-700 text-white text-xs px-2 py-1 rounded">Reject</button>
                      <button onClick={() => handleUpdateStatus(cr.id, "negotiating")}
                        className="bg-yellow-800 hover:bg-yellow-700 text-white text-xs px-2 py-1 rounded">Negotiate</button>
                    </div>
                  )}
                  <p className="text-xs text-slate-500">{new Date(cr.created_at).toLocaleDateString("en-IN")}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 rounded-xl border border-slate-700 w-full max-w-lg p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-semibold text-white">Log Change Request</h3>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-white">✕</button>
            </div>

            <div>
              <label className="block text-sm text-slate-300 mb-1">Change Type</label>
              <select value={changeType} onChange={(e) => setChangeType(e.target.value)}
                className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none">
                {CHANGE_TYPES.map((t) => <option key={t} value={t}>{t.replace(/_/g, " ")}</option>)}
              </select>
            </div>

            <div>
              <label className="block text-sm text-slate-300 mb-1">Description *</label>
              <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3}
                placeholder="Describe the requested change..."
                className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm resize-none focus:outline-none focus:ring-2 focus:ring-green-500" />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm text-slate-300 mb-1">Original Value</label>
                <input value={originalValue} onChange={(e) => setOriginalValue(e.target.value)}
                  className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none" />
              </div>
              <div>
                <label className="block text-sm text-slate-300 mb-1">Proposed Value</label>
                <input value={proposedValue} onChange={(e) => setProposedValue(e.target.value)}
                  className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none" />
              </div>
            </div>

            {impact && (
              <div className="bg-slate-700/50 rounded-lg p-3 space-y-2 text-sm">
                <p className="text-green-400 font-medium text-xs uppercase">Impact Analysis</p>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div><span className="text-slate-400">Financial: </span><span className="text-slate-200">{impact.financial_impact}</span></div>
                  <div><span className="text-slate-400">Timeline: </span><span className="text-slate-200">{impact.timeline_impact}</span></div>
                  <div><span className="text-slate-400">Legal Risk: </span><span className="text-slate-200 capitalize">{impact.legal_risk}</span></div>
                  <div><span className="text-slate-400">Recommendation: </span><span className="text-slate-200 capitalize">{impact.recommendation}</span></div>
                </div>
                <p className="text-slate-300 text-xs">{impact.reasoning}</p>
                {impact.suggested_compensation && (
                  <p className="text-xs text-slate-400">Compensation: {impact.suggested_compensation}</p>
                )}
              </div>
            )}

            {modalError && <p className="text-red-400 text-sm">{modalError}</p>}

            <div className="flex gap-3">
              <button onClick={handleAnalyseImpact} disabled={analysing || !description}
                className="flex-1 bg-slate-700 hover:bg-slate-600 disabled:opacity-50 text-white px-4 py-2 rounded-lg text-sm font-medium">
                {analysing ? "Analysing..." : "Analyse Impact"}
              </button>
              {impact && (
                <button onClick={handleSubmitRequest} disabled={submitting}
                  className="flex-1 bg-green-600 hover:bg-green-500 disabled:opacity-50 text-white px-4 py-2 rounded-lg text-sm font-medium">
                  Confirm Submit
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
