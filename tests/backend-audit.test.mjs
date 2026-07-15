import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const apiRoutes = walk("app/api").filter((file) => file.endsWith("/route.ts")).sort();

test("backend route inventory keeps critical production APIs present", () => {
  assert.ok(apiRoutes.length >= 71, `expected at least 71 backend routes, found ${apiRoutes.length}`);
  for (const route of [
    "app/api/health/route.ts",
    "app/api/ready/route.ts",
    "app/api/counsel/upload/route.ts",
    "app/api/counsel/analyse/route.ts",
    "app/api/workspace/contracts/[contract_id]/comments/route.ts",
    "app/api/final-check/start/route.ts",
    "app/api/final-check/upload/route.ts",
    "app/api/proof/upload/route.ts",
    "app/api/billing/status/route.ts",
    "app/api/billing/webhook/route.ts",
  ]) {
    assert.ok(apiRoutes.includes(route), `${route} missing from backend route inventory`);
  }
});

test("public route allowlist stays explicit", () => {
  const publicRoutes = new Set([
    "app/api/health/route.ts",
    "app/api/ready/route.ts",
    "app/api/auth/callback/route.ts",
    "app/api/billing/plans/route.ts",
    "app/api/billing/webhook/route.ts",
    // Marketing-site public APIs: rate-limited live check + analytics beacon
    "app/api/public/live-check/route.ts",
    "app/api/public/event/route.ts",
  ]);

  for (const route of apiRoutes) {
    const source = readFileSync(route, "utf8");
    const protectsWithUserSession =
      source.includes("auth.getUser") ||
      source.includes("requireAdmin") ||
      source.includes("requireWorkspaceProfile") ||
      source.includes('from "@/lib/engine/workspace/service"') ||
      source.includes("ingestEmailNegotiation");
    assert.ok(
      publicRoutes.has(route) || protectsWithUserSession,
      `${route} must authenticate directly, call requireWorkspaceProfile, or be added to the public allowlist`
    );
  }
});

test("logged-out root visitors see the public homepage instead of login", () => {
  const rootPage = readFileSync("app/page.tsx", "utf8");
  const middleware = readFileSync("lib/supabase/middleware.ts", "utf8");

  // Logged-out visitors get the marketing homepage rendered in-place
  assert.match(rootPage, /MarketingNav/);
  assert.match(rootPage, /<Hero \/>/);
  assert.match(middleware, /pathname === "\/"/);
  assert.doesNotMatch(middleware, /PUBLIC_ROUTES = \["\/"/);
});

test("proof upload validates resource ownership before storage or service-role insert", () => {
  const source = readFileSync("app/api/proof/upload/route.ts", "utf8");
  const contractCheck = source.indexOf('.from("contracts")');
  const sowCheck = source.indexOf('.from("sows")');
  const approvalCheck = source.indexOf('.from("approval_requests")');
  const storageUpload = source.indexOf('.storage\n      .from("proof-vault")');
  const serviceInsert = source.indexOf('.from("proof_vault_entries")');

  assert.ok(contractCheck > -1, "contract proof uploads must check contract ownership");
  assert.ok(sowCheck > -1, "SOW proof uploads must check SOW ownership");
  assert.ok(approvalCheck > -1, "approval-scoped proof uploads must check approval ownership");
  assert.ok(storageUpload > -1, "proof upload should still write to proof-vault storage");
  assert.ok(serviceInsert > -1, "proof upload should still create proof_vault_entries");
  assert.ok(contractCheck < storageUpload, "contract ownership check must run before storage upload");
  assert.ok(sowCheck < storageUpload, "SOW ownership check must run before storage upload");
  assert.ok(approvalCheck < storageUpload, "approval ownership check must run before storage upload");
  assert.ok(storageUpload < serviceInsert, "storage path should be created before DB row stores file_path");
  assert.match(source, /File is empty/);
  assert.match(source, /Approval request does not match proof context/);
  assert.match(source, /remove\(\[file_path\]\)/);
});

test("corpus URL ingestion is restricted to configured hosts and rejects redirects", () => {
  const source = readFileSync("app/api/admin/corpus/route.ts", "utf8");
  assert.match(source, /GREENLIT_CORPUS_URL_HOSTS/);
  assert.match(source, /isAllowedCorpusHost\(parsed\.hostname\)/);
  assert.match(source, /redirect: "error"/);
});

function walk(dir) {
  const out = [];
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    const stat = statSync(path);
    if (stat.isDirectory()) out.push(...walk(path));
    else out.push(path);
  }
  return out;
}
