-- E06 (§8.1.1, «Procedencia»; D.1, regla 6): provenance when current data changes.
-- Picks one Hacker News detection of the A8 run (highest engagement, lowest
-- detection_id on ties), records what is stored, raises the mention's likes by 2
-- (as the source would after a later poll) and records it again.
-- Question: which stored data still allow rebuilding the original score?
-- This script CHANGES one row: social_mentions.likes_count of the chosen mention.
\set ON_ERROR_STOP on

SELECT d.detection_id, m.mention_id
FROM threat_detections d
JOIN social_mentions m ON m.mention_id = d.mention_id
WHERE m.collected_at >= TIMESTAMPTZ '2026-11-13 13:11:22-03:00'
  AND m.platform = 'hackernews'
ORDER BY COALESCE(m.likes_count, 0) + COALESCE(m.shares_count, 0) + COALESCE(m.replies_count, 0) DESC,
         d.detection_id
LIMIT 1 \gset

\echo '== Chosen detection and mention'
SELECT :detection_id AS detection_id, :mention_id AS mention_id;

\echo '== Before: mention engagement'
SELECT mention_id, platform, likes_count, shares_count, replies_count, views_count, last_updated
FROM social_mentions WHERE mention_id = :mention_id;

\echo '== Before: numeric and boolean fields kept in raw_data'
SELECT key, value FROM social_mentions, jsonb_each(COALESCE(raw_data, '{}'::jsonb))
WHERE mention_id = :mention_id AND jsonb_typeof(value) IN ('number', 'boolean')
ORDER BY key;

\echo '== Before: stored detection'
SELECT detection_id, criticality_level, risk_score, confidence_score, matched_keywords,
       detection_rules_triggered, detection_method, contextual_notes, last_updated
FROM threat_detections WHERE detection_id = :detection_id;

\echo '== Change: likes_count + 2'
BEGIN;
UPDATE social_mentions SET likes_count = COALESCE(likes_count, 0) + 2 WHERE mention_id = :mention_id;
COMMIT;

\echo '== After: mention engagement'
SELECT mention_id, platform, likes_count, shares_count, replies_count, views_count, last_updated
FROM social_mentions WHERE mention_id = :mention_id;

\echo '== After: numeric and boolean fields kept in raw_data'
SELECT key, value FROM social_mentions, jsonb_each(COALESCE(raw_data, '{}'::jsonb))
WHERE mention_id = :mention_id AND jsonb_typeof(value) IN ('number', 'boolean')
ORDER BY key;

\echo '== After: stored detection'
SELECT detection_id, criticality_level, risk_score, confidence_score, matched_keywords,
       detection_rules_triggered, detection_method, contextual_notes, last_updated
FROM threat_detections WHERE detection_id = :detection_id;
