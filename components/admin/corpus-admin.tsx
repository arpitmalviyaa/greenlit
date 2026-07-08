"use client";

// Founder tool — utilitarian, not a product surface. Upload documents, feed
// quick notes, and curate chunks that sharpen every analysis.
import { useCallback, useEffect, useRef, useState } from "react";

const DOC_KINDS = ["contract", "dispute", "judgment", "negotiation", "clause_note", "founder_annotation"];
const DEAL_TYPES = ["paid_promotion", "barter", "ugc_license", "ambassadorship", "representation", "platform", "other"];
const VERTICALS = ["creator", "startup", "litigation", "general"];
const CLAUSE_TYPES = ["", "usage_rights", "exclusivity", "payment_terms", "indemnity", "termination", "morality", "ip_assignment", "confidentiality", "deliverables", "other"];
const STANCES = ["market_standard", "creator_favorable", "brand_aggressive", "dispute_source", "founder_approved"];

const field = "w-full rounded-lg border border-white/15 bg-black px-3 py-2 text-sm text-white outline-none placeholder:text-zinc-600 focus:border-white/50";
const btn = "inline-flex items-center justify-center rounded-lg bg-white px-3 py-2 text-sm font-medium text-black hover:bg-zinc-200 disabled:opacity-40";
const btnGhost = "inline-flex items-center justify-center rounded-lg border border-white/15 px-3 py-2 text-sm text-white hover:bg-white/5 disabled:opacity-40";

type DocRow = { id: string; doc_kind: string; deal_type: string; vertical: string; sanitized: boolean; title: string | null; status: string; chunk_count: number; created_at: string };
type Chunk = { id: string; chunk_index: number; content: string; clause_type: string | null; risk_note: string | null; stance: string; status: string };
type Staged = { file: File; doc_kind: string; deal_type: string; vertical: string; title: string; founder_note: string; source_note: string; state: "idle" | "uploading" | "done" | "error"; msg?: string };

export function CorpusAdmin() {
  const [tab, setTab] = useState<"upload" | "library" | "note">("upload");
  return (
    <div className="mx-auto max-w-4xl px-4 py-8 text-white">
      <header className="mb-6">
        <h1 className="text-xl font-semibold">Corpus</h1>
        <p className="text-sm text-zinc-500">House knowledge — contracts, disputes, judgments, reviewer notes. Only you see this.</p>
      </header>
      <nav className="mb-6 flex gap-2">
        {(["upload", "library", "note"] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)}
            className={`rounded-lg px-3 py-1.5 text-sm ${tab === t ? "bg-white text-black" : "border border-white/15 text-zinc-300"}`}>
            {t === "upload" ? "Upload" : t === "library" ? "Library" : "Quick note"}
          </button>
        ))}
      </nav>
      {tab === "upload" && <UploadView />}
      {tab === "library" && <LibraryView />}
      {tab === "note" && <NoteView />}
    </div>
  );
}

