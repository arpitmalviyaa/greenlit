// Batch-ingest a local folder into the Corpus through the real pipeline.
//
//   npx tsx scripts/corpus-seed.ts <folder> [--deal-type paid_promotion] [--doc-kind contract]
//
// Reuses lib/corpus/pipeline.ts (extract → chunk → classify → save) — no logic
// duplication. Requires SUPABASE_SERVICE_ROLE_KEY, NEXT_PUBLIC_SUPABASE_URL,
// NEXT_PUBLIC_SUPABASE_ANON_KEY and ANTHROPIC_API_KEY (loaded from .env.local/.env
// below, or already exported). The 035 migration must be applied first.

import { readFileSync, readdirSync, existsSync } from "node:fs";
import { join, extname, basename } from "node:path";
import { randomUUID } from "node:crypto";

// Tiny .env loader — dotenv isn't a dependency and we only need a handful of keys.
for (const f of [".env.local", ".env"]) {
  if (!existsSync(f)) continue;
  for (const line of readFileSync(f, "utf8").split("\n")) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
}

const EXT_MIME: Record<string, string> = {
  ".pdf": "application/pdf",
  ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
};

function arg(name: string, fallback: string): string {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 && process.argv[i + 1] ? process.argv[i + 1] : fallback;
}

async function main() {
  const folder = process.argv[2];
  if (!folder || !existsSync(folder)) {
    console.error("Usage: npx tsx scripts/corpus-seed.ts <folder> [--deal-type X] [--doc-kind Y]");
    process.exit(1);
  }
  const dealType = arg("deal-type", "other");
  const docKind = arg("doc-kind", "contract");

  // Lazy import so the env loader above runs before the pipeline reads keys.
  const { ingestDocument } = await import("../lib/corpus/pipeline.ts");

  const files = readdirSync(folder).filter((f) => EXT_MIME[extname(f).toLowerCase()]);
  if (!files.length) {
    console.error(`No .pdf/.docx files in ${folder}`);
    process.exit(1);
  }
  console.log(`Ingesting ${files.length} file(s) from ${folder} …`);

  let ok = 0, failed = 0;
  for (const name of files) {
    const path = join(folder, name);
    const buffer = readFileSync(path);
    const mimeType = EXT_MIME[extname(name).toLowerCase()];
    const storageKey = `seed/${randomUUID()}/${basename(name).replace(/[^a-zA-Z0-9._-]/g, "_")}`;
    try {
      const res = await ingestDocument({
        uploaded_by: null,
        doc_kind: docKind,
        deal_type: dealType,
        title: name,
        source_note: `seed:${folder}`,
        file: { buffer, fileName: name, mimeType, storageKey },
      });
      if (res.status === "failed") { failed++; console.log(`  ✗ ${name} — ${res.error}`); }
      else { ok++; console.log(`  ✓ ${name} — ${res.status}, ${res.chunk_count} chunks`); }
    } catch (e) {
      failed++;
      console.log(`  ✗ ${name} — ${e instanceof Error ? e.message : String(e)}`);
    }
  }
  console.log(`Done. ${ok} ingested, ${failed} failed.`);
  process.exit(failed && !ok ? 1 : 0);
}

void main();
