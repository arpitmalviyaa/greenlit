"use client";

import { useState, useEffect, useCallback } from "react";
import {
  CheckCircle, XCircle, RotateCcw, Clock, ExternalLink,
  Upload, FileText, Image, Video, Link2, BarChart2
} from "lucide-react";

type ApprovalStatus = "pending" | "approved" | "rejected" | "revision_requested";
type ProofEntryType = "screenshot" | "video" | "document" | "url_capture" | "metric_report";

interface Approval {
  id: string;
  title: string;
  description: string | null;
  content_url: string | null;
  status: ApprovalStatus;
  feedback: string | null;
  due_date: string | null;
  sow_id: string | null;
  created_at: string;
  submitted_by_profile: { name: string | null } | null;
  deliverable: { title: string } | null;
}

interface ProofEntry {
  id: string;
  entry_type: ProofEntryType;
  title: string;
  file_path: string | null;
  external_url: string | null;
  created_at: string;
  signed_url: string | null;
}

const STATUS_COLORS: Record<ApprovalStatus, string> = {
  pending: "bg-yellow-900/40 text-yellow-400",
  approved: "bg-green-900/40 text-green-400",
  rejected: "bg-red-900/40 text-red-400",
  revision_requested: "bg-orange-900/40 text-orange-400",
};

const PROOF_ICONS: Record<ProofEntryType, React.ComponentType<{ className?: string }>> = {
  screenshot: Image,
  video: Video,
  document: FileText,
  url_capture: Link2,
  metric_report: BarChart2,
};

const FILTER_TABS: { label: string; value: string }[] = [
  { label: "All", value: "" },
  { label: "Pending", value: "pending" },
  { label: "Approved", value: "approved" },
  { label: "Rejected", value: "rejected" },
  { label: "Revision", value: "revision_requested" },
];