function UploadView() {
  const [items, setItems] = useState<Staged[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);

  const add = useCallback((files: FileList | null) => {
    if (!files) return;
    setItems((prev) => [
      ...prev,
      ...Array.from(files).map((file) => ({
        file, doc_kind: "contract", deal_type: "other", vertical: "creator",
        title: file.name, founder_note: "", source_note: "", state: "idle" as const,
      })),
    ]);
  }, []);

  function update(i: number, patch: Partial<Staged>) {
    setItems((prev) => prev.map((it, idx) => (idx === i ? { ...it, ...patch } : it)));
  }

  async function ingestOne(i: number, it: Staged) {
    update(i, { state: "uploading", msg: undefined });
    const fd = new FormData();
    fd.set("file", it.file);
    fd.set("doc_kind", it.doc_kind);
    fd.set("deal_type", it.deal_type);
    fd.set("vertical", it.vertical);
    fd.set("title", it.title);
    fd.set("founder_note", it.founder_note);
    fd.set("source_note", it.source_note);
    try {
      const res = await fetch("/api/admin/corpus", { method: "POST", body: fd });
      const body = await res.json() as { status?: string; chunk_count?: number; error?: string };
      if (!res.ok) update(i, { state: "error", msg: body.error ?? "failed" });
      else update(i, { state: "done", msg: `${body.status} · ${body.chunk_count} chunks` });
    } catch (e) {
      update(i, { state: "error", msg: e instanceof Error ? e.message : "failed" });
    }
  }

  async function ingestAll() {
    for (let i = 0; i < items.length; i++) {
      if (items[i].state === "idle" || items[i].state === "error") await ingestOne(i, items[i]);
    }
  }

  return (
    <div className="space-y-4">
      <div
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => { e.preventDefault(); setDragOver(false); add(e.dataTransfer.files); }}
        onClick={() => inputRef.current?.click()}
        className={`cursor-pointer rounded-xl border border-dashed p-8 text-center text-sm ${dragOver ? "border-white/60 bg-white/5" : "border-white/20 text-zinc-400"}`}>
        Drop PDF / DOCX / images here, or tap to choose. Multiple files OK.
        <input ref={inputRef} type="file" multiple hidden accept=".pdf,.docx,.png,.jpg,.jpeg,.heic"
          onChange={(e) => add(e.target.files)} />
      </div>

      {items.map((it, i) => (
        <div key={i} className="rounded-xl border border-white/10 p-3">
          <div className="mb-2 flex items-center justify-between gap-2">
            <span className="truncate text-sm text-zinc-300">{it.file.name}</span>
            <span className={`text-xs ${it.state === "error" ? "text-red-400" : it.state === "done" ? "text-emerald-400" : "text-zinc-500"}`}>
              {it.state === "uploading" ? "Processing…" : it.msg ?? ""}
            </span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <select className={field} value={it.doc_kind} onChange={(e) => update(i, { doc_kind: e.target.value })}>
              {DOC_KINDS.map((k) => <option key={k} value={k}>{k}</option>)}
            </select>
            <select className={field} value={it.deal_type} onChange={(e) => update(i, { deal_type: e.target.value })}>
              {DEAL_TYPES.map((k) => <option key={k} value={k}>{k}</option>)}
            </select>
            <select className={`${field} col-span-2`} value={it.vertical} onChange={(e) => update(i, { vertical: e.target.value })}>
              {VERTICALS.map((k) => <option key={k} value={k}>vertical: {k}</option>)}
            </select>
            <input className={`${field} col-span-2`} placeholder="Title" value={it.title} onChange={(e) => update(i, { title: e.target.value })} />
            <textarea className={`${field} col-span-2`} rows={2} placeholder="What should the system learn from this?" value={it.founder_note} onChange={(e) => update(i, { founder_note: e.target.value })} />
          </div>
          <div className="mt-2 flex gap-2">
            <button className={btn} disabled={it.state === "uploading" || it.state === "done"} onClick={() => ingestOne(i, it)}>Ingest</button>
            <button className={btnGhost} onClick={() => setItems((p) => p.filter((_, idx) => idx !== i))}>Remove</button>
          </div>
        </div>
      ))}

      {items.length > 1 && <button className={btn} onClick={ingestAll}>Ingest all</button>}
    </div>
  );
}

