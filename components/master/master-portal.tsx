"use client";

import { useEffect, useState } from "react";
import { BookOpen, Database, LogOut, Plus, Trash2, Users } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import Link from "next/link";

type Creator = {
  profile_id: string; creator_name: string; email: string; organisation_name: string | null;
  contract_count: number; pending_count: number; last_contract_at: string | null;
};
type Source = {
  id: string; title: string; content_type: string; source: string; source_url: string | null;
  jurisdiction_code: string; created_at: string;
};
const field = "w-full rounded-lg border border-white/15 bg-black px-3 py-2.5 text-sm text-white outline-none placeholder:text-zinc-600 focus:border-white/50";
const button = "inline-flex items-center justify-center rounded-lg bg-white px-4 py-2.5 text-sm font-medium text-black hover:bg-zinc-200 disabled:opacity-40";

export function MasterPortal({ adminName }: { adminName: string }) {
  const router = useRouter();
  const [creators, setCreators] = useState<Creator[]>([]);
  const [sources, setSources] = useState<Source[]>([]);
  const [tab, setTab] = useState<"creators" | "repository">("creators");
  const [message, setMessage] = useState("");

  async function load() {
    const [overview, corpus] = await Promise.all([fetch("/api/master/overview"), fetch("/api/master/corpus")]);
    if (overview.ok) setCreators(((await overview.json()) as { creators: Creator[] }).creators);
    if (corpus.ok) setSources(await corpus.json() as Source[]);
  }
  useEffect(() => { void load(); }, []);

  async function addSource(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const values = Object.fromEntries(new FormData(event.currentTarget));
    const response = await fetch("/api/master/corpus", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(values) });
    const body = await response.json() as { error?: string };
    if (!response.ok) return setMessage(body.error ?? "Could not add source");
    event.currentTarget.reset();
    setMessage("Source added to the Indian legal repository.");
    await load();
  }

  async function removeSource(id: string) {
    if (!window.confirm("Remove this source from the active repository?")) return;
    const response = await fetch(`/api/master/corpus?id=${encodeURIComponent(id)}`, { method: "DELETE" });
    if (response.ok) setSources((current) => current.filter((source) => source.id !== id));
  }

  async function signOut() {
    await createClient().auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <div className="min-h-screen bg-black text-white">
      <header className="flex items-center justify-between border-b border-white/10 px-6 py-5">
        <div><p className="text-xs uppercase tracking-[0.25em] text-zinc-600">Greenlit master</p><h1 className="mt-1 text-lg font-medium">{adminName}</h1></div>
        <button onClick={signOut} className="flex items-center gap-2 text-sm text-zinc-500 hover:text-white"><LogOut className="h-4 w-4" />Sign out</button>
      </header>
      <div className="grid min-h-[calc(100vh-77px)] md:grid-cols-[240px_1fr]">
        <nav className="border-r border-white/10 p-4">
          <button onClick={() => setTab("creators")} className={`mb-2 flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm ${tab === "creators" ? "bg-white text-black" : "text-zinc-500 hover:bg-white/10 hover:text-white"}`}><Users className="h-4 w-4" />Creators</button>
          <button onClick={() => setTab("repository")} className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm ${tab === "repository" ? "bg-white text-black" : "text-zinc-500 hover:bg-white/10 hover:text-white"}`}><BookOpen className="h-4 w-4" />Knowledge repository</button>
          <p className="mt-6 mb-2 px-3 text-[10px] uppercase tracking-widest text-zinc-700">Admin tools</p>
          <Link href="/admin/corpus" className="mb-2 flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-zinc-500 hover:bg-white/10 hover:text-white"><Database className="h-4 w-4" />Corpus</Link>
          {/* ponytail: Startup analyses hidden per request — route still live at /admin/startup, restore this Link when the startup vertical is back in play. */}
          <p className="mt-8 px-3 text-xs leading-5 text-zinc-700">Contract files, clauses, messages, analyses, and confidential details are intentionally unavailable here.</p>
        </nav>
        <main className="p-6 md:p-8">
          {message && <p className="mb-5 rounded-lg border border-white/20 p-3 text-sm">{message}</p>}
          {tab === "creators" ? (
            <section>
              <h2 className="text-2xl font-medium">Creator accounts</h2><p className="mt-2 text-sm text-zinc-500">Operational metadata only. No confidential contract access.</p>
              <div className="mt-6 overflow-x-auto rounded-xl border border-white/15">
                <table className="w-full min-w-[760px] text-left text-sm"><thead className="border-b border-white/10 text-xs uppercase tracking-widest text-zinc-600"><tr><th className="p-4">Creator</th><th>Organisation</th><th>Contracts</th><th>Pending</th><th>Last activity</th></tr></thead>
                  <tbody>{creators.map((creator) => <tr key={creator.profile_id} className="border-b border-white/10"><td className="p-4"><p>{creator.creator_name}</p><p className="text-xs text-zinc-600">{creator.email}</p></td><td className="text-zinc-500">{creator.organisation_name ?? "—"}</td><td>{creator.contract_count}</td><td>{creator.pending_count}</td><td className="text-zinc-500">{creator.last_contract_at ? new Date(creator.last_contract_at).toLocaleDateString() : "—"}</td></tr>)}</tbody>
                </table>
              </div>
            </section>
          ) : (
            <section className="grid gap-6 xl:grid-cols-[380px_1fr]">
              <form onSubmit={addSource} className="h-fit space-y-4 rounded-xl border border-white/15 p-5">
                <div><h2 className="text-xl font-medium">Add legal source</h2><p className="mt-1 text-sm text-zinc-500">Publish a verified Indian authority to the review corpus.</p></div>
                <input className={field} name="title" required placeholder="Title or case name" />
                <div className="grid grid-cols-2 gap-3"><select className={field} name="content_type" defaultValue="judgment"><option value="judgment">Judgment</option><option value="statute">Statute</option><option value="regulation">Regulation</option><option value="news">Update</option></select><input className={field} name="jurisdiction_code" defaultValue="IN" /></div>
                <input className={field} name="source" required placeholder="Court, regulator, or publisher" />
                <input className={field} name="source_url" type="url" placeholder="Official source URL" />
                <textarea className={`${field} min-h-48`} name="content" required placeholder="Relevant text, ratio, provision, or verified summary" />
                <button className={`${button} w-full`}><Plus className="mr-2 h-4 w-4" />Add to repository</button>
              </form>
              <div className="rounded-xl border border-white/15">
                <div className="border-b border-white/10 p-5"><h2 className="text-xl font-medium">Active sources</h2><p className="mt-1 text-sm text-zinc-500">{sources.length} sources available to contract review.</p></div>
                <div>{sources.map((source) => <article key={source.id} className="flex items-start justify-between gap-4 border-b border-white/10 p-5"><div><p className="text-xs uppercase tracking-widest text-zinc-600">{source.content_type} · {source.jurisdiction_code}</p><h3 className="mt-2 font-medium">{source.title}</h3><p className="mt-1 text-sm text-zinc-500">{source.source}</p></div><button onClick={() => void removeSource(source.id)} className="p-2 text-zinc-600 hover:text-white" aria-label="Remove source"><Trash2 className="h-4 w-4" /></button></article>)}</div>
              </div>
            </section>
          )}
        </main>
      </div>
    </div>
  );
}
