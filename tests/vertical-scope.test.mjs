// Phase 1 acceptance: creator and startup corpora must NEVER co-retrieve.
// The whole isolation guarantee lives in verticalScope() — retrieval applies it
// as `.in("vertical", scope)`. This compiles that pure module (no DB, no alias
// imports) and asserts the invariant directly.
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { createRequire } from "node:module";
import { rmSync } from "node:fs";
import test from "node:test";

const buildDir = ".vertical-scope-test-build";
rmSync(buildDir, { recursive: true, force: true });
execFileSync("npx", [
  "tsc", "--module", "commonjs", "--target", "es2022", "--moduleResolution", "node",
  "--esModuleInterop", "--skipLibCheck", "--strict",
  "--outDir", buildDir, "--rootDir", ".", "lib/corpus/vertical.ts",
], { stdio: "inherit" });

const requireBuilt = createRequire(`${process.cwd()}/${buildDir}/tests/vertical-scope.test.cjs`);
const { verticalScope, VERTICALS, isVertical } = requireBuilt("../lib/corpus/vertical.js");

test.after(() => rmSync(buildDir, { recursive: true, force: true }));

test("creator scope reads creator + general, never startup/litigation", () => {
  const scope = verticalScope("creator");
  assert.deepEqual([...scope].sort(), ["creator", "general"]);
  assert.ok(!scope.includes("startup"));
  assert.ok(!scope.includes("litigation"));
});

test("startup scope reads startup + general, never creator", () => {
  const scope = verticalScope("startup");
  assert.deepEqual([...scope].sort(), ["general", "startup"]);
  assert.ok(!scope.includes("creator"));
});

test("general reads only general (no cross-vertical bleed)", () => {
  assert.deepEqual(verticalScope("general"), ["general"]);
});

test("no two non-general verticals ever share a non-general chunk source", () => {
  const nonGeneral = VERTICALS.filter((v) => v !== "general");
  for (const a of nonGeneral) for (const b of nonGeneral) {
    if (a === b) continue;
    const overlap = verticalScope(a).filter((v) => v !== "general" && verticalScope(b).includes(v));
    assert.equal(overlap.length, 0, `${a} and ${b} must not co-retrieve`);
  }
});

test("isVertical rejects junk, accepts known values", () => {
  assert.ok(isVertical("startup"));
  assert.ok(!isVertical("bogus"));
  assert.ok(!isVertical(null));
});