function LibraryView() {
  const [docs, setDocs] = useState<DocRow[]>([]);
  const [openId, setOpenId] = useState<string | null>(null);
  const [vertical, setVertical] = useState("");

  const load = useCallback(async () => {
    const res = await fetch(`/api/admin/corpus${vertical ? `?vertical=${vertical}` : ""}`);
    if (res.ok) setDocs(await res.json() as DocRow[]);
  }, [vertical]);
  useEffect(() => { void load(); }, [load]);

  if (openId) return <DocDetail id={openId} onBack={() => { setOpenId(null); void load(); }} />;

  return (
    <div className="space-y-3">
      <select className={`${field} max-w-xs`} value={vertical} onChange={(e) => setVertical(e.target.value)}>
        <option value="">All verticals</option>
        {VERTICALS.map((k) => <option key={k} value={k}>{k}</option>)}
      </select>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="text-xs uppercase text-zinc-500">
            <tr><th className="py-2">Title</th><th>Vertical</th><th>Kind</th><th>Deal</th><th>Chunks</th><th>Retrieval</th><th>Status</th></tr>
          </thead>
          <tbody>
            {docs.map((d) => (
              <tr key={d.id} onClick={() => setOpenId(d.id)} className="cursor-pointer border-t border-white/10 hover:bg-white/5">
                <td className="py-2 pr-2">{d.title ?? "(untitled)"}</td>
                <td className="pr-2 text-zinc-400">{d.vertical}</td>
                <td className="pr-2 text-zinc-400">{d.doc_kind}</td>
                <td className="pr-2 text-zinc-400">{d.deal_type}</td>
                <td className="pr-2">{d.chunk_count}</td>
                <td className="pr-2">{d.sanitized ? <span className="text-emerald-400">sanitized</span> : <span className="text-amber-400">unsanitized</span>}</td>
                <td><StatusPill s={d.status} /></td>
              </tr>
            ))}
            {!docs.length && <tr><td colSpan={7} className="py-6 text-center text-zinc-500">No documents yet.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function DocDetail({ id, onBack }: { id: string; onBack: () => void }) {
  const [chunks, setChunks] = useState<Chunk[]>([]);
  const [title, setTitle] = useState<string>("");
  const [sanitized, setSanitized] = useState(false);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const res = await fetch(`/api/admin/corpus/${id}`);
    if (res.ok) {
      const body = await res.json() as { document: { title: string | null; sanitized: boolean }; chunks: Chunk[] };
      setTitle(body.document.title ?? "(untitled)");
      setSanitized(!!body.document.sanitized);
      setChunks(body.chunks);
    }
  }, [id]);
  useEffect(() => { void load(); }, [load]);

  async function markSanitized() {
    if (!confirm("Confirm all party names and identifying details have been removed from this document. It will then be eligible for retrieval.")) return;
    await fetch(`/api/admin/corpus/${id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ sanitized: true }),
    });
    setSanitized(true);
  }

  async function saveChunk(c: Chunk) {
    await fetch(`/api/admin/corpus/chunk/${c.id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ clause_type: c.clause_type || null, stance: c.stance, risk_note: c.risk_note }),
    });
    setChunks((p) => p.map((x) => (x.id === c.id ? { ...x, status: "ready" } : x)));
  }
  async function delChunk(cid: string) {
    await fetch(`/api/admin/corpus/chunk/${cid}`, { method: "DELETE" });
    setChunks((p) => p.filter((x) => x.id !== cid));
  }
  async function reprocess() {
    setBusy(true);
    await fetch(`/api/admin/corpus/${id}`, { method: "POST" });
    await load();
    setBusy(false);
  }
  async function delDoc() {
    if (!confirm("Delete this document and all its chunks?")) return;
    await fetch(`/api/admin/corpus/${id}`, { method: "DELETE" });
    onBack();
  }
  function edit(cid: string, patch: Partial<Chunk>) {
    setChunks((p) => p.map((x) => (x.id === cid ? { ...x, ...patch } : x)));
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <button className={btnGhost} onClick={onBack}>← Back</button>
        <div className="flex gap-2">
          {sanitized
            ? <span className="inline-flex items-center rounded-lg border border-emerald-500/30 px-3 py-2 text-sm text-emerald-400">Sanitized ✓ (retrievable)</span>
            : <button className={btnGhost} onClick={markSanitized}>Mark sanitized</button>}
          <button className={btnGhost} disabled={busy} onClick={reprocess}>{busy ? "Reprocessing…" : "Reprocess"}</button>
          <button className={btnGhost} onClick={delDoc}>Delete doc</button>
        </div>
      </div>
      <h2 className="text-lg font-medium">{title}</h2>
      {!sanitized && <p className="text-sm text-amber-400">Unsanitized — excluded from retrieval until party names/identifying details are confirmed removed.</p>}
      {chunks.map((c) => (
        <div key={c.id} className="rounded-xl border border-white/10 p-3">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-xs text-zinc-500">#{c.chunk_index} <StatusPill s={c.status} /></span>
            <button className="text-xs text-red-400 hover:underline" onClick={() => delChunk(c.id)}>delete</button>
          </div>
          <p className="mb-2 whitespace-pre-wrap text-sm text-zinc-300">{c.content.slice(0, 600)}{c.content.length > 600 ? "…" : ""}</p>
          <div className="grid grid-cols-2 gap-2">
            <select className={field} value={c.clause_type ?? ""} onChange={(e) => edit(c.id, { clause_type: e.target.value })}>
              {CLAUSE_TYPES.map((k) => <option key={k} value={k}>{k || "(clause?)"}</option>)}
            </select>
            <select className={field} value={c.stance} onChange={(e) => edit(c.id, { stance: e.target.value })}>
              {STANCES.map((k) => <option key={k} value={k}>{k}</option>)}
            </select>
            <input className={`${field} col-span-2`} placeholder="Risk note — what went wrong / why it matters" value={c.risk_note ?? ""} onChange={(e) => edit(c.id, { risk_note: e.target.value })} />
          </div>
          <button className={`${btn} mt-2`} onClick={() => saveChunk(c)}>Save</button>
        </div>
      ))}
      {!chunks.length && <p className="text-sm text-zinc-500">No chunks (document may still be processing or failed).</p>}
    </div>
  );
}

