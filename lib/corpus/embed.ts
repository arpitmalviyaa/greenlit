// OpenAI embeddings for corpus chunks. text-embedding-3-small = 1536 dims,
// matching the vector(1536) column from migration 035.
//
// Degrades gracefully: no OPENAI_API_KEY → returns null, callers store null
// embeddings and retrieval stays tsv-only. Never throws — an embedding outage
// must never fail an ingest.

const EMBED_URL = "https://api.openai.com/v1/embeddings";
const EMBED_MODEL = "text-embedding-3-small";
const MAX_INPUT_CHARS = 8000; // ~2k tokens; chunks are ≤3200 chars anyway, queries can be long
const BATCH = 100;

let warnedDisabled = false;

export function embeddingsEnabled(): boolean {
  return !!process.env.OPENAI_API_KEY;
}

async function callOpenAI(inputs: string[]): Promise<number[][] | null> {
  const key = process.env.OPENAI_API_KEY;
  if (!key) return null;
  const res = await fetch(EMBED_URL, {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({ model: EMBED_MODEL, input: inputs }),
    signal: AbortSignal.timeout(30_000),
  });
  if (!res.ok) throw new Error(`embeddings ${res.status}: ${(await res.text()).slice(0, 200)}`);
  const body = await res.json() as { data: { index: number; embedding: number[] }[] };
  const out: number[][] = new Array(inputs.length);
  for (const d of body.data) out[d.index] = d.embedding;
  return out;
}

// Embed many texts (ingest path). Returns null when disabled or on failure —
// callers treat null as "no embeddings this round".
export async function embedTexts(texts: string[]): Promise<number[][] | null> {
  if (!embeddingsEnabled()) {
    if (!warnedDisabled) {
      console.warn("[corpus] OPENAI_API_KEY not set — embeddings disabled, retrieval is tsv-only");
      warnedDisabled = true;
    }
    return null;
  }
  try {
    const out: number[][] = [];
    for (let i = 0; i < texts.length; i += BATCH) {
      const batch = texts.slice(i, i + BATCH).map((t) => t.slice(0, MAX_INPUT_CHARS) || " ");
      const res = await callOpenAI(batch);
      if (!res) return null;
      out.push(...res);
    }
    return out;
  } catch (err) {
    console.warn(`[corpus] embedding failed (ingest continues without): ${err instanceof Error ? err.message : err}`);
    return null;
  }
}

// Embed a single query (retrieval path).
export async function embedQuery(query: string): Promise<number[] | null> {
  const res = await embedTexts([query]);
  return res?.[0] ?? null;
}
