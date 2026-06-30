"use client";

import { useState, useEffect, useCallback } from "react";
import { JurisdictionSelector } from "@/components/ui/jurisdiction-selector";

// ── Types ────────────────────────────────────────────────────────────────────

interface SowListItem {
  id: string;
  title: string;
  brand_name: string;
  status: string;
  total_value: number | null;
  currency: string;
  start_date: string | null;
  end_date: string | null;
  created_at: string;
  sow_deliverables: [{ count: number }];
  sow_payment_milestones: [{ count: number }];
}

interface SowJson {
  title?: string;
  parties?: { brand?: { name?: string }; creator?: { handle?: string } };
  scope?: string;
  deliverables?: Array<{ title: string; platform: string; content_type: string; quantity: number; due_date: string; value: number }>;
  payment_milestones?: Array<{ title: string; amount: number; due_date: string; trigger_event: string }>;
  exclusivity_clause?: string;
  usage_rights?: string;
  cancellation_terms?: string;
  jurisdiction_clause?: string;
  governing_law?: string;
  dispute_resolution?: string;
  special_conditions?: string[];
}

interface FullSow {
  id: string;
  title: string;
  brand_name: string;
  status: string;
  total_value: number | null;
  currency: string;
  start_date: string | null;
  end_date: string | null;
  created_at: string;
  jurisdiction: string;
  sow_json: SowJson;
  sow_deliverables: Array<{ id: string; title: string; platform: string; content_type: string; quantity: number; due_date: string | null; value: number | null; status: string }>;
  sow_payment_milestones: Array<{ id: string; title: string; amount: number; due_date: string | null; trigger_event: string | null; status: string }>;
}

interface Template { id: string; name: string; description: string | null; category: string }

// ── Helpers ──────────────────────────────────────────────────────────────────

const PLATFORMS = ["instagram", "youtube", "twitter", "linkedin", "tiktok", "offline", "other"];
const CURRENCIES = ["INR", "USD", "EUR", "GBP"];
const STATUS_COLORS: Record<string, string> = {
  draft: "bg-slate-700 text-slate-300",
  sent: "bg-blue-900 text-blue-300",
  negotiating: "bg-yellow-900 text-yellow-300",
  signed: "bg-green-900 text-green-300",
  cancelled: "bg-red-900 text-red-300",
};
const SOW_STATUS_ORDER = ["draft", "sent", "negotiating", "signed", "cancelled"];

