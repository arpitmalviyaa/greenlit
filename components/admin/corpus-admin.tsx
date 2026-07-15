"use client";

// Founder tool — utilitarian, not a product surface. Upload documents, feed
// quick notes, and curate chunks that sharpen every analysis.
import { useCallback, useEffect, useRef, useState } from "react";
import { BackButton } from "@/components/ui/back-button";

const DOC_KINDS = ["contract", "dispute", "judgment", "negotiation", "clause_note", "founder_annotation"];
const AUTHORITY_KINDS = ["act", "statute", "rule", "regulation", "notification", "circular", "case_law", "guideline"];
const ALL_KINDS = [...DOC_KINDS, ...AUTHORITY_KINDS];
const DEAL_TYPES = ["paid_promotion", "barter", "ugc_license", "ambassadorship", "representation", "platform", "other"];
const VERTICALS = ["creator", "startup", "litigation", "general"];
const CLAUSE_TYPES = ["", "usage_rights", "exclusivity", "payment_terms", "indemnity", "termination", "morality", "ip_assignment", "confidentiality", "deliverables", "other"];
const STANCES = ["market_standard", "creator_favorable", "brand_aggressive", "dispute_source", "founder_approved"];

const field = "w-full rounded-lg border border-white/15 bg-black px-3 py-2 text-sm text-white outline-none placeholder:text-zinc-600 focus:border-white/50";
const btn = "inline-flex items-center justify-center rounded-lg bg-white px-3 py-2 text-sm font-medium text-black hover:bg-zinc-200 disabled:opacity-40";
const btnGhost = "inline-flex items-center justify-center rounded-lg border border-white/15 px-3 py-2 text-sm text-white hover:bg-white/5 disabled:opacity-40";

type DocRow = { id: string; doc_kind: string; deal_type: string; vertical: string; sanitized: boolean; title: string | null; status: string; chunk_count: number; created_at: string };
type Chunk = { id: string; chunk_index: number; content: string; clause_type: string | null; risk_note: string | null; stance: string; status: string };
type Staged = { file: File; doc_kind: string; deal_type: string; vertical: string; title: string; founder_note: string; source_note: string; citation: string; jurisdiction: string; issuing_body: string; effective_date: string; source_url: string; state: "idle" | "uploading" | "done" | "error"; msg?: string };

export function CorpusAdmin() {
  const [tab, setTab] = useState<"upload" | "link" | "library" | "graph" | "note">("upload");
  // Doc list is loaded once here and shared with Library + Graph so switching
  // tabs is instant (no re-fetch) and the header can show live counts.
  const [docs, setDocs] = useState<DocRow[] | null>(null);
  const reload = useCallback(async () => {
    const res = await fetch("/api/admin/corpus");
    if (res.ok) setDocs(await res.json() as DocRow[]);
  }, []);
  useEffect(() => { void reload(); }, [reload]);

  const total = docs?.length ?? 0;
  const unsanitized = docs?.filter((d) => !d.sanitized).length ?? 0;
  const label = {
    upload: "Upload", link: "Link",
    library: total ? `Library (${total})` : "Library",
    graph: "Graph", note: "Quick note",
  } as const;

  return (
    <div className="min-h-screen bg-[#0a0a0b] text-white">
      <div className={`mx-auto px-4 py-8 ${tab === "graph" ? "max-w-6xl" : "max-w-4xl"}`}>
        <header className="mb-6">
          <BackButton fallback="/master" className="mb-4" />
          <h1 className="text-2xl font-semibold">Corpus</h1>
          <p className="mt-1 text-sm text-zinc-400">House knowledge — statutes, contracts, judgments, blog links, reviewer notes. Only you see this.</p>
          {docs && (
            <p className="mt-2 text-xs text-zinc-500">
              {total} document{total === 1 ? "" : "s"} loaded
              {unsanitized > 0 && <> · <span className="text-amber-400">{unsanitized} awaiting review</span></>}
            </p>
          )}
        </header>
        <nav className="mb-6 flex flex-wrap gap-2">
          {(["upload", "link", "library", "graph", "note"] as const).map((t) => (
            <button key={t} onClick={() => setTab(t)}
              className={`rounded-lg px-3 py-1.5 text-sm transition-colors ${tab === t ? "bg-white text-black" : "border border-white/15 text-zinc-300 hover:border-white/30 hover:text-white"}`}>
              {label[t]}
            </button>
          ))}
        </nav>
        {tab === "upload" && <UploadView onSaved={reload} />}
        {tab === "link" && <LinkView onSaved={reload} />}
        {tab === "library" && <LibraryView docs={docs} reload={reload} />}
        {tab === "graph" && <GraphView docs={docs ?? []} />}
        {tab === "note" && <NoteView onSaved={reload} />}
      </div>
    </div>
  );
}

