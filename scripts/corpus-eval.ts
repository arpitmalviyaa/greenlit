// Retrieval-quality eval over the golden set. Run whenever retrieval logic
// changes so regressions are visible before they ship:
//
//   npx tsx scripts/corpus-eval.ts [--k 10] [--vertical creator]
//
// Golden set = query → expected-authority pairs, from two sources (merged):
//   1. tests/golden-set.json — hand-curated. Entries:
//        { "query": "...", "expect_chunk_ids": ["uuid", ...] }        (exact)
//        { "query": "...", "expect_citations": ["Consumer Protection", ...] } (substring match on hit citation)
//        { "skip": true, ... } entries are ignored.
//   2. finding_feedback verdict='accepted' joined to compliance_findings with a
//      non-null query → (query, chunk_ids) pairs. Real usage becomes the eval.
//
// Reports precision@k and recall@k per query + aggregate. Exits 1 when the
// aggregate recall drops below --min-recall (default 0, i.e. report-only).

import { readFileSync, existsSync } from "node:fs";

for (const f of [".env.local", ".env"]) {
  if (!existsSync(f)) continue;
  for (const line of readFileSync(f, "utf8").split("\n")) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
}

function arg(name: string, fallback: string): string {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 && process.argv[i + 1] ? process.argv[i + 1] : fallback;
}

type GoldenEntry = {
  query: string;
  expect_chunk_ids?: string[];
  expect_citations?: string[];
  skip?: boolean;
};

async function main() {
  const k = Number(arg("k", "10"));
  const vertical = arg("vertical", "creator") as import("../lib/corpus/vertical.ts").Vertical;
  const minRecall = Number(arg("min-recall", "0"));

  const { search } = await import("../lib/corpus/retrieve.ts");
  const { createServiceClient } = await import("../lib/supabase/server.ts");

  // 1. Hand-curated entries.
  const golden: GoldenEntry[] = [];
  const goldenPath = "tests/golden-set.json";
  if (existsSync(goldenPath)) {
    for (const e of JSON.parse(readFileSync(goldenPath, "utf8")) as GoldenEntry[]) {
      if (!e.skip && e.query) golden.push(e);
    }
  }

  // 2. Accepted feedback → golden pairs (query-backed findings only).
  try {
    const supabase = await createServiceClient();
    const { data } = await supabase
      .from("finding_feedback")
      .select("compliance_findings!inner(query, chunk_ids)")
      .eq("verdict", "accepted")
      .not("compliance_findings.query", "is", null)
      .limit(200);
    for (const r of (data ?? []) as unknown as { compliance_findings: { query: string; chunk_ids: string[] } }[]) {
      golden.push({ query: r.compliance_findings.query, expect_chunk_ids: r.compliance_findings.chunk_ids });
    }
  } catch { /* no DB access → file-only eval */ }

  if (!golden.length) {
    console.log("Golden set is empty (no tests/golden-set.json entries, no accepted feedback). Nothing to eval.");
    return;
  }

  console.log(`Evaluating ${golden.length} golden quer${golden.length === 1 ? "y" : "ies"} @ k=${k}, vertical=${vertical}\n`);

  let sumP = 0, sumR = 0;
  for (const g of golden) {
    const hits = await search(g.query, { vertical }, k);
    const expectedN = (g.expect_chunk_ids?.length ?? 0) + (g.expect_citations?.length ?? 0);
    const idHit = new Set(hits.map((h) => h.id));
    const idMatches = (g.expect_chunk_ids ?? []).filter((id) => idHit.has(id)).length;
    const citMatches = (g.expect_citations ?? []).filter((c) =>
      hits.some((h) => (h.citation ?? "").toLowerCase().includes(c.toLowerCase()))
    ).length;
    const matched = idMatches + citMatches;
    const precision = hits.length ? matched / Math.min(hits.length, expectedN || 1) : 0;
    const recall = expectedN ? matched / expectedN : 0;
    sumP += precision; sumR += recall;
    console.log(`  ${recall >= 1 ? "✓" : recall > 0 ? "~" : "✗"} P=${precision.toFixed(2)} R=${recall.toFixed(2)}  "${g.query.slice(0, 70)}" (${matched}/${expectedN}, ${hits.length} retrieved)`);
  }

  const avgP = sumP / golden.length, avgR = sumR / golden.length;
  console.log(`\nAggregate: precision=${avgP.toFixed(3)} recall=${avgR.toFixed(3)} over ${golden.length} queries`);
  if (avgR < minRecall) {
    console.error(`FAIL: recall ${avgR.toFixed(3)} < --min-recall ${minRecall}`);
    process.exit(1);
  }
}

void main();
