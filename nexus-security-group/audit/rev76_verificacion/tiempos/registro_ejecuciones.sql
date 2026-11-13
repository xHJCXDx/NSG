-- Mentions and detections per execution, as logged by the workflow (read-only)
SELECT log_id, execution_id, status,
       mentions_collected, mentions_processed, detections_generated, alerts_generated
FROM execution_logs
WHERE completed_at >= '2026-11-13 16:00:00+00'
ORDER BY log_id;
