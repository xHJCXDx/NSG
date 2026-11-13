-- E09 (§8.2; D.1, regla 6): two overlapping executions over the same window.
-- Run after triggering the webhook twice in parallel. Read-only.
-- Usage: psql -v since="'<ISO timestamp taken just before the triggers>'" -f this file
\set ON_ERROR_STOP on

\echo '== Executions started since the trigger (expect 2, overlapping)'
SELECT log_id, execution_id, status, mentions_collected, mentions_processed,
       detections_generated, alerts_generated, started_at, completed_at
FROM execution_logs
WHERE started_at >= TIMESTAMPTZ :since
ORDER BY started_at;

\echo '== Overlap check: second start before first completion'
SELECT (MAX(started_at) < MIN(completed_at)) AS overlapped
FROM execution_logs
WHERE started_at >= TIMESTAMPTZ :since;

\echo '== Mentions collected since the trigger, per platform'
SELECT platform, COUNT(*) AS mentions
FROM social_mentions
WHERE collected_at >= TIMESTAMPTZ :since
GROUP BY ROLLUP (platform)
ORDER BY platform;

\echo '== Duplicate (platform, external_id) among them (expect 0 rows)'
SELECT platform, external_id, COUNT(*)
FROM social_mentions
WHERE collected_at >= TIMESTAMPTZ :since
GROUP BY platform, external_id
HAVING COUNT(*) > 1;

\echo '== Rows per mention: analyses, detections, alerts (expect at most 1 each)'
SELECT COUNT(DISTINCT m.mention_id) AS mentions,
       COUNT(DISTINCT s.mention_id) AS with_analysis,
       COUNT(DISTINCT d.detection_id) AS detections,
       COUNT(a.alert_id) AS alerts,
       COUNT(*) FILTER (WHERE a.alert_id IS NOT NULL) - COUNT(DISTINCT a.detection_id) AS extra_alerts
FROM social_mentions m
LEFT JOIN sentiment_analysis s ON s.mention_id = m.mention_id
LEFT JOIN threat_detections d ON d.mention_id = m.mention_id
LEFT JOIN alerts a ON a.detection_id = d.detection_id
WHERE m.collected_at >= TIMESTAMPTZ :since;

\echo '== Alerts of those detections (compare with Slack and email messages received)'
SELECT a.alert_id, a.detection_id, a.alert_severity, a.channels_sent, a.delivery_status, a.created_at
FROM alerts a
JOIN threat_detections d ON d.detection_id = a.detection_id
JOIN social_mentions m ON m.mention_id = d.mention_id
WHERE m.collected_at >= TIMESTAMPTZ :since
ORDER BY a.alert_id;
