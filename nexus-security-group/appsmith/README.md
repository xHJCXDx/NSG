# NSG Appsmith Dashboard Demo

This folder contains a safe Appsmith demo pack for the NSG thesis dashboard. It is intentionally docs/query-first instead of a custom frontend: Appsmith reads PostgreSQL reporting data with a read-only login and can trigger the existing n8n OSINT workflow through a documented admin action.

## Contents

- `appsmith-export.json` — reference manifest listing the datasource config, pages, and named queries required for manual setup. **This is NOT an importable Appsmith application export.** A real Appsmith export (`.json` produced by the Appsmith UI) includes widget DSL, layout trees, JS objects, and query configs — none of which can be captured without a running, configured Appsmith instance. This file serves as a structured reference to guide manual configuration; use it alongside `queries.sql` and `webhooks.md`.
- `queries.sql` — named, bounded SQL query catalog for the dashboard.
- `webhooks.md` — Appsmith action contracts for the preferred FastAPI proxy and controlled n8n fallback.
- `security.md` — read-only PostgreSQL setup, existing-volume rollout, rollback, and no-secret checklist.
- `runtime-validation.md` — operator checklist for local Appsmith + PostgreSQL validation.

The legacy root `appsmith-dashboard.json` placeholder was removed; this directory is the authoritative demo pack.

## Local setup

1. Start the NSG stack normally. Do not run a build command for this demo pack.
2. Run Appsmith externally or with the optional Compose overlay `docker-compose.appsmith.yml` attached to Docker network `nexus-net`.
3. Create an Appsmith PostgreSQL datasource manually:
   - Host: `postgres`
   - Port: `5432`
   - Database: `<POSTGRES_DB>`
   - User: `appsmith_readonly`
   - Password: `<APPSMITH_DB_PASSWORD>`
   - SSL: disabled for local Docker bridge demos; enable as required outside local.
4. Apply the read-only login/grants from `security.md` for existing volumes. Fresh empty volumes receive the additive DDL from `init.sql`.
5. Create Appsmith queries using the names and SQL blocks in `queries.sql`.
6. Configure the admin action from `webhooks.md` with placeholders replaced only in the Appsmith runtime, never in repository files.

## Dashboard layout

- Overview: `Dashboard_KPIs`, `WorkflowHealth_ByDay`.
- Mentions: `MentionTrend_ByDatePlatformSentiment`, `Sentiment_Distribution`, `RecentMentions_Table`.
- Threats: `ThreatSeverity_Distribution`, `UnresolvedThreats_Table`, `RecentAlerts_Table`.
- Keywords: `TopKeywords_Ranking`.
- Admin controls: `TriggerOsintScanViaApi` preferred, `TriggerOsintScanDirectN8n` fallback only.

## Controls and parameters

Use constrained Appsmith widgets rather than free-form SQL fragments:

- `DateRangePicker.startDate` / `DateRangePicker.endDate`: default last 7 or 30 days.
- `PlatformSelect`: allow `all`, `twitter`, `reddit`, `telegram`, `discord`, `github`, `exploit-db`, `hackernews`, `other`.
- `SeveritySelect`: allow `all`, `low`, `medium`, `high`, `critical`.
- `StatusSelect` (for `RecentAlerts_Table` `delivery_status`): allow `all`, `pending`, `sent`, `delivered`, `failed`.
- `PageSizeSelect`: allow `25` or `50` only.
- `Table.pageNo`: minimum 1.

`RecentMentions_Table` and `RecentAlerts_Table` read reporting views (`recent_mentions_dashboard`, `recent_alerts_dashboard`) so the dashboard can stay read-only without relaxing table-level RLS broadly.

## Demo flow

### User/analyst flow

1. Open the dashboard and review KPI totals and workflow health.
2. Filter mentions by date, platform, and sentiment.
3. Review sentiment and severity distributions.
4. Inspect unresolved threats in the paginated read-only table.
5. Use keyword ranking to explain why selected mentions became detections.

### Admin flow

1. Confirm the user has the backend permission `workflows:execute` when using the FastAPI proxy.
2. Open the admin-only manual scan section. Widget visibility is UX only; backend/n8n credentials are the real boundary.
3. Run `TriggerOsintScanViaApi` with payload `{ "source": "appsmith", "requested_by": "<operator>", "mode": "manual-demo" }`.
4. Refresh dashboard queries after n8n completes. If metrics are materialized, refresh them through the existing backend/admin process or database maintenance path before demoing updated aggregates.

## Local verification checklist

- JSON files parse: `appsmith/appsmith-export.json` and unchanged `workflow.json`.
- `appsmith/queries.sql` contains dashboard `SELECT` queries only, bounded date filters, and table pagination.
- Appsmith datasource uses `appsmith_readonly`, not admin or n8n credentials.
- Secrets remain placeholders in repository files: `<APPSMITH_DB_PASSWORD>`, `<APPSMITH_API_BEARER_TOKEN>`, `<N8N_WEBHOOK_TOKEN>`, `<operator>`.
- Existing n8n workflow logic remains unchanged.
- Runtime validation steps are documented in `runtime-validation.md`; execute them manually only when you are ready to start Docker/Appsmith locally.
