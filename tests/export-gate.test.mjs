// Route-level test of the startup memo export 403 review-gate — the vertical's
// core safety invariant: a DRAFT memo must never export.
// Run: node --test --import ./tests/helpers/register-loader.mjs tests/export-gate.test.mjs
import assert from "node:assert/strict";
import test from "node:test";

const { GET } = await import("../app/api/admin/startup/[id]/export/route.ts");

const VALID_MEMO = {
  bottom_line: "Fine overall.",
  top_issues: [],
  diligence_flags: [],
  standard_no_action: "Everything else is market standard.",
  needs_lawyer: [],
  next_step: "Sign after the one fix.",
};

function params(id = "m1") {
  return { params: Promise.resolve({ id }) };
}

test("draft memo export returns 403", async () => {
  globalThis.__mockRows = { startup_memos: [{ memo_json: VALID_MEMO, status: "draft", prepared_for: null, document_label: null, reviewed_by: null, reviewed_at: null }] };
  const res = await GET(new Request("http://t/export"), params());
  assert.equal(res.status, 403);
  const body = await res.json();
  assert.match(body.error, /draft/i);
});

test("reviewed memo exports (200, html)", async () => {
  globalThis.__mockRows = { startup_memos: [{ memo_json: VALID_MEMO, status: "reviewed", prepared_for: "Acme", document_label: "SHA", reviewed_by: "Adv. X", reviewed_at: "2026-07-12T00:00:00Z" }] };
  const res = await GET(new Request("http://t/export"), params());
  assert.equal(res.status, 200);
  assert.match(res.headers.get("content-type") ?? "", /text\/html/);
});

test("missing memo returns 404", async () => {
  globalThis.__mockRows = { startup_memos: [] };
  const res = await GET(new Request("http://t/export"), params());
  assert.equal(res.status, 404);
});

test("non-admin gets 404 (surface invisible)", async () => {
  globalThis.__mockAdminUser = null;
  globalThis.__mockRows = { startup_memos: [{ memo_json: VALID_MEMO, status: "reviewed" }] };
  const res = await GET(new Request("http://t/export"), params());
  assert.equal(res.status, 404);
  globalThis.__mockAdminUser = undefined;
});
