import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

const issues = [];
const files = walk(".").filter((file) =>
  /\.(ts|tsx|js|mjs|json|yml|yaml)$/.test(file) &&
  !file.includes("node_modules/") &&
  !file.includes(".next/") &&
  !file.includes("app/_archive/") &&
  !file.includes(".claude/") &&
  !file.startsWith("scripts/security-audit.mjs")
);

for (const file of files) {
  const text = readFileSync(file, "utf8");
  const lower = text.toLowerCase();
  if (/(sk_live_|sk-[a-zA-Z0-9]{20,}|ghp_[a-zA-Z0-9]{20,}|xox[baprs]-)/.test(text)) issues.push(`${file}: possible hardcoded secret`);
  if (/dangerouslySetInnerHTML|innerHTML\s*=|new Function\(|\beval\(/.test(text)) issues.push(`${file}: unsafe dynamic code or HTML rendering`);
  if (lower.includes("supabase_service_role_key") && (file.endsWith(".tsx") || file.includes("client.ts"))) {
    issues.push(`${file}: service role key referenced from client-facing code`);
  }
  if (/Storage upload failed:|Signed URL creation failed:|DB insert failed:/.test(text)) {
    issues.push(`${file}: raw provider/database error exposed to client`);
  }
  if (/NextResponse\.json\(\{ error: [^}]*\.message/.test(text)) {
    issues.push(`${file}: raw error.message exposed to client`);
  }
  if (/storagePath\s*=.*\$\{file\.name\}|Date\.now\(\)[^;\n]*\+\s*file\.name/.test(text)) {
    issues.push(`${file}: raw upload filename used in storage path`);
  }
  if (
    /(placeholder implementation|not implemented|pretend integration|configure real|local_\$\{?Date\.now)/i.test(text) &&
    !file.startsWith("docs/") &&
    !file.startsWith("tests/") &&
    !file.startsWith("reports/")
  ) {
    issues.push(`${file}: production code contains placeholder marker`);
  }
}

const webhook = readFileSync("app/api/billing/webhook/route.ts", "utf8");
if (!webhook.includes("timingSafeEqual")) issues.push("billing webhook must use constant-time signature comparison");
if (!webhook.includes("WEBHOOK_NOT_CONFIGURED")) issues.push("billing webhook must fail closed when the secret is missing");

const subscription = readFileSync("app/api/billing/create-subscription/route.ts", "utf8");
if (subscription.includes("local_")) issues.push("billing subscription must not create local fallback subscription IDs");
if (!subscription.includes("RAZORPAY_PLAN_ID_")) issues.push("billing subscription must use configured provider plan IDs");

const middleware = readFileSync("lib/supabase/middleware.ts", "utf8");
for (const header of ["content-security-policy", "x-request-id", "x-frame-options", "x-content-type-options"]) {
  if (!middleware.includes(header)) issues.push(`middleware missing ${header}`);
}

if (issues.length) {
  console.error("Security audit failed:");
  for (const issue of issues) console.error(`- ${issue}`);
  process.exit(1);
}

console.log(`Security audit passed: ${files.length} files scanned.`);

function walk(dir) {
  const out = [];
  for (const name of readdirSync(dir)) {
    if (["node_modules", ".git", ".next"].includes(name)) continue;
    const path = join(dir, name);
    const stat = statSync(path);
    if (stat.isDirectory()) out.push(...walk(path));
    else out.push(path);
  }
  return out;
}
