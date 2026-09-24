-- NSG Appsmith dashboard query catalog.
-- Use prepared Appsmith query fields/widgets. Do not concatenate SQL fragments.
-- Common controls: DateRangePicker, PlatformSelect, SeveritySelect, StatusSelect, PageSizeSelect.
--
-- NOTE: Queries reading from materialized views (daily_activity_summary,
-- daily_mention_stats, top_keywords_stats, workflow_performance_stats)
-- show data as of the last REFRESH MATERIALIZED VIEW call.
-- Refresh via: SELECT refresh_all_materialized_views(); (defined in init.sql)

-- name: Dashboard_KPIs
-- purpose: High-level OSINT counts for the overview cards.
-- inputs: none; view already limits to the current 7-day reporting window.
-- limit: single summary row.
SELECT
    report_date,
    total_mentions,
    mentions_today,
    total_detections,
    detections_today,
    critical_today,
    alerts_today,
    unacknowledged_alerts
FROM daily_activity_summary
ORDER BY report_date DESC
LIMIT 1;

-- name: MentionTrend_ByDatePlatformSentiment
-- purpose: Daily mention/threat/alert trend by platform and sentiment.
-- inputs: {{DateRangePicker.startDate}}, {{DateRangePicker.endDate}}, {{PlatformSelect.selectedOptionValue}}.
-- limit: 90-day reporting source plus explicit date range, capped to 500 chart rows.
SELECT
    date,
    platform,
    COALESCE(sentiment_label, 'unknown') AS sentiment_label,
    SUM(mention_count) AS mention_count,
    SUM(threat_count) AS threat_count,
    SUM(alert_count) AS alert_count,
    ROUND(AVG(avg_sentiment_score)::numeric, 4) AS avg_sentiment_score
FROM daily_mention_stats
WHERE date BETWEEN {{DateRangePicker.startDate}}::date AND {{DateRangePicker.endDate}}::date
  AND ({{PlatformSelect.selectedOptionValue}} = 'all' OR platform = {{PlatformSelect.selectedOptionValue}})
GROUP BY date, platform, COALESCE(sentiment_label, 'unknown')
ORDER BY date ASC, platform ASC, sentiment_label ASC
LIMIT 500;

-- name: Sentiment_Distribution
-- purpose: Sentiment split for the selected date/platform scope.
-- inputs: {{DateRangePicker.startDate}}, {{DateRangePicker.endDate}}, {{PlatformSelect.selectedOptionValue}}.
-- limit: one row per sentiment label.
SELECT
    COALESCE(sentiment_label, 'unknown') AS sentiment_label,
    SUM(mention_count) AS mention_count
FROM daily_mention_stats
WHERE date BETWEEN {{DateRangePicker.startDate}}::date AND {{DateRangePicker.endDate}}::date
  AND ({{PlatformSelect.selectedOptionValue}} = 'all' OR platform = {{PlatformSelect.selectedOptionValue}})
GROUP BY COALESCE(sentiment_label, 'unknown')
ORDER BY mention_count DESC
LIMIT 10;

-- name: ThreatSeverity_Distribution
-- purpose: Severity split for detected threats.
-- inputs: {{DateRangePicker.startDate}}, {{DateRangePicker.endDate}}, {{PlatformSelect.selectedOptionValue}}.
-- limit: one row per known severity plus none.
SELECT
    COALESCE(criticality_level, 'none') AS criticality_level,
    SUM(threat_count) AS threat_count
FROM daily_mention_stats
WHERE date BETWEEN {{DateRangePicker.startDate}}::date AND {{DateRangePicker.endDate}}::date
  AND ({{PlatformSelect.selectedOptionValue}} = 'all' OR platform = {{PlatformSelect.selectedOptionValue}})
GROUP BY COALESCE(criticality_level, 'none')
ORDER BY
    CASE COALESCE(criticality_level, 'none')
        WHEN 'critical' THEN 1
        WHEN 'high' THEN 2
        WHEN 'medium' THEN 3
        WHEN 'low' THEN 4
        ELSE 5
    END
LIMIT 10;

-- name: TopKeywords_Ranking
-- purpose: Top matched threat keywords for explanation panels.
-- inputs: none; materialized source covers the last 30 days.
-- limit: top 25 keywords.
SELECT
    keyword,
    detection_count,
    days_active,
    ROUND(avg_confidence::numeric, 4) AS avg_confidence,
    high_severity_count,
    last_detection
FROM top_keywords_stats
ORDER BY detection_count DESC, high_severity_count DESC, last_detection DESC
LIMIT 25;

