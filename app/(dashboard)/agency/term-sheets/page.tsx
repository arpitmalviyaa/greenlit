"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";

type TermSheetStatus = "draft" | "shared" | "accepted" | "rejected";

interface TermSheetRow {
  id: string;
  title: string;
  status: TermSheetStatus;
  jurisdiction: string;
  created_at: string;
  transcript_id: string | null;
  terms_json: Record<string, unknown>;
}

const STATUS_COLOURS: Record<TermSheetStatus, string> = {
  draft: "bg-gray-100 text-gray-700",
  shared: "bg-blue-100 text-blue-700",
  accepted: "bg-green-100 text-green-700",
  rejected: "bg-red-100 text-red-700",
};

export default function TermSheetsPage() {
  const [sheets, setSheets] = useState<TermSheetRow[]>([]);
  const [selected, setSelected] = useState<TermSheetRow | null>(null);
  const [updating, setUpdating] = useState(false);
  const router = useRouter();

  const loadSheets = useCallback(async () => {
    const res = await fetch("/api/term-sheets/list");
    if (res.ok) {
      const data = await res.json() as TermSheetRow[];
      setSheets(data);
    }
  }, []);

  useEffect(() => { void loadSheets(); }, [loadSheets]);

  async function updateStatus(id: string, status: TermSheetStatus) {
    setUpdating(true);
    try {
      await fetch(`/api/term-sheets/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      await loadSheets();
      if (selected?.id === id) setSelected((prev) => prev ? { ...prev, status } : null);
    } finally {
      setUpdating(false);
    }
  }

  const terms = selected?.terms_json as {
    parties?: string[];
    deliverables?: string[];
    compensation?: string;
    timeline?: string;
    exclusivity?: string;
    usage_rights?: string;
    governing_law?: string;
    next_steps?: string[];
  } | null;

  return (
    <div className="flex flex-col lg:flex-row gap-6 p-6 min-h-screen">
      {/* List */}
      <div className="w-full lg:w-80 shrink-0 space-y-3">
        <h1 className="text-xl font-bold text-gray-900">Term Sheets</h1>
        {sheets.map((s) => (
          <button
            key={s.id}
            onClick={() => setSelected(s)}
            className={`w-full text-left border rounded-lg p-3 transition-colors ${selected?.id === s.id ? "border-blue-500 bg-blue-50" : "border-gray-200 hover:bg-gray-50"}`}
          >
            <p className="text-sm font-medium text-gray-800 truncate">{s.title}</p>
            <div className="flex items-center gap-2 mt-1">
              <span className={`px-2 py-0.5 rounded text-xs font-semibold ${STATUS_COLOURS[s.status]}`}>{s.status}</span>
              <span className="text-xs text-gray-400">{new Date(s.created_at).toLocaleDateString()}</span>
            </div>
          </button>
        ))}
        {sheets.length === 0 && <p className="text-xs text-gray-400">No term sheets yet. Generate one from Meeting Counsel.</p>}
      </div>

      {/* Detail */}
      {selected && terms && (
        <div className="flex-1 bg-white border border-gray-200 rounded-lg p-6 space-y-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold text-gray-900">{selected.title}</h2>
              <span className={`px-2 py-0.5 rounded text-xs font-semibold ${STATUS_COLOURS[selected.status]}`}>{selected.status}</span>
            </div>
            <div className="flex gap-2 flex-wrap">
              {selected.status === "draft" && (
                <button onClick={() => void updateStatus(selected.id, "shared")} disabled={updating}
                  className="text-xs bg-blue-600 text-white px-3 py-1.5 rounded hover:bg-blue-700 disabled:opacity-50">Share</button>
              )}
              {selected.status === "shared" && (<>
                <button onClick={() => void updateStatus(selected.id, "accepted")} disabled={updating}
                  className="text-xs bg-green-600 text-white px-3 py-1.5 rounded hover:bg-green-700 disabled:opacity-50">Accept</button>
                <button onClick={() => void updateStatus(selected.id, "rejected")} disabled={updating}
                  className="text-xs bg-red-600 text-white px-3 py-1.5 rounded hover:bg-red-700 disabled:opacity-50">Reject</button>
              </>)}
            </div>
          </div>

          <dl className="space-y-4">
            {terms.parties && terms.parties.length > 0 && (
              <TermRow label="Parties"><ul className="list-disc pl-4">{terms.parties.map((p, i) => <li key={i} className="text-sm">{p}</li>)}</ul></TermRow>
            )}
            {terms.deliverables && terms.deliverables.length > 0 && (
              <TermRow label="Deliverables"><ul className="list-disc pl-4">{terms.deliverables.map((d, i) => <li key={i} className="text-sm">{d}</li>)}</ul></TermRow>
            )}
            {terms.compensation && <TermRow label="Compensation"><p className="text-sm">{terms.compensation}</p></TermRow>}
            {terms.timeline && <TermRow label="Timeline"><p className="text-sm">{terms.timeline}</p></TermRow>}
            {terms.exclusivity && <TermRow label="Exclusivity"><p className="text-sm">{terms.exclusivity}</p></TermRow>}
            {terms.usage_rights && <TermRow label="Usage Rights"><p className="text-sm">{terms.usage_rights}</p></TermRow>}
            {terms.governing_law && <TermRow label="Governing Law"><p className="text-sm">{terms.governing_law}</p></TermRow>}
            {terms.next_steps && terms.next_steps.length > 0 && (
              <TermRow label="Next Steps"><ul className="list-disc pl-4">{terms.next_steps.map((n, i) => <li key={i} className="text-sm">{n}</li>)}</ul></TermRow>
            )}
          </dl>

          <button
            onClick={() => router.push(`/agency/sow?from_term_sheet=${selected.id}`)}
            className="w-full border border-gray-300 text-gray-700 py-2 px-4 rounded-md text-sm font-medium hover:bg-gray-50"
          >
            Convert to SOW
          </button>
        </div>
      )}
    </div>
  );
}

function TermRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="text-xs font-semibold text-gray-500 mb-1">{label}</dt>
      <dd className="text-gray-800">{children}</dd>
    </div>
  );
}
