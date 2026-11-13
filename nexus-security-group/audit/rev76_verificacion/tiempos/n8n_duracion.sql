-- Real duration of each workflow execution, recorded by n8n itself (read-only)
SELECT id, mode, status,
       "startedAt", "stoppedAt",
       round(extract(epoch FROM "stoppedAt" - "startedAt")::numeric, 1) AS seconds
FROM execution_entity
WHERE "startedAt" >= '2026-11-13 16:00:00+00'
ORDER BY id;
