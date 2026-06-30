"use client";

import { useState, useEffect, useCallback } from "react";

type CrisisSeverity = "critical" | "high" | "medium" | "low";
type CrisisStatus = "active" | "monitoring" | "resolved";

interface CrisisRoom {
  id: string;
  title: string;
  severity: CrisisSeverity;
  status: CrisisStatus;
  jurisdiction: string;
  created_at: string;
  timeline_json: Array<{ text?: string; timestamp: string }>;
  action_plan_json: {
    steps?: Array<{ order: number; action: string; owner: string; timeline: string; priority: string }>;
    communication_guidance?: string;
    evidence_preservation_notes?: string;
  } | null;
  legal_notice_id: string | null;
}

const SEVERITY_COLOURS: Record<CrisisSeverity, string> = {
  critical: "bg-red-100 text-red-800",
  high: "bg-orange-100 text-orange-800",
  medium: "bg-amber-100 text-amber-800",
  low: "bg-yellow-100 text-yellow-800",
};

const STATUS_COLOURS: Record<CrisisStatus, string> = {
  active: "bg-red-100 text-red-700",
  monitoring: "bg-amber-100 text-amber-700",
  resolved: "bg-green-100 text-green-700",
};

const PRIORITY_COLOURS: Record<string, string> = {
  immediate: "text-red-700 font-bold",
  high: "text-orange-700 font-semibold",
  medium: "text-amber-700",
  low: "text-gray-500",
};

