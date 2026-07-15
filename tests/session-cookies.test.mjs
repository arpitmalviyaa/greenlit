// Self-check for the session-cookie downgrade. Run: npx tsx tests/session-cookies.test.mjs
import assert from "node:assert";
import { serialize } from "cookie";
import { toSessionCookie } from "../lib/supabase/session-cookies.ts";

// A real SET (non-empty value, positive maxAge) → maxAge & expires stripped.
const set = toSessionCookie("token123", { maxAge: 400 * 24 * 3600, expires: new Date(), path: "/", sameSite: "lax" });
assert.strictEqual(set.maxAge, undefined, "maxAge must be stripped on set");
assert.strictEqual(set.expires, undefined, "expires must be stripped on set");
assert.strictEqual(set.path, "/", "other options preserved");
assert.ok(!/Max-Age|Expires/i.test(serialize("sb", "token123", set)), "serialized set is a session cookie");

// A DELETION (empty value) → passed through so sign-out still clears the cookie.
const del = toSessionCookie("", { maxAge: 0, path: "/" });
assert.strictEqual(del.maxAge, 0, "deletion maxAge preserved");
assert.ok(/Max-Age=0/.test(serialize("sb", "", del)), "serialized deletion still clears");

// A negative-maxAge deletion is also preserved.
assert.strictEqual(toSessionCookie("x", { maxAge: -1 }).maxAge, -1, "negative maxAge preserved");

console.log("session-cookies: all checks passed");
