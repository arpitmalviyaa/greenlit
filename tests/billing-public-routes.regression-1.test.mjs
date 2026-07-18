import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

// Regression: billing plan reads and signed provider webhooks were redirected
// to login even though both route handlers are intentionally public.
// Found by /qa on 2026-07-18.
test("billing plans and webhook bypass the login redirect", () => {
  const middleware = readFileSync(new URL("../lib/supabase/middleware.ts", import.meta.url), "utf8");
  assert.match(middleware, /"\/api\/billing\/plans"/);
  assert.match(middleware, /"\/api\/billing\/webhook"/);
});