// ── Graph view ────────────────────────────────────────────────────────────────
// Obsidian-style force-directed map of the corpus: a central hub → one node per
// category (grouped from doc_kind) → one node per document. Dependency-free: a
// tiny spring/repulsion sim settles the layout, rendered as SVG.
// ponytail: O(n²) repulsion + hand-rolled sim, fine for a few hundred docs.
// If the corpus ever runs to thousands, swap in d3-force or a quadtree; not now.

const BUCKETS: { key: string; label: string; color: string; kinds: string[] }[] = [
  { key: "statutes", label: "Statutes", color: "#60a5fa", kinds: ["act", "statute"] },
  { key: "notifications", label: "Notifications & Rules", color: "#a78bfa", kinds: ["rule", "regulation", "notification", "circular", "guideline"] },
  { key: "judgements", label: "Judgements", color: "#f472b6", kinds: ["case_law", "judgment", "dispute"] },
  { key: "contracts", label: "Contracts & Notes", color: "#34d399", kinds: ["contract", "negotiation", "clause_note", "founder_annotation"] },
];
function bucketOf(kind: string) {
  return BUCKETS.find((b) => b.kinds.includes(kind)) ?? BUCKETS[3];
}

type GNode = {
  id: string; label: string; type: "hub" | "cat" | "doc"; color: string; r: number;
  x: number; y: number; vx: number; vy: number; fixed?: boolean; meta?: DocRow;
};

