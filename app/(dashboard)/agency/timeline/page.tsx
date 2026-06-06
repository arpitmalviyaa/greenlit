"use client";

import { useState, useCallback } from "react";
import {
  FileText, CheckCircle, RotateCcw, DollarSign, Edit3,
  Mail, Lock, Upload, Zap, Circle
} from "lucide-react";

type TimelineEventType =
  | "sow_created" | "deliverable_submitted" | "approval_granted"
  | "revision_requested" | "payment_made" | "scope_change"
  | "invoice_sent" | "delivery_locked" | "proof_uploaded";

interface TimelineEvent {
  id: string;
  event_type: TimelineEventType;
  title: string;
  description: string | null;
  actor_name: string;
  created_at: string;
  reference_id: string | null;
  reference_table: string | null;
}

const EVENT_CONFIG: Record<TimelineEventType, { icon: React.ComponentType<{ className?: string }>; color: string; bg: string }> = {
  sow_created: { icon: FileText, color: "text-blue-400", bg: "bg-blue-900/30 border-blue-700/50" },
  deliverable_submitted: { icon: Zap, color: "text-yellow-400", bg: "bg-yellow-900/30 border-yellow-700/50" },
  approval_granted: { icon: CheckCircle, color: "text-green-400", bg: "bg-green-900/30 border-green-700/50" },
  revision_requested: { icon: RotateCcw, color: "text-orange-400", bg: "bg-orange-900/30 border-orange-700/50" },
  payment_made: { icon: DollarSign, color: "text-emerald-400", bg: "bg-emerald-900/30 border-emerald-700/50" },
  scope_change: { icon: Edit3, color: "text-purple-400", bg: "bg-purple-900/30 border-purple-700/50" },
  invoice_sent: { icon: Mail, color: "text-indigo-400", bg: "bg-indigo-900/30 border-indigo-700/50" },
  delivery_locked: { icon: Lock, color: "text-red-400", bg: "bg-red-900/30 border-red-700/50" },
  proof_uploaded: { icon: Upload, color: "text-cyan-400", bg: "bg-cyan-900/30 border-cyan-700/50" },
};

export default function TimelinePage() {
  const [sowId, setSowId] = useState("");
  const [events, setEvents] = useState<TimelineEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchTimeline = useCallback(async () => {
    if (!sowId.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/timeline?sow_id=${encodeURIComponent(sowId)}`);
      const json = await res.json() as { events?: TimelineEvent[]; error?: string };
      if (json.error) { setError(json.error); setEvents([]); }
      else setEvents(json.events ?? []);
    } catch {
      setError("Failed to fetch timeline.");
    }
    setLoading(false);
  }, [sowId]);

  return (
    <div className="p-6 min-h-screen bg-slate-950 text-slate-100">
      <style>{`@media print { .no-print { display: none !important; } body { background: white; color: black; } }`}</style>

      <div className="flex items-center justify-between mb-6 no-print">
        <h1 className="text-2xl font-bold text-white">Evidence Timeline</h1>
        <button
          onClick={() => window.print()}
          className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded text-sm"
        >
          Export PDF
        </button>
      </div>

      <div className="flex gap-3 mb-8 no-print">
        <input
          value={sowId}
          onChange={(e) => setSowId(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") void fetchTimeline(); }}
          placeholder="Enter SOW ID…"
          className="flex-1 max-w-md bg-slate-800 border border-slate-700 rounded px-3 py-2 text-sm text-slate-200"
        />
        <button
          onClick={fetchTimeline}
          disabled={loading || !sowId.trim()}
          className="px-4 py-2 bg-green-700 hover:bg-green-600 disabled:opacity-50 text-white rounded text-sm font-medium"
        >
          {loading ? "Loading…" : "Load Timeline"}
        </button>
      </div>

      {error && (
        <div className="bg-red-900/20 border border-red-800 rounded-lg p-3 text-red-400 text-sm mb-6">
          {error}
        </div>
      )}

      {events.length === 0 && !loading && sowId && !error && (
        <p className="text-slate-500 text-sm">No events found for this SOW.</p>
      )}

      {events.length > 0 && (
        <div className="relative">
          {/* Vertical line */}
          <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-slate-700" />

          <div className="space-y-6 pl-16">
            {events.map((event) => {
              const config = EVENT_CONFIG[event.event_type] ?? {
                icon: Circle, color: "text-slate-400", bg: "bg-slate-800 border-slate-700"
              };
              const Icon = config.icon;
              return (
                <div key={event.id} className="relative">
                  {/* Dot on timeline */}
                  <div className={`absolute -left-10 w-8 h-8 rounded-full border flex items-center justify-center ${config.bg}`}>
                    <Icon className={`w-4 h-4 ${config.color}`} />
                  </div>

                  <div className={`border rounded-lg p-4 ${config.bg}`}>
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className={`font-semibold ${config.color}`}>{event.title}</p>
                        {event.description && (
                          <p className="text-sm text-slate-300 mt-1">{event.description}</p>
                        )}
                        <p className="text-xs text-slate-400 mt-2">
                          {event.actor_name} · {new Date(event.created_at).toLocaleString()}
                        </p>
                      </div>
                      <span className="text-xs text-slate-500 whitespace-nowrap">
                        {event.event_type.replace(/_/g, " ")}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
