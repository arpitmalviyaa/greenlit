"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { BookOpen, Check, Clipboard, FileCheck2, FileText, MessageSquare, Upload, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type ContractStatus = "pending_review" | "reviewed" | "negotiated" | "approved" | "signed" | "expired";

type RiskyClause = {
  clause_text?: string;
  issue?: string;
  severity?: string;
  suggestion?: string;
};

type Contract = {
  id: string;
  title: string;
  status: ContractStatus;
  created_at: string;
  analysis_json: { risky_clauses?: RiskyClause[] } | null;
  deal_rooms: Array<{ counterparty_name: string | null }>;
};

type KnowledgeEntry = {
  id: string;
  title: string;
  category: string;
  content: string;
  jurisdiction: string;
};

const STATUS: Record<ContractStatus, { label: string; className: string }> = {
  pending_review: { label: "Under review", className: "bg-amber-500/15 text-amber-300 border-amber-500/30" },
  reviewed: { label: "Reviewed", className: "bg-blue-500/15 text-blue-300 border-blue-500/30" },
  negotiated: { label: "Negotiating", className: "bg-purple-500/15 text-purple-300 border-purple-500/30" },
  approved: { label: "Approved", className: "bg-green-500/15 text-green-300 border-green-500/30" },
  signed: { label: "Signed", className: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30" },
  expired: { label: "Expired", className: "bg-slate-500/15 text-slate-400 border-slate-500/30" },
};

const FALLBACK_KNOWLEDGE: KnowledgeEntry[] = [
  { id: "fallback-1", title: "Payment terms", category: "standard_position", content: "Use clear payment dates, late-payment consequences, and milestone acceptance rules.", jurisdiction: "IN" },
  { id: "fallback-2", title: "Usage rights", category: "red_line", content: "Escalate perpetual, worldwide, or sublicensable usage rights before agreeing.", jurisdiction: "IN" },
  { id: "fallback-3", title: "Termination", category: "negotiation_rule", content: "Keep notice periods and payment for completed work mutual and explicit.", jurisdiction: "IN" },
];

export function CreatorFourPillars({
  userName,
  userRole,
  initialContracts,
}: {
  userName: string;
  userRole: string;
  initialContracts: Contract[];
}) {
  const router = useRouter();
  const [contracts, setContracts] = useState(initialContracts);
  const [selectedContractId, setSelectedContractId] = useState(initialContracts[0]?.id ?? "");
  const [uploadOpen, setUploadOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [finalFile, setFinalFile] = useState<File | null>(null);
  const [finalMessage, setFinalMessage] = useState("");
  const [finalLoading, setFinalLoading] = useState(false);
  const [copied, setCopied] = useState("");
  const [knowledge, setKnowledge] = useState<KnowledgeEntry[]>(FALLBACK_KNOWLEDGE);
  const [knowledgeLive, setKnowledgeLive] = useState(false);

  useEffect(() => {
    fetch("/api/playbook/entries")
      .then((response) => response.ok ? response.json() as Promise<KnowledgeEntry[]> : [])
      .then((entries) => {
        if (entries.length) {
          setKnowledge(entries.slice(0, 3));
          setKnowledgeLive(true);
        }
      })
      .catch(() => {});
  }, []);

  const selectedContract = useMemo(
    () => contracts.find((contract) => contract.id === selectedContractId) ?? contracts[0],
    [contracts, selectedContractId]
  );
  const clauses = selectedContract?.analysis_json?.risky_clauses ?? [];

  async function uploadContract(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setUploading(true);
    setUploadError("");
    const form = new FormData(event.currentTarget);
    const response = await fetch("/api/counsel/upload", { method: "POST", body: form });
    const body = await response.json() as { contract_id?: string; title?: string; error?: string };
    if (!response.ok || !body.contract_id) {
      setUploadError(body.error ?? "Upload failed");
      setUploading(false);
      return;
    }

    const contract: Contract = {
      id: body.contract_id,
      title: body.title ?? "Untitled Contract",
      status: "pending_review",
      created_at: new Date().toISOString(),
      analysis_json: null,
      deal_rooms: [],
    };
    setContracts((current) => [contract, ...current]);
    setSelectedContractId(contract.id);
    setUploadOpen(false);
    setUploading(false);
    router.refresh();
  }

  async function copySuggestion(text: string, key: string) {
    await navigator.clipboard.writeText(text);
    setCopied(key);
    window.setTimeout(() => setCopied(""), 1500);
  }

  async function submitFinalCheck() {
    if (!selectedContract || !finalFile) return;
    setFinalLoading(true);
    setFinalMessage("");

    const proof = new FormData();
    proof.set("contract_id", selectedContract.id);
    proof.set("entry_type", "document");
    proof.set("title", `Revised contract — ${selectedContract.title}`);
    proof.set("file", finalFile);
    const proofResponse = await fetch("/api/proof/upload", { method: "POST", body: proof });
    const proofBody = await proofResponse.json() as { error?: string };
    if (!proofResponse.ok) {
      setFinalMessage(proofBody.error ?? "Revised contract upload failed");
      setFinalLoading(false);
      return;
    }

    const endpoint = userRole === "agency_admin" ? "/api/final-check/start" : "/api/approvals/submit";
    const requestBody = userRole === "agency_admin"
      ? { contract_id: selectedContract.id }
      : {
          contract_id: selectedContract.id,
          title: `Final Contract Check — ${selectedContract.title}`,
          description: "Creator uploaded a revised contract for explicit agency-admin final-check review.",
        };
    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(requestBody),
    });
    const body = await response.json() as { error?: string; contract_status?: ContractStatus };
    if (!response.ok) {
      setFinalMessage(body.error ?? "Could not submit final check");
      setFinalLoading(false);
      return;
    }

    if (body.contract_status) {
      setContracts((current) => current.map((contract) =>
        contract.id === selectedContract.id ? { ...contract, status: body.contract_status! } : contract
      ));
    }
    setFinalFile(null);
    setFinalMessage(userRole === "agency_admin"
      ? "Final Contract Check started. The contract is now negotiating until every check clears."
      : "Revised contract submitted. An agency admin must explicitly start Final Contract Check.");
    setFinalLoading(false);
    router.refresh();
  }

  return (
    <div className="p-6 md:p-8 text-white space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-green-400">Greenlit workspace</p>
          <h1 className="mt-2 text-3xl font-bold">Welcome, {userName}</h1>
          <p className="mt-1 text-slate-400">Review, negotiate, clear, and reuse contract knowledge in one place.</p>
        </div>
        <Button variant="greenlit" onClick={() => setUploadOpen(true)}>
          <Upload className="mr-2 h-4 w-4" /> Upload contract
        </Button>
      </div>

      <Card className="border-slate-700 bg-slate-900">
        <CardHeader>
          <CardTitle className="text-white">Contracts</CardTitle>
          <CardDescription className="text-slate-400">Live contracts uploaded by your account.</CardDescription>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full min-w-[680px] text-left text-sm">
            <thead className="border-b border-slate-700 text-xs uppercase tracking-wide text-slate-500">
              <tr><th className="pb-3">Contract</th><th className="pb-3">Brand</th><th className="pb-3">Added</th><th className="pb-3">Status</th></tr>
            </thead>
            <tbody>
              {contracts.map((contract) => {
                const status = STATUS[contract.status];
                return (
                  <tr
                    key={contract.id}
                    onClick={() => setSelectedContractId(contract.id)}
                    className={`cursor-pointer border-b border-slate-800 ${selectedContract?.id === contract.id ? "bg-green-950/20" : "hover:bg-slate-800/50"}`}
                  >
                    <td className="py-4 font-medium text-slate-100">{contract.title}</td>
                    <td className="py-4 text-slate-400">{contract.deal_rooms[0]?.counterparty_name ?? "—"}</td>
                    <td className="py-4 text-slate-400">{new Date(contract.created_at).toLocaleDateString()}</td>
                    <td className="py-4"><span className={`rounded-full border px-2.5 py-1 text-xs ${status.className}`}>{status.label}</span></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {!contracts.length && <p className="py-8 text-center text-sm text-slate-500">Upload your first PDF or Word contract to begin.</p>}
        </CardContent>
      </Card>

      <div className="grid gap-6 xl:grid-cols-3">
        <Card className="border-slate-700 bg-slate-900 xl:col-span-2">
          <CardHeader>
            <div className="flex items-center gap-2"><MessageSquare className="h-5 w-5 text-green-400" /><CardTitle className="text-white">Negotiation Assistant</CardTitle></div>
            <CardDescription className="text-slate-400">Flagged clauses and suggested language from Contract Review.</CardDescription>
          </CardHeader>
          <CardContent>
            {contracts.length > 1 && (
              <select
                value={selectedContract?.id ?? ""}
                onChange={(event) => setSelectedContractId(event.target.value)}
                className="mb-4 w-full rounded-md border border-slate-700 bg-slate-800 px-3 py-2 text-sm"
              >
                {contracts.map((contract) => <option key={contract.id} value={contract.id}>{contract.title}</option>)}
              </select>
            )}
            {!selectedContract ? (
              <p className="text-sm text-slate-500">Upload a contract to see negotiation guidance.</p>
            ) : !clauses.length ? (
              <p className="text-sm text-slate-500">No flagged clauses yet. Complete Contract Review to populate suggestions.</p>
            ) : (
              <div className="space-y-4">
                {clauses.map((clause, index) => {
                  const key = `${selectedContract.id}-${index}`;
                  return (
                    <div key={key} className="rounded-lg border border-slate-700 bg-slate-800/60 p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div><p className="text-sm font-medium text-white">{clause.issue ?? "Flagged clause"}</p><p className="mt-1 text-xs uppercase tracking-wide text-amber-400">{clause.severity ?? "Review"}</p></div>
                        {clause.suggestion && (
                          <button onClick={() => copySuggestion(clause.suggestion!, key)} className="rounded p-2 text-slate-400 hover:bg-slate-700 hover:text-white" aria-label="Copy suggested language">
                            {copied === key ? <Check className="h-4 w-4 text-green-400" /> : <Clipboard className="h-4 w-4" />}
                          </button>
                        )}
                      </div>
                      <p className="mt-3 text-sm text-slate-400">{clause.clause_text ?? "Clause text unavailable."}</p>
                      <div className="mt-3 rounded-md border border-green-900 bg-green-950/30 p-3"><p className="text-xs font-medium uppercase text-green-400">Suggested language</p><p className="mt-1 text-sm text-slate-200">{clause.suggestion ?? "No suggested rewrite available."}</p></div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-slate-700 bg-slate-900">
          <CardHeader>
            <div className="flex items-center gap-2"><FileCheck2 className="h-5 w-5 text-green-400" /><CardTitle className="text-white">Final Contract Check</CardTitle></div>
            <CardDescription className="text-slate-400">Upload the revised agreement against the selected original.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div><Label htmlFor="revised-contract" className="text-slate-300">Revised PDF or Word file</Label><Input id="revised-contract" type="file" accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document" onChange={(event) => setFinalFile(event.target.files?.[0] ?? null)} className="mt-2 border-slate-700 bg-slate-800" /></div>
            <Button className="w-full" variant="greenlit" disabled={!selectedContract || !finalFile || finalLoading} onClick={submitFinalCheck}>{finalLoading ? "Submitting…" : "Submit revised contract"}</Button>
            <p className="text-xs text-slate-500">Approved means Greenlit cleared it. Signed remains a separate real-signature state.</p>
            {finalMessage && <p className="rounded-md bg-slate-800 p-3 text-sm text-slate-300">{finalMessage}</p>}
          </CardContent>
        </Card>
      </div>

      <Card className="border-slate-700 bg-slate-900">
        <CardHeader>
          <div className="flex items-center gap-2"><BookOpen className="h-5 w-5 text-green-400" /><CardTitle className="text-white">Knowledge Repository</CardTitle></div>
          <CardDescription className="text-slate-400">{knowledgeLive ? "Live entries from your legal playbook." : "Starter guidance shown while your repository is empty."}</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-3">
          {knowledge.map((entry) => (
            <div key={entry.id} className="rounded-lg border border-slate-700 bg-slate-800/60 p-4">
              <p className="text-xs uppercase tracking-wide text-green-400">{entry.category.replaceAll("_", " ")}</p>
              <h3 className="mt-2 font-medium text-white">{entry.title}</h3>
              <p className="mt-2 text-sm text-slate-400">{entry.content}</p>
              <p className="mt-3 text-xs text-slate-600">{entry.jurisdiction}</p>
            </div>
          ))}
        </CardContent>
      </Card>

      {uploadOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" role="dialog" aria-modal="true" aria-labelledby="upload-title">
          <Card className="w-full max-w-lg border-slate-700 bg-slate-900">
            <CardHeader className="flex-row items-start justify-between">
              <div><CardTitle id="upload-title" className="text-white">Upload contract</CardTitle><CardDescription className="mt-1 text-slate-400">PDF or Word, up to 10 MB.</CardDescription></div>
              <button onClick={() => setUploadOpen(false)} className="rounded p-1 text-slate-400 hover:bg-slate-800" aria-label="Close upload"><X className="h-5 w-5" /></button>
            </CardHeader>
            <CardContent>
              <form onSubmit={uploadContract} className="space-y-4">
                <div><Label htmlFor="contract-title" className="text-slate-300">Contract title</Label><Input id="contract-title" name="title" placeholder="Brand collaboration agreement" className="mt-2 border-slate-700 bg-slate-800" /></div>
                <div><Label htmlFor="contract-file" className="text-slate-300">Contract file</Label><Input id="contract-file" name="file" type="file" required accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document" className="mt-2 border-slate-700 bg-slate-800" /></div>
                {uploadError && <p className="text-sm text-red-400">{uploadError}</p>}
                <Button type="submit" variant="greenlit" className="w-full" disabled={uploading}><FileText className="mr-2 h-4 w-4" />{uploading ? "Uploading…" : "Upload for review"}</Button>
              </form>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