/* eslint-disable react-hooks/refs -- ponytail: this small force simulation intentionally mutates ref state; tick only schedules SVG snapshots. */
function GraphView({ docs }: { docs: DocRow[] }) {
  const [hover, setHover] = useState<GNode | null>(null);
  const [tick, setTick] = useState(0); // re-render as the sim settles
  const nodesRef = useRef<GNode[]>([]);
  const linksRef = useRef<[number, number, number][]>([]); // [a, b, restLength]

  const W = 1000, H = 640, CX = W / 2, CY = H / 2;

  // Build nodes + links whenever the doc list changes.
  useEffect(() => {
    if (!docs.length) { nodesRef.current = []; linksRef.current = []; return; }
    const nodes: GNode[] = [{ id: "hub", label: "Corpus", type: "hub", color: "#ffffff", r: 26, x: CX, y: CY, vx: 0, vy: 0, fixed: true }];
    const links: [number, number, number][] = [];
    const catIndex = new Map<string, number>();
    const used = BUCKETS.filter((b) => docs.some((d) => bucketOf(d.doc_kind).key === b.key));
    used.forEach((b, i) => {
      const a = (i / used.length) * Math.PI * 2;
      nodes.push({ id: `cat-${b.key}`, label: b.label, type: "cat", color: b.color, r: 16, x: CX + Math.cos(a) * 170, y: CY + Math.sin(a) * 170, vx: 0, vy: 0 });
      catIndex.set(b.key, nodes.length - 1);
      links.push([0, nodes.length - 1, 170]);
    });
    docs.forEach((d, i) => {
      const b = bucketOf(d.doc_kind);
      const ci = catIndex.get(b.key)!;
      const a = (i / docs.length) * Math.PI * 2;
      nodes.push({
        id: d.id, label: d.title ?? "(untitled)", type: "doc", color: b.color,
        r: 5 + Math.min(d.chunk_count ?? 0, 60) / 8,
        x: nodes[ci].x + Math.cos(a) * 90, y: nodes[ci].y + Math.sin(a) * 90, vx: 0, vy: 0, meta: d,
      });
      links.push([ci, nodes.length - 1, 90]);
    });
    nodesRef.current = nodes;
    linksRef.current = links;
    // Settle the layout: repulsion + link springs + gentle centering, alpha-decayed.
    let alpha = 1, frames = 0;
    let raf = 0;
    const step = () => {
      const ns = nodesRef.current, ls = linksRef.current;
      for (let i = 0; i < ns.length; i++) for (let j = i + 1; j < ns.length; j++) {
        let dx = ns[i].x - ns[j].x, dy = ns[i].y - ns[j].y;
        let d2 = dx * dx + dy * dy || 0.01; const d = Math.sqrt(d2);
        const f = Math.min(4000 / d2, 40); dx = (dx / d) * f; dy = (dy / d) * f;
        ns[i].vx += dx; ns[i].vy += dy; ns[j].vx -= dx; ns[j].vy -= dy;
      }
      for (const [a, b, rest] of ls) {
        let dx = ns[b].x - ns[a].x, dy = ns[b].y - ns[a].y;
        const d = Math.sqrt(dx * dx + dy * dy) || 0.01; const f = (d - rest) * 0.06;
        dx = (dx / d) * f; dy = (dy / d) * f;
        ns[a].vx += dx; ns[a].vy += dy; ns[b].vx -= dx; ns[b].vy -= dy;
      }
      for (const n of ns) {
        if (n.fixed) { n.vx = n.vy = 0; continue; }
        n.vx += (CX - n.x) * 0.002; n.vy += (CY - n.y) * 0.002;
        n.x += n.vx * alpha; n.y += n.vy * alpha;
        n.vx *= 0.85; n.vy *= 0.85;
        n.x = Math.max(n.r, Math.min(W - n.r, n.x)); n.y = Math.max(n.r, Math.min(H - n.r, n.y));
      }
      alpha *= 0.985; frames++;
      setTick((t) => t + 1);
      if (frames < 320 && alpha > 0.02) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [docs, CX, CY]);

  const nodes = nodesRef.current, links = linksRef.current;
  void tick; // dependency for re-render during settle

  if (!docs.length) return <p className="text-sm text-zinc-500">No documents yet — upload some to see the map.</p>;

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center gap-4 text-xs text-zinc-400">
        {BUCKETS.map((b) => (
          <span key={b.key} className="inline-flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full" style={{ background: b.color }} />{b.label}
          </span>
        ))}
        <span className="text-zinc-600">· node size = chunk count · amber ring = unsanitized</span>
      </div>
      <div className="relative overflow-hidden rounded-xl border border-white/10 bg-[#0a0a0b]">
        <svg viewBox={`0 0 ${W} ${H}`} className="h-[640px] w-full">
          {links.map(([a, b], i) => nodes[a] && nodes[b] && (
            <line key={i} x1={nodes[a].x} y1={nodes[a].y} x2={nodes[b].x} y2={nodes[b].y} stroke="#ffffff" strokeOpacity={0.08} />
          ))}
          {nodes.map((n) => {
            const unsanitized = n.type === "doc" && n.meta && !n.meta.sanitized;
            return (
              <g key={n.id} onMouseEnter={() => setHover(n)} onMouseLeave={() => setHover(null)} className="cursor-default">
                <circle cx={n.x} cy={n.y} r={n.r} fill={n.color} fillOpacity={n.type === "doc" ? 0.9 : 1}
                  stroke={unsanitized ? "#f59e0b" : "#000"} strokeWidth={unsanitized ? 2 : 1} />
                {n.type !== "doc" && (
                  <text x={n.x} y={n.y - n.r - 5} textAnchor="middle" fontSize={n.type === "hub" ? 14 : 11} fill="#e5e7eb">{n.label}</text>
                )}
              </g>
            );
          })}
        </svg>
        {hover && hover.type === "doc" && hover.meta && (
          <div className="pointer-events-none absolute left-3 top-3 max-w-xs rounded-lg border border-white/15 bg-black/90 px-3 py-2 text-xs">
            <p className="font-medium text-white">{hover.label}</p>
            <p className="mt-0.5 text-zinc-400">{hover.meta.doc_kind} · {hover.meta.vertical} · {hover.meta.chunk_count} chunks</p>
            <p className={hover.meta.sanitized ? "text-emerald-400" : "text-amber-400"}>{hover.meta.sanitized ? "sanitized" : "unsanitized"}</p>
          </div>
        )}
      </div>
    </div>
  );
}
/* eslint-enable react-hooks/refs */

function UploadView({ onSaved }: { onSaved: () => void }) {
  const [items, setItems] = useState<Staged[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);

  const add = useCallback((files: FileList | null) => {
    if (!files) return;
    setItems((prev) => [
      ...prev,
      ...Array.from(files).map((file) => ({
        file, doc_kind: "contract", deal_type: "other", vertical: "creator",
        title: file.name, founder_note: "", source_note: "",
        citation: "", jurisdiction: "IN", issuing_body: "", effective_date: "", source_url: "",
        state: "idle" as const,
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
    if (AUTHORITY_KINDS.includes(it.doc_kind)) {
      fd.set("citation", it.citation);
      fd.set("jurisdiction", it.jurisdiction);
      fd.set("issuing_body", it.issuing_body);
      fd.set("effective_date", it.effective_date);
      fd.set("source_url", it.source_url);
    }
    try {
      const res = await fetch("/api/admin/corpus", { method: "POST", body: fd });
      const body = await res.json() as { status?: string; chunk_count?: number; error?: string };
      if (!res.ok) update(i, { state: "error", msg: body.error ?? "failed" });
      else { update(i, { state: "done", msg: `${body.status} · ${body.chunk_count} chunks` }); onSaved(); }
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
              <optgroup label="House knowledge">
                {DOC_KINDS.map((k) => <option key={k} value={k}>{k}</option>)}
              </optgroup>
              <optgroup label="Legal authority">
                {AUTHORITY_KINDS.map((k) => <option key={k} value={k}>{k}</option>)}
              </optgroup>
            </select>
            <select className={field} value={it.deal_type} onChange={(e) => update(i, { deal_type: e.target.value })}>
              {DEAL_TYPES.map((k) => <option key={k} value={k}>{k}</option>)}
            </select>
            <select className={`${field} col-span-2`} value={it.vertical} onChange={(e) => update(i, { vertical: e.target.value })}>
              {VERTICALS.map((k) => <option key={k} value={k}>vertical: {k}</option>)}
            </select>
            <input className={`${field} col-span-2`} placeholder="Title" value={it.title} onChange={(e) => update(i, { title: e.target.value })} />
            <textarea className={`${field} col-span-2`} rows={2} placeholder="What should the system learn from this?" value={it.founder_note} onChange={(e) => update(i, { founder_note: e.target.value })} />
            {AUTHORITY_KINDS.includes(it.doc_kind) && (
              <>
                <input className={`${field} col-span-2`} placeholder='Citation — e.g. "Consumer Protection Act, 2019"' value={it.citation} onChange={(e) => update(i, { citation: e.target.value })} />
                <input className={field} placeholder="Jurisdiction" value={it.jurisdiction} onChange={(e) => update(i, { jurisdiction: e.target.value })} />
                <input className={field} type="date" title="Effective date" value={it.effective_date} onChange={(e) => update(i, { effective_date: e.target.value })} />
                <input className={field} placeholder="Issuing body — e.g. MeitY, SEBI" value={it.issuing_body} onChange={(e) => update(i, { issuing_body: e.target.value })} />
                <input className={field} placeholder="Official source URL" value={it.source_url} onChange={(e) => update(i, { source_url: e.target.value })} />
              </>
            )}
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

function LibraryView({ docs, reload }: { docs: DocRow[] | null; reload: () => Promise<void> }) {
  const [openId, setOpenId] = useState<string | null>(null);
  const [vertical, setVertical] = useState("");

  if (openId) return <DocDetail id={openId} onBack={() => { setOpenId(null); void reload(); }} />;

  if (docs === null) {
    return (
      <div className="space-y-2">
        {[0, 1, 2, 3, 4].map((i) => <div key={i} className="h-11 animate-pulse rounded-lg bg-white/5" />)}
      </div>
    );
  }

  const shown = vertical ? docs.filter((d) => d.vertical === vertical) : docs;

  return (
    <div className="space-y-4">
      {/* Plain-language explainer so "sanitized" isn't a mystery. */}
      <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4 text-sm text-zinc-400">
        <p><span className="font-medium text-white">What is “sanitized”?</span> A document only feeds the AI legal check once you confirm it carries no private party names or personal details.</p>
        <p className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1">
          <span className="inline-flex items-center gap-1.5"><Dot c="#34d399" /><span className="text-emerald-400">Sanitized</span> — reviewed, safe to use</span>
          <span className="inline-flex items-center gap-1.5"><Dot c="#f59e0b" /><span className="text-amber-400">Awaiting review</span> — held back until you confirm</span>
        </p>
      </div>

      <select className={`${field} max-w-xs`} value={vertical} onChange={(e) => setVertical(e.target.value)}>
        <option value="">All verticals</option>
        {VERTICALS.map((k) => <option key={k} value={k}>{k}</option>)}
      </select>

      <div className="overflow-x-auto rounded-xl border border-white/10">
        <table className="w-full text-left text-sm">
          <thead className="bg-white/[0.03] text-xs uppercase tracking-wide text-zinc-500">
            <tr><th className="px-3 py-2.5">Title</th><th>Vertical</th><th>Kind</th><th>Chunks</th><th>Review</th><th className="pr-3">Status</th></tr>
          </thead>
          <tbody>
            {shown.map((d) => (
              <tr key={d.id} onClick={() => setOpenId(d.id)} className="cursor-pointer border-t border-white/[0.06] hover:bg-white/5">
                <td className="px-3 py-2.5 font-medium text-zinc-100">{d.title ?? "(untitled)"}</td>
                <td className="pr-2 text-zinc-400">{d.vertical}</td>
                <td className="pr-2 text-zinc-400">{d.doc_kind}</td>
                <td className="pr-2 tabular-nums text-zinc-400">{d.chunk_count}</td>
                <td className="pr-2"><SanitizeBadge sanitized={d.sanitized} /></td>
                <td className="pr-3"><StatusPill s={d.status} /></td>
              </tr>
            ))}
            {!shown.length && <tr><td colSpan={6} className="py-8 text-center text-zinc-500">{docs.length ? "None in this vertical." : "No documents yet — add some from the Upload tab."}</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function DocDetail({ id, onBack }: { id: string; onBack: () => void }) {
  const [chunks, setChunks] = useState<Chunk[]>([]);
  const [chunkTotal, setChunkTotal] = useState(0);
  const [title, setTitle] = useState<string>("");
  const [sanitized, setSanitized] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`/api/admin/corpus/${id}`);
    if (res.ok) {
      const body = await res.json() as { document: { title: string | null; sanitized: boolean }; chunks: Chunk[]; chunk_total?: number };
      setTitle(body.document.title ?? "(untitled)");
      setSanitized(!!body.document.sanitized);
      setChunks(body.chunks);
      setChunkTotal(body.chunk_total ?? body.chunks.length);
    }
    setLoading(false);
  }, [id]);
  useEffect(() => { void load(); }, [load]);

  async function markSanitized() {
    if (!confirm("Confirm this document carries no private party names or personal details. It will then be eligible to feed the AI legal check.")) return;
    setSaving(true);
    await fetch(`/api/admin/corpus/${id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ sanitized: true }),
    });
    setSanitized(true);
    setSaving(false);
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

  if (loading) {
    return (
      <div className="space-y-3">
        <button className={btnGhost} onClick={onBack}>← Back</button>
        <div className="h-6 w-64 max-w-full animate-pulse rounded bg-white/10" />
        {[0, 1, 2].map((i) => <div key={i} className="h-24 animate-pulse rounded-xl bg-white/5" />)}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <button className={btnGhost} onClick={onBack}>← Back</button>
        <div className="flex gap-2">
          {sanitized
            ? <span className="inline-flex items-center rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-300">Sanitized ✓</span>
            : <button className={btnGhost} disabled={saving} onClick={markSanitized}>{saving ? "Saving…" : "Mark sanitized"}</button>}
          <button className={btnGhost} disabled={busy} onClick={reprocess}>{busy ? "Reprocessing…" : "Reprocess"}</button>
          <button className={btnGhost} onClick={delDoc}>Delete doc</button>
        </div>
      </div>
      <h2 className="text-lg font-medium">{title}</h2>
      {!sanitized && <p className="text-sm text-amber-400">Awaiting review — held out of the AI legal check until you confirm it carries no private party names or personal details.</p>}
      <p className="text-xs text-zinc-500">{chunkTotal} chunk{chunkTotal === 1 ? "" : "s"}{chunkTotal > chunks.length ? ` · showing first ${chunks.length}` : ""}</p>
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

function LinkView({ onSaved }: { onSaved: () => void }) {
  const [url, setUrl] = useState("");
  const [title, setTitle] = useState("");
  const [docKind, setDocKind] = useState("clause_note");
  const [vertical, setVertical] = useState("creator");
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);

  async function save() {
    if (!url.trim()) return;
    setBusy(true); setMsg("");
    try {
      const res = await fetch("/api/admin/corpus", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: url.trim(), title, doc_kind: docKind, vertical }),
      });
      const body = await res.json() as { status?: string; chunk_count?: number; error?: string };
      if (res.ok) { setUrl(""); setTitle(""); setMsg(`Ingested — ${body.status} · ${body.chunk_count} chunks. Sanitize it in Library to make it retrievable.`); onSaved(); }
      else setMsg(body.error ?? "Could not ingest.");
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Could not ingest.");
    }
    setBusy(false);
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-zinc-500">Paste a blog / article URL. The page is fetched, stripped to text, chunked and classified like any upload. It stays unsanitized (out of retrieval) until you review it in Library.</p>
      <input className={field} placeholder="https://example.com/post" value={url} onChange={(e) => setUrl(e.target.value)} />
      <input className={field} placeholder="Title (optional — defaults to the page title)" value={title} onChange={(e) => setTitle(e.target.value)} />
      <div className="grid grid-cols-2 gap-2">
        <select className={field} value={docKind} onChange={(e) => setDocKind(e.target.value)}>
          {ALL_KINDS.map((k) => <option key={k} value={k}>{k}</option>)}
        </select>
        <select className={field} value={vertical} onChange={(e) => setVertical(e.target.value)}>
          {VERTICALS.map((k) => <option key={k} value={k}>vertical: {k}</option>)}
        </select>
      </div>
      <button className={btn} disabled={busy || !url.trim()} onClick={save}>{busy ? "Fetching…" : "Ingest link"}</button>
      {msg && <p className="text-sm text-zinc-400">{msg}</p>}
    </div>
  );
}

function NoteView({ onSaved }: { onSaved: () => void }) {
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
    if (res.ok) { setText(""); setTitle(""); setMsg("Saved as founder-approved knowledge."); onSaved(); }
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

function Dot({ c }: { c: string }) {
  return <span className="inline-block h-2 w-2 rounded-full" style={{ background: c }} />;
}

function SanitizeBadge({ sanitized }: { sanitized: boolean }) {
  return sanitized
    ? <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-xs text-emerald-300">Sanitized</span>
    : <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-xs text-amber-300">Awaiting review</span>;
}

function StatusPill({ s }: { s: string }) {
  const map: Record<string, string> = {
    ready: "border-emerald-500/30 bg-emerald-500/10 text-emerald-300",
    needs_review: "border-amber-500/30 bg-amber-500/10 text-amber-300",
    processing: "border-sky-500/30 bg-sky-500/10 text-sky-300",
    failed: "border-red-500/30 bg-red-500/10 text-red-300",
  };
  const label = s === "needs_review" ? "needs review" : s;
  return <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs ${map[s] ?? "border-white/15 bg-white/5 text-zinc-300"}`}>{label}</span>;
}
