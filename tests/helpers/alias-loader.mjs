// Node module-resolution hooks for route-level tests:
//  1. Maps the Next.js "@/x" alias to <repo-root>/x(.ts|.tsx|/index.ts).
//  2. Substitutes auth/supabase modules with test doubles (mocks/) so route
//     handlers can be invoked outside a Next request scope.
// Used via: node --test --import ./tests/helpers/register-loader.mjs <test>
import { existsSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";
import { dirname, join } from "node:path";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");

const SUBSTITUTES = {
  "@/lib/corpus/admin": join(ROOT, "tests/helpers/mocks/admin.mjs"),
  "@/lib/supabase/server": join(ROOT, "tests/helpers/mocks/supabase.mjs"),
};

function resolveAlias(specifier) {
  const rel = specifier.slice(2);
  for (const candidate of [
    join(ROOT, `${rel}.ts`),
    join(ROOT, `${rel}.tsx`),
    join(ROOT, rel, "index.ts"),
    join(ROOT, rel),
  ]) {
    if (existsSync(candidate)) return pathToFileURL(candidate).href;
  }
  return null;
}

export async function resolve(specifier, context, nextResolve) {
  if (SUBSTITUTES[specifier]) {
    return { url: pathToFileURL(SUBSTITUTES[specifier]).href, shortCircuit: true };
  }
  if (specifier.startsWith("@/")) {
    const url = resolveAlias(specifier);
    if (url) return { url, shortCircuit: true };
  }
  // Extensionless relative imports inside .ts sources ("./retrieve").
  if ((specifier.startsWith("./") || specifier.startsWith("../")) && context.parentURL?.startsWith("file:")) {
    const parentDir = dirname(fileURLToPath(context.parentURL));
    for (const candidate of [
      join(parentDir, `${specifier}.ts`),
      join(parentDir, `${specifier}.tsx`),
      join(parentDir, specifier, "index.ts"),
    ]) {
      if (existsSync(candidate)) return { url: pathToFileURL(candidate).href, shortCircuit: true };
    }
  }
  // Next's subpath exports need the .js extension under bare-node resolution.
  if (/^next\/[a-z-]+$/.test(specifier)) {
    return nextResolve(`${specifier}.js`, context);
  }
  return nextResolve(specifier, context);
}
