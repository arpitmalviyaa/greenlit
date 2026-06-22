"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Check, ChevronRight, Clipboard, Download, FileCheck2, FileText,
  MessageSquare, RefreshCw, Search, Send, Upload, X,
} from "lucide-react";

type ContractStatus = "pending_review" | "reviewed" | "negotiated" | "approved" | "signed" | "expired";
type RiskyClause = { clause_text?: string; issue?: string; severity?: string; suggestion?: string };
type Contract = {
  id: string; title: string; status: ContractStatus; created_at: string;
  risk_score: number | null; raw_text: string | null; document_html: string | null; file_name: string | null;
  analysis_json: { risky_clauses?: RiskyClause[] } | null;
  deal_rooms: Array<{ counterparty_name: string | null }>;
};
type Comparison = {
  summary?: string; outcome?: string; unresolved?: string[]; silent_changes?: string[];
  changes?: Array<{ clause?: string; original?: string; revised?: string; outcome?: string; legal_effect?: string; commercial_effect?: string; authority?: string }>;
};
type ContractVersion = {
  id: string; contract_id: string; version_number: number; file_name: string;
  comparison_json: Comparison | null; created_at: string;
};
type KnowledgeEntry = { id: string; title: string; category: string; content: string; jurisdiction: string };
type ConversationMessage = {
  id: string; clause_index: number | null; direction: "incoming" | "draft" | "internal";
  source_text: string | null; generated_text: string | null; tone: string | null;
  channel: "email" | "whatsapp" | "internal"; created_at: string;
};
type View = "contracts" | "negotiation" | "final" | "knowledge";

const STATUS: Record<ContractStatus, string> = {
  pending_review: "Under review", reviewed: "Reviewed", negotiated: "Negotiating",
  approved: "Approved", signed: "Signed", expired: "Expired",
};
const FALLBACK_KNOWLEDGE: KnowledgeEntry[] = [
  { id: "fallback-1", title: "Payment terms", category: "Standard position", content: "Define payment dates, milestone acceptance, and late-payment consequences.", jurisdiction: "IN" },
  { id: "fallback-2", title: "Usage rights", category: "Red line", content: "Escalate perpetual, worldwide, sublicensable, or unrestricted usage rights.", jurisdiction: "IN" },
  { id: "fallback-3", title: "Termination", category: "Negotiation rule", content: "Keep notice and payment for completed work mutual and explicit.", jurisdiction: "IN" },
];

const panel = "rounded-xl border border-white/15 bg-black";
const field = "w-full rounded-lg border border-white/15 bg-black px-3 py-2.5 text-sm text-white outline-none placeholder:text-zinc-600 focus:border-white/50";
const primary = "inline-flex items-center justify-center rounded-lg bg-white px-4 py-2.5 text-sm font-medium text-black transition hover:bg-zinc-200 disabled:cursor-not-allowed disabled:opacity-40";
const secondary = "inline-flex items-center justify-center rounded-lg border border-white/20 px-3 py-2 text-sm text-white transition hover:bg-white hover:text-black disabled:opacity-40";

