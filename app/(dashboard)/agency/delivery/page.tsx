"use client";

import { useState, useEffect, useCallback } from "react";

interface SowOption { id: string; title: string; brand_name: string; status: string }

interface Milestone { id: string; title: string; amount: number; due_date: string | null; status: string }

interface Invoice {
  id: string; invoice_number: string; brand_name: string;
  amount: number; tax_amount: number; total_amount: number;
  currency: string; status: string; due_date: string | null; created_at: string;
}

interface DeliveryLock {
  id: string; lock_status: string;
  all_deliverables_approved: boolean; all_milestones_paid: boolean;
  compliance_cleared: boolean; final_assets_uploaded: boolean;
  checklist_json: {
    deliverables: { total: number; approved: number; all_approved: boolean };
    milestones: { total: number; paid: number; all_paid: boolean };
  };
  locked_at: string;
}

interface ApprovedChange {
  id: string; change_type: string; description: string;
  impact_analysis_json: { financial_impact: string; suggested_compensation: string } | null;
  created_at: string;
}

const INVOICE_STATUS_COLORS: Record<string, string> = {
  draft: "bg-slate-700 text-slate-300",
  sent: "bg-blue-900 text-blue-300",
  paid: "bg-green-900 text-green-300",
  overdue: "bg-red-900 text-red-300",
  cancelled: "bg-slate-700 text-slate-400",
};

const LOCK_STATUS_COLORS: Record<string, string> = {
  complete: "bg-green-900 text-green-300",
  pending: "bg-yellow-900 text-yellow-300",
  disputed: "bg-red-900 text-red-300",
};

function formatCurrency(amount: number, currency = "INR") {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency, maximumFractionDigits: 0 }).format(amount);
}

