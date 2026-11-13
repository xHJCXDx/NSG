-- E16 (Tabla 9, criterio 4; D.1, regla 2): first latency leg, collected_at - created_at,
-- over the mentions of the A8 functional run. Read-only.
-- Run window start: 2026-11-13 13:11:22-03:00 (corrida_funcional_20261113-131408.log).
-- near_zero counts mentions whose created_at is within 5 s of collected_at, the
-- expected trace of a missing source date replaced by the current time (AD-66).
SELECT
    COALESCE(platform, 'TOTAL') AS source,
    count(*) AS mentions,
    count(*) FILTER (WHERE collected_at < created_at) AS negative,
    count(*) FILTER (WHERE abs(extract(epoch FROM collected_at - created_at)) < 5) AS near_zero,
    min(collected_at - created_at) AS min_leg,
    percentile_cont(0.5) WITHIN GROUP (
        ORDER BY extract(epoch FROM collected_at - created_at)
    ) AS median_leg_seconds,
    max(collected_at - created_at) AS max_leg
FROM social_mentions
WHERE collected_at >= TIMESTAMPTZ '2026-11-13 13:11:22-03:00'
GROUP BY ROLLUP (platform)
ORDER BY platform NULLS LAST;
