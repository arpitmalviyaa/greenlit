"use client";

import { useState, useCallback } from "react";
import { Eye, Plus, AlertTriangle, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface ExclusivityRecord {
  id: string;
  creator_id: string;
  brand_name: string;
  category: string;
  start_date: string;
  end_date: string;
  status: string;
  sow_id?: string | null;
  notes?: string | null;
  jurisdiction?: string;
}

interface ConflictResult {
  conflict: boolean;
  conflicts: ExclusivityRecord[];
  alert_id?: string | null;
}

export default function ExclusivityPage() {
  const [creatorId, setCreatorId] = useState("");
  const [records, setRecords] = useState<ExclusivityRecord[]>([]);
  const [loadingRecords, setLoadingRecords] = useState(false);
  const [activeTab, setActiveTab] = useState<"active" | "all">("active");

  // Conflict check
  const [checkBrand, setCheckBrand] = useState("");
  const [checkCategory, setCheckCategory] = useState("");
  const [checkStart, setCheckStart] = useState("");
  const [checkEnd, setCheckEnd] = useState("");
  const [checking, setChecking] = useState(false);
  const [conflictResult, setConflictResult] = useState<ConflictResult | null>(null);

  // Add record
  const [showAddModal, setShowAddModal] = useState(false);
  const [addBrand, setAddBrand] = useState("");
  const [addCategory, setAddCategory] = useState("");
  const [addStart, setAddStart] = useState("");
  const [addEnd, setAddEnd] = useState("");
  const [addNotes, setAddNotes] = useState("");
  const [adding, setAdding] = useState(false);
  const [addError, setAddError] = useState("");

  const fetchRecords = useCallback(async (cid: string) => {
    if (!cid) return;
    setLoadingRecords(true);
    const url = `/api/exclusivity/list?creator_id=${encodeURIComponent(cid)}`;
    const res = await fetch(url);
    const json = await res.json() as { records?: ExclusivityRecord[] };
    setRecords(json.records ?? []);
    setLoadingRecords(false);
  }, []);

  const checkConflict = async () => {
    if (!creatorId || !checkBrand || !checkCategory || !checkStart || !checkEnd) return;
    setChecking(true);
    setConflictResult(null);
    const res = await fetch("/api/exclusivity/check", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ creator_id: creatorId, brand_name: checkBrand, category: checkCategory, start_date: checkStart, end_date: checkEnd }),
    });
    const json = await res.json() as ConflictResult;
    setConflictResult(json);
    setChecking(false);
  };

  const addRecord = async () => {
    if (!creatorId || !addBrand || !addCategory || !addStart || !addEnd) return;
    setAdding(true);
    setAddError("");
    const res = await fetch("/api/exclusivity/add", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ creator_id: creatorId, brand_name: addBrand, category: addCategory, start_date: addStart, end_date: addEnd, notes: addNotes || undefined }),
    });
    if (res.ok) {
      setShowAddModal(false);
      setAddBrand(""); setAddCategory(""); setAddStart(""); setAddEnd(""); setAddNotes("");
      await fetchRecords(creatorId);
    } else {
      const err = await res.json() as { error?: string };
      setAddError(err.error ?? "Failed to add record");
    }
    setAdding(false);
  };

  // Visual timeline bar helpers
  const today = new Date();
  const timelineStart = new Date(today.getFullYear(), today.getMonth() - 1, 1);
  const timelineEnd = new Date(today.getFullYear(), today.getMonth() + 12, 0);
  const timelineMs = timelineEnd.getTime() - timelineStart.getTime();

  const barLeft = (d: string) => Math.max(0, (new Date(d).getTime() - timelineStart.getTime()) / timelineMs * 100);
  const barWidth = (s: string, e: string) => Math.min(100 - barLeft(s), (new Date(e).getTime() - new Date(s).getTime()) / timelineMs * 100);

  const COLOURS = ["bg-blue-400", "bg-purple-400", "bg-green-400", "bg-orange-400", "bg-pink-400"];

  return (
    <div className="p-6 space-y-8 bg-gray-50 min-h-screen">
      <div className="flex items-center gap-2">
        <Eye className="w-5 h-5" />
        <h1 className="text-xl font-bold">Exclusivity Radar</h1>
      </div>

      {/* Section 1 — Radar */}
      <Card>
        <CardHeader><CardTitle className="text-base">Creator Exclusivity Map</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Input value={creatorId} onChange={e => setCreatorId(e.target.value)} placeholder="Creator UUID" className="max-w-xs" />
            <Button onClick={() => void fetchRecords(creatorId)} disabled={!creatorId || loadingRecords} size="sm">
              {loadingRecords ? "Loading…" : "Load"}
            </Button>
          </div>

          {records.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs text-gray-500 flex items-center gap-1"><Calendar className="w-3 h-3" /> Timeline (12 months from today)</p>
              {records.map((r, i) => (
                <div key={r.id} className="flex items-center gap-3">
                  <div className="w-32 text-xs text-right text-gray-600 truncate">{r.brand_name}</div>
                  <div className="flex-1 h-6 bg-gray-100 rounded relative">
                    <div
                      className={`absolute h-6 rounded ${COLOURS[i % COLOURS.length]} opacity-80`}
                      style={{ left: `${barLeft(r.start_date)}%`, width: `${Math.max(2, barWidth(r.start_date, r.end_date))}%` }}
                      title={`${r.category}: ${r.start_date} – ${r.end_date}`}
                    />
                  </div>
                  <div className="w-20 text-xs text-gray-500">{r.category}</div>
                </div>
              ))}
            </div>
          )}

          {/* Conflict check */}
          <div className="border-t pt-4 space-y-3">
            <p className="text-sm font-medium">Check for Conflict</p>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              <div><Label className="text-xs">Brand</Label><Input value={checkBrand} onChange={e => setCheckBrand(e.target.value)} placeholder="Brand name" /></div>
              <div><Label className="text-xs">Category</Label><Input value={checkCategory} onChange={e => setCheckCategory(e.target.value)} placeholder="e.g. fashion" /></div>
              <div><Label className="text-xs">Start</Label><Input type="date" value={checkStart} onChange={e => setCheckStart(e.target.value)} /></div>
              <div><Label className="text-xs">End</Label><Input type="date" value={checkEnd} onChange={e => setCheckEnd(e.target.value)} /></div>
            </div>
            <Button size="sm" onClick={() => void checkConflict()} disabled={checking || !creatorId}>
              {checking ? "Checking…" : "Check Conflict"}
            </Button>

            {conflictResult && (
              <div className={`p-3 rounded-lg ${conflictResult.conflict ? "bg-red-50 border border-red-200" : "bg-green-50 border border-green-200"}`}>
                {conflictResult.conflict ? (
                  <>
                    <div className="flex items-center gap-2 text-red-700 font-medium mb-2">
                      <AlertTriangle className="w-4 h-4" />Conflict Detected
                    </div>
                    {conflictResult.conflicts.map(c => (
                      <div key={c.id} className="text-xs text-red-600 bg-red-100 rounded p-2 mb-1">
                        {c.brand_name} · {c.category} · {c.start_date} – {c.end_date}
                      </div>
                    ))}
                  </>
                ) : (
                  <p className="text-green-700 text-sm font-medium">✓ No conflicts found</p>
                )}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Section 2 — Records Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Exclusivity Records</CardTitle>
            <Button size="sm" onClick={() => setShowAddModal(true)} disabled={!creatorId}><Plus className="w-4 h-4 mr-1" />Add Record</Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex gap-2">
            {(["active", "all"] as const).map(t => (
              <button key={t} onClick={() => setActiveTab(t)} className={`px-3 py-1 rounded text-xs font-medium ${activeTab === t ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-600"}`}>{t === "active" ? "Active" : "All"}</button>
            ))}
          </div>

          {showAddModal && (
            <Card className="border-blue-200">
              <CardHeader><CardTitle className="text-sm">Add Exclusivity Record</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                <div className="grid grid-cols-2 gap-2">
                  <div><Label className="text-xs">Brand</Label><Input value={addBrand} onChange={e => setAddBrand(e.target.value)} /></div>
                  <div><Label className="text-xs">Category</Label><Input value={addCategory} onChange={e => setAddCategory(e.target.value)} /></div>
                  <div><Label className="text-xs">Start</Label><Input type="date" value={addStart} onChange={e => setAddStart(e.target.value)} /></div>
                  <div><Label className="text-xs">End</Label><Input type="date" value={addEnd} onChange={e => setAddEnd(e.target.value)} /></div>
                </div>
                <div><Label className="text-xs">Notes</Label><Input value={addNotes} onChange={e => setAddNotes(e.target.value)} /></div>
                {addError && <p className="text-xs text-red-600">{addError}</p>}
                <div className="flex gap-2">
                  <Button size="sm" onClick={() => void addRecord()} disabled={adding}>{adding ? "Saving…" : "Save"}</Button>
                  <Button size="sm" variant="outline" onClick={() => { setShowAddModal(false); setAddError(""); }}>Cancel</Button>
                </div>
              </CardContent>
            </Card>
          )}

          {records.length === 0 ? (
            <p className="text-sm text-gray-500">Load a creator to see records.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-xs text-gray-500">
                    <th className="text-left py-2 pr-4">Brand</th>
                    <th className="text-left py-2 pr-4">Category</th>
                    <th className="text-left py-2 pr-4">Start</th>
                    <th className="text-left py-2 pr-4">End</th>
                    <th className="text-left py-2">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {records
                    .filter(r => activeTab === "all" || r.status === "active")
                    .map(r => (
                      <tr key={r.id} className="border-b hover:bg-gray-50">
                        <td className="py-2 pr-4 font-medium">{r.brand_name}</td>
                        <td className="py-2 pr-4 text-gray-600">{r.category}</td>
                        <td className="py-2 pr-4 text-gray-600">{r.start_date}</td>
                        <td className="py-2 pr-4 text-gray-600">{r.end_date}</td>
                        <td className="py-2">
                          <span className={`text-xs px-2 py-0.5 rounded-full ${r.status === "active" ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-600"}`}>{r.status}</span>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