export default function ApprovalsPage() {
  const [approvals, setApprovals] = useState<Approval[]>([]);
  const [filterStatus, setFilterStatus] = useState("");
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [feedbackMap, setFeedbackMap] = useState<Record<string, string>>({});
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Proof vault
  const [proofSowId, setProofSowId] = useState("");
  const [proofEntries, setProofEntries] = useState<ProofEntry[]>([]);
  const [proofLoading, setProofLoading] = useState(false);
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [uploadForm, setUploadForm] = useState({
    entry_type: "screenshot" as ProofEntryType,
    title: "",
    file: null as File | null,
  });
  const [uploading, setUploading] = useState(false);

  const fetchApprovals = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (filterStatus) params.set("status", filterStatus);
    const res = await fetch(`/api/approvals/list?${params}`);
    const json = await res.json() as { approvals: Approval[] };
    setApprovals(json.approvals ?? []);
    setLoading(false);
  }, [filterStatus]);

  useEffect(() => { void fetchApprovals(); }, [fetchApprovals]);

  const fetchProof = useCallback(async () => {
    if (!proofSowId.trim()) return;
    setProofLoading(true);
    const res = await fetch(`/api/proof/list?sow_id=${proofSowId}`);
    const json = await res.json() as { entries: ProofEntry[] };
    setProofEntries(json.entries ?? []);
    setProofLoading(false);
  }, [proofSowId]);

  async function handleReview(id: string, status: ApprovalStatus) {
    setActionLoading(id);
    await fetch("/api/approvals/review", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ approval_id: id, status, feedback: feedbackMap[id] ?? null }),
    });
    setActionLoading(null);
    void fetchApprovals();
  }

  async function handleUpload() {
    if (!uploadForm.title || !proofSowId) return;
    setUploading(true);
    const fd = new FormData();
    fd.append("sow_id", proofSowId);
    fd.append("entry_type", uploadForm.entry_type);
    fd.append("title", uploadForm.title);
    if (uploadForm.file) fd.append("file", uploadForm.file);
    await fetch("/api/proof/upload", { method: "POST", body: fd });
    setUploading(false);
    setUploadModalOpen(false);
    setUploadForm({ entry_type: "screenshot", title: "", file: null });
    void fetchProof();
  }

  return (
    <div className="flex flex-col lg:flex-row gap-6 p-6 min-h-screen bg-slate-950 text-slate-100">
      {/* Left panel — Approval Queue */}
      <div className="flex-1 min-w-0">
        <h1 className="text-xl font-semibold text-white mb-4">Approval Queue</h1>

        {/* Filter tabs */}
        <div className="flex gap-1 mb-4 flex-wrap">
          {FILTER_TABS.map((tab) => (
            <button
              key={tab.value}
              onClick={() => setFilterStatus(tab.value)}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                filterStatus === tab.value
                  ? "bg-green-700 text-white"
                  : "bg-slate-800 text-slate-400 hover:bg-slate-700"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="text-slate-500 text-sm">Loading...</div>
        ) : approvals.length === 0 ? (
          <div className="text-slate-500 text-sm">No approvals found.</div>
        ) : (
          <div className="space-y-3">
            {approvals.map((ap) => (
              <div
                key={ap.id}
                className="bg-slate-900 border border-slate-800 rounded-lg overflow-hidden"
              >
                <button
                  className="w-full text-left px-4 py-3 hover:bg-slate-800/50 transition-colors"
                  onClick={() => setExpandedId(expandedId === ap.id ? null : ap.id)}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-medium text-white truncate">{ap.title}</p>
                      <p className="text-xs text-slate-400 mt-0.5">
                        {ap.submitted_by_profile?.name ?? "Unknown"} •{" "}
                        {ap.sow_id ? `SOW: ${ap.sow_id.slice(0, 8)}…` : "No SOW"} •{" "}
                        {ap.due_date ? `Due: ${ap.due_date}` : "No due date"}
                      </p>
                    </div>
                    <span className={`px-2 py-0.5 rounded text-xs font-medium whitespace-nowrap ${STATUS_COLORS[ap.status]}`}>
                      {ap.status.replace("_", " ")}
                    </span>
                  </div>
                </button>

                {expandedId === ap.id && (
                  <div className="px-4 pb-4 border-t border-slate-800 pt-3 space-y-3">
                    {ap.description && <p className="text-sm text-slate-300">{ap.description}</p>}
                    {ap.content_url && (
                      <a
                        href={ap.content_url}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-sm text-green-400 hover:underline"
                      >
                        <ExternalLink className="w-3.5 h-3.5" /> View Content
                      </a>
                    )}
                    {ap.feedback && (
                      <p className="text-xs text-orange-300 bg-orange-900/20 rounded p-2">
                        Feedback: {ap.feedback}
                      </p>
                    )}

                    {/* Review actions */}
                    <div className="space-y-2">
                      <textarea
                        placeholder="Feedback (optional)"
                        rows={2}
                        value={feedbackMap[ap.id] ?? ""}
                        onChange={(e) => setFeedbackMap((prev) => ({ ...prev, [ap.id]: e.target.value }))}
                        className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-sm text-slate-200 resize-none"
                      />
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleReview(ap.id, "approved")}
                          disabled={actionLoading === ap.id}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-green-700 hover:bg-green-600 text-white rounded text-sm"
                        >
                          <CheckCircle className="w-3.5 h-3.5" /> Approve
                        </button>
                        <button
                          onClick={() => handleReview(ap.id, "revision_requested")}
                          disabled={actionLoading === ap.id}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-orange-700 hover:bg-orange-600 text-white rounded text-sm"
                        >
                          <RotateCcw className="w-3.5 h-3.5" /> Revision
                        </button>
                        <button
                          onClick={() => handleReview(ap.id, "rejected")}
                          disabled={actionLoading === ap.id}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-red-700 hover:bg-red-600 text-white rounded text-sm"
                        >
                          <XCircle className="w-3.5 h-3.5" /> Reject
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Right panel — Proof Vault */}
      <div className="w-full lg:w-96 flex-shrink-0">
        <h2 className="text-xl font-semibold text-white mb-4">Proof Vault</h2>

        <div className="flex gap-2 mb-3">
          <input
            value={proofSowId}
            onChange={(e) => setProofSowId(e.target.value)}
            placeholder="Enter SOW ID"
            className="flex-1 bg-slate-800 border border-slate-700 rounded px-3 py-2 text-sm text-slate-200"
          />
          <button
            onClick={fetchProof}
            className="px-3 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded text-sm"
          >
            Load
          </button>
        </div>

        <button
          onClick={() => setUploadModalOpen(true)}
          disabled={!proofSowId.trim()}
          className="flex items-center gap-2 mb-4 px-3 py-2 bg-green-700 hover:bg-green-600 disabled:opacity-50 text-white rounded text-sm w-full justify-center"
        >
          <Upload className="w-4 h-4" /> Upload Proof
        </button>

        {proofLoading ? (
          <div className="text-slate-500 text-sm">Loading...</div>
        ) : (
          <div className="grid grid-cols-1 gap-3">
            {proofEntries.map((entry) => {
              const Icon = PROOF_ICONS[entry.entry_type] ?? FileText;
              const link = entry.signed_url ?? entry.external_url;
              return (
                <div
                  key={entry.id}
                  className="bg-slate-900 border border-slate-800 rounded-lg p-3 flex items-start gap-3"
                >
                  <Icon className="w-5 h-5 text-slate-400 flex-shrink-0 mt-0.5" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-white truncate">{entry.title}</p>
                    <p className="text-xs text-slate-500">{new Date(entry.created_at).toLocaleDateString()}</p>
                    {link && (
                      <a
                        href={link}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs text-green-400 hover:underline inline-flex items-center gap-1 mt-1"
                      >
                        <ExternalLink className="w-3 h-3" /> View
                      </a>
                    )}
                  </div>
                </div>
              );
            })}
            {proofEntries.length === 0 && proofSowId && !proofLoading && (
              <p className="text-slate-500 text-sm">No proof entries found.</p>
            )}
          </div>
        )}
      </div>

      {/* Upload Modal */}
      {uploadModalOpen && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-xl w-full max-w-md p-6 space-y-4">
            <h3 className="text-lg font-semibold text-white">Upload Proof</h3>

            <div className="space-y-3">
              <div>
                <label className="text-xs text-slate-400 block mb-1">Entry Type</label>
                <select
                  value={uploadForm.entry_type}
                  onChange={(e) => setUploadForm((f) => ({ ...f, entry_type: e.target.value as ProofEntryType }))}
                  className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-sm text-slate-200"
                >
                  <option value="screenshot">Screenshot</option>
                  <option value="video">Video</option>
                  <option value="document">Document</option>
                  <option value="url_capture">URL Capture</option>
                  <option value="metric_report">Metric Report</option>
                </select>
              </div>
              <div>
                <label className="text-xs text-slate-400 block mb-1">Title</label>
                <input
                  value={uploadForm.title}
                  onChange={(e) => setUploadForm((f) => ({ ...f, title: e.target.value }))}
                  className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-sm text-slate-200"
                />
              </div>
              <div>
                <label className="text-xs text-slate-400 block mb-1">File (optional)</label>
                <input
                  type="file"
                  onChange={(e) => setUploadForm((f) => ({ ...f, file: e.target.files?.[0] ?? null }))}
                  className="text-sm text-slate-300"
                />
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                onClick={handleUpload}
                disabled={uploading || !uploadForm.title}
                className="flex-1 px-4 py-2 bg-green-700 hover:bg-green-600 disabled:opacity-50 text-white rounded text-sm font-medium"
              >
                {uploading ? "Uploading..." : "Upload"}
              </button>
              <button
                onClick={() => setUploadModalOpen(false)}
                className="flex-1 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded text-sm"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
