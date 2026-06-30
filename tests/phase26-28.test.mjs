import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { createRequire } from "node:module";
import { rmSync } from "node:fs";
import test from "node:test";

const buildDir = ".phase26-28-test-build";
const sourceFiles = [
  "lib/engine/workspace/model.ts",
  "lib/engine/workspace/core.ts",
];

rmSync(buildDir, { recursive: true, force: true });
execFileSync("npx", [
  "tsc",
  "--module",
  "commonjs",
  "--target",
  "es2022",
  "--moduleResolution",
  "node",
  "--esModuleInterop",
  "--skipLibCheck",
  "--strict",
  "--outDir",
  buildDir,
  "--rootDir",
  ".",
  ...sourceFiles,
], { stdio: "inherit" });

const requireBuilt = createRequire(`${process.cwd()}/${buildDir}/tests/phase26-28.test.cjs`);
const core = requireBuilt("../lib/engine/workspace/core.js");

test.after(() => {
  rmSync(buildDir, { recursive: true, force: true });
});

test("version graph preserves ordered version history", () => {
  const graph = core.buildVersionGraph("contract_1", [
    version("v3", 3),
    version("v1", 1),
    version("v2", 2),
  ]);
  assert.deepEqual(graph.versions.map((item) => item.id), ["v1", "v2", "v3"]);
  assert.deepEqual(graph.edges, [
    { from_version_id: "v1", to_version_id: "v2", kind: "successor" },
    { from_version_id: "v2", to_version_id: "v3", kind: "successor" },
  ]);
  assert.equal(graph.latest_version_id, "v3");
});

test("timeline unifies contract timeline, evidence timeline, and audit history", () => {
  const events = core.mergeTimelineEvents({
    timeline: [{ id: "t1", organisation_id: "org", contract_id: "c1", event_type: "reviewed", event_at: "2026-01-02T00:00:00Z", payload: { title: "Reviewed", summary: "Risk down" } }],
    evidenceTimeline: [{ id: "e1", organisation_id: "org", sow_id: "s1", event_type: "proof_uploaded", title: "Proof", created_at: "2026-01-01T00:00:00Z" }],
    auditLogs: [{ id: "a1", organisation_id: "org", action: "contract_archived", entity_id: "c1", entity_type: "contracts", created_at: "2026-01-03T00:00:00Z", metadata: { reason: "done" } }],
  });
  assert.deepEqual(events.map((event) => event.source), ["evidence_timeline", "timeline", "audit_logs"]);
  assert.equal(events[1].title, "Reviewed");
});

test("automation bundle writes audit, timeline, search, job, and notification payloads", () => {
  const bundle = core.reviewAutomationBundle({
    organisationId: "org",
    actorId: "user",
    contractId: "contract",
    contractTitle: "Creator Agreement",
    action: "review_completed",
    summary: "Two risks resolved",
  });
  assert.equal(bundle.audit_log.action, "review_completed");
  assert.equal(bundle.timeline_event.contract_id, "contract");
  assert.equal(bundle.search_document.entity_type, "contracts");
  assert.equal(bundle.background_job.kind, "search_indexing");
  assert.equal(bundle.notification.kind, "review_update");
});

test("workspace projections include creator and manager expected surfaces", () => {
  const creator = core.creatorWorkspaceData({ contracts: [{ id: "c" }], notifications: [{ id: "n" }] });
  assert.deepEqual(Object.keys(creator).sort(), [
    "brands",
    "clause_preferences",
    "contracts",
    "negotiations",
    "notifications",
    "recent_activity",
    "review_history",
    "saved_playbooks",
    "templates",
  ]);
  const manager = core.managerWorkspaceData({ creators: [{ id: "cr" }], permissions: ["review:create"] });
  assert.equal(manager.organisation_analytics instanceof Object, true);
  assert.deepEqual(manager.permissions, ["review:create"]);
});

test("search indexing payloads and permission boundaries are deterministic", () => {
  const contract = core.contractSearchDocument({
    organisationId: "org",
    contractId: "contract",
    title: "Creator Agreement",
    rawText: "Usage rights and payment terms",
    status: "reviewed",
    riskScore: 12,
  });
  assert.equal(contract.organisation_id, "org");
  assert.equal(contract.entity_type, "contracts");
  assert.match(contract.body, /Usage rights/);

  const clause = core.clauseSearchDocument({
    organisationId: "org",
    clauseId: "clause",
    clauseType: "usage_rights",
    body: "Brand may use content for six months.",
  });
  assert.equal(clause.title, "usage_rights");

  assert.equal(core.canReadWorkspace("creator"), true);
  assert.equal(core.canManageWorkspace("creator"), false);
  assert.equal(core.canManageWorkspace("manager"), true);
});

function version(id, version_number) {
  return {
    id,
    contract_id: "contract_1",
    version_number,
    storage_path: `${id}.docx`,
    content_sha256: id,
    compatibility_status: "valid",
    created_at: `2026-01-0${version_number}T00:00:00Z`,
  };
}
