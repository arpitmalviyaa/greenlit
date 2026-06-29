import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { createRequire } from "node:module";
import { rmSync } from "node:fs";
import test from "node:test";

const buildDir = ".phase29-30-test-build";
const sourceFiles = [
  "lib/engine/docx/package.ts",
  "lib/engine/regression/golden-corpus.ts",
  "lib/engine/email/model.ts",
  "lib/engine/email/core.ts",
  "lib/engine/infrastructure/rate-limit.ts",
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

const requireBuilt = createRequire(`${process.cwd()}/${buildDir}/tests/phase29-30.test.cjs`);
const docxPackage = requireBuilt("../lib/engine/docx/package.js");
const corpus = requireBuilt("../lib/engine/regression/golden-corpus.js");
const emailCore = requireBuilt("../lib/engine/email/core.js");
const rateLimit = requireBuilt("../lib/engine/infrastructure/rate-limit.js");

test.after(() => {
  rmSync(buildDir, { recursive: true, force: true });
});

test("provider-neutral email context and draft do not send or require Gmail credentials", () => {
  const message = {
    provider: "manual",
    provider_thread_id: "thread_1",
    provider_message_id: "message_1",
    direction: "inbound",
    subject: "Usage rights and payment",
    from_address: "brand@example.com",
    to_addresses: ["creator@example.com"],
    sent_at: "2026-06-29T10:00:00Z",
    body_text: "Can we make usage perpetual for $5,000, payable net 90 by 30 June 2026?",
  };
  const context = emailCore.extractNegotiationContext(message);
  assert.deepEqual(context.mentioned_terms.sort(), ["payment", "usage_rights"]);
  assert.ok(context.money.some((item) => item.includes("$5,000")));
  assert.ok(context.risk_flags.includes("perpetual_rights"));
  assert.ok(context.risk_flags.includes("slow_payment"));
  const draft = emailCore.buildDraftReply(message, context);
  assert.equal(draft.subject, "Re: Usage rights and payment");
  assert.match(draft.body, /Can you confirm/);
});

test("DOCX validation accepts valid packages and rejects unsafe ZIP paths", () => {
  const valid = corpus.buildGoldenCorpus().byName("stress_5_pages").docx;
  const report = docxPackage.validateDocxPackage(valid);
  assert.equal(report.valid, true, JSON.stringify(report.issues));

  const parts = docxPackage.readDocxParts(valid);
  parts.set("../evil.xml", Buffer.from("<evil/>"));
  const unsafe = docxPackage.writeDocxParts(parts);
  const unsafeReport = docxPackage.validateDocxPackage(unsafe);
  assert.equal(unsafeReport.valid, false);
  assert.match(unsafeReport.issues[0].code, /UNSAFE_ZIP_PATH/);
});

test("upload rate limiting is deterministic", () => {
  rateLimit.clearRateLimitBuckets();
  assert.equal(rateLimit.checkRateLimit("user:upload", { limit: 2, windowMs: 1000, now: 0 }).allowed, true);
  assert.equal(rateLimit.checkRateLimit("user:upload", { limit: 2, windowMs: 1000, now: 1 }).allowed, true);
  assert.equal(rateLimit.checkRateLimit("user:upload", { limit: 2, windowMs: 1000, now: 2 }).allowed, false);
  assert.equal(rateLimit.checkRateLimit("user:upload", { limit: 2, windowMs: 1000, now: 1001 }).allowed, true);
});

test("DOCX package read stays within a small local benchmark budget", () => {
  const docx = corpus.buildGoldenCorpus().byName("stress_20_pages").docx;
  const start = performance.now();
  const parts = docxPackage.readDocxParts(docx);
  const elapsedMs = performance.now() - start;
  assert.ok(parts.has("word/document.xml"));
  assert.ok(elapsedMs < 250, `DOCX parse exceeded benchmark budget: ${elapsedMs}ms`);
});
