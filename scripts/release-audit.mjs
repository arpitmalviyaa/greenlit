import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

const issues = [];

checkMigrations();
checkApiDocs();
checkScriptsAndCi();
checkEmailNeutrality();
checkHardeningWiring();
checkRc2Docs();

if (issues.length) {
  console.error("Release audit failed:");
  for (const issue of issues) console.error(`- ${issue}`);
  process.exit(1);
}

console.log("Release audit passed.");

function checkMigrations() {
  const files = readdirSync("supabase/migrations").filter((file) => file.endsWith(".sql")).sort();
  const numberedFiles = files.filter((file) => /^\d{3}_/.test(file));
  const numbers = numberedFiles.map((file) => Number(file.slice(0, 3)));
  const seen = new Set();
  for (const number of numbers) {
    if (seen.has(number)) issues.push(`duplicate migration number ${String(number).padStart(3, "0")}`);
    seen.add(number);
  }
  for (let expected = 1; expected <= Math.max(...numbers); expected += 1) {
    if (!seen.has(expected)) issues.push(`missing migration number ${String(expected).padStart(3, "0")}`);
  }
  for (const required of ["024_compatibility_validation.sql", "027_production_infrastructure.sql", "032_workspace_persistence.sql", "033_email_negotiation_and_upload_hardening.sql"]) {
    if (!files.includes(required)) issues.push(`required migration missing: ${required}`);
  }
  if (!(position(files, "024_compatibility_validation.sql") < position(files, "027_production_infrastructure.sql") &&
    position(files, "027_production_infrastructure.sql") < position(files, "032_workspace_persistence.sql") &&
    position(files, "032_workspace_persistence.sql") < position(files, "033_email_negotiation_and_upload_hardening.sql"))) {
    issues.push("required migrations 024, 027, 032, 033 are not ordered correctly");
  }
}

function checkApiDocs() {
  const api = read("docs/API.md");
  for (const route of [
    "/api/workspace/search",
    "/api/workspace/notifications",
    "/api/workspace/timeline",
    "/api/workspace/contracts/{contract_id}/versions",
    "/api/workspace/contracts/{contract_id}/comments",
    "/api/email/ingest",
    "/api/counsel/upload",
  ]) {
    if (!api.includes(route)) issues.push(`docs/API.md missing ${route}`);
  }
  if (!api.includes("provider-neutral")) issues.push("docs/API.md must call email ingestion provider-neutral");
}

function checkScriptsAndCi() {
  const pkg = JSON.parse(read("package.json"));
  for (const script of [
    "test:phase24-25", "test:phase26-28", "test:phase29-30", "test:phases",
    "test:unit", "test:integration", "release:audit", "env:check",
    "migration:audit", "supabase:audit", "security:audit", "deps:audit", "bundle:report",
    "performance:audit", "smoke", "verify:nonlive", "verify:release",
  ]) {
    if (!pkg.scripts?.[script]) issues.push(`package.json missing ${script}`);
  }
  const ga = ".github/workflows/ga.yml";
  if (!existsSync(ga)) {
    issues.push(`${ga} missing`);
  } else {
    const contents = read(ga);
    for (const job of ["lint", "typecheck", "unit", "integration", "phase-tests", "dependency-audit", "build", "smoke-tests", "release-verification"]) {
      if (!contents.includes(`${job}:`)) issues.push(`${ga} missing job ${job}`);
    }
    if (!contents.includes("npm run verify:release")) issues.push(`${ga} must run npm run verify:release`);
  }
  if (existsSync(".github/workflows/rc1.yml")) issues.push("obsolete RC1 workflow must be removed");
}

function checkEmailNeutrality() {
  const text = [
    read("lib/engine/email/model.ts"),
    read("lib/engine/email/core.ts"),
    read("lib/engine/email/service.ts"),
    read("app/api/email/ingest/route.ts"),
  ].join("\n");
  for (const forbidden of ["sendMail", "smtp", "access_token", "refresh_token", "client_secret"]) {
    if (text.toLowerCase().includes(forbidden.toLowerCase())) issues.push(`email code contains live-provider marker: ${forbidden}`);
  }
}

function checkHardeningWiring() {
  const upload = read("app/api/counsel/upload/route.ts");
  if (!upload.includes("validateDocxPackage")) issues.push("upload route does not call validateDocxPackage");
  if (!upload.includes("checkRateLimit")) issues.push("upload route does not call checkRateLimit");
  if (!upload.includes("contract_id")) issues.push("upload route response no longer includes contract_id");
  if (!upload.includes("text_preview")) issues.push("upload route response no longer includes text_preview");
  if (!read("lib/supabase/middleware.ts").includes("x-request-id")) issues.push("middleware must attach request ids");
  if (!read("lib/supabase/middleware.ts").includes("user_id")) issues.push("request logs must include authenticated user ids when available");
  if (!existsSync("instrumentation.ts")) issues.push("instrumentation.ts missing unhandled error hooks");
  if (!read("app/api/billing/webhook/route.ts").includes("WEBHOOK_NOT_CONFIGURED")) issues.push("webhook must fail closed when missing secret");
  if (read("app/api/billing/create-subscription/route.ts").includes("local_")) issues.push("billing must not create local fallback subscriptions");
  if (!existsSync("app/api/workspace/contracts/[contract_id]/comments/route.ts")) issues.push("comments API route missing");
  if (!read(".gitignore").includes(".claude/")) issues.push(".claude/ must be gitignored");
}

function checkRc2Docs() {
  for (const path of [
    "docs/DEPLOYMENT.md",
    "docs/BACKUP_RECOVERY.md",
    "docs/PRODUCTION_SECURITY_AUDIT.md",
    "docs/PERFORMANCE_AUDIT.md",
    "docs/GA_RELEASE.md",
    "docs/OPERATIONS.md",
    "docs/INCIDENT_RESPONSE.md",
    "docs/SECRETS.md",
  ]) {
    if (!existsSync(path)) issues.push(`${path} missing`);
  }
}

function read(path) {
  return readFileSync(join(process.cwd(), path), "utf8");
}

function position(files, file) {
  const idx = files.indexOf(file);
  return idx === -1 ? Number.POSITIVE_INFINITY : idx;
}
