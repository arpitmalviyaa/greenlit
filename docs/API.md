# Greenlit API Notes

Status date: 2026-06-29

## Workspace APIs

- `GET /api/workspace/search?q=&type=&limit=` searches `search_index`.
- `GET /api/workspace/notifications?unread=true` lists org/user notifications.
- `POST /api/workspace/notifications/read` marks a notification read.
- `GET /api/workspace/timeline?contract_id=&sow_id=&include_audit=true` returns unified `timeline`, `evidence_timeline`, and optional `audit_logs` events.
- `GET /api/workspace/contracts/{contract_id}/versions` returns the persistent version graph.
- `GET /api/workspace/contracts/{contract_id}/compare?previous_version_id=&current_version_id=` returns a persisted revision comparison.
- `GET /api/workspace/contracts/{contract_id}/comments` lists org-scoped contract comments.
- `POST /api/workspace/contracts/{contract_id}/comments` creates an org-scoped contract comment with a 5,000 character body limit.
- `POST /api/workspace/contracts/{contract_id}/archive` archives a contract.
- `POST /api/workspace/contracts/{contract_id}/restore` restores an archived contract.
- `GET /api/workspace/creator?status=&sort=&archived=true` returns creator workspace data.
- `GET /api/workspace/manager` returns manager workspace data.

All workspace APIs require an authenticated Supabase session and scope reads or
writes to the caller's `profiles.organisation_id`.

## Health APIs

- `GET /api/health` returns process liveness without touching external services.
- `GET /api/ready` validates required production configuration and returns
  `503 CONFIGURATION_ERROR` when configuration is incomplete.

## Email Negotiation APIs

- `POST /api/email/ingest` ingests a provider-neutral email message, links it to
  an optional `contract_id` or `deal_room_id`, extracts negotiation context,
  prepares an unsent draft reply, writes timeline and notification records, and
  queues a background `email` job for draft processing.

This API is provider-neutral. It does not send mail, perform Gmail OAuth, store
provider credentials, or pretend a Gmail integration exists. `gmail` is only a
future provider value in the adapter/table model.

## Counsel Upload API

- `POST /api/counsel/upload` accepts the existing PDF/DOCX multipart upload
  flow and still returns `contract_id`, `title`, `text_preview`,
  `extraction_error`, and `extraction_success`.

The upload route now enforces authenticated org membership, upload role checks,
per-user/org rate limiting, pre-storage DOCX package validation, org-prefixed
private storage paths, SHA-256 recording, audit logs, timeline events,
notifications, and `document_parsing` background jobs.

Existing counsel, review, DOCX, clause, semantic diff, and export response
contracts remain unchanged unless noted above.
