# Performance Audit

Status date: 2026-06-29

## Automated Gate

```bash
npm run performance:audit
```

Report output:

- `reports/performance-report.json`

## Measured Locally

- Cold boot env validation.
- Release, migration, Supabase, and security audit latency.
- Contract upload/review-adjacent DOCX parser budget.
- Search/dashboard projection budget.

## Bundle

```bash
npm run build
npm run bundle:report
```

Report output:

- `reports/bundle-report.json`

## Live Measurements Required After Deploy

- API latency.
- Contract review latency with real AI provider.
- Upload latency with production storage.
- Email ingestion latency.
- Search latency against production data volume.
- Dashboard load against production org data.

GA avoids premature optimization; only obvious fail-closed and audit/reporting bottlenecks were changed.
