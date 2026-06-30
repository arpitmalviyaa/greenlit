import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { createRequire } from "node:module";
import { rmSync } from "node:fs";
import test from "node:test";

const buildDir = ".phase-test-build";
const sourceFiles = [
  "lib/engine/docx/package.ts",
  "lib/engine/validation/compatibility.ts",
  "lib/engine/regression/golden-corpus.ts",
  "lib/engine/regression/snapshots.ts",
  "lib/engine/infrastructure/audit.ts",
  "lib/engine/infrastructure/auth.ts",
  "lib/engine/infrastructure/config.ts",
  "lib/engine/infrastructure/jobs.ts",
  "lib/engine/infrastructure/rbac.ts",
  "lib/engine/infrastructure/search.ts",
  "lib/engine/infrastructure/index.ts",
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

const requireBuilt = createRequire(`${process.cwd()}/${buildDir}/tests/phase24-25.test.cjs`);
const docxPackage = requireBuilt("../lib/engine/docx/package.js");
const compatibility = requireBuilt("../lib/engine/validation/compatibility.js");
const corpus = requireBuilt("../lib/engine/regression/golden-corpus.js");
const snapshots = requireBuilt("../lib/engine/regression/snapshots.js");
const infrastructure = requireBuilt("../lib/engine/infrastructure/index.js");

test.after(() => {
  rmSync(buildDir, { recursive: true, force: true });
});

test("golden corpus validates required features and stress sizes", () => {
  const golden = corpus.buildGoldenCorpus();
  assert.deepEqual(
    golden.documents.map((doc) => doc.name).sort(),
    ["complex_features", "stress_100_pages", "stress_20_pages", "stress_500_pages", "stress_5_pages"]
  );
  for (const document of golden.documents) {
    const report = compatibility.validateExportedDocx(document.docx, { sourceName: document.name });
    assert.equal(report.valid, true, JSON.stringify(report, null, 2));
    for (const [feature, minimum] of Object.entries(document.expected_features)) {
      assert.ok((report.feature_counts[feature] ?? 0) >= minimum, feature);
    }
    assert.deepEqual(
      report.editor_validations.map((item) => item.editor).sort(),
      ["google_docs", "libreoffice", "word_desktop", "word_online"]
    );
  }
});

test("snapshot regression detects changed document xml", () => {
  const document = corpus.buildGoldenCorpus().byName("stress_5_pages");
  const comparator = new snapshots.SnapshotComparator();
  const baseline = comparator.snapshot(document.docx, document.name);
  const changed = mutatePart(document.docx, "word/document.xml", (content) =>
    Buffer.from(content.toString("utf8").replace("Page 3", "Page X"))
  );
  const current = comparator.snapshot(changed, document.name);
  const diff = comparator.compare(baseline, current);
  assert.equal(diff.passed, false);
  assert.ok(diff.changed_parts.includes("word/document.xml"));
});

test("invalid relationship target fails compatibility validation", () => {
  const document = corpus.buildGoldenCorpus().byName("stress_5_pages");
  const broken = mutatePart(document.docx, "word/_rels/document.xml.rels", (content) =>
    Buffer.from(content.toString("utf8").replace("styles.xml", "missing.xml"))
  );
  const report = compatibility.validateExportedDocx(broken, { sourceName: "broken.docx" });
  assert.equal(report.valid, false);
  assert.ok(report.issues.some((issue) => issue.code === "REL_TARGET_MISSING"));
});

test("configuration, jwt, rbac, jobs, and search are production-safe", () => {
  assert.throws(() => infrastructure.productionConfigFromEnv({}));
  const config = infrastructure.productionConfigFromEnv({
    GREENLIT_ENV: "production",
    NEXT_PUBLIC_SUPABASE_URL: "https://example.supabase.co",
    NEXT_PUBLIC_SUPABASE_ANON_KEY: "anon",
    SUPABASE_SERVICE_ROLE_KEY: "service",
    GREENLIT_JWT_SECRET: "x".repeat(32),
    NEXT_PUBLIC_APP_URL: "https://app.greenlit.example",
    DATABASE_URL: "postgresql://user:pass@db.example/greenlit",
    ANTHROPIC_API_KEY: "test-anthropic-key",
    GREENLIT_EMAIL_PROVIDER: "api",
  });
  assert.equal(config.storageBucket, "contracts");

  const jwt = new infrastructure.JwtService("s".repeat(32));
  const access = jwt.issue({ subject: "user_1", organisationId: "org_1", role: "manager", ttlSeconds: 60 });
  assert.equal(jwt.verify(access).org_id, "org_1");
  const refresh = jwt.issue({ subject: "user_1", organisationId: "org_1", role: "manager", tokenType: "refresh", ttlSeconds: 3600 });
  assert.equal(jwt.verify(refresh, { expectedType: "refresh" }).typ, "refresh");

  const hasher = new infrastructure.PasswordHasher();
  const encoded = hasher.hash("correct horse battery staple");
  assert.equal(hasher.verify("correct horse battery staple", encoded), true);
  assert.equal(hasher.verify("wrong horse battery staple", encoded), false);

  infrastructure.assertAllowed("manager", "review:create");
  assert.throws(() => infrastructure.assertAllowed("creator", "review:create"));

  const queue = new infrastructure.JobQueue(new infrastructure.RetryPolicy(2, 1, 10));
  const first = queue.enqueue("export", { version_id: "v1" }, { organisationId: "org_1", idempotencyKey: "export:v1" });
  assert.equal(queue.enqueue("export", { version_id: "v1" }, { organisationId: "org_1", idempotencyKey: "export:v1" }).id, first.id);
  const reserved = queue.reserve(new Date());
  queue.fail(reserved.id, "temporary outage", new Date(0));
  const reservedAgain = queue.reserve(new Date(2000));
  assert.equal(queue.fail(reservedAgain.id, "permanent outage", new Date(2000)).status, "dead");

  const index = new infrastructure.SearchIndex();
  for (const type of ["contracts", "brands", "creators", "clauses", "comments", "versions"]) {
    index.upsert({ id: `${type}_1`, organisation_id: "org_1", document_type: type, title: type, body: "usage rights payment approval", metadata: {} });
    index.upsert({ id: `${type}_2`, organisation_id: "org_2", document_type: type, title: type, body: "usage rights payment approval", metadata: {} });
  }
  const results = index.search("usage payment", { organisationId: "org_1", limit: 10 });
  assert.equal(results.length, 6);
  assert.deepEqual(new Set(results.map((result) => result.organisation_id)), new Set(["org_1"]));
  assert.deepEqual(index.search("approval", { organisationId: "org_1", documentTypes: new Set(["clauses"]) }).map((result) => result.document_type), ["clauses"]);
});

function mutatePart(docx, name, transform) {
  const parts = docxPackage.readDocxParts(docx);
  parts.set(name, transform(parts.get(name)));
  return docxPackage.writeDocxParts(parts);
}
