# Two-Tenant RLS Results

Gate: **PASS — 60/60 assertions**

Actors were anon, authenticated user A in organisation A, and authenticated user B in organisation B. The service role created and removed fixtures only.

| Table/flow | Actor | Operation | Expected | Actual | Result |
|---|---|---|---|---|---|
| profiles | A | SELECT own PK | 1 row | 1 row | PASS |
| profiles | B | SELECT A PK | 0 rows | 0 rows | PASS |
| organisations | A | SELECT own PK | 1 row | 1 row | PASS |
| organisations | B | SELECT A PK | 0 rows | 0 rows | PASS |
| contracts | A | SELECT own PK | 1 row | 1 row | PASS |
| contracts | B | SELECT A PK | 0 rows | 0 rows | PASS |
| contracts | B | SELECT list | no A row | only B row visible | PASS |
| approval_requests | A | SELECT own PK | 1 row | 1 row | PASS |
| approval_requests | B | SELECT A PK | 0 rows | 0 rows | PASS |
| approval_requests | B | SELECT list | no A row | only B row visible | PASS |
| proof_vault_entries | A | SELECT own PK | 1 row | 1 row | PASS |
| proof_vault_entries | B | SELECT A PK | 0 rows | 0 rows | PASS |
| proof_vault_entries | B | SELECT list | no A row | only B row visible | PASS |
| delivery_locks | A | SELECT own PK | 1 row | 1 row | PASS |
| delivery_locks | B | SELECT A PK | 0 rows | 0 rows | PASS |
| delivery_locks | B | SELECT list | no A row | only B row visible | PASS |
| contracts | A -> B | UPDATE B PK | zero affected | zero returned | PASS |
| contracts | B | SELECT after forged update | original row/title | original row/title | PASS |
| contracts | A -> B | DELETE B PK | zero affected | zero returned | PASS |
| contracts | B | SELECT after forged delete | row remains | row remains | PASS |
| contracts | A | INSERT with B org ID | RLS rejection | SQLSTATE 42501 | PASS |
| contracts | A | INSERT with A org ID | permitted | inserted | PASS |
| contracts storage | A | UPLOAD A prefix | permitted | uploaded | PASS |
| contracts storage | A | DOWNLOAD A prefix | permitted | downloaded | PASS |
| contracts storage | A -> B | DOWNLOAD B prefix | denied | object hidden | PASS |
| contracts storage | A -> B | UPLOAD B prefix | denied | RLS rejection | PASS |
| proof-vault storage | A | UPLOAD A prefix | permitted | uploaded | PASS |
| proof-vault storage | A | DOWNLOAD A prefix | permitted | downloaded | PASS |
| proof-vault storage | A -> B | DOWNLOAD B prefix | denied | object hidden | PASS |
| proof-vault storage | A -> B | UPLOAD B prefix | denied | RLS rejection | PASS |
| claim-evidence storage | A | UPLOAD A prefix | permitted | uploaded | PASS |
| claim-evidence storage | A | DOWNLOAD A prefix | permitted | downloaded | PASS |
| claim-evidence storage | A -> B | DOWNLOAD B prefix | denied | object hidden | PASS |
| claim-evidence storage | A -> B | UPLOAD B prefix | denied | RLS rejection | PASS |
| ip-evidence storage | A | UPLOAD A prefix | permitted | uploaded | PASS |
| ip-evidence storage | A | DOWNLOAD A prefix | permitted | downloaded | PASS |
| ip-evidence storage | A -> B | DOWNLOAD B prefix | denied | object hidden | PASS |
| ip-evidence storage | A -> B | UPLOAD B prefix | denied | RLS rejection | PASS |
| analytics_events | A | SELECT | 0 rows | 0 rows | PASS |
| analytics_events | anon | SELECT | denied | SQLSTATE 42501 | PASS |
| compliance_findings | A | SELECT | 0 rows | 0 rows | PASS |
| compliance_findings | anon | SELECT | denied | SQLSTATE 42501 | PASS |
| finding_feedback | A | SELECT | 0 rows | 0 rows | PASS |
| finding_feedback | anon | SELECT | denied | SQLSTATE 42501 | PASS |
| scope_items | A | SELECT | 0 rows | 0 rows | PASS |
| scope_items | anon | SELECT | denied | SQLSTATE 42501 | PASS |
| corpus_documents | A | SELECT | 0 rows | 0 rows | PASS |
| corpus_documents | anon | SELECT | denied | SQLSTATE 42501 | PASS |
| corpus_chunks | A | SELECT | 0 rows | 0 rows | PASS |
| corpus_chunks | anon | SELECT | denied | SQLSTATE 42501 | PASS |
| analysis_corpus_refs | A | SELECT | 0 rows | 0 rows | PASS |
| analysis_corpus_refs | anon | SELECT | denied | SQLSTATE 42501 | PASS |
| startup_matters | A | SELECT | 0 rows | 0 rows | PASS |
| startup_matters | anon | SELECT | denied | SQLSTATE 42501 | PASS |
| startup_documents | A | SELECT | 0 rows | 0 rows | PASS |
| startup_documents | anon | SELECT | denied | SQLSTATE 42501 | PASS |
| startup_memos | A | SELECT | 0 rows | 0 rows | PASS |
| startup_memos | anon | SELECT | denied | SQLSTATE 42501 | PASS |
| contracts | anon | SELECT | denied | SQLSTATE 42501 | PASS |
| contracts | anon | INSERT | denied | SQLSTATE 42501 | PASS |

The four tenant buckets consistently use organisation ID as the first path segment: `contracts`, `proof-vault`, `claim-evidence`, and `ip-evidence`. `corpus` and `startup-docs` use UUID-prefixed service-only paths and are intentionally not tenant buckets; authenticated and anon table access to their metadata is denied.
