"use client";

// Internal advocate tool for the startup vertical: create a matter (one document or a
// data room), read the AI-drafted Founder Readiness Memo, edit every section, mark it
// reviewed (the human gate), then export to PDF via browser print.
import { useCallback, useEffect, useState } from "react";

const SUB_TYPES = [
  "term_sheet", "sha", "ssa", "safe_ccps", "esop", "founder_agreement",
  "ip_assignment", "employment", "consultant", "nda", "dpdp_program", "incorporation",
];
const DILIGENCE_ITEMS = [
  "ip_assignments", "cap_table", "dpdpa_consent", "data_processing",
  "key_contracts_executed", "esop_docs", "founder_agreements", "statutory_registers",
];
const field = "w-full rounded-lg border border-white/15 bg-black px-3 py-2 text-sm text-white outline-none placeholder:text-zinc-600 focus:border-white/50";
const btn = "inline-flex items-center justify-center rounded-lg bg-white px-3 py-2 text-sm font-medium text-black hover:bg-zinc-200 disabled:opacity-40";
const btnGhost = "inline-flex items-center justify-center rounded-lg border border-white/15 px-3 py-2 text-sm text-white hover:bg-white/5 disabled:opacity-40";

type Issue = { clause_ref: string; plain_english: string; why_it_matters: string; action: string; suggested_wording: string };
type Flag = { item: string; status: string; note: string };
type Memo = { bottom_line: string; top_issues: Issue[]; diligence_flags: Flag[]; standard_no_action: string; needs_lawyer: { item: string; reason: string }[]; next_step: string };
type DocStatusRow = { id: string; sub_type: string; title: string | null; status: string };
type MemoRow = { id: string; memo_json: Memo; status: string; prepared_for: string | null; document_label: string | null; reviewed_by: string | null; reviewed_at: string | null };
type MatterRow = { id: string; title: string; sub_type: string | null; created_at: string; startup_memos: { status: string }[]; startup_documents: { count: number }[] };

export function StartupAdmin() {
  const [tab, setTab] = useState<"new" | "matters">("matters");
  const [openId, setOpenId] = useState<string | null>(null);

  if (openId) return <MatterDetail id={openId} onBack={() => setOpenId(null)} />;

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 text-white">
      <header className="mb-6">
        <h1 className="text-xl font-semibold">Startup Review</h1>
        <p className="text-sm text-zinc-500">Founder Readiness Memos — internal. Every memo is advocate-reviewed before export.</p>
      </header>
      <nav className="mb-6 flex gap-2">
        {(["matters", "new"] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)}
            className={`rounded-lg px-3 py-1.5 text-sm ${tab === t ? "bg-white text-black" : "border border-white/15 text-zinc-300"}`}>
            {t === "matters" ? "Matters" : "New matter"}
          </button>
        ))}
      </nav>
      {tab === "new" ? <NewMatter onCreated={(id) => setOpenId(id)} /> : <MattersList onOpen={setOpenId} />}
    </div>
  );
}

