import { existsSync, readFileSync } from "node:fs";

const checks = [
  ["homepage", "app/page.tsx"],
  ["login", "app/(auth)/login/page.tsx"],
  ["signup", "app/(auth)/signup/page.tsx"],
  ["dashboard", "app/(dashboard)/agency/page.tsx"],
  ["compliance endpoint", "app/api/compliance/feedback/route.ts"],
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

const middleware = read("lib/supabase/middleware.ts");
for (const publicPath of ["/login", "/signup", "/api/health"]) {
  if (!middleware.includes(`"${publicPath}"`)) issues.push(`${publicPath} is not public in auth middleware`);
}
if (!middleware.includes("if (!user && !isPublicRoute)")) issues.push("dashboard routes are not protected by auth middleware");

const compliance = read("app/api/compliance/feedback/route.ts");
if (!compliance.includes("auth.getUser")) issues.push("compliance endpoint is missing user authentication");
if (!compliance.includes("accepted") || !compliance.includes("rejected")) issues.push("compliance endpoint verdict validation is missing");

const health = read("app/api/health/route.ts");
if (!health.includes("ok: true") || !health.includes('service: "greenlit"')) issues.push("health endpoint contract changed");

if (issues.length) {
  console.error("Smoke tests failed:");
  for (const issue of issues) console.error(`- ${issue}`);
  process.exit(1);
}

if (process.env.SMOKE_BASE_URL) await runLiveSmoke(process.env.SMOKE_BASE_URL);

console.log("Smoke tests passed: homepage, login, signup, dashboard auth boundary, compliance endpoint, health endpoint, and core validation surfaces.");

function read(path) {
  return readFileSync(path, "utf8");
}

async function runLiveSmoke(baseUrl) {
  const base = new URL(baseUrl);
  const get = (path) => fetch(new URL(path, base), { redirect: "manual" });
  for (const path of ["/", "/login", "/signup", "/api/health"]) {
    const response = await get(path);
    if (!response.ok) issues.push(`live ${path} returned ${response.status}`);
  }
  const dashboard = await get("/agency");
  if (![302, 303, 307, 308].includes(dashboard.status)) {
    issues.push(`live logged-out dashboard returned ${dashboard.status}, expected an auth redirect`);
  }
  const complianceResponse = await fetch(new URL("/api/compliance/feedback", base), {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: "{}",
    redirect: "manual",
  });
  if (![302, 303, 307, 308, 401].includes(complianceResponse.status)) {
    issues.push(`live compliance auth boundary returned ${complianceResponse.status}`);
  }
  if (issues.length) {
    console.error("Live smoke tests failed:");
    for (const issue of issues) console.error(`- ${issue}`);
    process.exit(1);
  }
}
