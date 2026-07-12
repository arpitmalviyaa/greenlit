// The compliance grounding contract: every emitted finding cites at least one
// ACTUALLY-RETRIEVED authority chunk; findings whose citations don't resolve
// are dropped. Tests the exact production code path (resolveGroundedFindings).
// Run: node --test --import ./tests/helpers/register-loader.mjs tests/compliance-grounding.test.mjs
import assert from "node:assert/strict";
import test from "node:test";

const { resolveGroundedFindings, complianceCheck } = await import("../lib/corpus/compliance.ts");

const CHUNKS = [
  { id: "c-0", document_id: "d", content: "s.2(28) misleading advertisement…", clause_type: null, risk_note: null, stance: "market_standard", deal_type: "other", doc_kind: "act", citation: "Consumer Protection Act, 2019", section_ref: "s.2", source_url: "https://example.gov/cpa", authority_weight: 1 },
  { id: "c-1", document_id: "d", content: "s.89 punishment for false ads…", clause_type: null, risk_note: null, stance: "market_standard", deal_type: "other", doc_kind: "act", citation: "Consumer Protection Act, 2019", section_ref: "s.89", source_url: null, authority_weight: 1 },
];

const BASE = {
  issue: "No ad-disclosure obligation on the creator",
  severity: "high",
  statute_citation: "Consumer Protection Act, 2019",
  explanation: "The contract omits the mandatory disclosure duty.",
  confidence: 0.9,
};

test("every emitted finding carries >=1 resolved citation", () => {
  const out = resolveGroundedFindings(
    [{ ...BASE, cited_chunks: [0, 1] }],
    CHUNKS
  );
  assert.equal(out.length, 1);
  assert.ok(out[0].citations.length >= 1, "finding without citations escaped");
  assert.deepEqual(out[0].citations.map((c) => c.chunk_id), ["c-0", "c-1"]);
  assert.equal(out[0].citations[0].citation, "Consumer Protection Act, 2019");
  assert.ok(out[0].id, "finding must carry a feedback-anchor id");
});

test("finding citing only out-of-range chunks is DROPPED", () => {
  const out = resolveGroundedFindings(
    [{ ...BASE, cited_chunks: [7, -1, 99] }],
    CHUNKS
  );
  assert.equal(out.length, 0, "un-grounded finding survived — grounding contract broken");
});

test("invalid indexes are stripped, valid ones kept", () => {
  const out = resolveGroundedFindings(
    [{ ...BASE, cited_chunks: [99, 1] }],
    CHUNKS
  );
  assert.equal(out.length, 1);
  assert.deepEqual(out[0].citations.map((c) => c.chunk_id), ["c-1"]);
});

test("section_ref falls back to the first cited chunk's ref", () => {
  const out = resolveGroundedFindings([{ ...BASE, cited_chunks: [1] }], CHUNKS);
  assert.equal(out[0].section_ref, "s.89");
});

test("flag OFF: complianceCheck short-circuits to disabled with zero findings", async () => {
  const res = await complianceCheck({ text: "anything", vertical: "creator", feature: "test" });
  assert.equal(res.status, "disabled");
  assert.deepEqual(res.findings, []);
});
