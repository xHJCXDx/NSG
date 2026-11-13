-- E11 (Tabla D1): Slack webhook pointed to a local server that accepts the
-- connection and never answers; email valid. Read-only.
-- Run while the request is still hanging, and again after the server is stopped.
-- Usage: psql -v since="'<time taken just before the trigger>'" -f this file
\set ON_ERROR_STOP on
BEGIN READ ONLY;

\echo '== Executions since the trigger'
SELECT log_id, execution_id, status, detections_generated, alerts_generated,
       started_at, completed_at
FROM execution_logs
WHERE started_at >= TIMESTAMPTZ :since
ORDER BY started_at;

\echo '== Alerts since the trigger: one delivery_status for both channels?'
SELECT alert_id, detection_id, alert_severity, channels_sent, slack_channel,
       delivery_status, sent_at, created_at
FROM alerts
WHERE created_at >= TIMESTAMPTZ :since
ORDER BY alert_id;

\echo '== Alerts per delivery_status'
SELECT delivery_status, COUNT(*) AS alerts
FROM alerts
WHERE created_at >= TIMESTAMPTZ :since
GROUP BY delivery_status
ORDER BY delivery_status;

\echo '== Review status of the alerted detections (shown in the interface)'
SELECT d.review_status, COUNT(*) AS detections
FROM alerts a
JOIN threat_detections d USING (detection_id)
WHERE a.created_at >= TIMESTAMPTZ :since
GROUP BY d.review_status
ORDER BY d.review_status;

COMMIT;
