# Feature Flags

Flags live in [`lib/flags.ts`](lib/flags.ts). A flag that is **off** removes the
feature's pages (middleware in `proxy.ts` redirects them to `/agency`) and its
navigation entry. **Backend API routes stay live** so existing data keeps
working and the feature can be restored by flipping one boolean.

Decision context: v1 (July 2026) narrows the agency surface to exactly six
navigation items — Dashboard, Contracts, Content Check, Approvals, Deals,
Settings. Everything below was flagged off to get there.

| Flag | Feature | Page(s) gated | Backend kept | Notes |
|---|---|---|---|---|
| `sendScanner` | Send Scanner | `/agency/send-scanner` | `app/api/send/*` | Outbound message safety scanning. |
| `dealRooms` | Deal Rooms | (page rebuilt) | `app/api/deals/*` | `/agency/deals` now hosts the lightweight Deals **list**; the room-style negotiation UI is retired. Flag exists to mark that decision, not a redirect. |
| `termSheets` | Term Sheets | `/agency/term-sheets` | `app/api/term-sheets/*` | |
| `scopeMonitor` | Scope Monitor | `/agency/scope` | `app/api/scope/*` | |
| `meetingCounsel` | Meeting Counsel | `/agency/meeting` | `app/api/meeting/*` | |
| `delivery` | Delivery | `/agency/delivery` | `app/api/delivery/*`, `app/api/final-check/*` | |
| `timeline` | Timeline | `/agency/timeline` | `app/api/timeline/*` | Evidence timeline still records events server-side. |
| `legalPlaybook` | Legal Playbook | `/agency/playbook` | `app/api/playbook/*` | |
| `crossReference` | Cross-Reference | `/agency/cross-reference` | `app/api/cross-ref/*` | |
| `proofVault` | Proof Vault | (nav item only) | `app/api/proof/*` | Nav pointed at `/agency/approvals`; proof upload API remains live and org-scoped. |

Also folded in (permanent redirects in `proxy.ts`, not flags):

- `/agency/counsel` → `/agency/contracts` (route renamed)
- `/agency/nda-scanner` → `/agency/contracts` (NDA scan is now a document-type
  choice inside Contracts)

## Restoring a feature

1. Set its flag to `true` in `lib/flags.ts`.
2. Add its nav item back in `components/dashboard/sidebar.tsx`.
3. Ship. No data migration needed — backend routes and tables never left.
