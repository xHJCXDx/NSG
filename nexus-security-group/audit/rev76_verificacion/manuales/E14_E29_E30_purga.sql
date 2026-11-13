-- E14, E29, E30 (§7.8.4; A.1; A.2, rules 1-3): purge_old_data() on aged rows.
-- Everything runs inside ONE transaction that ends in ROLLBACK: the synthetic
-- rows, the purge and the keyword counters it touches are undone, so the A8
-- database is left exactly as it was. The last block checks that.
-- Synthetic rows: platform 'other', external_id 'rev76-*', no real author.
\set ON_ERROR_STOP on
BEGIN;

\echo '== Real rows older than 365 days before the purge (should be 0: A8 data is from today)'
SELECT (SELECT COUNT(*) FROM social_mentions
         WHERE created_at < NOW() - INTERVAL '365 days'
           AND external_id NOT LIKE 'rev76-%') AS old_real_mentions,
       (SELECT COUNT(*) FROM execution_logs
         WHERE started_at < NOW() - INTERVAL '365 days'
           AND workflow_name NOT LIKE 'rev76-%') AS old_real_logs,
       (SELECT COUNT(*) FROM social_mentions) AS real_mentions_before,
       (SELECT COUNT(*) FROM execution_logs) AS real_logs_before;

-- Fixtures
INSERT INTO social_mentions
    (platform, external_id, text_content, created_at, collected_at,
     author_username, author_id, raw_data)
VALUES
    ('other', 'rev76-e14',     'rev76 synthetic purge fixture E14',
     NOW() - INTERVAL '366 days', NOW() - INTERVAL '366 days',
     'rev76-synthetic-author', 'rev76-a1', '{"synthetic": true}'),
    ('other', 'rev76-e29-res', 'rev76 synthetic purge fixture E29 resolved',
     NOW() - INTERVAL '366 days', NOW() - INTERVAL '366 days',
     'rev76-synthetic-author', 'rev76-a2', '{"synthetic": true}'),
    ('other', 'rev76-e29-inv', 'rev76 synthetic purge fixture E29 investigating',
     NOW() - INTERVAL '366 days', NOW() - INTERVAL '366 days',
     'rev76-synthetic-author', 'rev76-a3', '{"synthetic": true}'),
    ('other', 'rev76-e30',     'rev76 synthetic purge fixture E30',
     NOW() - INTERVAL '400 days', NOW() - INTERVAL '400 days',
     'rev76-synthetic-author', 'rev76-a4', '{"synthetic": true}');

INSERT INTO threat_detections
    (mention_id, threat_type, criticality_level, confidence_score, review_status, detected_at)
SELECT m.mention_id, 'general', 'high', 0.500, v.status, m.created_at
FROM social_mentions m
JOIN (VALUES ('rev76-e14', 'confirmed'),
             ('rev76-e29-res', 'resolved'),
             ('rev76-e29-inv', 'investigating'),
             ('rev76-e30', 'confirmed')) AS v(ext, status)
  ON m.platform = 'other' AND m.external_id = v.ext;

INSERT INTO execution_logs (workflow_name, execution_id, status, started_at, completed_at)
VALUES ('rev76-e30', 'rev76-e30', 'success',
        NOW() - INTERVAL '400 days', NOW() - INTERVAL '400 days' + INTERVAL '1 minute');

\echo '== Before the purge'
SELECT m.external_id, d.review_status, m.created_at::date AS created,
       m.author_username, m.author_id, m.raw_data
FROM social_mentions m
LEFT JOIN threat_detections d USING (mention_id)
WHERE m.platform = 'other' AND m.external_id LIKE 'rev76-%'
ORDER BY m.external_id;
SELECT log_id, workflow_name, started_at::date AS started
FROM execution_logs WHERE workflow_name = 'rev76-e30';

\echo '== CALL purge_old_data()'
CALL purge_old_data();

\echo '== After the purge: mentions that survive (E14: author and raw data kept? E29: which one survives?)'
SELECT m.external_id, d.review_status, m.created_at::date AS created,
       m.author_username, m.author_id, m.raw_data
FROM social_mentions m
LEFT JOIN threat_detections d USING (mention_id)
WHERE m.platform = 'other' AND m.external_id LIKE 'rev76-%'
ORDER BY m.external_id;

\echo '== After the purge: E30 execution log (kept while its mention exists?)'
SELECT COUNT(*) AS e30_logs_left
FROM execution_logs WHERE workflow_name = 'rev76-e30';

\echo '== Real rows deleted by the purge (should be 0)'
SELECT (SELECT COUNT(*) FROM social_mentions WHERE external_id NOT LIKE 'rev76-%') AS real_mentions_now,
       (SELECT COUNT(*) FROM execution_logs WHERE workflow_name NOT LIKE 'rev76-%') AS real_logs_now;

ROLLBACK;

\echo '== After ROLLBACK: synthetic rows left (should be 0 and 0)'
SELECT (SELECT COUNT(*) FROM social_mentions WHERE external_id LIKE 'rev76-%') AS mentions,
       (SELECT COUNT(*) FROM execution_logs WHERE workflow_name LIKE 'rev76-%') AS logs;
