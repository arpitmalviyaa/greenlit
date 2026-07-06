# Greenlit Backend API Contract For Frontend Rebuild

Generated: 2026-07-04 17:50 IST

## Global Rules

- Authenticated routes use Supabase SSR cookies. Browser clients should call same-origin `/api/...` with credentials included by default.
- Public routes are limited to health/readiness, auth callback, billing plans, and billing webhook.
- Workspace ownership is `profiles.organisation_id`; user-visible queries must never trust client-supplied organisation IDs.
- File upload routes use `FormData`; storage paths are server-generated and scoped to organisation IDs.
- Error bodies generally use `{ "error": "message" }`; workspace service routes may include `error_id`.

## States

- Contract: `pending_review`, `reviewed`, `negotiated`, `approved`, `signed`, `expired`.
- Approval request: `pending`, `approved`, `rejected`, `revision_requested`.
- Proof entry types: `screenshot`, `video`, `document`, `url_capture`, `metric_report`.
- Background job: `queued`, `running`, `succeeded`, `failed`, `dead`.
- Billing subscription: null/free-safe for users without subscription; Razorpay webhook updates `active`, `past_due`, `cancelled` where configured.

## Route Groups

### approvals

| Route | Methods | Auth | Notes |
|---|---:|---|---|
| `/api/approvals/list` | GET | required | Source: `app/api/approvals/list/route.ts` |
| `/api/approvals/review` | POST | required | Source: `app/api/approvals/review/route.ts`; server uses service role after caller checks |
| `/api/approvals/submit` | POST | required | Source: `app/api/approvals/submit/route.ts`; server uses service role after caller checks |

### auth

| Route | Methods | Auth | Notes |
|---|---:|---|---|
| `/api/auth/callback` | GET | required | Source: `app/api/auth/callback/route.ts` |

### billing

| Route | Methods | Auth | Notes |
|---|---:|---|---|
| `/api/billing/create-subscription` | POST | required | Source: `app/api/billing/create-subscription/route.ts`; server uses service role after caller checks |
| `/api/billing/jurisdiction-addon` | POST | required | Source: `app/api/billing/jurisdiction-addon/route.ts`; server uses service role after caller checks |
| `/api/billing/plans` | GET | public | Source: `app/api/billing/plans/route.ts`; server uses service role after caller checks |
| `/api/billing/status` | GET | required | Source: `app/api/billing/status/route.ts` |
| `/api/billing/webhook` | POST | public | Source: `app/api/billing/webhook/route.ts`; server uses service role after caller checks |

### clauses

| Route | Methods | Auth | Notes |
|---|---:|---|---|
| `/api/clauses/analyse` | POST | required | Source: `app/api/clauses/analyse/route.ts` |
| `/api/clauses/library` | GET, POST | required | Source: `app/api/clauses/library/route.ts`; server uses service role after caller checks |

### counsel

| Route | Methods | Auth | Notes |
|---|---:|---|---|
| `/api/counsel/analyse` | POST | required | Source: `app/api/counsel/analyse/route.ts`; server uses service role after caller checks |
| `/api/counsel/compare` | POST | required | Source: `app/api/counsel/compare/route.ts` |
| `/api/counsel/decode` | POST | required | Source: `app/api/counsel/decode/route.ts` |
| `/api/counsel/draft` | GET, POST | required | Source: `app/api/counsel/draft/route.ts`; server uses service role after caller checks |
| `/api/counsel/file` | GET | required | Source: `app/api/counsel/file/route.ts`; server uses service role after caller checks |
| `/api/counsel/redflags` | POST | required | Source: `app/api/counsel/redflags/route.ts` |
| `/api/counsel/silent-changes` | POST | required | Source: `app/api/counsel/silent-changes/route.ts` |
| `/api/counsel/upload` | POST | required | Source: `app/api/counsel/upload/route.ts`; server uses service role after caller checks |

### cross-ref

| Route | Methods | Auth | Notes |
|---|---:|---|---|
| `/api/cross-ref/query` | POST | required | Source: `app/api/cross-ref/query/route.ts`; server uses service role after caller checks |

