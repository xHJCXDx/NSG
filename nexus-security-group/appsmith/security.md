# Appsmith Security Notes

## Least-privilege database access

Appsmith must use a dedicated login mapped to the existing read-only role. The login password below is a placeholder; set the real value only in the local Appsmith datasource or a private secret store.

```sql
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'appsmith_readonly') THEN
        CREATE ROLE appsmith_readonly LOGIN PASSWORD '<APPSMITH_DB_PASSWORD>';
    END IF;
END
$$;

GRANT osint_readonly TO appsmith_readonly;
GRANT USAGE ON SCHEMA public TO appsmith_readonly;
GRANT SELECT ON daily_activity_summary TO appsmith_readonly;
GRANT SELECT ON daily_mention_stats TO appsmith_readonly;
GRANT SELECT ON top_keywords_stats TO appsmith_readonly;
GRANT SELECT ON workflow_performance_stats TO appsmith_readonly;
GRANT SELECT ON unresolved_threats TO appsmith_readonly;
GRANT SELECT ON recent_mentions_dashboard TO appsmith_readonly;
GRANT SELECT ON recent_alerts_dashboard TO appsmith_readonly;
```

Do not grant write privileges, schema ownership, function execution, or sequence access to the Appsmith login. The dashboard query catalog is read-only by design. Prefer reporting views such as `recent_mentions_dashboard` and `recent_alerts_dashboard` when RLS blocks direct table reads.

## Existing-volume rollout

`init.sql` runs only when the PostgreSQL data directory is first initialized. This repository mounts `./data/postgres` as the database volume, so existing local volumes require manual DDL:

1. Connect as the local database administrator.
2. Apply the DDL above, including `recent_alerts_dashboard`, or the equivalent Appsmith section in `init.sql`.
3. Configure Appsmith manually with `appsmith_readonly` and the private password.
4. Run dashboard queries and verify they require only read access.

## Rollback

If the demo login must be removed from an existing database:

```sql
REVOKE ALL PRIVILEGES ON ALL TABLES IN SCHEMA public FROM appsmith_readonly;
REVOKE USAGE ON SCHEMA public FROM appsmith_readonly;
REVOKE osint_readonly FROM appsmith_readonly;
DROP ROLE IF EXISTS appsmith_readonly;
```

## Appsmith RBAC boundary

Appsmith widget visibility and page-level roles are useful UX controls, not authoritative security. Real enforcement must remain in:

- PostgreSQL grants for dashboard reads.
- FastAPI bearer authentication and `workflows:execute` permission for the preferred trigger path.
- n8n webhook token/header configuration for the fallback path.

## No-secret checklist

- Database password: keep `<APPSMITH_DB_PASSWORD>` in repo files; set real value manually in Appsmith only.
- Backend token: keep `<APPSMITH_API_BEARER_TOKEN>` in docs/export; generate a real token through `/api/auth/login` only at runtime.
- n8n fallback token/header: keep `<N8N_WEBHOOK_TOKEN>` and `<N8N_WEBHOOK_HEADER>` as placeholders.
- Session/JWT values: never export real `JWT_SECRET_KEY`, cookies, or Appsmith datasource credentials.
- URLs: use local service names such as `postgres`, `dashboard-api`, and `n8n` for Docker bridge examples only.
