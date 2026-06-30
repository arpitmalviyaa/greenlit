import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

const dir = "supabase/migrations";
const files = readdirSync(dir).filter((file) => file.endsWith(".sql")).sort();
const issues = [];

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

for (const file of files) {
  const sql = readFileSync(join(dir, file), "utf8");
  const lower = sql.toLowerCase();
  if (/\bdrop\s+(table|column|schema|type)\b/.test(lower)) issues.push(`${file} contains destructive DROP`);
  if (/\btruncate\s+table\b/.test(lower)) issues.push(`${file} contains TRUNCATE`);
  if (/\bdelete\s+from\b/.test(lower)) issues.push(`${file} contains DELETE`);
  if (/\balter\s+table\b[\s\S]{0,120}\bdrop\s+(column|table|type|schema)\b/.test(lower)) {
    issues.push(`${file} contains destructive ALTER TABLE DROP`);
  }
}

const migration033 = readFileSync(join(dir, "033_email_negotiation_and_upload_hardening.sql"), "utf8").toLowerCase();
for (const required of [
  "create table if not exists email_threads",
  "create table if not exists email_messages",
  "create table if not exists email_draft_replies",
  "enable row level security",
  "create policy",
  "on delete cascade",
  "on delete set null",
  "create index if not exists idx_email_threads_contract",
  "create index if not exists idx_email_messages_thread",
]) {
  if (!migration033.includes(required)) issues.push(`033 missing ${required}`);
}

if (issues.length) {
  console.error("Migration audit failed:");
  for (const issue of issues) console.error(`- ${issue}`);
  process.exit(1);
}

console.log(`Migration audit passed: ${files[0]} -> ${files.at(-1)}, ${files.length} migrations, no destructive operations.`);