### deals

| Route | Methods | Auth | Notes |
|---|---:|---|---|
| `/api/deals/:room_id/messages` | GET, POST | required | Source: `app/api/deals/[room_id]/messages/route.ts`; server uses service role after caller checks |
| `/api/deals/analyse-term` | POST | required | Source: `app/api/deals/analyse-term/route.ts`; server uses service role after caller checks |
| `/api/deals/rooms` | GET, POST | required | Source: `app/api/deals/rooms/route.ts`; server uses service role after caller checks |
| `/api/deals/suggest-counter` | POST | required | Source: `app/api/deals/suggest-counter/route.ts`; server uses service role after caller checks |

### delivery

| Route | Methods | Auth | Notes |
|---|---:|---|---|
| `/api/delivery/lock` | POST | required | Source: `app/api/delivery/lock/route.ts`; server uses service role after caller checks |
| `/api/delivery/status` | GET | required | Source: `app/api/delivery/status/route.ts` |

### email

| Route | Methods | Auth | Notes |
|---|---:|---|---|
| `/api/email/ingest` | POST | required | Source: `app/api/email/ingest/route.ts` |

### final-check

| Route | Methods | Auth | Notes |
|---|---:|---|---|
| `/api/final-check/start` | POST | required | Source: `app/api/final-check/start/route.ts`; server uses service role after caller checks |
| `/api/final-check/upload` | POST | required | Source: `app/api/final-check/upload/route.ts`; server uses service role after caller checks |

### health

| Route | Methods | Auth | Notes |
|---|---:|---|---|
| `/api/health` | implicit | public | Source: `app/api/health/route.ts` |

### jurisdiction

| Route | Methods | Auth | Notes |
|---|---:|---|---|
| `/api/jurisdiction/add` | POST | required | Source: `app/api/jurisdiction/add/route.ts`; server uses service role after caller checks |
| `/api/jurisdiction/list` | GET | required | Source: `app/api/jurisdiction/list/route.ts` |

### master

| Route | Methods | Auth | Notes |
|---|---:|---|---|
| `/api/master/corpus` | GET, POST, DELETE | required | Source: `app/api/master/corpus/route.ts`; server uses service role after caller checks |
| `/api/master/overview` | GET | required | Source: `app/api/master/overview/route.ts` |

### meeting

| Route | Methods | Auth | Notes |
|---|---:|---|---|
| `/api/meeting/:id` | GET | required | Source: `app/api/meeting/[id]/route.ts` |
| `/api/meeting/analyse` | POST | required | Source: `app/api/meeting/analyse/route.ts`; server uses service role after caller checks |
| `/api/meeting/list` | GET | required | Source: `app/api/meeting/list/route.ts` |
| `/api/meeting/term-sheet` | POST | required | Source: `app/api/meeting/term-sheet/route.ts`; server uses service role after caller checks |

### nda

| Route | Methods | Auth | Notes |
|---|---:|---|---|
| `/api/nda/scan` | POST | required | Source: `app/api/nda/scan/route.ts`; server uses service role after caller checks |

### org

| Route | Methods | Auth | Notes |
|---|---:|---|---|
| `/api/org/create` | POST | required | Source: `app/api/org/create/route.ts`; server uses service role after caller checks |

### playbook

| Route | Methods | Auth | Notes |
|---|---:|---|---|
| `/api/playbook/entries/:id` | PATCH, DELETE | required | Source: `app/api/playbook/entries/[id]/route.ts`; server uses service role after caller checks |
| `/api/playbook/entries` | GET, POST | required | Source: `app/api/playbook/entries/route.ts`; server uses service role after caller checks |
| `/api/playbook/generate` | POST | required | Source: `app/api/playbook/generate/route.ts` |

### proof

| Route | Methods | Auth | Notes |
|---|---:|---|---|
| `/api/proof/list` | GET | required | Source: `app/api/proof/list/route.ts` |
| `/api/proof/upload` | POST | required | Source: `app/api/proof/upload/route.ts`; server uses service role after caller checks |