export function CreatorFourPillars({
  userName, userRole, initialContracts, initialVersions,
}: {
  userName: string; userRole: string; initialContracts: Contract[]; initialVersions: ContractVersion[];
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const view = (searchParams.get("view") as View | null) ?? "contracts";
  const [contracts, setContracts] = useState(initialContracts);
  const [versions, setVersions] = useState(initialVersions);
  const [selectedContractId, setSelectedContractId] = useState(initialContracts[0]?.id ?? "");
  const [selectedClause, setSelectedClause] = useState(0);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState("");
  const [copied, setCopied] = useState("");
  const [draft, setDraft] = useState("");
  const [drafting, setDrafting] = useState(false);
  const [tone, setTone] = useState("polite and commercially constructive");
  const [incoming, setIncoming] = useState("");
  const [channel, setChannel] = useState<"email" | "whatsapp">("email");
  const [thread, setThread] = useState<ConversationMessage[]>([]);
  const [revisionFile, setRevisionFile] = useState<File | null>(null);
  const [finalFile, setFinalFile] = useState<File | null>(null);
  const [finalLoading, setFinalLoading] = useState(false);
  const [knowledge, setKnowledge] = useState<KnowledgeEntry[]>(FALLBACK_KNOWLEDGE);
  const [documentQuery, setDocumentQuery] = useState("");

  useEffect(() => {
    fetch("/api/playbook/entries")
      .then((response) => response.ok ? response.json() as Promise<KnowledgeEntry[]> : [])
      .then((entries) => entries.length && setKnowledge(entries))
      .catch(() => {});
  }, []);

  useEffect(() => {
    setContracts(initialContracts);
    setVersions(initialVersions);
  }, [initialContracts, initialVersions]);

  const selectedContract = useMemo(
    () => contracts.find((contract) => contract.id === selectedContractId) ?? contracts[0],
    [contracts, selectedContractId],
  );
  const clauses = selectedContract?.analysis_json?.risky_clauses ?? [];
  const clause = clauses[selectedClause] ?? clauses[0];
  const contractVersions = versions.filter((item) => item.contract_id === selectedContract?.id);
  const latestComparison = contractVersions[0]?.comparison_json;
  const visibleText = useMemo(() => {
    const text = selectedContract?.raw_text ?? "";
    if (!documentQuery.trim()) return text;
    const query = documentQuery.toLowerCase();
    return text.split("\n").filter((line) => line.toLowerCase().includes(query)).join("\n");
  }, [selectedContract, documentQuery]);

  useEffect(() => {
    if (!selectedContract?.id) return setThread([]);
    fetch(`/api/counsel/draft?contract_id=${encodeURIComponent(selectedContract.id)}`)
      .then((response) => response.ok ? response.json() as Promise<ConversationMessage[]> : [])
      .then(setThread)
      .catch(() => setThread([]));
  }, [selectedContract?.id]);

  function navigate(next: View) {
    router.push(`/creator?view=${next}`);
  }

  async function uploadContract(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setUploading(true);
    setMessage("");
    try {
      const form = new FormData(event.currentTarget);
      const response = await fetch("/api/counsel/upload", { method: "POST", body: form });
      const body = await response.json() as { contract_id?: string; title?: string; extraction_success?: boolean; extraction_error?: string; error?: string };
      if (!response.ok || !body.contract_id) throw new Error(body.error ?? "Upload failed");
      if (!body.extraction_success) throw new Error(body.extraction_error ?? "Text extraction failed");
      const pending: Contract = {
        id: body.contract_id, title: body.title ?? "Untitled Contract", status: "pending_review",
        created_at: new Date().toISOString(), risk_score: null, raw_text: null, document_html: null, file_name: null,
        analysis_json: null, deal_rooms: [],
      };
      setContracts((current) => [pending, ...current]);
      setSelectedContractId(pending.id);
      const analysisResponse = await fetch("/api/counsel/analyse", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contract_id: pending.id, jurisdiction: "IN" }),
      });
      const analysisBody = await analysisResponse.json() as { analysis?: Contract["analysis_json"] & { risk_score?: number }; error?: string };
      if (!analysisResponse.ok || !analysisBody.analysis) throw new Error(analysisBody.error ?? "Review failed");
      setContracts((current) => current.map((item) => item.id === pending.id
        ? { ...item, status: "reviewed", analysis_json: analysisBody.analysis!, risk_score: analysisBody.analysis?.risk_score ?? null }
        : item));
      setUploadOpen(false);
      setMessage("Review complete.");
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Contract review failed");
    } finally {
      setUploading(false);
    }
  }

  async function downloadContract(contractId: string) {
    const response = await fetch(`/api/counsel/file?contract_id=${encodeURIComponent(contractId)}`);
    const body = await response.json() as { url?: string; error?: string };
    if (!response.ok || !body.url) return setMessage(body.error ?? "Download failed");
    window.open(body.url, "_blank", "noopener,noreferrer");
  }

  async function copy(text: string, key: string) {
    await navigator.clipboard.writeText(text);
    setCopied(key);
    window.setTimeout(() => setCopied(""), 1200);
  }

  async function createDraft(customTone = tone) {
    if (!selectedContract || (!clause && !incoming.trim())) return;
    setDrafting(true);
    setMessage("");
    const response = await fetch("/api/counsel/draft", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contract_id: selectedContract.id, clause_index: selectedClause,
        clause: clause?.clause_text, suggestion: clause?.suggestion,
        incoming: incoming.trim() || undefined, tone: customTone, channel,
      }),
    });
    const body = await response.json() as { draft?: string; error?: string };
    setDrafting(false);
    if (!response.ok || !body.draft) return setMessage(body.error ?? "Could not draft reply");
    setDraft(body.draft);
    if (incoming.trim()) setIncoming("");
    const threadResponse = await fetch(`/api/counsel/draft?contract_id=${encodeURIComponent(selectedContract.id)}`);
    if (threadResponse.ok) setThread(await threadResponse.json() as ConversationMessage[]);
  }

  async function uploadVersion(file: File | null, isFinal: boolean) {
    if (!selectedContract || !file) return;
    setFinalLoading(true);
    setMessage("");
    const form = new FormData();
    form.set("contract_id", selectedContract.id);
    form.set("file", file);
    const response = await fetch("/api/final-check/upload", { method: "POST", body: form });
    const body = await response.json() as { version?: number; comparison?: Comparison; error?: string };
    setFinalLoading(false);
    if (!response.ok || !body.version || !body.comparison) return setMessage(body.error ?? "Final comparison failed");
    setVersions((current) => [{
      id: `${selectedContract.id}-${body.version}`, contract_id: selectedContract.id,
      version_number: body.version!, file_name: file.name, comparison_json: body.comparison!,
      created_at: new Date().toISOString(),
    }, ...current]);
    if (isFinal) setFinalFile(null);
    else setRevisionFile(null);
    const threadResponse = await fetch(`/api/counsel/draft?contract_id=${encodeURIComponent(selectedContract.id)}`);
    if (threadResponse.ok) setThread(await threadResponse.json() as ConversationMessage[]);
    setMessage(isFinal
      ? userRole === "agency_admin"
        ? "Comparison complete. Start Final Contract Check explicitly when ready."
        : "Comparison complete. An agency admin must explicitly start Final Contract Check."
      : `Version ${body.version} uploaded and compared with the original.`);
  }

  return (
    <div className="min-h-screen bg-black p-5 text-white md:p-8">
      <header className="mb-8 flex flex-col gap-4 border-b border-white/10 pb-7 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.25em] text-zinc-500">Greenlit contract workspace</p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight">{userName}</h1>
          <p className="mt-2 text-sm text-zinc-500">Review. Negotiate. Compare. Clear.</p>
        </div>
        <button className={primary} onClick={() => setUploadOpen(true)}><Upload className="mr-2 h-4 w-4" />Upload contract</button>
      </header>

      {message && (
        <div className="mb-6 flex items-center justify-between rounded-lg border border-white/20 px-4 py-3 text-sm">
          <span>{message}</span><button onClick={() => setMessage("")}><X className="h-4 w-4" /></button>
        </div>
      )}

      {view === "contracts" && (
        <section className={panel}>
          <div className="flex items-center justify-between border-b border-white/10 p-5">
            <div><h2 className="text-xl font-medium">Contracts</h2><p className="mt-1 text-sm text-zinc-500">Every agreement uploaded by this account.</p></div>
            <span className="text-sm text-zinc-500">{contracts.length} total</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead className="border-b border-white/10 text-xs uppercase tracking-wider text-zinc-600">
                <tr><th className="p-4">Contract</th><th>Brand</th><th>Added</th><th>Risk</th><th>Status</th><th className="pr-4 text-right">File</th></tr>
              </thead>
              <tbody>
                {contracts.map((contract) => (
                  <tr key={contract.id} className="border-b border-white/10 transition hover:bg-white/[0.04]">
                    <td className="p-4 font-medium">{contract.title}</td>
                    <td className="text-zinc-500">{contract.deal_rooms[0]?.counterparty_name ?? "—"}</td>
                    <td className="text-zinc-500">{new Date(contract.created_at).toLocaleDateString()}</td>
                    <td>{contract.risk_score ?? "—"}</td>
                    <td><span className="rounded-full border border-white/20 px-2.5 py-1 text-xs">{STATUS[contract.status]}</span></td>
                    <td className="pr-4 text-right">
                      <button className={secondary} onClick={() => void downloadContract(contract.id)}><Download className="mr-2 h-4 w-4" />Download</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!contracts.length && <p className="p-10 text-center text-zinc-600">Upload your first contract to begin.</p>}
          </div>
        </section>
      )}

      {view === "negotiation" && (
        <section className="space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row">
            <select className={field} value={selectedContract?.id ?? ""} onChange={(event) => { setSelectedContractId(event.target.value); setSelectedClause(0); setDraft(""); }}>
              {contracts.map((contract) => <option key={contract.id} value={contract.id}>{contract.title}</option>)}
            </select>
            <div className="relative sm:w-80"><Search className="absolute left-3 top-3 h-4 w-4 text-zinc-600" /><input className={`${field} pl-9`} value={documentQuery} onChange={(event) => setDocumentQuery(event.target.value)} placeholder="Find in document" /></div>
          </div>

          <div className={`${panel} flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between`}>
            <div>
              <p className="font-medium">Received a revised contract?</p>
              <p className="mt-1 text-sm text-zinc-500">Upload it here. Greenlit saves it as the next version, compares it with the original, and adds the event to this negotiation thread.</p>
            </div>
            <div className="flex min-w-0 flex-col gap-2 sm:w-[360px]">
              <input className={field} type="file" accept=".pdf,.docx" onChange={(event) => setRevisionFile(event.target.files?.[0] ?? null)} />
              <button className={primary} disabled={!revisionFile || finalLoading} onClick={() => void uploadVersion(revisionFile, false)}>
                <Upload className="mr-2 h-4 w-4" />{finalLoading ? "Comparing version…" : "Upload revised version"}
              </button>
            </div>
          </div>

          <div className="grid min-h-[720px] gap-4 xl:grid-cols-[minmax(0,1.5fr)_minmax(360px,.8fr)]">
            <div className={`${panel} overflow-hidden`}>
              <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
                <div><p className="font-medium">{selectedContract?.title ?? "No contract selected"}</p><p className="text-xs text-zinc-600">{selectedContract?.file_name}</p></div>
                {selectedContract && <button className={secondary} onClick={() => void downloadContract(selectedContract.id)}><Download className="mr-2 h-4 w-4" />Download</button>}
              </div>
              <article className="h-[650px] overflow-y-auto bg-white px-8 py-10 font-serif text-[15px] leading-7 text-zinc-950 md:px-12">
                {!documentQuery.trim() && selectedContract?.document_html ? (
                  <div
                    className="[&_h1]:mb-6 [&_h1]:text-2xl [&_h2]:mb-4 [&_h2]:mt-8 [&_h2]:text-xl [&_h3]:mb-3 [&_h3]:mt-6 [&_li]:mb-2 [&_ol]:mb-5 [&_ol]:ml-6 [&_ol]:list-decimal [&_p]:mb-4 [&_table]:mb-5 [&_table]:w-full [&_td]:border [&_td]:border-zinc-300 [&_td]:p-2 [&_th]:border [&_th]:border-zinc-300 [&_th]:p-2 [&_ul]:mb-5 [&_ul]:ml-6 [&_ul]:list-disc"
                    dangerouslySetInnerHTML={{ __html: selectedContract.document_html }}
                  />
                ) : (
                  <div className="whitespace-pre-wrap">{visibleText || "Extracted document text is unavailable."}</div>
                )}
              </article>
            </div>

            <aside className={`${panel} flex min-h-0 flex-col`}>
              <div className="border-b border-white/10 p-5">
                <p className="text-xs uppercase tracking-widest text-zinc-600">Flagged clauses</p>
                <p className="mt-2 text-sm text-zinc-400">{clauses.length} issues found</p>
              </div>
              <div className="max-h-48 overflow-y-auto border-b border-white/10 p-2">
                {clauses.map((item, index) => (
                  <button key={`${item.issue}-${index}`} onClick={() => { setSelectedClause(index); setDraft(""); }}
                    className={`flex w-full items-center justify-between rounded-lg px-3 py-3 text-left text-sm ${selectedClause === index ? "bg-white text-black" : "text-zinc-400 hover:bg-white/10 hover:text-white"}`}>
                    <span className="line-clamp-2">Clause {index + 1}. {item.issue ?? "Review required"}</span><ChevronRight className="ml-2 h-4 w-4 shrink-0" />
                  </button>
                ))}
              </div>
              <div className="flex-1 space-y-5 overflow-y-auto p-5">
                {clause ? (
                  <>
                    <div><p className="text-xs uppercase tracking-widest text-zinc-600">Clause {selectedClause + 1} · {clause.severity ?? "Review"}</p><h3 className="mt-2 text-lg font-medium">{clause.issue}</h3></div>
                    <div><p className="mb-2 text-xs uppercase tracking-widest text-zinc-600">Current language</p><p className="text-sm leading-6 text-zinc-400">{clause.clause_text}</p></div>
                    <div className="border-l border-white pl-4"><p className="mb-2 text-xs uppercase tracking-widest text-zinc-600">Suggested clause</p><p className="text-sm leading-6">{clause.suggestion}</p></div>
                    <div className="space-y-2">
                      <label className="text-xs uppercase tracking-widest text-zinc-600">Draft communication</label>
                      <input className={field} value={tone} onChange={(event) => setTone(event.target.value)} placeholder="Make it more polite, softer, firmer…" />
                      <div className="flex flex-wrap gap-2">
                        {["more polite", "soft pitch", "short and warm", "firm but commercial"].map((preset) => (
                          <button key={preset} className={secondary} onClick={() => { setTone(preset); void createDraft(preset); }}>{preset}</button>
                        ))}
                      </div>
                      <button className={`${primary} w-full`} disabled={drafting} onClick={() => void createDraft()}>
                        <RefreshCw className={`mr-2 h-4 w-4 ${drafting ? "animate-spin" : ""}`} />{draft ? "Redraft text" : "Draft message"}
                      </button>
                    </div>
                    {draft && <div className="relative rounded-lg border border-white/20 p-4"><button className="absolute right-2 top-2 p-2" onClick={() => void copy(draft, "draft")}>{copied === "draft" ? <Check className="h-4 w-4" /> : <Clipboard className="h-4 w-4" />}</button><p className="whitespace-pre-wrap pr-8 text-sm leading-6 text-zinc-300">{draft}</p></div>}
                  </>
                ) : <p className="text-sm text-zinc-600">Select a reviewed contract with flagged clauses.</p>}
              </div>
            </aside>
          </div>

          <div className={`${panel} overflow-hidden`}>
            <div className="border-b border-white/10 p-5">
              <div className="flex items-center gap-2"><MessageSquare className="h-4 w-4" /><h3 className="font-medium">Negotiation thread</h3></div>
              <p className="mt-1 text-sm text-zinc-500">Keep emails and WhatsApp exchanges beside the contract. Greenlit never sends them automatically.</p>
            </div>
            <div className="max-h-[520px] space-y-4 overflow-y-auto p-5">
              {!thread.length && <p className="py-10 text-center text-sm text-zinc-600">No messages saved yet. Paste the latest reply below to begin the thread.</p>}
              {thread.map((item) => (
                <div key={item.id} className={`flex ${item.direction === "draft" ? "justify-end" : "justify-start"}`}>
                  <div className={`max-w-[85%] rounded-xl border p-4 ${item.direction === "draft" ? "border-white bg-white text-black" : item.direction === "internal" ? "border-dashed border-white/20 text-zinc-500" : "border-white/20 text-zinc-200"}`}>
                    <p className={`mb-2 text-[11px] uppercase tracking-widest ${item.direction === "draft" ? "text-zinc-500" : "text-zinc-600"}`}>
                      {item.direction === "draft" ? `Greenlit draft · ${item.channel}` : item.direction === "internal" ? "Version history" : `Brand / agency · ${item.channel}`}
                    </p>
                    <p className="whitespace-pre-wrap text-sm leading-6">{item.generated_text ?? item.source_text}</p>
                    <p className={`mt-3 text-[11px] ${item.direction === "draft" ? "text-zinc-500" : "text-zinc-700"}`}>{new Date(item.created_at).toLocaleString()}</p>
                  </div>
                </div>
              ))}
            </div>
            <div className="border-t border-white/10 p-5">
              <div className="mb-4 flex flex-col gap-3 sm:flex-row">
                <select className={`${field} sm:w-40`} value={channel} onChange={(event) => setChannel(event.target.value as "email" | "whatsapp")}>
                  <option value="email">Email</option>
                  <option value="whatsapp">WhatsApp</option>
                </select>
                <input className={field} value={tone} onChange={(event) => setTone(event.target.value)} placeholder="Tone: soft, concise, firm…" />
              </div>
              <textarea className={`${field} min-h-32 resize-y`} value={incoming} onChange={(event) => setIncoming(event.target.value)} placeholder="Paste the latest brand or agency message here…" />
              <button className={`${primary} mt-3 w-full sm:w-auto`} disabled={!incoming.trim() || drafting} onClick={() => void createDraft()}><Send className="mr-2 h-4 w-4" />Save message and draft reply</button>
            </div>
          </div>
        </section>
      )}

      {view === "final" && (
        <section className="grid gap-5 xl:grid-cols-[380px_1fr]">
          <div className={`${panel} p-5`}>
            <FileCheck2 className="h-6 w-6" />
            <h2 className="mt-4 text-xl font-medium">Final contract upload</h2>
            <p className="mt-2 text-sm leading-6 text-zinc-500">Compare a revised PDF or Word agreement against the original and every saved version.</p>
            <label className="mt-6 block text-xs uppercase tracking-widest text-zinc-600">Original contract</label>
            <select className={`${field} mt-2`} value={selectedContract?.id ?? ""} onChange={(event) => setSelectedContractId(event.target.value)}>
              {contracts.map((contract) => <option key={contract.id} value={contract.id}>{contract.title}</option>)}
            </select>
            <label className="mt-5 block text-xs uppercase tracking-widest text-zinc-600">Revised document</label>
            <input className={`${field} mt-2`} type="file" accept=".pdf,.docx" onChange={(event) => setFinalFile(event.target.files?.[0] ?? null)} />
            <button className={`${primary} mt-4 w-full`} disabled={!selectedContract || !finalFile || finalLoading} onClick={() => void uploadVersion(finalFile, true)}>
              {finalLoading ? "Comparing every clause…" : "Upload and compare"}
            </button>
            <p className="mt-4 text-xs leading-5 text-zinc-600">Approved means Greenlit cleared it. Signed remains a separate real-signature state. Negotiated requires explicit action.</p>
          </div>
          <div className={panel}>
            <div className="border-b border-white/10 p-5"><p className="text-xs uppercase tracking-widest text-zinc-600">Where we were. Where we are.</p><h2 className="mt-2 text-xl font-medium">{latestComparison?.summary ?? "Upload a revised agreement to generate the comparison."}</h2></div>
            {latestComparison && (
              <div className="space-y-5 p-5">
                <div className="grid gap-3 sm:grid-cols-3">
                  <Metric label="Outcome" value={latestComparison.outcome ?? "—"} />
                  <Metric label="Changed clauses" value={String(latestComparison.changes?.length ?? 0)} />
                  <Metric label="Unresolved" value={String(latestComparison.unresolved?.length ?? 0)} />
                </div>
                {latestComparison.changes?.map((change, index) => (
                  <details key={`${change.clause}-${index}`} className="rounded-lg border border-white/15 p-4">
                    <summary className="cursor-pointer list-none font-medium">Clause {index + 1}. {change.clause} <span className="ml-2 text-xs uppercase text-zinc-500">{change.outcome}</span></summary>
                    <div className="mt-5 grid gap-4 md:grid-cols-2"><TextBlock label="Original" text={change.original} /><TextBlock label="Revised" text={change.revised} /></div>
                    <div className="mt-4 space-y-3 border-t border-white/10 pt-4"><TextBlock label="Legal effect" text={change.legal_effect} /><TextBlock label="Commercial effect" text={change.commercial_effect} />{change.authority && <TextBlock label="Authority" text={change.authority} />}</div>
                  </details>
                ))}
              </div>
            )}
          </div>
        </section>
      )}

      {view === "knowledge" && (
        <section className={panel}>
          <div className="border-b border-white/10 p-5"><h2 className="text-xl font-medium">Knowledge repository</h2><p className="mt-1 text-sm text-zinc-500">Indian statutes, judgments, playbook positions, and approved language used during review.</p></div>
          <div className="grid gap-px bg-white/10 md:grid-cols-2 xl:grid-cols-3">
            {knowledge.map((entry) => <article key={entry.id} className="bg-black p-5"><p className="text-xs uppercase tracking-widest text-zinc-600">{entry.category}</p><h3 className="mt-3 font-medium">{entry.title}</h3><p className="mt-3 text-sm leading-6 text-zinc-500">{entry.content}</p><p className="mt-5 text-xs text-zinc-700">{entry.jurisdiction}</p></article>)}
          </div>
        </section>
      )}

      {uploadOpen && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/85 p-4">
          <div className="w-full max-w-lg rounded-xl border border-white/20 bg-black p-6">
            <div className="flex items-start justify-between"><div><h2 className="text-xl font-medium">Upload contract</h2><p className="mt-1 text-sm text-zinc-500">PDF or Word, up to 10 MB.</p></div><button onClick={() => setUploadOpen(false)}><X className="h-5 w-5" /></button></div>
            <form className="mt-6 space-y-4" onSubmit={uploadContract}>
              <input className={field} name="title" placeholder="Contract title" />
              <input className={field} name="file" type="file" required accept=".pdf,.docx" />
              <button className={`${primary} w-full`} disabled={uploading}><FileText className="mr-2 h-4 w-4" />{uploading ? "Reviewing contract…" : "Upload and review"}</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return <div className="rounded-lg border border-white/15 p-4"><p className="text-xs uppercase tracking-widest text-zinc-600">{label}</p><p className="mt-2 text-xl capitalize">{value}</p></div>;
}

function TextBlock({ label, text }: { label: string; text?: string }) {
  return <div><p className="text-xs uppercase tracking-widest text-zinc-600">{label}</p><p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-zinc-400">{text || "Not stated."}</p></div>;
}
