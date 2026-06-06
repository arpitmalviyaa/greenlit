// Standalone corpus ingest scripts — NOT imported in request path.
// Run manually or via a scheduled job.
// TODO: Set COURTLISTENER_API_KEY, FTC_API_KEY in env before running.

import { createServiceClient } from "@/lib/supabase/server";

interface CorpusInsert {
  jurisdiction_code: string;
  content_type: 'statute' | 'judgment' | 'regulation' | 'news';
  title: string;
  content: string;
  source: string;
  source_url?: string;
  last_updated?: string;
}

async function upsertCorpus(entries: CorpusInsert[]) {
  const supabase = await createServiceClient();
  const { error } = await supabase.from("jurisdiction_corpus").insert(entries);
  if (error) throw error;
}

// TODO: Requires COURTLISTENER_API_KEY env var
export async function ingestCourtListener() {
  const apiKey = process.env.COURTLISTENER_API_KEY;
  if (!apiKey) throw new Error("COURTLISTENER_API_KEY not set");

  const resp = await fetch(
    "https://www.courtlistener.com/api/rest/v3/opinions/?jurisdiction=us&format=json&limit=20",
    { headers: { Authorization: `Token ${apiKey}` } }
  );
  if (!resp.ok) throw new Error(`CourtListener fetch failed: ${resp.status}`);

  const data = await resp.json() as { results: Array<{ absolute_url: string; case_name: string; plain_text: string; date_filed: string }> };

  const entries: CorpusInsert[] = (data.results ?? []).map((r) => ({
    jurisdiction_code: 'US',
    content_type: 'judgment',
    title: r.case_name,
    content: (r.plain_text ?? "").slice(0, 5000),
    source: 'CourtListener',
    source_url: `https://www.courtlistener.com${r.absolute_url}`,
    last_updated: r.date_filed,
  }));

  await upsertCorpus(entries);
  return entries.length;
}

// TODO: Requires public FTC guidelines page — no API key needed but rate-limit applies
export async function ingestFTCGuidelines() {
  const url = "https://www.ftc.gov/business-guidance/resources/ftcs-endorsement-guides-what-people-are-asking";
  const resp = await fetch(url);
  if (!resp.ok) throw new Error(`FTC fetch failed: ${resp.status}`);

  const html = await resp.text();
  // Strip HTML tags for plain text approximation
  const text = html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim().slice(0, 8000);

  await upsertCorpus([{
    jurisdiction_code: 'US',
    content_type: 'regulation',
    title: "FTC Endorsement Guides — FAQ",
    content: text,
    source: 'FTC',
    source_url: url,
    last_updated: new Date().toISOString(),
  }]);
  return 1;
}

// TODO: Requires public ASA/CAP page — no API key needed but respect robots.txt
export async function ingestASACAP() {
  const url = "https://www.asa.org.uk/type/non_broadcast/code_section/02.html";
  const resp = await fetch(url);
  if (!resp.ok) throw new Error(`ASA fetch failed: ${resp.status}`);

  const html = await resp.text();
  const text = html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim().slice(0, 8000);

  await upsertCorpus([{
    jurisdiction_code: 'UK',
    content_type: 'regulation',
    title: "ASA/CAP Code — Section 2: Recognition of Marketing Communications",
    content: text,
    source: 'ASA CAP',
    source_url: url,
    last_updated: new Date().toISOString(),
  }]);
  return 1;
}