function NewMatter({ onCreated }: { onCreated: (matterId: string) => void }) {
  const [title, setTitle] = useState("");
  const [stage, setStage] = useState("");
  const [round, setRound] = useState("");
  const [concerns, setConcerns] = useState("");
  const [rows, setRows] = useState<{ file: File | null; sub_type: string }[]>([{ file: null, sub_type: "term_sheet" }]);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  function setRow(i: number, patch: Partial<{ file: File | null; sub_type: string }>) {
    setRows((p) => p.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));
  }

  async function submit() {
    const withFile = rows.filter((r) => r.file);
    if (!title.trim() || !withFile.length) { setMsg("Title and at least one document are required."); return; }
    setBusy(true); setMsg("Analysing… this runs the full pipeline and can take a minute.");
    const fd = new FormData();
    fd.set("title", title); fd.set("stage", stage); fd.set("round", round); fd.set("concerns", concerns);
    for (const r of withFile) { fd.append("file", r.file!); fd.append("sub_type", r.sub_type); }
    try {
      const res = await fetch("/api/admin/startup", { method: "POST", body: fd });
      const body = await res.json() as { matter_id?: string; error?: string };
      if (!res.ok || !body.matter_id) { setMsg(body.error ?? "failed"); setBusy(false); return; }
      onCreated(body.matter_id);
    } catch (e) { setMsg(e instanceof Error ? e.message : "failed"); setBusy(false); }
  }

  return (
    <div className="space-y-4">
      <input className={field} placeholder="Matter title (e.g. Acme Seed Round)" value={title} onChange={(e) => setTitle(e.target.value)} />
      <div className="grid grid-cols-3 gap-2">
        <input className={field} placeholder="Stage (e.g. seed)" value={stage} onChange={(e) => setStage(e.target.value)} />
        <input className={field} placeholder="Round (e.g. Series A)" value={round} onChange={(e) => setRound(e.target.value)} />
        <input className={field} placeholder="Worried about…" value={concerns} onChange={(e) => setConcerns(e.target.value)} />
      </div>
      <p className="text-xs text-zinc-500">One document = single review. Two or more = data room (one synthesis memo).</p>
      {rows.map((r, i) => (
        <div key={i} className="grid grid-cols-[1fr_auto_auto] items-center gap-2">
          <input type="file" accept=".pdf,.docx,.png,.jpg,.jpeg" className={`${field} file:mr-3 file:rounded file:border-0 file:bg-white/10 file:px-2 file:py-1 file:text-white`}
            onChange={(e) => setRow(i, { file: e.target.files?.[0] ?? null })} />
          <select className={field} value={r.sub_type} onChange={(e) => setRow(i, { sub_type: e.target.value })}>
            {SUB_TYPES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
          <button className={btnGhost} onClick={() => setRows((p) => p.filter((_, idx) => idx !== i))} disabled={rows.length === 1}>−</button>
        </div>
      ))}
      <button className={btnGhost} onClick={() => setRows((p) => [...p, { file: null, sub_type: "sha" }])}>+ Add document</button>
      <div><button className={btn} disabled={busy} onClick={submit}>{busy ? "Analysing…" : "Create + analyse"}</button></div>
      {msg && <p className="text-sm text-zinc-400">{msg}</p>}
    </div>
  );
}

function MattersList({ onOpen }: { onOpen: (id: string) => void }) {
  const [matters, setMatters] = useState<MatterRow[]>([]);
  useEffect(() => { void (async () => {
    const res = await fetch("/api/admin/startup");
    if (res.ok) setMatters(await res.json() as MatterRow[]);
  })(); }, []);
  const pending = matters.filter((m) => m.startup_memos?.length && m.startup_memos[0]?.status !== "reviewed").length;
  return (
    <div className="overflow-x-auto">
      {pending > 0 && (
        <p className="mb-2 text-sm text-amber-400">{pending} memo{pending === 1 ? "" : "s"} awaiting review</p>
      )}
      <table className="w-full text-left text-sm">
        <thead className="text-xs uppercase text-zinc-500"><tr><th className="py-2">Matter</th><th>Type</th><th>Docs</th><th>Memo</th></tr></thead>
        <tbody>
          {matters.map((m) => (
            <tr key={m.id} onClick={() => onOpen(m.id)} className="cursor-pointer border-t border-white/10 hover:bg-white/5">
              <td className="py-2 pr-2">{m.title}</td>
              <td className="pr-2 text-zinc-400">{m.sub_type}</td>
              <td className="pr-2">{m.startup_documents?.[0]?.count ?? 0}</td>
              <td className="pr-2">{m.startup_memos?.[0]?.status === "reviewed" ? <span className="text-emerald-400">reviewed</span> : <span className="text-amber-400">draft</span>}</td>
            </tr>
          ))}
          {!matters.length && <tr><td colSpan={4} className="py-6 text-center text-zinc-500">No matters yet.</td></tr>}
        </tbody>
      </table>
    </div>
  );
}

