-- E08 (§8.4; D.1, regla 5): step 2 of 3, read-only.
-- Run after the manual execution finished, with the constraint still in place.
-- Usage: psql -v since="'<injected_at from E08_inyectar.sql>'" -f this file
\set ON_ERROR_STOP on
BEGIN READ ONLY;

\echo '== Executions since the injection (expect status success: binary state)'
SELECT log_id, execution_id, status, mentions_collected, mentions_processed,
       detections_generated, alerts_generated, started_at, completed_at
FROM execution_logs
WHERE started_at >= TIMESTAMPTZ :since
ORDER BY started_at;

\echo '== Mentions since the injection: with analysis, with detection'
SELECT COUNT(*) AS mentions,
       COUNT(s.mention_id) AS with_analysis,
       COUNT(d.mention_id) AS with_detection,
       COUNT(*) FILTER (WHERE s.mention_id IS NOT NULL AND d.mention_id IS NULL)
         AS analysis_without_detection
FROM social_mentions m
LEFT JOIN (SELECT DISTINCT mention_id FROM sentiment_analysis) s USING (mention_id)
LEFT JOIN (SELECT DISTINCT mention_id FROM threat_detections) d USING (mention_id)
WHERE m.collected_at >= TIMESTAMPTZ :since;

\echo '== Detections created since the injection (expect 0)'
SELECT COUNT(*) AS detections FROM threat_detections
WHERE detected_at >= TIMESTAMPTZ :since;

\echo '== Alerts created since the injection'
SELECT alert_id, detection_id, alert_severity, channels_sent, delivery_status, created_at
FROM alerts
WHERE created_at >= TIMESTAMPTZ :since
ORDER BY alert_id;

COMMIT;
