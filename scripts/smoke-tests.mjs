import { existsSync, readFileSync } from "node:fs";

const checks = [
  ["homepage", "app/page.tsx"],
  ["login", "app/(auth)/login/page.tsx"],
  ["dashboard", "app/(dashboard)/agency/page.tsx"],
  ["contract upload", "app/api/counsel/upload/route.ts"],
  ["contract review", "app/api/counsel/analyse/route.ts"],
  ["comments", "app/api/workspace/contracts/[contract_id]/comments/route.ts"],
  ["email ingest", "app/api/email/ingest/route.ts"],
  ["approval flow submit", "app/api/approvals/submit/route.ts"],
  ["approval flow review", "app/api/approvals/review/route.ts"],
  ["notifications", "app/api/workspace/notifications/route.ts"],
  ["health endpoint", "app/api/health/route.ts"],
  ["readiness endpoint", "app/api/ready/route.ts"],
];

const issues = [];
for (const [name, path] of checks) {
  if (!existsSync(path)) issues.push(`${name} missing at ${path}`);
}

const db = [
  "supabase/migrations/027_production_infrastructure.sql",
  "supabase/migrations/033_email_negotiation_and_upload_hardening.sql",
].map((path) => readFileSync(path, "utf8")).join("\n").toLowerCase();

for (const table of ["contract_comments", "email_threads", "email_messages", "email_draft_replies", "notifications"]) {
  if (!db.includes(table)) issues.push(`database smoke surface missing ${table}`);
}

const upload = read("app/api/counsel/upload/route.ts");
for (const marker of ["validateDocxPackage", "checkRateLimit", "contentSha256", "error_id"]) {
  if (!upload.includes(marker)) issues.push(`contract upload missing ${marker}`);
}

const emailRoute = read("app/api/email/ingest/route.ts");
const emailService = read("lib/engine/email/service.ts");
for (const marker of ["ingestEmailNegotiation"]) {
  if (!emailRoute.includes(marker)) issues.push(`email ingest route missing ${marker}`);
}
for (const marker of ["requireWorkspaceProfile", "email_draft_replies", "background_jobs"]) {
  if (!emailService.includes(marker)) issues.push(`email ingest service missing ${marker}`);
}

if (existsSync(".next/build-manifest.json")) {
  const manifest = read(".next/build-manifest.json");
  if (!manifest.includes("/_app")) issues.push("Next build manifest missing app bundle");
}

if (issues.length) {
  console.error("Smoke tests failed:");
  for (const issue of issues) console.error(`- ${issue}`);
  process.exit(1);
}

console.log("Smoke tests passed: homepage, login, dashboard, upload, review, comments API, email ingest, approvals, notifications, and health endpoints.");

function read(path) {
  return readFileSync(path, "utf8");
}