function MatterDetail({ id, onBack }: { id: string; onBack: () => void }) {
  const [memo, setMemo] = useState<Memo | null>(null);
  const [row, setRow] = useState<MemoRow | null>(null);
  const [header, setHeader] = useState({ prepared_for: "", document_label: "", reviewed_by: "" });
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);

  const [docs, setDocs] = useState<DocStatusRow[]>([]);

  const load = useCallback(async () => {
    const res = await fetch(`/api/admin/startup/${id}`);
    if (!res.ok) return;
    const body = await res.json() as { memo: MemoRow | null; documents?: DocStatusRow[] };
    setDocs(body.documents ?? []);
    if (body.memo) {
      setRow(body.memo); setMemo(body.memo.memo_json);
      setHeader({ prepared_for: body.memo.prepared_for ?? "", document_label: body.memo.document_label ?? "", reviewed_by: body.memo.reviewed_by ?? "" });
    }
  }, [id]);

  async function reprocessDoc(docId: string) {
    setBusy(true); setMsg("Reprocessing document…");
    const res = await fetch(`/api/admin/startup/doc/${docId}`, { method: "POST" });
    const body = await res.json() as { error?: string };
    setMsg(res.ok ? "Document reprocessed — text and terms refreshed." : (body.error ?? "Reprocess failed."));
    setBusy(false);
    void load();
  }
  useEffect(() => { void load(); }, [load]);

  if (!memo || !row) return <div className="mx-auto max-w-4xl px-4 py-8 text-white"><button className={btnGhost} onClick={onBack}>← Back</button><p className="mt-4 text-zinc-500">Loading memo…</p></div>;

  const reviewed = row.status === "reviewed";
  const patch = (m: Partial<Memo>) => setMemo({ ...memo, ...m });

  async function save() {
    setBusy(true); setMsg("");
    const res = await fetch(`/api/admin/startup/${id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ memo_json: memo, ...header }),
    });
    setBusy(false);
    if (res.ok) { setMsg("Saved. Memo is back to draft — mark reviewed to unlock export."); void load(); }
    else setMsg("Save failed (check required fields).");
  }
  async function markReviewed() {
    setBusy(true); setMsg("");
    await fetch(`/api/admin/startup/${id}`, { method: "POST" });
    setBusy(false); setMsg("Marked reviewed. Export unlocked."); void load();
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 text-white space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <button className={btnGhost} onClick={onBack}>← Back</button>
        <div className="flex items-center gap-2">
          <span className={reviewed ? "text-emerald-400 text-sm" : "text-amber-400 text-sm"}>{reviewed ? `reviewed ${row.reviewed_at?.slice(0, 10) ?? ""}` : "draft"}</span>
          <button className={btnGhost} disabled={busy} onClick={save}>Save draft</button>
          <button className={btn} disabled={busy || reviewed} onClick={markReviewed}>Mark reviewed</button>
          <a className={reviewed ? btn : `${btn} pointer-events-none opacity-40`} href={reviewed ? `/api/admin/startup/${id}/export` : undefined} target="_blank" rel="noreferrer">Export PDF</a>
        </div>
      </div>

      <section className="grid grid-cols-3 gap-2">
        <input className={field} placeholder="Prepared for" value={header.prepared_for} onChange={(e) => setHeader({ ...header, prepared_for: e.target.value })} />
        <input className={field} placeholder="Document reviewed" value={header.document_label} onChange={(e) => setHeader({ ...header, document_label: e.target.value })} />
        <input className={field} placeholder="Reviewed by (advocate)" value={header.reviewed_by} onChange={(e) => setHeader({ ...header, reviewed_by: e.target.value })} />
      </section>

      <Section label="Bottom line">
        <textarea className={field} rows={3} value={memo.bottom_line} onChange={(e) => patch({ bottom_line: e.target.value })} />
      </Section>

      <Section label={`Top issues (${memo.top_issues.length}/3)`}>
        {memo.top_issues.map((iss, i) => (
          <div key={i} className="rounded-lg border border-white/10 p-3 space-y-2">
            <div className="grid grid-cols-3 gap-2">
              <input className={field} placeholder="Clause ref" value={iss.clause_ref} onChange={(e) => patch({ top_issues: memo.top_issues.map((x, idx) => idx === i ? { ...x, clause_ref: e.target.value } : x) })} />
              <select className={field} value={iss.why_it_matters} onChange={(e) => patch({ top_issues: memo.top_issues.map((x, idx) => idx === i ? { ...x, why_it_matters: e.target.value } : x) })}>
                {["control", "economics", "diligence"].map((v) => <option key={v} value={v}>{v}</option>)}
              </select>
              <select className={field} value={iss.action} onChange={(e) => patch({ top_issues: memo.top_issues.map((x, idx) => idx === i ? { ...x, action: e.target.value } : x) })}>
                {["accept", "negotiate", "fix_now"].map((v) => <option key={v} value={v}>{v}</option>)}
              </select>
            </div>
      {docs.some((d) => d.status === "failed") && (
        <div className="rounded-lg border border-red-500/30 p-3 text-sm">
          <p className="mb-2 text-red-400">Failed documents — text never extracted, memo may be incomplete:</p>
          {docs.filter((d) => d.status === "failed").map((d) => (
            <div key={d.id} className="flex items-center justify-between gap-2 py-1">
              <span className="text-zinc-300">{d.title ?? d.sub_type}</span>
              <button className={btnGhost} disabled={busy} onClick={() => void reprocessDoc(d.id)}>Reprocess</button>
            </div>
          ))}
        </div>
      )}
            <textarea className={field} rows={2} placeholder="Plain English" value={iss.plain_english} onChange={(e) => patch({ top_issues: memo.top_issues.map((x, idx) => idx === i ? { ...x, plain_english: e.target.value } : x) })} />
            <textarea className={field} rows={2} placeholder="Suggested wording" value={iss.suggested_wording} onChange={(e) => patch({ top_issues: memo.top_issues.map((x, idx) => idx === i ? { ...x, suggested_wording: e.target.value } : x) })} />
            <button className={btnGhost} onClick={() => patch({ top_issues: memo.top_issues.filter((_, idx) => idx !== i) })}>Remove issue</button>
          </div>
        ))}
        {memo.top_issues.length < 3 && <button className={btnGhost} onClick={() => patch({ top_issues: [...memo.top_issues, { clause_ref: "", plain_english: "", why_it_matters: "control", action: "negotiate", suggested_wording: "" }] })}>+ Add issue</button>}
      </Section>

      <Section label="Diligence readiness">
        {DILIGENCE_ITEMS.map((item) => {
          const f = memo.diligence_flags.find((x) => x.item === item) ?? { item, status: "missing", note: "" };
          const setFlag = (patchF: Partial<Flag>) => patch({ diligence_flags: DILIGENCE_ITEMS.map((it) => it === item ? { ...f, item, ...patchF } : (memo.diligence_flags.find((x) => x.item === it) ?? { item: it, status: "missing", note: "" })) });
          return (
            <div key={item} className="grid grid-cols-[180px_130px_1fr] items-center gap-2">
              <span className="text-sm text-zinc-400">{item}</span>
              <select className={field} value={f.status} onChange={(e) => setFlag({ status: e.target.value })}>
                {["green", "attention", "missing"].map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
              <input className={field} value={f.note} onChange={(e) => setFlag({ note: e.target.value })} />
            </div>
          );
        })}
      </Section>

      <Section label="Standard — no action needed">
        <textarea className={field} rows={3} value={memo.standard_no_action} onChange={(e) => patch({ standard_no_action: e.target.value })} />
      </Section>

      <Section label="Needs a lawyer">
        {memo.needs_lawyer.map((n, i) => (
          <div key={i} className="grid grid-cols-[1fr_1fr_auto] gap-2">
            <input className={field} placeholder="Item" value={n.item} onChange={(e) => patch({ needs_lawyer: memo.needs_lawyer.map((x, idx) => idx === i ? { ...x, item: e.target.value } : x) })} />
            <input className={field} placeholder="One-line reason" value={n.reason} onChange={(e) => patch({ needs_lawyer: memo.needs_lawyer.map((x, idx) => idx === i ? { ...x, reason: e.target.value } : x) })} />
            <button className={btnGhost} onClick={() => patch({ needs_lawyer: memo.needs_lawyer.filter((_, idx) => idx !== i) })}>−</button>
          </div>
        ))}
        <button className={btnGhost} onClick={() => patch({ needs_lawyer: [...memo.needs_lawyer, { item: "", reason: "" }] })}>+ Add</button>
      </Section>

      <Section label="Next step">
        <input className={field} value={memo.next_step} onChange={(e) => patch({ next_step: e.target.value })} />
      </Section>

      {msg && <p className="text-sm text-zinc-400">{msg}</p>}
    </div>
  );
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <section className="space-y-2">
      <h3 className="text-xs uppercase tracking-wide text-zinc-500">{label}</h3>
      {children}
    </section>
  );
}