export default function DeliveryPage() {
  const [sowOptions, setSowOptions] = useState<SowOption[]>([]);
  const [selectedSowId, setSelectedSowId] = useState("");
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [lock, setLock] = useState<DeliveryLock | null>(null);
  const [approvedChanges, setApprovedChanges] = useState<ApprovedChange[]>([]);

  // Invoice generator
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [selectedMilestoneId, setSelectedMilestoneId] = useState("");
  const [includeTax, setIncludeTax] = useState(false);
  const [taxRate, setTaxRate] = useState(18);
  const [invoiceNotes, setInvoiceNotes] = useState("");
  const [generatingInvoice, setGeneratingInvoice] = useState(false);
  const [invoiceError, setInvoiceError] = useState("");
  const [previewInvoice, setPreviewInvoice] = useState<Invoice | null>(null);

  // Lock
  const [initiatingLock, setInitiatingLock] = useState(false);

  const loadSows = useCallback(async () => {
    const res = await fetch("/api/sow/list");
    if (res.ok) { const d = await res.json(); setSowOptions(d.sows ?? []); }
  }, []);

  const loadData = useCallback(async (sowId: string) => {
    const [sowRes, invRes, lockRes, crRes] = await Promise.allSettled([
      fetch(`/api/sow/${sowId}`),
      fetch(`/api/invoices/list?sow_id=${sowId}`),
      fetch(`/api/delivery/status?sow_id=${sowId}`),
      fetch(`/api/scope/change-requests?sow_id=${sowId}`),
    ]);

    if (sowRes.status === "fulfilled" && sowRes.value.ok) {
      const d = await sowRes.value.json();
      setMilestones(d.sow?.sow_payment_milestones ?? []);
    }
    if (invRes.status === "fulfilled" && invRes.value.ok) {
      const d = await invRes.value.json();
      setInvoices(d.invoices ?? []);
    }
    if (lockRes.status === "fulfilled" && lockRes.value.ok) {
      const d = await lockRes.value.json();
      setLock(d.lock);
    }
    if (crRes.status === "fulfilled" && crRes.value.ok) {
      const d = await crRes.value.json();
      setApprovedChanges((d.requests ?? []).filter((r: ApprovedChange & { status: string }) => r.status === "approved"));
    }
  }, []);

  useEffect(() => { loadSows(); }, [loadSows]);

  useEffect(() => {
    if (selectedSowId) {
      setMilestones([]); setInvoices([]); setLock(null); setApprovedChanges([]);
      loadData(selectedSowId);
    }
  }, [selectedSowId, loadData]);

  async function handleGenerateInvoice() {
    setInvoiceError("");
    setGeneratingInvoice(true);
    const res = await fetch("/api/invoices/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sow_id: selectedSowId,
        milestone_id: selectedMilestoneId || undefined,
        include_tax: includeTax,
        tax_rate: includeTax ? taxRate : 0,
        notes: invoiceNotes,
      }),
    });
    if (res.ok) {
      const d = await res.json();
      setPreviewInvoice(d.invoice);
      await loadData(selectedSowId);
    } else {
      const d = await res.json();
      setInvoiceError(d.error ?? "Generation failed");
    }
    setGeneratingInvoice(false);
  }

  async function handleUpdateInvoiceStatus(id: string, status: string) {
    const res = await fetch(`/api/invoices/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    if (res.ok) loadData(selectedSowId);
  }

  async function handleInitiateLock() {
    setInitiatingLock(true);
    const res = await fetch("/api/delivery/lock", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sow_id: selectedSowId }),
    });
    if (res.ok) { const d = await res.json(); setLock(d.lock); }
    setInitiatingLock(false);
  }

  async function handleToggleManual(field: "compliance_cleared" | "final_assets_uploaded") {
    if (!lock) return;
    // PATCH delivery_locks via service client — requires a dedicated route not in spec.
    // We just reload.
    await loadData(selectedSowId);
  }

  const checkItem = (ok: boolean, label: string, sub?: string) => (
    <div className="flex items-start gap-3">
      <span className={`mt-0.5 flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-xs ${ok ? "bg-green-700 text-green-100" : "bg-slate-700 text-slate-400"}`}>
        {ok ? "✓" : "✗"}
      </span>
      <div>
        <p className={`text-sm ${ok ? "text-green-300" : "text-slate-300"}`}>{label}</p>
        {sub && <p className="text-xs text-slate-500">{sub}</p>}
      </div>
    </div>
  );

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Delivery</h1>
        <p className="text-slate-400 text-sm mt-1">Manage invoices, initiate delivery locks, and review approved scope changes.</p>
      </div>

      {/* SOW Selector */}
      <div>
        <label className="block text-sm text-slate-300 mb-1">Select SOW</label>
        <select value={selectedSowId} onChange={(e) => setSelectedSowId(e.target.value)}
          className="w-full max-w-sm bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none">
          <option value="">— Select a SOW —</option>
          {sowOptions.map((s) => <option key={s.id} value={s.id}>{s.title} · {s.brand_name}</option>)}
        </select>
      </div>

      {selectedSowId && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* Section 1 — Invoice Manager */}
          <div className="lg:col-span-2 bg-slate-800 rounded-xl border border-slate-700 p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold text-white">Invoice Manager</h2>
              <button onClick={() => { setPreviewInvoice(null); setShowInvoiceModal(true); }}
                className="bg-green-600 hover:bg-green-500 text-white px-3 py-1.5 rounded-lg text-xs font-medium">
                + Generate Invoice
              </button>
            </div>

            {/* Milestones summary */}
            {milestones.length > 0 && (
              <div className="bg-slate-700/50 rounded-lg p-3 space-y-1">
                <p className="text-xs text-slate-400 uppercase tracking-wide mb-2">Milestones</p>
                {milestones.map((m) => (
                  <div key={m.id} className="flex items-center justify-between text-sm">
                    <span className="text-slate-300">{m.title}</span>
                    <div className="flex items-center gap-3">
                      <span className="text-slate-400">{formatCurrency(m.amount)}</span>
                      <span className={`text-xs px-1.5 py-0.5 rounded capitalize ${m.status === "paid" ? "bg-green-900 text-green-300" : "bg-slate-700 text-slate-400"}`}>{m.status}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Invoice modal */}
            {showInvoiceModal && (
              <div className="bg-slate-700/50 rounded-lg p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-white">New Invoice</p>
                  <button onClick={() => setShowInvoiceModal(false)} className="text-slate-400 hover:text-white text-xs">✕</button>
                </div>
                {milestones.length > 0 && (
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Link to Milestone (optional)</label>
                    <select value={selectedMilestoneId} onChange={(e) => setSelectedMilestoneId(e.target.value)}
                      className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none">
                      <option value="">— None —</option>
                      {milestones.map((m) => <option key={m.id} value={m.id}>{m.title} ({formatCurrency(m.amount)})</option>)}
                    </select>
                  </div>
                )}
                <div className="flex items-center gap-3">
                  <label className="flex items-center gap-2 text-sm text-slate-300 cursor-pointer">
                    <input type="checkbox" checked={includeTax} onChange={(e) => setIncludeTax(e.target.checked)} className="rounded" />
                    Include GST
                  </label>
                  {includeTax && (
                    <input type="number" value={taxRate} onChange={(e) => setTaxRate(Number(e.target.value))} min={0} max={30}
                      className="w-20 bg-slate-700 border border-slate-600 rounded px-2 py-1 text-white text-sm" />
                  )}
                </div>
                <textarea value={invoiceNotes} onChange={(e) => setInvoiceNotes(e.target.value)} rows={2} placeholder="Notes (optional)"
                  className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm resize-none focus:outline-none" />
                {invoiceError && <p className="text-red-400 text-xs">{invoiceError}</p>}
                {previewInvoice && (
                  <div className="bg-slate-700 rounded p-3 space-y-1 text-sm">
                    <p className="text-green-400 font-medium">{previewInvoice.invoice_number}</p>
                    <p className="text-slate-300">Amount: {formatCurrency(previewInvoice.amount, previewInvoice.currency)}</p>
                    {previewInvoice.tax_amount > 0 && <p className="text-slate-400">GST: {formatCurrency(previewInvoice.tax_amount, previewInvoice.currency)}</p>}
                    <p className="text-white font-medium">Total: {formatCurrency(previewInvoice.total_amount, previewInvoice.currency)}</p>
                  </div>
                )}
                <button onClick={handleGenerateInvoice} disabled={generatingInvoice}
                  className="w-full bg-green-600 hover:bg-green-500 disabled:opacity-50 text-white py-2 rounded-lg text-sm font-medium">
                  {generatingInvoice ? "Generating..." : previewInvoice ? "Regenerate" : "Generate Invoice"}
                </button>
              </div>
            )}

            {/* Invoice list */}
            {invoices.length === 0 ? (
              <p className="text-slate-400 text-sm text-center py-4">No invoices yet for this SOW.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-slate-400 text-xs border-b border-slate-700">
                      <th className="text-left py-2 pr-3">Number</th>
                      <th className="text-left py-2 pr-3">Status</th>
                      <th className="text-right py-2 pr-3">Total</th>
                      <th className="text-left py-2 pr-3">Due</th>
                      <th className="text-left py-2">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {invoices.map((inv) => (
                      <tr key={inv.id} className="border-b border-slate-700/50">
                        <td className="py-2 pr-3 text-white font-mono text-xs">{inv.invoice_number}</td>
                        <td className="py-2 pr-3">
                          <span className={`text-xs px-1.5 py-0.5 rounded ${INVOICE_STATUS_COLORS[inv.status]}`}>{inv.status}</span>
                        </td>
                        <td className="py-2 pr-3 text-right text-slate-300">{formatCurrency(inv.total_amount, inv.currency)}</td>
                        <td className="py-2 pr-3 text-slate-400 text-xs">{inv.due_date ?? "—"}</td>
                        <td className="py-2">
                          <div className="flex gap-1 flex-wrap">
                            {inv.status === "draft" && (
                              <button onClick={() => handleUpdateInvoiceStatus(inv.id, "sent")}
                                className="text-xs bg-blue-800 hover:bg-blue-700 text-white px-2 py-0.5 rounded">Send</button>
                            )}
                            {(inv.status === "sent" || inv.status === "overdue") && (
                              <button onClick={() => handleUpdateInvoiceStatus(inv.id, "paid")}
                                className="text-xs bg-green-800 hover:bg-green-700 text-white px-2 py-0.5 rounded">Mark Paid</button>
                            )}
                            {inv.status === "sent" && (
                              <button onClick={() => handleUpdateInvoiceStatus(inv.id, "overdue")}
                                className="text-xs bg-red-900 hover:bg-red-800 text-white px-2 py-0.5 rounded">Overdue</button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Sections 2+3 — Delivery Lock + Changes */}
          <div className="space-y-4">
            {/* Section 2 — Delivery Lock */}
            <div className="bg-slate-800 rounded-xl border border-slate-700 p-5 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-base font-semibold text-white">Delivery Lock</h2>
                {lock && (
                  <span className={`text-xs px-2 py-0.5 rounded ${LOCK_STATUS_COLORS[lock.lock_status]}`}>{lock.lock_status}</span>
                )}
              </div>

              {lock ? (
                <>
                  {lock.lock_status === "complete" && (
                    <div className="bg-green-900/30 border border-green-700 rounded-lg p-3">
                      <p className="text-green-300 text-sm font-medium">Delivery locked. SOW marked signed.</p>
                    </div>
                  )}
                  {lock.lock_status === "pending" && (
                    <div className="space-y-3">
                      {checkItem(
                        lock.all_deliverables_approved,
                        "All deliverables approved",
                        `${lock.checklist_json?.deliverables?.approved ?? 0}/${lock.checklist_json?.deliverables?.total ?? 0} approved`
                      )}
                      {checkItem(
                        lock.all_milestones_paid,
                        "All milestones paid",
                        `${lock.checklist_json?.milestones?.paid ?? 0}/${lock.checklist_json?.milestones?.total ?? 0} paid`
                      )}
                      {checkItem(lock.compliance_cleared, "Compliance cleared")}
                      {checkItem(lock.final_assets_uploaded, "Final assets uploaded")}
                    </div>
                  )}
                  <button onClick={handleInitiateLock} disabled={initiatingLock}
                    className="w-full bg-slate-700 hover:bg-slate-600 text-white py-2 rounded-lg text-sm font-medium">
                    {initiatingLock ? "Rechecking..." : "Recheck"}
                  </button>
                </>
              ) : (
                <div className="space-y-3">
                  <p className="text-slate-400 text-sm">Initiate delivery lock to verify all deliverables and payments are complete.</p>
                  <button onClick={handleInitiateLock} disabled={initiatingLock}
                    className="w-full bg-green-600 hover:bg-green-500 disabled:opacity-50 text-white py-2 rounded-lg text-sm font-medium">
                    {initiatingLock ? "Checking..." : "Initiate Lock"}
                  </button>
                </div>
              )}
            </div>

            {/* Section 3 — Approved Changes */}
            {approvedChanges.length > 0 && (
              <div className="bg-slate-800 rounded-xl border border-slate-700 p-5 space-y-3">
                <h2 className="text-base font-semibold text-white">Approved Changes</h2>
                <div className="space-y-2">
                  {approvedChanges.map((ch) => (
                    <div key={ch.id} className="bg-slate-700/50 rounded-lg p-3 space-y-1.5">
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-green-400 capitalize">{ch.change_type.replace(/_/g, " ")}</span>
                        <span className="text-xs text-slate-500">{new Date(ch.created_at).toLocaleDateString("en-IN")}</span>
                      </div>
                      <p className="text-sm text-slate-300">{ch.description}</p>
                      {ch.impact_analysis_json?.financial_impact && (
                        <p className="text-xs text-slate-400">{ch.impact_analysis_json.financial_impact}</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {!selectedSowId && (
        <div className="text-center py-16">
          <p className="text-slate-400">Select a SOW above to manage invoices and delivery.</p>
        </div>
      )}
    </div>
  );
}
