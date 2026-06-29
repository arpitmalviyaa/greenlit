# Greenlit Database Notes

Status date: 2026-06-29

Phases 26-30 extend the existing Supabase schema.

Reused tables:

- `organisations`
- `profiles`
- `contracts`
- `deal_rooms`
- `evidence_timeline`
- `timeline`
- `contract_versions`
- `contract_reviews`
- `contract_clauses`
- `contract_comments`
- `contract_revisions`
- `contract_exports`
- `search_index`
- `audit_logs`
- `background_jobs`
- `notifications`

Migration `029_workspace_persistence.sql` adds:

- `negotiation_memory`
- `creator_clause_preferences`
- `workspace_assignments`
- `review_metrics`
- `contracts.archived_at`
- `contracts.archived_by`

Migration `030_email_negotiation_and_upload_hardening.sql` adds:

- `email_threads`
- `email_messages`
- `email_draft_replies`

The Phase 30 upload hardening path also uses existing `contracts.content_sha256`,
`audit_logs`, `timeline`, `background_jobs`, and `notifications` records.

All new tables are scoped by `organisation_id` and protected by
`same_org(organisation_id)` RLS policies.
