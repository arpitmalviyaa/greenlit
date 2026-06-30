# Phases 26-28 Engineering Notes

Status date: 2026-06-29

## Architecture

Phases 26-28 extend the canonical Next.js/Supabase architecture. They do not
create a second persistence layer or workspace abstraction.

Reused foundations:

- `organisations`, `profiles`, and Supabase Auth for tenancy and identity.
- `contracts`, `deal_rooms`, SOW/scope, approvals, and proof vault for existing
  workspace flows.
- Phase 25 `contract_versions`, `contract_reviews`, `contract_clauses`,
  `contract_comments`, `contract_revisions`, `contract_exports`,
  `search_index`, `timeline`, `audit_logs`, `background_jobs`, and
  `notifications`.
- `evidence_timeline` remains supported and is normalized together with
  `timeline` by `mergeTimelineEvents`.

New engine modules:

- `lib/engine/workspace/model.ts`
- `lib/engine/workspace/core.ts`
- `lib/engine/workspace/service.ts`

`core.ts` contains reusable business logic. `service.ts` is the Supabase-backed
adapter used by route handlers.

## APIs

Added thin workspace routes:

- `GET /api/workspace/search?q=&type=&limit=`
- `GET /api/workspace/notifications?unread=true`
- `POST /api/workspace/notifications/read`
- `GET /api/workspace/timeline?contract_id=&sow_id=&include_audit=true`
- `GET /api/workspace/contracts/{contract_id}/versions`
- `GET /api/workspace/contracts/{contract_id}/compare?previous_version_id=&current_version_id=`
- `POST /api/workspace/contracts/{contract_id}/archive`
- `POST /api/workspace/contracts/{contract_id}/restore`
- `GET /api/workspace/creator?status=&sort=&archived=true`
- `GET /api/workspace/manager`

Existing counsel, review, DOCX, clause, semantic diff, and export routes are not
removed or renamed.

## Database

Added migration:

- `supabase/migrations/029_workspace_persistence.sql`

New tables:

- `negotiation_memory`
- `creator_clause_preferences`
- `workspace_assignments`
- `review_metrics`

Extended table:

- `contracts.archived_at`
- `contracts.archived_by`

All new tables are scoped by `organisation_id`, use `same_org(organisation_id)`
RLS policies, and follow existing soft-delete conventions where records are
mutable.

## Automation

`reviewAutomationBundle` and `persistReviewAutomation` centralize automatic:

- audit logs;
- timeline events;
- search indexing;
- background jobs;
- notifications.

Archive and restore actions call the automation path.

## Workspace Data

Creator workspace response includes:

- contracts;
- brands;
- negotiations and negotiation memory;
- templates;
- clause preferences;
- saved playbooks;
- review history;
- notifications;
- recent activity.

Manager workspace response includes:

- creator management data;
- team data;
- assignments;
- queues;
- approvals;
- permissions;
- internal review;
- organisation analytics;
- activity feeds;
- legal review queue.
