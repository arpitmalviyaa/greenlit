import { mkdirSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { performance } from "node:perf_hooks";

const checks = [
  ["cold boot env validation", "npm", ["run", "env:check", "--", "--allow-missing"], 1500],
  ["release audit latency", "npm", ["run", "release:audit"], 1500],
  ["migration audit latency", "npm", ["run", "migration:audit"], 1500],
  ["supabase audit latency", "npm", ["run", "supabase:audit"], 1500],
  ["security audit latency", "npm", ["run", "security:audit"], 2500],
  ["contract upload/review local parser budget", "node", ["--test", "tests/phase29-30.test.mjs"], 10_000],
  ["search/dashboard projection budget", "node", ["--test", "tests/phase26-28.test.mjs"], 10_000],
];

const results = [];
const issues = [];

for (const [name, command, args, budgetMs] of checks) {
  const started = performance.now();
  const result = spawnSync(command, args, { stdio: "pipe", encoding: "utf8", shell: process.platform === "win32" });
  const durationMs = Math.round(performance.now() - started);
  results.push({ name, duration_ms: durationMs, budget_ms: budgetMs, status: result.status ?? 1 });
  if (result.status !== 0) issues.push(`${name} failed`);
  if (durationMs > budgetMs) issues.push(`${name} exceeded budget: ${durationMs}ms > ${budgetMs}ms`);
}

const report = {
  generated_at: new Date().toISOString(),
  environment: "local-ci",
  results,
  notes: [
    "Live API, email ingestion, and dashboard timings require deployed infrastructure and are covered by deployment smoke checks.",
    "Local budgets protect cold boot, parser/upload-adjacent work, search projections, and audit latency from obvious regressions.",
  ],
};

mkdirSync("reports", { recursive: true });
writeFileSync("reports/performance-report.json", `${JSON.stringify(report, null, 2)}\n`);

if (issues.length) {
  console.error("Performance audit failed:");
  for (const issue of issues) console.error(`- ${issue}`);
  process.exit(1);
}

console.log("Performance audit passed. Report written to reports/performance-report.json.");