function StatusBadge({ status }: { status: string }) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${STATUS_COLORS[status] ?? "bg-slate-700 text-slate-300"}`}>
      {status}
    </span>
  );
}

function formatCurrency(amount: number | null, currency = "INR") {
  if (amount == null) return "—";
  return new Intl.NumberFormat("en-IN", { style: "currency", currency, maximumFractionDigits: 0 }).format(amount);
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function SOWBuilderPage() {
  const [jurisdiction, setJurisdiction] = useState("IN");
  const [templates, setTemplates] = useState<Template[]>([]);
  const [sowList, setSowList] = useState<SowListItem[]>([]);
  const [selectedSow, setSelectedSow] = useState<FullSow | null>(null);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState("");

  // Generator form state
  const [brandName, setBrandName] = useState("");
  const [creatorHandle, setCreatorHandle] = useState("");
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>([]);
  const [budget, setBudget] = useState("");
  const [currency, setCurrency] = useState("INR");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [campaignBrief, setCampaignBrief] = useState("");
  const [templateId, setTemplateId] = useState("");

  // Suggestion state
  const [suggestField, setSuggestField] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<{ field: string; suggestions: string[]; reasoning: string } | null>(null);
  const [suggesting, setSuggesting] = useState(false);

  // Save as template
  const [savingTemplate, setSavingTemplate] = useState(false);
  const [templateName, setTemplateName] = useState("");
  const [showSaveTemplate, setShowSaveTemplate] = useState(false);

  const loadTemplates = useCallback(async () => {
    const res = await fetch("/api/sow/templates");
    if (res.ok) { const d = await res.json(); setTemplates(d.templates ?? []); }
  }, []);

  const loadSowList = useCallback(async () => {
    const res = await fetch("/api/sow/list");
    if (res.ok) { const d = await res.json(); setSowList(d.sows ?? []); }
  }, []);

  useEffect(() => {
    loadTemplates();
    loadSowList();
  }, [loadTemplates, loadSowList]);

  async function loadFullSow(id: string) {
    const res = await fetch(`/api/sow/${id}`);
    if (res.ok) { const d = await res.json(); setSelectedSow(d.sow); }
  }

  function togglePlatform(p: string) {
    setSelectedPlatforms((prev) => prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p]);
  }

  async function handleGenerate() {
    setError("");
    if (!brandName || !creatorHandle || !selectedPlatforms.length || !campaignBrief) {
      setError("Fill in all required fields and select at least one platform.");
      return;
    }
    setGenerating(true);
    try {
      const res = await fetch("/api/sow/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          campaign_brief: campaignBrief,
          brand_name: brandName,
          creator_handle: creatorHandle,
          platforms: selectedPlatforms,
          budget: parseFloat(budget) || 0,
          currency,
          start_date: startDate,
          end_date: endDate,
          jurisdiction,
          template_id: templateId || undefined,
        }),
      });
      if (!res.ok) { const d = await res.json(); setError(d.error ?? "Failed to generate"); return; }
      const data = await res.json();
      await loadSowList();
      await loadFullSow(data.sow_id);
    } catch {
      setError("Generation failed. Please try again.");
    } finally {
      setGenerating(false);
    }
  }

  async function handleSuggest(field: string, value: string) {
    setSuggestField(field);
    setSuggesting(true);
    setSuggestions(null);
    const res = await fetch("/api/sow/suggest", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sow_id: selectedSow?.id, field, current_value: value, jurisdiction }),
    });
    if (res.ok) {
      const d = await res.json();
      setSuggestions({ field, ...d });
    }
    setSuggesting(false);
  }

  async function handleStatusUpdate(newStatus: string) {
    if (!selectedSow) return;
    const res = await fetch(`/api/sow/${selectedSow.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus }),
    });
    if (res.ok) {
      await loadSowList();
      await loadFullSow(selectedSow.id);
    }
  }

  async function handleSaveTemplate() {
    if (!selectedSow || !templateName) return;
    setSavingTemplate(true);
    const res = await fetch("/api/sow/templates", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sow_id: selectedSow.id, name: templateName }),
    });
    if (res.ok) {
      setShowSaveTemplate(false);
      setTemplateName("");
      await loadTemplates();
    }
    setSavingTemplate(false);
  }

  const sow = selectedSow;
  const json = sow?.sow_json;

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-white">SOW Builder</h1>
        <p className="text-slate-400 text-sm mt-1">Generate AI-drafted Statements of Work for brand deals and influencer campaigns.</p>
      </div>

      {/* Section 1 — Generator */}
      <div className="bg-slate-800 rounded-xl border border-slate-700 p-6 space-y-5">
        <h2 className="text-lg font-semibold text-white">Generate SOW</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm text-slate-300 mb-1">Brand Name *</label>
            <input value={brandName} onChange={(e) => setBrandName(e.target.value)} placeholder="e.g. Mamaearth"
              className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-green-500" />
          </div>
          <div>
            <label className="block text-sm text-slate-300 mb-1">Creator Handle *</label>
            <input value={creatorHandle} onChange={(e) => setCreatorHandle(e.target.value)} placeholder="e.g. @nikhilchoudhary"
              className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-green-500" />
          </div>
          <div>
            <label className="block text-sm text-slate-300 mb-1">Budget *</label>
            <div className="flex gap-2">
              <select value={currency} onChange={(e) => setCurrency(e.target.value)}
                className="bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none">
                {CURRENCIES.map((c) => <option key={c}>{c}</option>)}
              </select>
              <input type="number" value={budget} onChange={(e) => setBudget(e.target.value)} placeholder="500000"
                className="flex-1 bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-green-500" />
            </div>
          </div>
          <div>
            <label className="block text-sm text-slate-300 mb-1">Jurisdiction</label>
            <JurisdictionSelector value={jurisdiction} onChange={setJurisdiction} />
          </div>
          <div>
            <label className="block text-sm text-slate-300 mb-1">Start Date</label>
            <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)}
              className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
          </div>
          <div>
            <label className="block text-sm text-slate-300 mb-1">End Date</label>
            <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)}
              className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
          </div>
        </div>

        <div>
          <label className="block text-sm text-slate-300 mb-2">Platforms *</label>
          <div className="flex flex-wrap gap-2">
            {PLATFORMS.map((p) => (
              <button key={p} onClick={() => togglePlatform(p)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors capitalize ${selectedPlatforms.includes(p) ? "bg-green-600 text-white" : "bg-slate-700 text-slate-400 hover:bg-slate-600"}`}>
                {p}
              </button>
            ))}
          </div>
        </div>

        {templates.length > 0 && (
          <div>
            <label className="block text-sm text-slate-300 mb-1">Template (optional)</label>
            <select value={templateId} onChange={(e) => setTemplateId(e.target.value)}
              className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none">
              <option value="">— No template —</option>
              {templates.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </div>
        )}

        <div>
          <label className="block text-sm text-slate-300 mb-1">Campaign Brief *</label>
          <textarea value={campaignBrief} onChange={(e) => setCampaignBrief(e.target.value)} rows={4}
            placeholder="Describe the campaign scope, goals, deliverables expected, and any special requirements..."
            className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm placeholder:text-slate-500 resize-none focus:outline-none focus:ring-2 focus:ring-green-500" />
        </div>

        {error && <p className="text-red-400 text-sm">{error}</p>}

        <button onClick={handleGenerate} disabled={generating}
          className="bg-green-600 hover:bg-green-500 disabled:opacity-50 disabled:cursor-not-allowed text-white px-6 py-2.5 rounded-lg text-sm font-medium transition-colors">
          {generating ? "Drafting your SOW..." : "Generate SOW"}
        </button>
      </div>

      {/* Section 2 — SOW Preview */}
      {sow && json && (
        <div className="bg-slate-800 rounded-xl border border-slate-700 p-6 space-y-6">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <h2 className="text-lg font-semibold text-white">{sow.title}</h2>
              <p className="text-slate-400 text-sm mt-0.5">{sow.brand_name}</p>
            </div>
            <div className="flex items-center gap-3 flex-wrap">
              <StatusBadge status={sow.status} />
              <select onChange={(e) => e.target.value && handleStatusUpdate(e.target.value)} value=""
                className="bg-slate-700 border border-slate-600 rounded-lg px-3 py-1.5 text-white text-xs focus:outline-none">
                <option value="">Update status...</option>
                {SOW_STATUS_ORDER.filter((s) => s !== sow.status).map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
              <button onClick={() => setShowSaveTemplate(true)}
                className="bg-slate-700 hover:bg-slate-600 text-slate-200 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors">
                Save as Template
              </button>
            </div>
          </div>

          {showSaveTemplate && (
            <div className="bg-slate-700/50 rounded-lg p-4 flex gap-3 items-center">
              <input value={templateName} onChange={(e) => setTemplateName(e.target.value)} placeholder="Template name"
                className="flex-1 bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
              <button onClick={handleSaveTemplate} disabled={savingTemplate || !templateName}
                className="bg-green-600 hover:bg-green-500 disabled:opacity-50 text-white px-4 py-2 rounded-lg text-sm font-medium">
                {savingTemplate ? "Saving..." : "Save"}
              </button>
              <button onClick={() => setShowSaveTemplate(false)} className="text-slate-400 hover:text-white text-sm">Cancel</button>
            </div>
          )}

          {/* Suggestions panel */}
          {suggestions && (
            <div className="bg-slate-700/50 rounded-lg p-4 space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-green-400">Suggestions for: {suggestions.field}</p>
                <button onClick={() => setSuggestions(null)} className="text-slate-500 hover:text-white text-xs">✕</button>
              </div>
              <p className="text-slate-400 text-xs">{suggestions.reasoning}</p>
              <ul className="space-y-1.5">
                {suggestions.suggestions.map((s, i) => (
                  <li key={i} className="text-slate-200 text-sm bg-slate-700 rounded px-3 py-2">{s}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Parties */}
          {json.parties && (
            <SowSection title="Parties">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-slate-400 text-xs uppercase tracking-wide mb-1">Brand</p>
                  <p className="text-white">{json.parties.brand?.name}</p>
                </div>
                <div>
                  <p className="text-slate-400 text-xs uppercase tracking-wide mb-1">Creator</p>
                  <p className="text-white">{json.parties.creator?.handle}</p>
                </div>
              </div>
            </SowSection>
          )}

          {/* Scope */}
          {json.scope && (
            <SowSection title="Scope" field="scope" value={json.scope} onSuggest={handleSuggest} suggesting={suggesting && suggestField === "scope"}>
              <p className="text-slate-300 text-sm">{json.scope}</p>
            </SowSection>
          )}

          {/* Deliverables table */}
          {sow.sow_deliverables && sow.sow_deliverables.length > 0 && (
            <SowSection title="Deliverables">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-slate-400 text-xs border-b border-slate-700">
                      <th className="text-left py-2 pr-4">Title</th>
                      <th className="text-left py-2 pr-4">Platform</th>
                      <th className="text-left py-2 pr-4">Type</th>
                      <th className="text-left py-2 pr-4">Qty</th>
                      <th className="text-left py-2 pr-4">Due</th>
                      <th className="text-right py-2">Value</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sow.sow_deliverables.map((d) => (
                      <tr key={d.id} className="border-b border-slate-700/50">
                        <td className="py-2 pr-4 text-white">{d.title}</td>
                        <td className="py-2 pr-4 text-slate-300 capitalize">{d.platform}</td>
                        <td className="py-2 pr-4 text-slate-300 capitalize">{d.content_type}</td>
                        <td className="py-2 pr-4 text-slate-300">{d.quantity}</td>
                        <td className="py-2 pr-4 text-slate-300">{d.due_date ?? "—"}</td>
                        <td className="py-2 text-right text-slate-300">{formatCurrency(d.value, sow.currency)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </SowSection>
          )}

          {/* Payment Milestones */}
          {sow.sow_payment_milestones && sow.sow_payment_milestones.length > 0 && (
            <SowSection title="Payment Milestones">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-slate-400 text-xs border-b border-slate-700">
                      <th className="text-left py-2 pr-4">Milestone</th>
                      <th className="text-left py-2 pr-4">Trigger</th>
                      <th className="text-left py-2 pr-4">Due</th>
                      <th className="text-right py-2">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sow.sow_payment_milestones.map((m) => (
                      <tr key={m.id} className="border-b border-slate-700/50">
                        <td className="py-2 pr-4 text-white">{m.title}</td>
                        <td className="py-2 pr-4 text-slate-300">{m.trigger_event ?? "—"}</td>
                        <td className="py-2 pr-4 text-slate-300">{m.due_date ?? "—"}</td>
                        <td className="py-2 text-right text-slate-300">{formatCurrency(m.amount, sow.currency)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </SowSection>
          )}

          {/* Legal clauses */}
          {[
            { key: "exclusivity_clause", label: "Exclusivity" },
            { key: "usage_rights", label: "Usage Rights" },
            { key: "cancellation_terms", label: "Cancellation Terms" },
            { key: "governing_law", label: "Governing Law" },
            { key: "dispute_resolution", label: "Dispute Resolution" },
          ].map(({ key, label }) => {
            const val = json[key as keyof SowJson] as string | undefined;
            if (!val) return null;
            return (
              <SowSection key={key} title={label} field={key} value={val} onSuggest={handleSuggest} suggesting={suggesting && suggestField === key}>
                <p className="text-slate-300 text-sm">{val}</p>
              </SowSection>
            );
          })}

          {json.special_conditions && json.special_conditions.length > 0 && (
            <SowSection title="Special Conditions">
              <ul className="space-y-1 text-sm text-slate-300 list-disc list-inside">
                {json.special_conditions.map((c, i) => <li key={i}>{c}</li>)}
              </ul>
            </SowSection>
          )}
        </div>
      )}

      {/* Section 3 — SOW List */}
      <div className="bg-slate-800 rounded-xl border border-slate-700 p-6 space-y-4">
        <h2 className="text-lg font-semibold text-white">All SOWs</h2>
        {sowList.length === 0 ? (
          <p className="text-slate-400 text-sm">No SOWs yet. Generate your first one above.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-slate-400 text-xs border-b border-slate-700">
                  <th className="text-left py-2 pr-4">Title</th>
                  <th className="text-left py-2 pr-4">Brand</th>
                  <th className="text-left py-2 pr-4">Status</th>
                  <th className="text-left py-2 pr-4">Value</th>
                  <th className="text-left py-2 pr-4">Period</th>
                  <th className="text-left py-2">Created</th>
                </tr>
              </thead>
              <tbody>
                {sowList.map((s) => (
                  <tr key={s.id}
                    onClick={() => loadFullSow(s.id)}
                    className="border-b border-slate-700/50 hover:bg-slate-700/50 cursor-pointer transition-colors">
                    <td className="py-2 pr-4 text-white font-medium">{s.title}</td>
                    <td className="py-2 pr-4 text-slate-300">{s.brand_name}</td>
                    <td className="py-2 pr-4"><StatusBadge status={s.status} /></td>
                    <td className="py-2 pr-4 text-slate-300">{formatCurrency(s.total_value, s.currency)}</td>
                    <td className="py-2 pr-4 text-slate-300 text-xs">{s.start_date ?? "—"} → {s.end_date ?? "—"}</td>
                    <td className="py-2 text-slate-400 text-xs">{new Date(s.created_at).toLocaleDateString("en-IN")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Sub-component ─────────────────────────────────────────────────────────────

function SowSection({
  title, field, value, onSuggest, suggesting, children,
}: {
  title: string;
  field?: string;
  value?: string;
  onSuggest?: (field: string, value: string) => void;
  suggesting?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="border-t border-slate-700 pt-4 space-y-2">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-slate-200 uppercase tracking-wide">{title}</h3>
        {field && onSuggest && value && (
          <button onClick={() => onSuggest(field, value)} disabled={suggesting}
            className="text-xs text-green-400 hover:text-green-300 disabled:opacity-50 transition-colors">
            {suggesting ? "Thinking..." : "Suggest improvement"}
          </button>
        )}
      </div>
      {children}
    </div>
  );
}
