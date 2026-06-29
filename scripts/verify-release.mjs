import { spawnSync } from "node:child_process";

const commands = [
  ["npm", ["run", "verify:nonlive"]],
];

for (const [cmd, args] of commands) {
  console.log(`\n$ ${cmd} ${args.join(" ")}`);
  const result = spawnSync(cmd, args, { stdio: "inherit", shell: process.platform === "win32" });
  if (result.status !== 0) process.exit(result.status ?? 1);
}

console.log("\nMANUAL STEP REQUIRED: run strict production env validation with live secrets: npm run env:check");
console.log("MANUAL STEP REQUIRED: create and verify Supabase backup before migration.");
console.log("MANUAL STEP REQUIRED: apply Supabase migrations through 033 in production.");
console.log("MANUAL STEP REQUIRED: verify storage buckets, RLS policies, auth settings, realtime, functions, and cron in Supabase.");
console.log("MANUAL STEP REQUIRED: deploy frontend/backend/worker from this commit.");
console.log("MANUAL STEP REQUIRED: run live smoke tests for auth, upload, review, comments, email ingest, approvals, notifications, billing, storage, AI, queue, health, and readiness.");
console.log("\nRelease verification passed for all non-live gates.");
