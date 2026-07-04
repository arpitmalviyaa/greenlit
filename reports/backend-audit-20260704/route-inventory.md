# Greenlit Backend Route Inventory

Generated: 2026-07-04 17:50 IST
Routes: 68

| Route | Methods | Auth | Service role | Source |
|---|---:|---|---|---|
| `/api/approvals/list` | GET | yes | no | `app/api/approvals/list/route.ts` |
| `/api/approvals/review` | POST | yes | yes | `app/api/approvals/review/route.ts` |
| `/api/approvals/submit` | POST | yes | yes | `app/api/approvals/submit/route.ts` |
| `/api/auth/callback` | GET | yes | no | `app/api/auth/callback/route.ts` |
| `/api/billing/create-subscription` | POST | yes | yes | `app/api/billing/create-subscription/route.ts` |
| `/api/billing/jurisdiction-addon` | POST | yes | yes | `app/api/billing/jurisdiction-addon/route.ts` |
| `/api/billing/plans` | GET | public/handler-internal | yes | `app/api/billing/plans/route.ts` |
| `/api/billing/status` | GET | yes | no | `app/api/billing/status/route.ts` |
| `/api/billing/webhook` | POST | public/handler-internal | yes | `app/api/billing/webhook/route.ts` |
| `/api/clauses/analyse` | POST | yes | no | `app/api/clauses/analyse/route.ts` |
| `/api/clauses/library` | GET, POST | yes | yes | `app/api/clauses/library/route.ts` |
| `/api/counsel/analyse` | POST | yes | yes | `app/api/counsel/analyse/route.ts` |
| `/api/counsel/compare` | POST | yes | no | `app/api/counsel/compare/route.ts` |
| `/api/counsel/decode` | POST | yes | no | `app/api/counsel/decode/route.ts` |
| `/api/counsel/draft` | GET, POST | yes | yes | `app/api/counsel/draft/route.ts` |
| `/api/counsel/file` | GET | yes | yes | `app/api/counsel/file/route.ts` |
| `/api/counsel/redflags` | POST | yes | no | `app/api/counsel/redflags/route.ts` |
| `/api/counsel/silent-changes` | POST | yes | no | `app/api/counsel/silent-changes/route.ts` |
| `/api/counsel/upload` | POST | yes | yes | `app/api/counsel/upload/route.ts` |
| `/api/cross-ref/query` | POST | yes | yes | `app/api/cross-ref/query/route.ts` |
| `/api/deals/:room_id/messages` | GET, POST | yes | yes | `app/api/deals/[room_id]/messages/route.ts` |
| `/api/deals/analyse-term` | POST | yes | yes | `app/api/deals/analyse-term/route.ts` |
| `/api/deals/rooms` | GET, POST | yes | yes | `app/api/deals/rooms/route.ts` |
| `/api/deals/suggest-counter` | POST | yes | yes | `app/api/deals/suggest-counter/route.ts` |
| `/api/delivery/lock` | POST | yes | yes | `app/api/delivery/lock/route.ts` |
| `/api/delivery/status` | GET | yes | no | `app/api/delivery/status/route.ts` |
| `/api/email/ingest` | POST | yes | no | `app/api/email/ingest/route.ts` |
| `/api/final-check/start` | POST | yes | yes | `app/api/final-check/start/route.ts` |
| `/api/final-check/upload` | POST | yes | yes | `app/api/final-check/upload/route.ts` |
| `/api/health` | implicit | public/handler-internal | no | `app/api/health/route.ts` |
| `/api/jurisdiction/add` | POST | yes | yes | `app/api/jurisdiction/add/route.ts` |
| `/api/jurisdiction/list` | GET | yes | no | `app/api/jurisdiction/list/route.ts` |
| `/api/master/corpus` | GET, POST, DELETE | yes | yes | `app/api/master/corpus/route.ts` |
| `/api/master/overview` | GET | yes | no | `app/api/master/overview/route.ts` |
| `/api/meeting/:id` | GET | yes | no | `app/api/meeting/[id]/route.ts` |
| `/api/meeting/analyse` | POST | yes | yes | `app/api/meeting/analyse/route.ts` |
| `/api/meeting/list` | GET | yes | no | `app/api/meeting/list/route.ts` |
| `/api/meeting/term-sheet` | POST | yes | yes | `app/api/meeting/term-sheet/route.ts` |
| `/api/nda/scan` | POST | yes | yes | `app/api/nda/scan/route.ts` |
| `/api/org/create` | POST | yes | yes | `app/api/org/create/route.ts` |
| `/api/playbook/entries/:id` | PATCH, DELETE | yes | yes | `app/api/playbook/entries/[id]/route.ts` |
| `/api/playbook/entries` | GET, POST | yes | yes | `app/api/playbook/entries/route.ts` |
| `/api/playbook/generate` | POST | yes | no | `app/api/playbook/generate/route.ts` |
| `/api/proof/list` | GET | yes | no | `app/api/proof/list/route.ts` |
| `/api/proof/upload` | POST | yes | yes | `app/api/proof/upload/route.ts` |
| `/api/ready` | implicit | public/handler-internal | no | `app/api/ready/route.ts` |
| `/api/scope/alerts` | GET, PATCH | yes | yes | `app/api/scope/alerts/route.ts` |
| `/api/scope/analyse-change` | POST | yes | yes | `app/api/scope/analyse-change/route.ts` |
| `/api/scope/change-requests` | GET, PATCH | yes | yes | `app/api/scope/change-requests/route.ts` |
| `/api/scope/detect` | POST | yes | yes | `app/api/scope/detect/route.ts` |
| `/api/send/counsel` | POST | yes | yes | `app/api/send/counsel/route.ts` |
| `/api/send/rewrite` | POST | yes | yes | `app/api/send/rewrite/route.ts` |
| `/api/send/scan` | POST | yes | yes | `app/api/send/scan/route.ts` |
| `/api/term-sheets/:id` | GET, PATCH | yes | no | `app/api/term-sheets/[id]/route.ts` |
| `/api/term-sheets/list` | GET | yes | no | `app/api/term-sheets/list/route.ts` |
| `/api/timeline` | GET | yes | no | `app/api/timeline/route.ts` |
| `/api/vendor/shield` | POST | yes | yes | `app/api/vendor/shield/route.ts` |
| `/api/workspace/contracts/:contract_id/archive` | POST | yes | no | `app/api/workspace/contracts/[contract_id]/archive/route.ts` |
| `/api/workspace/contracts/:contract_id/comments` | GET, POST | yes | no | `app/api/workspace/contracts/[contract_id]/comments/route.ts` |
| `/api/workspace/contracts/:contract_id/compare` | GET | yes | no | `app/api/workspace/contracts/[contract_id]/compare/route.ts` |
| `/api/workspace/contracts/:contract_id/restore` | POST | yes | no | `app/api/workspace/contracts/[contract_id]/restore/route.ts` |
| `/api/workspace/contracts/:contract_id/versions` | GET | yes | no | `app/api/workspace/contracts/[contract_id]/versions/route.ts` |
| `/api/workspace/creator` | GET | yes | no | `app/api/workspace/creator/route.ts` |
| `/api/workspace/manager` | GET | yes | no | `app/api/workspace/manager/route.ts` |
| `/api/workspace/notifications/read` | POST | yes | no | `app/api/workspace/notifications/read/route.ts` |
| `/api/workspace/notifications` | GET | yes | no | `app/api/workspace/notifications/route.ts` |
| `/api/workspace/search` | GET | yes | no | `app/api/workspace/search/route.ts` |
| `/api/workspace/timeline` | GET | yes | no | `app/api/workspace/timeline/route.ts` |