import { spawnSync } from "node:child_process";

const commands = [
  ["npm", ["run", "release:audit"]],
  ["npm", ["run", "env:check", "--", "--allow-missing"]],
  ["npm", ["run", "migration:audit"]],
  ["npm", ["run", "supabase:audit"]],
  ["npm", ["run", "security:audit"]],
  ["npm", ["run", "deps:audit"]],
  ["npm", ["run", "lint"]],
  ["npm", ["run", "type-check"]],
  ["npm", ["run", "test:phases"]],
  ["npm", ["run", "build"]],
  ["npm", ["run", "bundle:report"]],
  ["npm", ["run", "smoke"]],
  ["npm", ["run", "performance:audit"]],
];

for (const [cmd, args] of commands) {
  console.log(`\n$ ${cmd} ${args.join(" ")}`);
  const result = spawnSync(cmd, args, { stdio: "inherit", shell: process.platform === "win32" });
  if (result.status !== 0) process.exit(result.status ?? 1);
}

console.log("\nNon-live release verification passed.");
