# Greenlit Schema and RLS Audit

Generated: 2026-07-04 17:50 IST
Migrations scanned: 37
Tables declared in migrations: 80
RLS enable statements: 79
Policies declared: 192

## RLS Enabled Tables

- `organisations`
- `profiles`
- `contracts`
- `campaigns`
- `creators`
- `sows`
- `scope_items`
- `approvals`
- `evidence_vault`
- `exclusivity_records`
- `content_scans`
- `legal_notices`
- `ip_records`
- `invitations`
- `organisation_jurisdictions`
- `jurisdiction_corpus`
- `content_advanced_scans`
- `claims`
- `claim_evidence`
- `claim_audit_log`
- `sow_templates`
- `sows`
- `sow_deliverables`
- `sow_payment_milestones`
- `scope_change_requests`
- `scope_alerts`
- `invoices`
- `delivery_locks`
- `approval_requests`
- `proof_vault_entries`
- `evidence_timeline`
- `deal_rooms`
- `deal_messages`
- `exclusivity_alerts`
- `whitelisting_requests`
- `rights_valuations`
- `safety_passports`
- `send_scans`
- `meeting_transcripts`
- `term_sheets`
- `crisis_rooms`
- `liability_maps`
- `infringement_records`
- `takedown_notices`
- `playbook_entries`
- `clause_library`
- `nda_scans`
- `ai_workflow_scans`
- `vendor_contracts`
- `cross_reference_queries`
- `adversary_analyses`
- `complaint_simulations`
- `organisation_subscriptions`
- `billing_events`
- `compatibility_runs`
- `golden_documents`
- `brands`
- `contract_versions`
- `contract_reviews`
- `contract_clauses`
- `contract_comments`
- `contract_revisions`
- `contract_exports`
- `audit_logs`
- `background_jobs`
- `notifications`
- `search_index`
- `activity`
- `timeline`
- `platform_admins`
- `contract_versions`
- `negotiation_messages`
- `negotiation_memory`
- `creator_clause_preferences`
- `workspace_assignments`
- `review_metrics`
- `email_threads`
- `email_messages`
- `email_draft_replies`

## Storage Buckets Observed From Migrations

- `contracts` private bucket, org-scoped path policies
- `proof-vault` private bucket, org-scoped path policies
- `claim-evidence` private bucket, org-scoped path policies
- `ip-evidence` private bucket, org-scoped path policies

## Audit Notes

- Static `npm run supabase:audit` passed after scanning buckets, policies, RLS markers, and elevated grants.
- Cross-workspace proof upload was verified in production after deploy: org A attempting org B contract proof upload returned HTTP 404.
- Schema drift was not fully proven by direct `information_schema` comparison because no SQL admin channel was used; repository migrations and live behavior were used as evidence.