export default function CrisisPage() {
  const [rooms, setRooms] = useState<CrisisRoom[]>([]);
  const [selected, setSelected] = useState<CrisisRoom | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>("");
  const [timelineEntry, setTimelineEntry] = useState("");
  const [addingEntry, setAddingEntry] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);

  const loadRooms = useCallback(async () => {
    const params = filterStatus ? `?status=${filterStatus}` : "";
    const res = await fetch(`/api/crisis/list${params}`);
    if (res.ok) {
      const data = await res.json() as CrisisRoom[];
      setRooms(data);
    }
  }, [filterStatus]);

  useEffect(() => { void loadRooms(); }, [loadRooms]);

  async function loadRoom(id: string) {
    const res = await fetch(`/api/crisis/list`);
    if (!res.ok) return;
    const all = await res.json() as CrisisRoom[];
    const room = all.find((r) => r.id === id);
    if (room) setSelected(room);
  }

  async function addTimelineEntry() {
    if (!selected || !timelineEntry.trim()) return;
    setAddingEntry(true);
    try {
      const res = await fetch("/api/crisis/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          crisis_room_id: selected.id,
          action: "add_timeline_entry",
          payload: { text: timelineEntry },
        }),
      });
      if (res.ok) {
        const updated = await res.json() as CrisisRoom;
        setSelected(updated);
        setTimelineEntry("");
        void loadRooms();
      }
    } finally {
      setAddingEntry(false);
    }
  }

  async function updateStatus(status: CrisisStatus) {
    if (!selected) return;
    setUpdatingStatus(true);
    try {
      const res = await fetch("/api/crisis/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          crisis_room_id: selected.id,
          action: "update_status",
          payload: { status },
        }),
      });
      if (res.ok) {
        const updated = await res.json() as CrisisRoom;
        setSelected(updated);
        void loadRooms();
      }
    } finally {
      setUpdatingStatus(false);
    }
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Crisis Room</h1>
          <p className="text-sm text-gray-500 mt-1">Manage legal crises from notice to resolution.</p>
        </div>
        <div className="flex gap-2 items-center">
          <button
            onClick={() => alert("Crisis room creation — coming soon")}
            className="px-4 py-2 rounded-lg bg-red-600 text-white text-sm font-medium hover:bg-red-700 transition-colors"
          >
            Open New Crisis Room
          </button>
          {(["", "active", "monitoring", "resolved"] as const).map((s) => (
            <button
              key={s}
              onClick={() => setFilterStatus(s)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                filterStatus === s ? "bg-gray-900 text-white border-gray-900" : "bg-white text-gray-700 border-gray-300 hover:border-gray-500"
              }`}
            >
              {s || "All"}
            </button>
          ))}
        </div>
      </div>

      {!selected ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {rooms.map((room) => (
            <button
              key={room.id}
              onClick={() => void loadRoom(room.id).then(() => setSelected(room))}
              className="text-left bg-white border border-gray-200 rounded-lg p-4 hover:border-blue-400 transition-colors"
            >
              <div className="flex items-start justify-between gap-2">
                <p className="text-sm font-semibold text-gray-900">{room.title}</p>
                <span className={`shrink-0 px-2 py-0.5 rounded text-xs font-semibold ${SEVERITY_COLOURS[room.severity]}`}>{room.severity}</span>
              </div>
              <div className="flex items-center gap-2 mt-2">
                <span className={`px-2 py-0.5 rounded text-xs ${STATUS_COLOURS[room.status]}`}>{room.status}</span>
                <span className="text-xs text-gray-400">{new Date(room.created_at).toLocaleDateString()}</span>
              </div>
            </button>
          ))}
          {rooms.length === 0 && (
            <p className="text-sm text-gray-400 col-span-3">No crisis rooms. Open one from Legal Notices when a notice is triaged.</p>
          )}
        </div>
      ) : (
        <div className="space-y-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <button onClick={() => setSelected(null)} className="text-xs text-blue-600 hover:underline mb-1">← All rooms</button>
              <h2 className="text-xl font-bold text-gray-900">{selected.title}</h2>
              <div className="flex items-center gap-2 mt-1">
                <span className={`px-2 py-0.5 rounded text-xs font-semibold ${SEVERITY_COLOURS[selected.severity]}`}>{selected.severity}</span>
                <span className={`px-2 py-0.5 rounded text-xs ${STATUS_COLOURS[selected.status]}`}>{selected.status}</span>
                <span className="text-xs text-gray-400">{selected.jurisdiction}</span>
              </div>
            </div>
            {selected.status !== "resolved" && (
              <div className="flex gap-2">
                {selected.status === "active" && (
                  <button onClick={() => void updateStatus("monitoring")} disabled={updatingStatus}
                    className="text-xs border border-amber-400 text-amber-700 px-3 py-1.5 rounded hover:bg-amber-50 disabled:opacity-50">
                    Set Monitoring
                  </button>
                )}
                <button onClick={() => void updateStatus("resolved")} disabled={updatingStatus}
                  className="text-xs bg-green-600 text-white px-3 py-1.5 rounded hover:bg-green-700 disabled:opacity-50">
                  Resolve
                </button>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {/* Action Plan */}
            {selected.action_plan_json?.steps && (
              <div className="bg-white border border-gray-200 rounded-lg p-4 space-y-3">
                <h3 className="font-semibold text-gray-800 text-sm">Action Plan</h3>
                <ol className="space-y-2">
                  {selected.action_plan_json.steps.map((step) => (
                    <li key={step.order} className="flex items-start gap-2">
                      <span className="shrink-0 w-5 h-5 rounded-full bg-gray-100 text-gray-600 text-xs font-bold flex items-center justify-center mt-0.5">{step.order}</span>
                      <div>
                        <p className={`text-sm ${PRIORITY_COLOURS[step.priority] ?? "text-gray-800"}`}>{step.action}</p>
                        <p className="text-xs text-gray-500">{step.owner} · {step.timeline}</p>
                      </div>
                    </li>
                  ))}
                </ol>
                {selected.action_plan_json.communication_guidance && (
                  <div className="bg-blue-50 rounded p-3">
                    <p className="text-xs font-semibold text-blue-700 mb-1">Communication Guidance</p>
                    <p className="text-xs text-blue-800">{selected.action_plan_json.communication_guidance}</p>
                  </div>
                )}
              </div>
            )}

            {/* Timeline */}
            <div className="bg-white border border-gray-200 rounded-lg p-4 space-y-3">
              <h3 className="font-semibold text-gray-800 text-sm">Timeline</h3>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {(selected.timeline_json ?? []).map((entry, i) => (
                  <div key={i} className="border-l-2 border-gray-200 pl-3">
                    <p className="text-sm text-gray-800">{entry.text}</p>
                    <p className="text-xs text-gray-400">{new Date(entry.timestamp).toLocaleString()}</p>
                  </div>
                ))}
                {(selected.timeline_json ?? []).length === 0 && (
                  <p className="text-xs text-gray-400">No entries yet.</p>
                )}
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  className="flex-1 border border-gray-300 rounded-md p-2 text-sm"
                  placeholder="Add timeline entry…"
                  value={timelineEntry}
                  onChange={(e) => setTimelineEntry(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") void addTimelineEntry(); }}
                />
                <button
                  onClick={addTimelineEntry}
                  disabled={addingEntry || !timelineEntry.trim()}
                  className="bg-gray-900 text-white px-3 py-2 rounded-md text-sm font-medium hover:bg-gray-700 disabled:opacity-50"
                >
                  Add
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
