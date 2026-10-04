-- REV46 campaign reconciliation exports
-- Window: social_mentions.collected_at from 2026-09-25 18:48:00+00 to 2026-09-29 19:31:05.363840+00.
-- Original REV45 cutoff preserved for comparison: 2026-09-29 15:01:09.653599+00.

-- Count original declared frame.
SELECT
  COUNT(*) AS original_window_mentions,
  MIN(collected_at) AS first_collected_at,
  MAX(collected_at) AS last_collected_at
FROM social_mentions
WHERE collected_at >= TIMESTAMPTZ '2026-09-25 18:48:00+00'
  AND collected_at <= TIMESTAMPTZ '2026-09-29 15:01:09.653599+00';

SELECT
  COUNT(*) AS original_window_execution_logs,
  MIN(completed_at) AS first_completed_at,
  MAX(completed_at) AS last_completed_at,
  SUM(mentions_processed) AS mentions_processed,
  SUM(detections_generated) AS detections_generated,
  SUM(alerts_generated) AS alerts_generated
FROM execution_logs
WHERE completed_at >= TIMESTAMPTZ '2026-09-25 18:48:00+00'
  AND completed_at <= TIMESTAMPTZ '2026-09-29 15:01:09.653599+00';

-- Count extended REV46 frame.
SELECT
  COUNT(*) AS extended_window_mentions,
  MIN(collected_at) AS first_collected_at,
  MAX(collected_at) AS last_collected_at
FROM social_mentions
WHERE collected_at >= TIMESTAMPTZ '2026-09-25 18:48:00+00'
  AND collected_at <= TIMESTAMPTZ '2026-09-29 19:31:05.363840+00';

SELECT
  COUNT(*) AS extended_window_execution_logs,
  MIN(completed_at) AS first_completed_at,
  MAX(completed_at) AS last_completed_at,
  SUM(mentions_processed) AS mentions_processed,
  SUM(detections_generated) AS detections_generated,
  SUM(alerts_generated) AS alerts_generated
FROM execution_logs
WHERE completed_at >= TIMESTAMPTZ '2026-09-25 18:48:00+00'
  AND completed_at <= TIMESTAMPTZ '2026-09-29 19:31:05.363840+00';

-- Export population.
COPY (
  SELECT
    sm.mention_id,
    sm.platform,
    sm.external_id,
    sm.text_content,
    sm.language,
    sm.created_at AS source_published_at,
    sm.collected_at,
    sm.author_username,
    sm.author_id,
    sm.author_verified,
    sm.author_followers_count,
    sm.likes_count,
    sm.shares_count,
    sm.replies_count,
    sm.views_count,
    sm.urls,
    sm.hashtags,
    sm.processing_status,
    sm.processing_error,
    sm.last_updated
  FROM social_mentions sm
  WHERE sm.collected_at >= TIMESTAMPTZ '2026-09-25 18:48:00+00'
    AND sm.collected_at <= TIMESTAMPTZ '2026-09-29 19:31:05.363840+00'
  ORDER BY sm.collected_at, sm.mention_id
) TO STDOUT WITH CSV HEADER;

-- Export detections associated with campaign mentions.
COPY (
  SELECT
    td.detection_id,
    td.mention_id,
    sm.platform,
    sm.external_id,
    sm.collected_at,
    td.detected_at,
    td.threat_type,
    td.threat_category,
    td.criticality_level,
    td.confidence_score,
    td.risk_score,
    td.matched_keywords,
    td.detection_rules_triggered,
    td.detection_method,
    td.review_status,
    td.reviewed_by,
    td.reviewed_at,
    td.remediation_status,
    td.escalated,
    td.last_updated
  FROM threat_detections td
  JOIN social_mentions sm ON sm.mention_id = td.mention_id
  WHERE sm.collected_at >= TIMESTAMPTZ '2026-09-25 18:48:00+00'
    AND sm.collected_at <= TIMESTAMPTZ '2026-09-29 19:31:05.363840+00'
  ORDER BY sm.collected_at, td.detection_id
) TO STDOUT WITH CSV HEADER;

-- Export alerts associated with campaign mentions.
COPY (
  SELECT
    a.alert_id,
    a.detection_id,
    td.mention_id,
    sm.platform,
    sm.external_id,
    sm.collected_at,
    td.detected_at,
    a.alert_uuid,
    a.alert_title,
    a.alert_severity,
    a.channels_sent,
    a.created_at,
    a.sent_at,
    a.delivery_status,
    a.acknowledged,
    a.last_updated
  FROM alerts a
  JOIN threat_detections td ON td.detection_id = a.detection_id
  JOIN social_mentions sm ON sm.mention_id = td.mention_id
  WHERE sm.collected_at >= TIMESTAMPTZ '2026-09-25 18:48:00+00'
    AND sm.collected_at <= TIMESTAMPTZ '2026-09-29 19:31:05.363840+00'
  ORDER BY sm.collected_at, a.alert_id
) TO STDOUT WITH CSV HEADER;

-- Export execution logs in the extended frame.
COPY (
  SELECT
    log_id,
    execution_uuid,
    workflow_name,
    execution_id,
    status,
    mentions_collected,
    mentions_processed,
    detections_generated,
    alerts_generated,
    started_at,
    completed_at,
    duration_seconds,
    last_updated
  FROM execution_logs
  WHERE completed_at >= TIMESTAMPTZ '2026-09-25 18:48:00+00'
    AND completed_at <= TIMESTAMPTZ '2026-09-29 19:31:05.363840+00'
  ORDER BY completed_at, log_id
) TO STDOUT WITH CSV HEADER;
