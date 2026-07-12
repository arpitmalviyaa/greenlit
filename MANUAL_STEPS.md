# Greenlit — Manual Steps (refreshed 2026-07-12)

The human to-do list after the master build. Nothing below is automated; each item is
either a secret, a prod-gated action, or a judgment call.

## 1. Secrets / env
- [ ] **`OPENAI_API_KEY`** — add to `.env.local` (local seeding) AND Vercel project env.
      Without it everything still works tsv-only; embeddings + the vector leg of hybrid
      retrieval activate the moment the key exists. New docs embed automatically; for
      anything ingested before the key: `npx tsx scripts/corpus-backfill-embeddings.ts`.
- [ ] **GitHub PAT rotation** — carried over; still pending.

## 2. Prod database (hard-gated migrations)
Apply IN ORDER via Supabase MCP/SQL editor against `ovjqzgzqcyowitjfwptz` on your go-ahead
(all already proven on staging except the last, which is prod-only):
1. `20260712010000_legal_authority_layer.sql`
2. `20260712020000_compliance_findings.sql`
3. `20260712030000_finding_feedback.sql`
4. `20260712040000_vector_search.sql`
5. `20260712050000_security_advisor_closeout.sql` — **prod-only** (staging lacks the app
   schema; do not apply there). Deploy the code in the same window (the overview route now
   calls `platform_creator_overview` with the service role — old code + new DB works, but
   new code + old DB also works; either order is safe, just don't linger half-way).
None are destructive: additive columns/enums/tables/indexes, function replacements, and
one dead-policy drop (`early_access` anon INSERT — zero code paths use it).

## 3. Prod deploy (hard gate)
- [ ] `vercel deploy --prod` from the repo after the migrations above.
- [ ] Smoke: `npm run qa:prod-flow` (existing script) + open `/master` → check the new
      Corpus / Startup analyses nav links work while signed in as platform admin.

## 4. Supabase dashboard toggles (no API for these)
- [ ] **Auth → enable leaked-password protection (HaveIBeenPwned)** on prod. May be
      plan-gated; if the toggle isn't there, note the plan tier it needs.
- [ ] Optional: rename project "mike-oss" → "greenlit-prod" (cosmetic; the name keeps
      misleading everyone).

## 5. Populate the knowledge base (the whole point)
- [ ] House knowledge: `/admin/corpus` → Upload (contracts/judgments as PDF/DOCX) or
      Link tab (blog URLs). Everything lands **unsanitized = not retrievable**.
- [ ] Legal authorities: pick an authority kind in the Upload tab (citation, jurisdiction,
      effective date, issuing body, source URL fields appear), or batch:
      `npx tsx scripts/corpus-seed.ts manifest.json` (see script header for the format).
- [ ] **Review each doc in Library and flip "Mark sanitized"** — retrieval and the
      compliance layer see nothing until then.
- [ ] **Legal review of the statutory corpus** — a lawyer should verify the acts/sections
      ingested are current (superseded_by exists for repealed material) before the
      compliance layer goes live. The system cites whatever you feed it.
- [ ] Seed `tests/golden-set.json` with ~10 real query→citation pairs once authorities are
      in; then `npm run corpus:eval` becomes a meaningful regression gate.

## 6. Flag flips (after corpus is populated + legally reviewed)
- [ ] `lib/flags.ts` → `complianceCheck: true` + redeploy. Verify one real
      `counsel.analyse` run shows the "Statutory check" section with correct citations,
      and `compliance_findings` / `analysis_corpus_refs` rows appear.
- [ ] The other 10 page flags stay OFF (unchanged, separate product decision).

## 7. First real startup matter (moves startup_* off zero rows)
- [ ] `/admin/startup` → New matter → upload docs → review the draft memo → Mark
      reviewed → Export PDF. (Export 403-gates on draft — now covered by tests, but do
      one live pass.)

## 8. Carried-over infra (unchanged this run)
- [ ] Apex `getgreenlit.in` DNS still partly on the old VPS.
- [ ] In-memory live-check rate limiter — move to a durable store only if/when it must
      survive restarts or scale horizontally.
- [ ] Email (Resend/DNS) still blocked on founder — this also blocks any future
      reviewer-notification feature for startup memos.

## Open decisions (deliberately not built)
- Fine-tuning path: separate decision; needs a labeled dataset + cost sign-off.
  `finding_feedback` + the golden set are the raw material if ever green-lit.
- Reviewer assignment/notification for startup memos: deferred while there's one
  platform admin; the "awaiting review" banner covers it.
- `workspace_id`/`prepared_for` FKs: stay free-text until a tenant-facing startup UI
  exists (then add FK + same_org RLS as flagged in migration 20260708000001).
- Embedding provider: OpenAI text-embedding-3-small assumed (matches vector(1536)).
  Switching to Voyage means a column dim change → new migration + re-embed.