function NoteView() {
  const [text, setText] = useState("");
  const [dealType, setDealType] = useState("other");
  const [vertical, setVertical] = useState("creator");
  const [title, setTitle] = useState("");
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);

  async function save() {
    if (!text.trim()) return;
    setBusy(true); setMsg("");
    const res = await fetch("/api/admin/corpus", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ noteText: text, deal_type: dealType, vertical, title }),
    });
    setBusy(false);
    if (res.ok) { setText(""); setTitle(""); setMsg("Saved as founder-approved knowledge."); }
    else setMsg("Could not save.");
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-zinc-500">Drop a clause pattern or rule the system should always weigh heavily — e.g. &ldquo;perpetual usage grants keep losing in arbitration — always flag&rdquo;.</p>
      <textarea className={field} rows={5} placeholder="The knowledge to remember…" value={text} onChange={(e) => setText(e.target.value)} />
      <div className="grid grid-cols-2 gap-2">
        <input className={field} placeholder="Title (optional)" value={title} onChange={(e) => setTitle(e.target.value)} />
        <select className={field} value={dealType} onChange={(e) => setDealType(e.target.value)}>
          {DEAL_TYPES.map((k) => <option key={k} value={k}>{k}</option>)}
        </select>
        <select className={`${field} col-span-2`} value={vertical} onChange={(e) => setVertical(e.target.value)}>
          {VERTICALS.map((k) => <option key={k} value={k}>vertical: {k}</option>)}
        </select>
      </div>
      <button className={btn} disabled={busy || !text.trim()} onClick={save}>{busy ? "Saving…" : "Add note"}</button>
      {msg && <p className="text-sm text-zinc-400">{msg}</p>}
    </div>
  );
}

function StatusPill({ s }: { s: string }) {
  const color = s === "ready" ? "text-emerald-400" : s === "needs_review" ? "text-amber-400" : s === "failed" ? "text-red-400" : "text-zinc-400";
  return <span className={`text-xs ${color}`}>{s}</span>;
}
