-- E11, second query: the run logged alerts_generated 34 but no alert row was
-- created after the trigger. Check the detections touched since the trigger
-- (last_updated is set by trigger on UPDATE) and their alerts, whenever created.
-- Usage: psql -v since="'<time taken just before the run>'" -f this file. Read-only.
\set ON_ERROR_STOP on
BEGIN READ ONLY;

\echo '== Detections inserted or updated since the trigger'
SELECT COUNT(*) AS detections_touched,
       COUNT(*) FILTER (WHERE detected_at >= TIMESTAMPTZ :since) AS detections_new,
       COUNT(*) FILTER (WHERE criticality_level IN ('high', 'critical')) AS high_or_critical
FROM threat_detections
WHERE last_updated >= TIMESTAMPTZ :since;

\echo '== Alerts of those detections, by creation time and delivery_status'
SELECT (a.created_at >= TIMESTAMPTZ :since) AS created_after_trigger,
       a.delivery_status, COUNT(*) AS alerts,
       MIN(a.created_at) AS first_created, MAX(a.created_at) AS last_created
FROM threat_detections d
JOIN alerts a ON a.detection_id = d.detection_id
WHERE d.last_updated >= TIMESTAMPTZ :since
GROUP BY 1, 2
ORDER BY 1, 2;

\echo '== Latest alert in the table'
SELECT MAX(created_at) AS latest_alert_created FROM alerts;

COMMIT;
