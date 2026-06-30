# Greenlit Workspace Notes

Status date: 2026-06-29

Greenlit workspace behavior is organisation-scoped. The canonical workspace
identity remains `organisations` plus `profiles`; no separate workspace table is
introduced.

Creator workspace data includes contracts, brands, negotiations, templates,
clause preferences, saved playbooks, review history, notifications, recent
activity, search, filtering, sorting, archive, and restore.

Manager workspace data includes creator management, team data, assignments,
queues, approvals, permissions, internal review, dashboard analytics, activity
feeds, and legal review queue.

Timeline rule:

- `timeline` stores contract-level events.
- `evidence_timeline` stores SOW/proof/approval events.
- `mergeTimelineEvents` normalizes both into one API response instead of
  duplicating history systems.
