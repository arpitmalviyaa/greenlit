// Phase 2/3 pure-logic guard: diligence presence, cross-doc consistency, memo
// normalization. Compiles the dependency-free lib/startup/diligence.ts and asserts.
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { createRequire } from "node:module";
import { rmSync } from "node:fs";
import test from "node:test";

const buildDir = ".startup-logic-test-build";
rmSync(buildDir, { recursive: true, force: true });
execFileSync("npx", [
  "tsc", "--module", "commonjs", "--target", "es2022", "--moduleResolution", "node",
  "--esModuleInterop", "--skipLibCheck", "--strict",
  "--outDir", buildDir, "--rootDir", ".", "lib/startup/diligence.ts",
], { stdio: "inherit" });

const requireBuilt = createRequire(`${process.cwd()}/${buildDir}/tests/startup-logic.test.cjs`);
const { computeDiligenceFlags, crossDocChecks, normalizeMemo, DILIGENCE_ITEMS } =
  requireBuilt("../lib/startup/diligence.js");

test.after(() => rmSync(buildDir, { recursive: true, force: true }));

test("empty matter → all 8 diligence items missing, in canonical order", () => {
  const flags = computeDiligenceFlags([]);
  assert.equal(flags.length, 8);
  assert.deepEqual(flags.map((f) => f.item), [...DILIGENCE_ITEMS]);
  assert.ok(flags.every((f) => f.status === "missing"));
});

test("present docs flip their covered items to green; absent stay missing", () => {
  const flags = computeDiligenceFlags([
    { sub_type: "ip_assignment", title: "IP Deed" },
    { sub_type: "founder_agreement", title: "Founders SHA" },
  ]);
  const byItem = Object.fromEntries(flags.map((f) => [f.item, f.status]));
  assert.equal(byItem.ip_assignments, "green");
  assert.equal(byItem.founder_agreements, "green");
  assert.equal(byItem.esop_docs, "missing");          // no ESOP doc in the matter
  assert.equal(byItem.dpdpa_consent, "missing");
});

test("a present-but-unsigned covering doc yields 'attention', not green", () => {
  const flags = computeDiligenceFlags([
    { sub_type: "sha", title: "SHA", terms: { signed_and_dated: false } },
  ]);
  const capTable = flags.find((f) => f.item === "cap_table");
  assert.equal(capTable.status, "attention");
  assert.match(capTable.note, /unsigned/);
});

test("cross-doc: mismatched share counts flagged (cap table vs SHA)", () => {
  const inc = crossDocChecks([
    { sub_type: "incorporation", title: "MOA", terms: { total_shares: 900 } },
    { sub_type: "sha", title: "SHA", terms: { total_shares: 1000 } },
  ]);
  assert.equal(inc.length, 1);
  assert.equal(inc[0].field, "total_shares");
  assert.deepEqual(inc[0].docs.sort(), ["MOA", "SHA"]);
});

test("cross-doc: ESOP pool % mismatch (term sheet vs ESOP scheme) flagged", () => {
  const inc = crossDocChecks([
    { sub_type: "term_sheet", title: "TS", terms: { esop_pool_pct: 10 } },
    { sub_type: "esop", title: "ESOP", terms: { esop_pool_pct: 12 } },
  ]);
  assert.ok(inc.some((i) => i.field === "esop_pool_pct"));
});

test("cross-doc: company names equal up to case/punctuation are NOT flagged", () => {
  const inc = crossDocChecks([
    { sub_type: "sha", title: "SHA", terms: { company_name: "Acme, Inc." } },
    { sub_type: "term_sheet", title: "TS", terms: { company_name: "acme inc" } },
  ]);
  assert.equal(inc.filter((i) => i.field === "company_name").length, 0);
});

test("cross-doc: genuinely different company names ARE flagged", () => {
  const inc = crossDocChecks([
    { sub_type: "sha", title: "SHA", terms: { company_name: "Acme Technologies" } },
    { sub_type: "ssa", title: "SSA", terms: { company_name: "Beta Labs" } },
  ]);
  assert.ok(inc.some((i) => i.field === "company_name"));
});

test("consistent data room → no inconsistencies", () => {
  const inc = crossDocChecks([
    { sub_type: "sha", terms: { company_name: "Acme", total_shares: 1000, esop_pool_pct: 10 } },
    { sub_type: "term_sheet", terms: { company_name: "Acme", total_shares: 1000, esop_pool_pct: 10 } },
  ]);
  assert.equal(inc.length, 0);
});

test("normalizeMemo forces 8 ordered flags and caps top_issues at 3", () => {
  const memo = {
    bottom_line: "x",
    top_issues: [1, 2, 3, 4, 5].map((n) => ({ clause_ref: String(n) })),
    diligence_flags: [{ item: "cap_table", status: "green", note: "" }],
    standard_no_action: "", needs_lawyer: [], next_step: "",
  };
  const out = normalizeMemo(memo);
  assert.equal(out.top_issues.length, 3);
  assert.deepEqual(out.diligence_flags.map((f) => f.item), [...DILIGENCE_ITEMS]);
  assert.equal(out.diligence_flags.find((f) => f.item === "cap_table").status, "green");
  assert.equal(out.diligence_flags.find((f) => f.item === "ip_assignments").status, "missing");
});
