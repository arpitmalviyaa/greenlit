import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const film = readFileSync(new URL("../components/marketing/film.tsx", import.meta.url), "utf8");
const sections = readFileSync(new URL("../components/marketing/sections.tsx", import.meta.url), "utf8");
const pricing = readFileSync(new URL("../app/pricing/page.tsx", import.meta.url), "utf8");

// Regression: homepage media must play promptly at the approved speed.
// Found by /qa on 2026-07-18.
test("homepage film starts on intersection at 1.25x", () => {
  assert.match(film, /defaultPlaybackRate = 1\.25/);
  assert.match(film, /playbackRate = 1\.25/);
  assert.match(film, /\{ threshold: 0 \}/);
});

test("product stills use the full content width", () => {
  assert.doesNotMatch(sections, /md:grid-cols-2 gap-8 md:gap-14/);
  assert.match(sections, /className="w-full block"/);
});

test("agency price is ₹8,799 per month", () => {
  assert.match(pricing, /name: "Agency",\s+price: "₹8,799",\s+period: "\/month"/);
});
