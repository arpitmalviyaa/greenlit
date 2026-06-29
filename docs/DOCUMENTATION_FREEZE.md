# Documentation Maintenance

Status date: 2026-06-29

Greenlit GA documentation is production-focused. Keep docs current with the deployed system.

## Required Updates

Update documentation in the same commit when changing:

- API routes or response contracts.
- Environment variables.
- Supabase migrations, buckets, policies, functions, or cron.
- Deployment, rollback, backup, or restore procedures.
- Security controls, monitoring thresholds, or incident response.
- CI, release tooling, or verification commands.

## Rule

Do not document planned product features as shipped behavior. If a live operation requires credentials, document it as a manual operator step and never imply it was run locally.
