# Appsmith Runtime Validation Checklist

This checklist prepares a safe local runtime validation of Appsmith + PostgreSQL. It is intentionally manual: do not commit real secrets, do not run destructive SQL, and keep Appsmith database access read-only.

## Pre-flight repository checks

- Confirm `.env` is private and based on `.env.example`.
- Set `APPSMITH_DB_PASSWORD` to a local-only password; keep `APPSMITH_DB_USER=appsmith_readonly`.
- Keep `APPSMITH_API_BEARER_TOKEN`, `N8N_WEBHOOK_TOKEN`, and any Appsmith datasource credentials out of repository files and exports.
- Prefer the FastAPI proxy action for n8n: `POST /api/n8n/webhook/osint-trigger`.

## Optional local Appsmith runtime

Use the overlay only when you are ready to run containers manually:

```bash
docker compose -f docker-compose.yml -f docker-compose.appsmith.yml --profile appsmith up -d postgres appsmith
```

Then open Appsmith at `http://localhost:${APPSMITH_PORT:-8081}`.

## Database validation

For a fresh empty PostgreSQL data directory, `init.sql` creates the Appsmith role and reporting views. For an existing `./data/postgres` volume, connect as the local DB administrator and apply the Appsmith DDL from `appsmith/security.md` plus the `recent_alerts_dashboard` view from `init.sql`.

Run these checks manually after the database is up:

```sql
SET ROLE appsmith_readonly;
SELECT * FROM daily_activity_summary LIMIT 1;
SELECT * FROM recent_mentions_dashboard LIMIT 5;
SELECT * FROM recent_alerts_dashboard LIMIT 5;
RESET ROLE;
```

Expected result: SELECT queries succeed; INSERT, UPDATE, DELETE, DDL, function execution, and sequence mutation are not needed for the dashboard.

## Appsmith datasource

- Host: `postgres`
- Port: `5432`
- Database: your local `POSTGRES_DB`
- User: `appsmith_readonly`
- Password: local private `APPSMITH_DB_PASSWORD`
- SSL: disabled only for local Docker bridge validation.

## Dashboard query smoke test

Create or import the Appsmith app using `appsmith/appsmith-export.json`, then configure queries from `appsmith/queries.sql`:

- `Dashboard_KPIs`
- `MentionTrend_ByDatePlatformSentiment`
- `Sentiment_Distribution`
- `ThreatSeverity_Distribution`
- `TopKeywords_Ranking`
- `WorkflowHealth_ByDay`
- `UnresolvedThreats_Table`
- `RecentMentions_Table`
- `RecentAlerts_Table`

Use allowlisted widgets only: date range, platform, severity, status, page size `25`/`50`, and table page number.

## n8n action smoke test

Preferred path:

```text
POST http://dashboard-api:8000/api/n8n/webhook/osint-trigger
Authorization: Bearer <APPSMITH_API_BEARER_TOKEN>
Content-Type: application/json
```

> Requires the backend service and n8n workflow to be running. If the endpoint is unreachable, verify that both containers are healthy via `docker compose ps`.

Body:

```json
{ "source": "appsmith", "requested_by": "<operator>", "mode": "manual-demo" }
```

Use the direct n8n webhook only as a controlled fallback with a private token/header configured in n8n and Appsmith runtime.

## Pass criteria

- Appsmith connects with `appsmith_readonly` only.
- Dashboard SELECT queries render or return empty result sets without privilege errors.
- `RecentAlerts_Table` reads `recent_alerts_dashboard`, not a direct join over RLS-protected tables.
- Manual scan action succeeds through FastAPI proxy or is explicitly skipped if auth is not configured.
- No real secret appears in Git diff or exported Appsmith files.
