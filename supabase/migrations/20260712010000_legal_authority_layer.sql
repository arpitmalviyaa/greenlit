-- Legal-authority layer: the corpus grows first-class support for acts, statutes,
-- rules, regulations, notifications, circulars, case law, and guidelines.
--
-- doc_kind IS the authority type (one source of truth — no parallel
-- authority_type column; the enum carries it).
-- Chunks denormalize citation + section_ref so retrieval can cite the exact
-- provision without a join back to the document.

-- ── extend corpus_doc_kind ────────────────────────────────────────────────────
-- ADD VALUE IF NOT EXISTS is idempotent; values are not used in this migration
-- (PG forbids using a value added in the same transaction).
alter type corpus_doc_kind add value if not exists 'act';
alter type corpus_doc_kind add value if not exists 'statute';
alter type corpus_doc_kind add value if not exists 'rule';
alter type corpus_doc_kind add value if not exists 'regulation';
alter type corpus_doc_kind add value if not exists 'notification';
alter type corpus_doc_kind add value if not exists 'circular';
alter type corpus_doc_kind add value if not exists 'case_law';
alter type corpus_doc_kind add value if not exists 'guideline';

-- ── authority metadata on corpus_documents ────────────────────────────────────
alter table corpus_documents add column if not exists jurisdiction     text not null default 'IN';
alter table corpus_documents add column if not exists citation         text;          -- "Consumer Protection Act, 2019, s.2(28)"
alter table corpus_documents add column if not exists section_ref      text;          -- when the doc IS one provision
alter table corpus_documents add column if not exists issuing_body     text;          -- "MeitY", "SEBI", "Supreme Court of India"
alter table corpus_documents add column if not exists effective_date   date;
alter table corpus_documents add column if not exists superseded_by    uuid references corpus_documents(id) on delete set null;
alter table corpus_documents add column if not exists source_url       text;
-- Retrieval rank weight: acts/statutes (1.0) > rules/regulations (0.9) >
-- notifications/circulars (0.8) > case law (0.7) > guidelines (0.6) >
-- house knowledge (0.5, the default). Set by ingest, tunable per doc.
alter table corpus_documents add column if not exists authority_weight numeric not null default 0.5;

-- ── provision citation on corpus_chunks ───────────────────────────────────────
alter table corpus_chunks add column if not exists citation    text;
alter table corpus_chunks add column if not exists section_ref text;

-- Superseded authorities must not out-rank their replacement; retrieval filters
-- on superseded_by is null for authority kinds (enforced in code, indexed here).
create index if not exists idx_corpus_documents_superseded on corpus_documents (superseded_by) where superseded_by is not null;
