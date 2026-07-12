// Backfill embeddings for corpus chunks ingested before the vector path (or
// while OPENAI_API_KEY was absent). Idempotent — only touches rows with a null
// embedding. Safe to re-run; stops cleanly when there's nothing to do.
//
//   npx tsx scripts/corpus-backfill-embeddings.ts [--batch 100]

import { readFileSync, existsSync } from "node:fs";

for (const f of [".env.local", ".env"]) {
  if (!existsSync(f)) continue;
  for (const line of readFileSync(f, "utf8").split("\n")) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
}

async function main() {
  const i = process.argv.indexOf("--batch");
  const batch = Math.min(500, Number(i >= 0 ? process.argv[i + 1] : 100) || 100);

  const { embedTexts, embeddingsEnabled } = await import("../lib/corpus/embed.ts");
  if (!embeddingsEnabled()) {
    console.error("OPENAI_API_KEY not set — nothing to backfill with.");
    process.exit(1);
  }
  const { createServiceClient } = await import("../lib/supabase/server.ts");
  const supabase = await createServiceClient();

  let total = 0;
  for (;;) {
    const { data, error } = await supabase
      .from("corpus_chunks")
      .select("id, content")
      .is("embedding", null)
      .limit(batch);
    if (error) { console.error(`fetch failed: ${error.message}`); process.exit(1); }
    if (!data?.length) break;

    const embeddings = await embedTexts(data.map((r) => r.content as string));
    if (!embeddings) { console.error("embedding call failed — aborting (safe to re-run)"); process.exit(1); }

    for (let j = 0; j < data.length; j++) {
      const { error: upErr } = await supabase
        .from("corpus_chunks")
        .update({ embedding: JSON.stringify(embeddings[j]) })
        .eq("id", data[j].id);
      if (upErr) { console.error(`update ${data[j].id} failed: ${upErr.message}`); process.exit(1); }
    }
    total += data.length;
    console.log(`  embedded ${total} chunks…`);
  }
  console.log(`Done. ${total} chunk(s) backfilled.`);
}

void main();
