import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

const sql = readdirSync("supabase/migrations")
  .filter((file) => file.endsWith(".sql"))
  .sort()
  .map((file) => `\n-- ${file}\n${readFileSync(join("supabase/migrations", file), "utf8")}`)
  .join("\n")
  .toLowerCase();

const issues = [];

for (const bucket of ["contracts", "proof-vault", "ip-evidence"]) {
  if (!sql.includes(`'${bucket}'`)) issues.push(`storage bucket not declared: ${bucket}`);
}
for (const policy of [
  "contracts org read",
  "contracts org write",
  "contracts org update",
  "contracts org delete",
  "claim-evidence org read",
  "ip-evidence org write",
  "proof-vault org delete",
  "email_threads_same_org",
  "email_messages_same_org",
  "email_draft_replies_same_org",
]) {
  if (!sql.includes(policy.toLowerCase())) issues.push(`policy missing: ${policy}`);
}
for (const table of ["email_threads", "email_messages", "email_draft_replies", "contracts", "background_jobs", "notifications"]) {
  const marker = `alter table ${table} enable row level security`;
  if (!sql.includes(marker)) issues.push(`RLS not enabled for ${table}`);
}
if (/\bgrant\s+all\b[\s\S]{0,120}\banon\b/.test(sql)) issues.push("anon role has GRANT ALL");
if (/\bservice_role\b[\s\S]{0,120}\bstorage\.objects\b/.test(sql)) issues.push("service_role storage override found in migrations");
if (/\bcreate\s+policy\b[\s\S]{0,200}\busing\s*\(\s*true\s*\)/.test(sql)) issues.push("wide-open policy using(true) found");

for (const table of ["notifications", "background_jobs"]) {
  if (!sql.includes(`create table if not exists ${table}`)) issues.push(`realtime-ready table missing: ${table}`);
}

if (issues.length) {
  console.error("Supabase audit failed:");
  for (const issue of issues) console.error(`- ${issue}`);
  process.exit(1);
}

console.log("Supabase audit passed: buckets, policies, RLS, realtime markers, and elevated grants checked.");