### ready

| Route | Methods | Auth | Notes |
|---|---:|---|---|
| `/api/ready` | implicit | public | Source: `app/api/ready/route.ts` |

### scope

| Route | Methods | Auth | Notes |
|---|---:|---|---|
| `/api/scope/alerts` | GET, PATCH | required | Source: `app/api/scope/alerts/route.ts`; server uses service role after caller checks |
| `/api/scope/analyse-change` | POST | required | Source: `app/api/scope/analyse-change/route.ts`; server uses service role after caller checks |
| `/api/scope/change-requests` | GET, PATCH | required | Source: `app/api/scope/change-requests/route.ts`; server uses service role after caller checks |
| `/api/scope/detect` | POST | required | Source: `app/api/scope/detect/route.ts`; server uses service role after caller checks |

### send

| Route | Methods | Auth | Notes |
|---|---:|---|---|
| `/api/send/counsel` | POST | required | Source: `app/api/send/counsel/route.ts`; server uses service role after caller checks |
| `/api/send/rewrite` | POST | required | Source: `app/api/send/rewrite/route.ts`; server uses service role after caller checks |
| `/api/send/scan` | POST | required | Source: `app/api/send/scan/route.ts`; server uses service role after caller checks |

### term-sheets

| Route | Methods | Auth | Notes |
|---|---:|---|---|
| `/api/term-sheets/:id` | GET, PATCH | required | Source: `app/api/term-sheets/[id]/route.ts` |
| `/api/term-sheets/list` | GET | required | Source: `app/api/term-sheets/list/route.ts` |

### timeline

| Route | Methods | Auth | Notes |
|---|---:|---|---|
| `/api/timeline` | GET | required | Source: `app/api/timeline/route.ts` |

### vendor

| Route | Methods | Auth | Notes |
|---|---:|---|---|
| `/api/vendor/shield` | POST | required | Source: `app/api/vendor/shield/route.ts`; server uses service role after caller checks |

### workspace

| Route | Methods | Auth | Notes |
|---|---:|---|---|
| `/api/workspace/contracts/:contract_id/archive` | POST | required | Source: `app/api/workspace/contracts/[contract_id]/archive/route.ts` |
| `/api/workspace/contracts/:contract_id/comments` | GET, POST | required | Source: `app/api/workspace/contracts/[contract_id]/comments/route.ts` |
| `/api/workspace/contracts/:contract_id/compare` | GET | required | Source: `app/api/workspace/contracts/[contract_id]/compare/route.ts` |
| `/api/workspace/contracts/:contract_id/restore` | POST | required | Source: `app/api/workspace/contracts/[contract_id]/restore/route.ts` |
| `/api/workspace/contracts/:contract_id/versions` | GET | required | Source: `app/api/workspace/contracts/[contract_id]/versions/route.ts` |
| `/api/workspace/creator` | GET | required | Source: `app/api/workspace/creator/route.ts` |
| `/api/workspace/manager` | GET | required | Source: `app/api/workspace/manager/route.ts` |
| `/api/workspace/notifications/read` | POST | required | Source: `app/api/workspace/notifications/read/route.ts` |
| `/api/workspace/notifications` | GET | required | Source: `app/api/workspace/notifications/route.ts` |
| `/api/workspace/search` | GET | required | Source: `app/api/workspace/search/route.ts` |
| `/api/workspace/timeline` | GET | required | Source: `app/api/workspace/timeline/route.ts` |

## Rebuild Notes

- Use `/api/counsel/upload` then `/api/counsel/analyse` for contract review.
- Use `/api/workspace/contracts/:contract_id/comments` for comments.
- Use `/api/final-check/start` to create the final-check approval and delivery lock.
- Use `/api/proof/upload` with exactly one of `contract_id` or `sow_id`; foreign IDs return not found.
- Billing UI should tolerate `{ subscription: null }` from `/api/billing/status`.
- Comments, final-check, and contract-scoped proof APIs are backend-ready even though current UI affordances are thin.