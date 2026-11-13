-- Mentions actually stored per minute and source (read-only); real synthetic rows excluded
SELECT date_trunc('minute', collected_at) AS stored_minute_utc,
       platform,
       count(*) AS new_mentions
FROM social_mentions
WHERE collected_at >= '2026-11-13 16:00:00+00'
  AND external_id NOT LIKE 'rev76-%'
GROUP BY 1, 2
ORDER BY 1, 2;
