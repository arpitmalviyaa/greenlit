// Fixture-based regression tests for the red-flags structured output standard.
// Runs offline (no API calls). Requires Node >=23 (type stripping for .ts imports).
import assert from "node:assert/strict";
import test from "node:test";

const { RedFlagsSchema } = await import("../lib/anthropic/prompts/red-flags.ts");
const { validateStructured } = await import("../lib/anthropic/structured.ts");

const validFixture = {
  flags: [
    {
      flag_type: "uncapped_indemnity",
      clause_text: "The Influencer shall indemnify the Brand against all losses without limit.",
      severity: "critical",
      business_impact: "You could be liable for unlimited amounts far beyond the deal fee.",
    },
    {
      flag_type: "perpetual_ip_assignment",
      clause_text: "All content is assigned to the Brand in perpetuity across all media.",
      severity: "high",
      business_impact: "The brand can reuse your content forever without further payment.",
    },
  ],
};

test("valid red-flags fixture passes schema", () => {
  const result = validateStructured(RedFlagsSchema, validFixture);
  assert.equal(result.success, true);
  assert.equal(result.data.flags.length, 2);
});

test("empty flags list is valid (clean contract)", () => {
  const result = validateStructured(RedFlagsSchema, { flags: [] });
  assert.equal(result.success, true);
});

test("unknown flag_type is rejected with readable issues", () => {
  const result = validateStructured(RedFlagsSchema, {
    flags: [{ flag_type: "made_up_flag", clause_text: "x", severity: "high", business_impact: "y" }],
  });
  assert.equal(result.success, false);
  assert.match(result.issues, /flag_type/);
});

test("truncated/partial object is rejected (the old max_tokens failure mode)", () => {
  const result = validateStructured(RedFlagsSchema, {
    flags: [{ flag_type: "non_compete", clause_text: "You may not work with" }],
  });
  assert.equal(result.success, false);
});

test("invalid severity is rejected", () => {
  const result = validateStructured(RedFlagsSchema, {
    flags: [{ flag_type: "non_compete", clause_text: "x", severity: "extreme", business_impact: "y" }],
  });
  assert.equal(result.success, false);
});
