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