-- name: WorkflowHealth_ByDay
-- purpose: Workflow execution health and processing volume.
-- inputs: {{DateRangePicker.startDate}}, {{DateRangePicker.endDate}}.
-- limit: capped to 200 rows.
SELECT
    workflow_name,
    date,
    execution_count,
    success_count,
    error_count,
    ROUND((success_count::numeric / NULLIF(execution_count, 0)) * 100, 2) AS success_rate_percent,
    ROUND(avg_duration_seconds::numeric, 2) AS avg_duration_seconds,
    ROUND(avg_mentions_processed::numeric, 2) AS avg_mentions_processed,
    ROUND(avg_detections_generated::numeric, 2) AS avg_detections_generated
FROM workflow_performance_stats
WHERE date BETWEEN {{DateRangePicker.startDate}}::date AND {{DateRangePicker.endDate}}::date
ORDER BY date DESC, workflow_name ASC
LIMIT 200;

-- name: UnresolvedThreats_Table
-- purpose: Paginated read-only triage queue for high/critical unresolved threats.
-- inputs: {{SeveritySelect.selectedOptionValue}}, {{PageSizeSelect.selectedOptionValue}}, {{UnresolvedThreatsTable.pageNo}}.
-- limit: page size allowlist 25/50, offset derived from current page.
SELECT
    detection_id,
    threat_type,
    criticality_level,
    detected_at,
    platform,
    author_username,
    review_status,
    ROUND(hours_since_detection::numeric, 2) AS hours_since_detection,
    LEFT(text_content, 500) AS text_preview
FROM unresolved_threats
WHERE ({{SeveritySelect.selectedOptionValue}} = 'all' OR criticality_level = {{SeveritySelect.selectedOptionValue}})
ORDER BY detected_at ASC, detection_id ASC
LIMIT LEAST(GREATEST({{PageSizeSelect.selectedOptionValue}}::int, 25), 50)
OFFSET (GREATEST({{UnresolvedThreatsTable.pageNo}}::int, 1) - 1) * LEAST(GREATEST({{PageSizeSelect.selectedOptionValue}}::int, 25), 50);

-- name: RecentMentions_Table
-- purpose: Paginated recent mention browser with sentiment context.
-- inputs: {{DateRangePicker.startDate}}, {{DateRangePicker.endDate}}, {{PlatformSelect.selectedOptionValue}}, {{PageSizeSelect.selectedOptionValue}}, {{RecentMentionsTable.pageNo}}.
-- limit: page size allowlist 25/50.
SELECT
    sm.mention_id,
    sm.created_at,
    sm.platform,
    sm.author_username,
    COALESCE(sm.sentiment_label, 'unknown') AS sentiment_label,
    sm.final_sentiment_score,
    sm.processing_status,
    LEFT(sm.text_content, 500) AS text_preview
FROM recent_mentions_dashboard sm
WHERE sm.created_at::date BETWEEN {{DateRangePicker.startDate}}::date AND {{DateRangePicker.endDate}}::date
  AND ({{PlatformSelect.selectedOptionValue}} = 'all' OR sm.platform = {{PlatformSelect.selectedOptionValue}})
ORDER BY sm.created_at DESC, sm.mention_id DESC
LIMIT LEAST(GREATEST({{PageSizeSelect.selectedOptionValue}}::int, 25), 50)
OFFSET (GREATEST({{RecentMentionsTable.pageNo}}::int, 1) - 1) * LEAST(GREATEST({{PageSizeSelect.selectedOptionValue}}::int, 25), 50);

-- name: RecentAlerts_Table
-- purpose: Paginated recent alert visibility through a reporting view when alert data exists.
-- inputs: {{DateRangePicker.startDate}}, {{DateRangePicker.endDate}}, {{SeveritySelect.selectedOptionValue}}, {{StatusSelect.selectedOptionValue}}, {{PageSizeSelect.selectedOptionValue}}, {{RecentAlertsTable.pageNo}}.
-- limit: page size allowlist 25/50.
SELECT
    a.alert_id,
    a.alert_uuid,
    a.alert_title,
    a.alert_severity,
    a.delivery_status,
    a.acknowledged,
    a.created_at,
    a.threat_type,
    a.criticality_level
FROM recent_alerts_dashboard a
WHERE a.created_at::date BETWEEN {{DateRangePicker.startDate}}::date AND {{DateRangePicker.endDate}}::date
  AND ({{SeveritySelect.selectedOptionValue}} = 'all' OR a.alert_severity = {{SeveritySelect.selectedOptionValue}})
  AND ({{StatusSelect.selectedOptionValue}} = 'all' OR a.delivery_status = {{StatusSelect.selectedOptionValue}})
ORDER BY a.created_at DESC, a.alert_id DESC
LIMIT LEAST(GREATEST({{PageSizeSelect.selectedOptionValue}}::int, 25), 50)
OFFSET (GREATEST({{RecentAlertsTable.pageNo}}::int, 1) - 1) * LEAST(GREATEST({{PageSizeSelect.selectedOptionValue}}::int, 25), 50);
