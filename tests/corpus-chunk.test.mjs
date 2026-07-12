// Unit tests for the clause-aware corpus chunker. Offline, no deps.
// Requires Node >=23 (type stripping for .ts imports).
import assert from "node:assert/strict";
import test from "node:test";

const { chunkText } = await import("../lib/corpus/chunk.ts");

test("empty input yields no chunks", () => {
  assert.deepEqual(chunkText(""), []);
  assert.deepEqual(chunkText("   \n  "), []);
});

test("splits on numbered clause boundaries", () => {
  const doc = "Preamble text.\n1. Payment terms are net 30.\n2. Exclusivity applies for 12 months.\n3. Termination requires 30 days notice.";
  const chunks = chunkText(doc);
  assert.ok(chunks.length >= 3, `expected >=3 chunks, got ${chunks.length}`);
  assert.ok(chunks.some((c) => c.startsWith("1.")));
  assert.ok(chunks.some((c) => c.startsWith("2.")));
});

test("hard-wraps an oversized clause with no boundaries", () => {
  const big = "word ".repeat(1500); // ~7500 chars, single paragraph, no clauses
  const chunks = chunkText(big);
  assert.ok(chunks.length >= 2, "oversized text must split");
  for (const c of chunks) assert.ok(c.length <= 3200, `chunk too big: ${c.length}`);
});

test("short single clause stays one chunk", () => {
  const chunks = chunkText("Just one short clause about usage rights.");
  assert.equal(chunks.length, 1);
});

test("no chunk is empty or whitespace-only", () => {
  const doc = "1. A\n\n\n2. B\n\n   \n3. C";
  for (const c of chunkText(doc)) assert.ok(c.trim().length > 0);
});

// ── chunkSections (statutory) ────────────────────────────────────────────────
const { chunkSections } = await import("../lib/corpus/chunk.ts");

test("statute splits per section with refs", () => {
  const act = [
    "THE CONSUMER PROTECTION ACT, 2019",
    "1. Short title. This Act may be called the Consumer Protection Act, 2019.",
    "2. Definitions. In this Act, unless the context otherwise requires—",
    "(28) \"misleading advertisement\" means an advertisement which falsely describes a product.",
    "12A. Special provision inserted by amendment.",
    "Section 89 Punishment for false or misleading advertisement.",
  ].join("\n");
  const chunks = chunkSections(act);
  const refs = chunks.map((c) => c.section_ref);
  assert.ok(refs.includes("s.1"), `missing s.1 in ${refs}`);
  assert.ok(refs.includes("s.2"), `missing s.2 in ${refs}`);
  assert.ok(refs.includes("s.12A"), `missing s.12A in ${refs}`);
  assert.ok(refs.includes("s.89"), `missing s.89 in ${refs}`);
  // sub-clause (28) must NOT start a new section — stays inside s.2
  const s2 = chunks.find((c) => c.section_ref === "s.2");
  assert.ok(s2.content.includes("misleading advertisement"), "sub-clause leaked out of s.2");
});

test("rules get r. refs", () => {
  const rules = "Rule 3 Due diligence by intermediaries.\nSome text.\nRule 4 Additional obligations.";
  const refs = chunkSections(rules).map((c) => c.section_ref);
  assert.ok(refs.includes("r.3") && refs.includes("r.4"), `got ${refs}`);
});

test("unstructured text falls back to null refs", () => {
  const chunks = chunkSections("Just a plain paragraph with no sections at all.");
  assert.ok(chunks.length >= 1);
  for (const c of chunks) assert.equal(c.section_ref, null);
});

test("oversized section keeps its ref on every piece", () => {
  const big = "Section 5 Liability.\n" + "word ".repeat(1500);
  const chunks = chunkSections(big);
  assert.ok(chunks.length >= 2, "must split");
  for (const c of chunks) assert.equal(c.section_ref, "s.5");
});
