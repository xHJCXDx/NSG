-- ============================================
-- OSINT MONITORING SYSTEM - DATABASE SCHEMA
-- Version: 2.0
-- PostgreSQL 14+
-- ============================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";
CREATE EXTENSION IF NOT EXISTS "btree_gin";

-- ============================================
-- TABLA: social_mentions
-- ============================================

CREATE TABLE IF NOT EXISTS social_mentions (
    mention_id BIGSERIAL PRIMARY KEY,
    platform VARCHAR(50) NOT NULL CHECK (platform IN ('twitter', 'reddit', 'telegram', 'discord', 'github', 'exploit-db', 'other')),
    external_id VARCHAR(255) NOT NULL,

    text_content TEXT NOT NULL,
    language VARCHAR(10),

    created_at TIMESTAMPTZ NOT NULL,
    collected_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    author_username VARCHAR(255),
    author_id VARCHAR(255),
    author_verified BOOLEAN DEFAULT FALSE,
    author_followers_count INTEGER DEFAULT 0 CHECK (author_followers_count >= 0),
    author_description TEXT,

    likes_count INTEGER DEFAULT 0 CHECK (likes_count >= 0),
    shares_count INTEGER DEFAULT 0 CHECK (shares_count >= 0),
    replies_count INTEGER DEFAULT 0 CHECK (replies_count >= 0),
    views_count INTEGER DEFAULT 0 CHECK (views_count >= 0),

    urls TEXT[],
    hashtags VARCHAR(100)[],
    mentions VARCHAR(100)[],
    has_media BOOLEAN DEFAULT FALSE,
    media_types VARCHAR(20)[],

    geo_location JSONB,

    is_reply BOOLEAN DEFAULT FALSE,
    is_quote BOOLEAN DEFAULT FALSE,
    reply_to_id VARCHAR(255),
    conversation_id VARCHAR(255),

    raw_data JSONB,

    processing_status VARCHAR(20) DEFAULT 'pending' CHECK (processing_status IN ('pending', 'processed', 'failed')),
    processing_error TEXT,
    last_updated TIMESTAMPTZ DEFAULT NOW(),

    CONSTRAINT unique_mention_per_platform UNIQUE (platform, external_id)
);

CREATE INDEX idx_mentions_created_at ON social_mentions(created_at DESC);
CREATE INDEX idx_mentions_collected_at ON social_mentions(collected_at DESC);
CREATE INDEX idx_mentions_platform ON social_mentions(platform);
CREATE INDEX idx_mentions_author_username ON social_mentions(author_username);
CREATE INDEX idx_mentions_author_id ON social_mentions(author_id);
CREATE INDEX idx_mentions_processing_status ON social_mentions(processing_status);
CREATE INDEX idx_mentions_conversation_id ON social_mentions(conversation_id) WHERE conversation_id IS NOT NULL;
CREATE INDEX idx_mentions_text_content_gin ON social_mentions USING gin(to_tsvector('spanish', text_content));
CREATE INDEX idx_mentions_urls_gin ON social_mentions USING gin(urls);
CREATE INDEX idx_mentions_hashtags_gin ON social_mentions USING gin(hashtags);
CREATE INDEX idx_mentions_author_username_trgm ON social_mentions USING gin(author_username gin_trgm_ops);

-- ============================================
-- TABLA: sentiment_analysis
-- ============================================

CREATE TABLE IF NOT EXISTS sentiment_analysis (
    sentiment_id BIGSERIAL PRIMARY KEY,
    mention_id BIGINT NOT NULL REFERENCES social_mentions(mention_id) ON DELETE CASCADE,

    vader_compound NUMERIC(5,4) CHECK (vader_compound BETWEEN -1 AND 1),
    vader_pos NUMERIC(4,3) CHECK (vader_pos BETWEEN 0 AND 1),
    vader_neu NUMERIC(4,3) CHECK (vader_neu BETWEEN 0 AND 1),
    vader_neg NUMERIC(4,3) CHECK (vader_neg BETWEEN 0 AND 1),

    textblob_polarity NUMERIC(5,4) CHECK (textblob_polarity BETWEEN -1 AND 1),
    textblob_subjectivity NUMERIC(4,3) CHECK (textblob_subjectivity BETWEEN 0 AND 1),

    final_sentiment_score NUMERIC(5,4) CHECK (final_sentiment_score BETWEEN -1 AND 1) NOT NULL,
    sentiment_label VARCHAR(20) CHECK (sentiment_label IN ('positive', 'neutral', 'negative', 'mixed')) NOT NULL,
    confidence_score NUMERIC(4,3) CHECK (confidence_score BETWEEN 0 AND 1),

    analysis_method VARCHAR(50) NOT NULL,
    analyzed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT unique_sentiment_per_mention UNIQUE (mention_id)
);

CREATE INDEX idx_sentiment_mention_id ON sentiment_analysis(mention_id);
CREATE INDEX idx_sentiment_label ON sentiment_analysis(sentiment_label);
CREATE INDEX idx_sentiment_final_score ON sentiment_analysis(final_sentiment_score);
CREATE INDEX idx_sentiment_analyzed_at ON sentiment_analysis(analyzed_at DESC);
CREATE INDEX idx_sentiment_method ON sentiment_analysis(analysis_method);
CREATE INDEX idx_sentiment_label_score ON sentiment_analysis(sentiment_label, final_sentiment_score);

-- ============================================
-- TABLA: threat_detections
-- ============================================

CREATE TABLE IF NOT EXISTS threat_detections (
    detection_id BIGSERIAL PRIMARY KEY,
    mention_id BIGINT NOT NULL REFERENCES social_mentions(mention_id) ON DELETE CASCADE,
    sentiment_id BIGINT REFERENCES sentiment_analysis(sentiment_id) ON DELETE SET NULL,

    threat_type VARCHAR(100) NOT NULL,
    threat_category VARCHAR(50),
    criticality_level VARCHAR(20) CHECK (criticality_level IN ('low', 'medium', 'high', 'critical')) NOT NULL,
    confidence_score NUMERIC(4,3) CHECK (confidence_score BETWEEN 0 AND 1) NOT NULL,
    risk_score INTEGER CHECK (risk_score BETWEEN 0 AND 100),

    matched_keywords TEXT[],
    detection_rules_triggered TEXT[],
    detection_method VARCHAR(50),

    contextual_notes TEXT,
    related_iocs TEXT[],
    affected_assets VARCHAR(255)[],
    potential_impact TEXT,

    detected_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    review_status VARCHAR(20) CHECK (review_status IN ('pending', 'reviewing', 'confirmed', 'false_positive', 'investigating', 'resolved')) DEFAULT 'pending',
    reviewed_by VARCHAR(100),
    reviewed_at TIMESTAMPTZ,
    review_notes TEXT,

    actions_taken TEXT[],
    remediation_status VARCHAR(20) CHECK (remediation_status IN ('none', 'in_progress', 'completed', 'not_required')),
    resolution_time TIMESTAMPTZ,

    escalated BOOLEAN DEFAULT FALSE,
    escalated_to VARCHAR(100),
    escalation_time TIMESTAMPTZ,

    last_updated TIMESTAMPTZ DEFAULT NOW(),

    CONSTRAINT unique_detection_per_mention UNIQUE (mention_id)
);

CREATE INDEX idx_detections_mention_id ON threat_detections(mention_id);
CREATE INDEX idx_detections_sentiment_id ON threat_detections(sentiment_id);
CREATE INDEX idx_detections_criticality ON threat_detections(criticality_level);
CREATE INDEX idx_detections_detected_at ON threat_detections(detected_at DESC);
CREATE INDEX idx_detections_review_status ON threat_detections(review_status);
CREATE INDEX idx_detections_threat_type ON threat_detections(threat_type);
CREATE INDEX idx_detections_threat_category ON threat_detections(threat_category);
CREATE INDEX idx_detections_status_criticality ON threat_detections(review_status, criticality_level);
CREATE INDEX idx_detections_date_criticality ON threat_detections(detected_at DESC, criticality_level);
CREATE INDEX idx_detections_keywords_gin ON threat_detections USING gin(matched_keywords);
CREATE INDEX idx_detections_rules_gin ON threat_detections USING gin(detection_rules_triggered);

-- ============================================
-- TABLA: alerts
-- ============================================

CREATE TABLE IF NOT EXISTS alerts (
    alert_id BIGSERIAL PRIMARY KEY,
    detection_id BIGINT NOT NULL REFERENCES threat_detections(detection_id) ON DELETE CASCADE,
    alert_uuid UUID DEFAULT uuid_generate_v4() UNIQUE,

    alert_title VARCHAR(255) NOT NULL,
    alert_message TEXT NOT NULL,
    alert_severity VARCHAR(20) CHECK (alert_severity IN ('info', 'warning', 'high', 'critical')) NOT NULL,

    channels_sent VARCHAR(50)[],
    slack_channel VARCHAR(100),

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    sent_at TIMESTAMPTZ,
    delivery_status VARCHAR(20) CHECK (delivery_status IN ('pending', 'sent', 'delivered', 'failed')) DEFAULT 'pending',

    acknowledged BOOLEAN DEFAULT FALSE,
    acknowledged_by VARCHAR(100),
    acknowledged_at TIMESTAMPTZ,

    last_updated TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_alerts_detection_id ON alerts(detection_id);
CREATE INDEX idx_alerts_severity ON alerts(alert_severity);
CREATE INDEX idx_alerts_created_at ON alerts(created_at DESC);
CREATE INDEX idx_alerts_acknowledged ON alerts(acknowledged);
CREATE INDEX idx_alerts_delivery_status ON alerts(delivery_status);
CREATE INDEX idx_alerts_status_severity ON alerts(delivery_status, alert_severity);

-- ============================================
-- TABLA: keywords_monitor
-- ============================================

CREATE TABLE IF NOT EXISTS keywords_monitor (
    keyword_id SERIAL PRIMARY KEY,
    keyword_text VARCHAR(255) NOT NULL UNIQUE,
    keyword_type VARCHAR(50),
    keyword_category VARCHAR(50),
    keyword_weight INTEGER DEFAULT 10 CHECK (keyword_weight BETWEEN 1 AND 100),

    is_active BOOLEAN DEFAULT TRUE,
    is_regex BOOLEAN DEFAULT FALSE,
    case_sensitive BOOLEAN DEFAULT FALSE,

    added_by VARCHAR(100),
    added_at TIMESTAMPTZ DEFAULT NOW(),

    last_match_at TIMESTAMPTZ,
    match_count INTEGER DEFAULT 0,
    false_positive_count INTEGER DEFAULT 0,
    true_positive_count INTEGER DEFAULT 0,

    trigger_immediate_alert BOOLEAN DEFAULT FALSE,
    min_matches_for_alert INTEGER DEFAULT 1,

    description TEXT
);

CREATE INDEX idx_keywords_active ON keywords_monitor(is_active);
CREATE INDEX idx_keywords_type ON keywords_monitor(keyword_type);
CREATE INDEX idx_keywords_category ON keywords_monitor(keyword_category);
CREATE INDEX idx_keywords_last_match ON keywords_monitor(last_match_at DESC) WHERE last_match_at IS NOT NULL;
CREATE INDEX idx_keywords_text_trgm ON keywords_monitor USING gin(keyword_text gin_trgm_ops);

-- ============================================
-- TABLA: execution_logs
-- ============================================

CREATE TABLE IF NOT EXISTS execution_logs (
    log_id BIGSERIAL PRIMARY KEY,
    execution_uuid UUID DEFAULT uuid_generate_v4() UNIQUE,

    workflow_name VARCHAR(100) NOT NULL,
    execution_id VARCHAR(255),

    status VARCHAR(20) CHECK (status IN ('success', 'partial_success', 'error', 'warning', 'timeout')) NOT NULL,

    mentions_collected INTEGER DEFAULT 0,
    mentions_processed INTEGER DEFAULT 0,
    detections_generated INTEGER DEFAULT 0,
    alerts_generated INTEGER DEFAULT 0,

    started_at TIMESTAMPTZ NOT NULL,
    completed_at TIMESTAMPTZ,
    duration_seconds INTEGER,

    last_updated TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_logs_workflow_name ON execution_logs(workflow_name);
CREATE INDEX idx_logs_started_at ON execution_logs(started_at DESC);
CREATE INDEX idx_logs_status ON execution_logs(status);
CREATE INDEX idx_logs_execution_id ON execution_logs(execution_id);
CREATE INDEX idx_logs_workflow_date_status ON execution_logs(workflow_name, started_at DESC, status);

-- ============================================
-- TABLA: user_activity
-- ============================================

CREATE TABLE IF NOT EXISTS user_activity (
    activity_id BIGSERIAL PRIMARY KEY,

    username VARCHAR(100) NOT NULL,
    user_role VARCHAR(50),

    activity_type VARCHAR(50) NOT NULL,
    activity_description TEXT,

    related_mention_id BIGINT REFERENCES social_mentions(mention_id) ON DELETE SET NULL,
    related_detection_id BIGINT REFERENCES threat_detections(detection_id) ON DELETE SET NULL,
    related_alert_id BIGINT REFERENCES alerts(alert_id) ON DELETE SET NULL,

    ip_address INET,
    user_agent TEXT,
    session_id VARCHAR(255),

    activity_timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    activity_data JSONB
);

CREATE INDEX idx_activity_username ON user_activity(username);
CREATE INDEX idx_activity_type ON user_activity(activity_type);
CREATE INDEX idx_activity_timestamp ON user_activity(activity_timestamp DESC);
CREATE INDEX idx_activity_related_detection ON user_activity(related_detection_id) WHERE related_detection_id IS NOT NULL;

-- ============================================
-- FUNCIONES Y TRIGGERS
-- ============================================

CREATE OR REPLACE FUNCTION update_last_updated_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.last_updated = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_social_mentions_last_updated
    BEFORE UPDATE ON social_mentions
    FOR EACH ROW
    EXECUTE FUNCTION update_last_updated_column();

CREATE TRIGGER update_threat_detections_last_updated
    BEFORE UPDATE ON threat_detections
    FOR EACH ROW
    EXECUTE FUNCTION update_last_updated_column();

CREATE TRIGGER update_alerts_last_updated
    BEFORE UPDATE ON alerts
    FOR EACH ROW
    EXECUTE FUNCTION update_last_updated_column();

CREATE OR REPLACE FUNCTION update_keyword_match()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE keywords_monitor
    SET last_match_at = NEW.collected_at,
        match_count = match_count + 1
    WHERE is_active = TRUE
      AND (
          (is_regex = FALSE AND case_sensitive = FALSE AND lower(NEW.text_content) LIKE '%' || lower(keyword_text) || '%')
          OR
          (is_regex = FALSE AND case_sensitive = TRUE AND NEW.text_content LIKE '%' || keyword_text || '%')
          OR
          (is_regex = TRUE AND NEW.text_content ~ keyword_text)
      );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_keyword_match
    AFTER INSERT ON social_mentions
    FOR EACH ROW
    EXECUTE FUNCTION update_keyword_match();

CREATE OR REPLACE FUNCTION calculate_execution_duration()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.completed_at IS NOT NULL AND NEW.started_at IS NOT NULL THEN
        NEW.duration_seconds := EXTRACT(EPOCH FROM (NEW.completed_at - NEW.started_at))::INTEGER;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_calculate_duration
    BEFORE INSERT OR UPDATE ON execution_logs
    FOR EACH ROW
    EXECUTE FUNCTION calculate_execution_duration();

-- ============================================
-- VISTAS MATERIALIZADAS
-- ============================================

CREATE MATERIALIZED VIEW daily_mention_stats AS
SELECT
    DATE(sm.created_at) AS date,
    sm.platform,
    sa.sentiment_label,
    td.criticality_level,
    COUNT(DISTINCT sm.mention_id) AS mention_count,
    COUNT(DISTINCT CASE WHEN td.detection_id IS NOT NULL THEN sm.mention_id END) AS threat_count,
    COUNT(DISTINCT CASE WHEN a.alert_id IS NOT NULL THEN sm.mention_id END) AS alert_count,
    AVG(sa.final_sentiment_score) AS avg_sentiment_score,
    AVG(sm.likes_count + sm.shares_count + sm.replies_count) AS avg_engagement,
    MAX(sm.likes_count + sm.shares_count + sm.replies_count) AS max_engagement
FROM social_mentions sm
LEFT JOIN sentiment_analysis sa ON sm.mention_id = sa.mention_id
LEFT JOIN threat_detections td ON sm.mention_id = td.mention_id
LEFT JOIN alerts a ON td.detection_id = a.detection_id
WHERE sm.created_at >= CURRENT_DATE - INTERVAL '90 days'
GROUP BY DATE(sm.created_at), sm.platform, sa.sentiment_label, td.criticality_level;

CREATE UNIQUE INDEX ON daily_mention_stats (date, platform, COALESCE(sentiment_label, 'unknown'), COALESCE(criticality_level, 'none'));

CREATE MATERIALIZED VIEW top_keywords_stats AS
SELECT
    keyword,
    COUNT(*) AS detection_count,
    COUNT(DISTINCT DATE(td.detected_at)) AS days_active,
    AVG(td.confidence_score) AS avg_confidence,
    COUNT(CASE WHEN td.criticality_level IN ('high', 'critical') THEN 1 END) AS high_severity_count,
    MAX(td.detected_at) AS last_detection
FROM threat_detections td, UNNEST(td.matched_keywords) AS keyword
WHERE td.detected_at >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY keyword
ORDER BY detection_count DESC;

CREATE INDEX ON top_keywords_stats (detection_count DESC);

CREATE MATERIALIZED VIEW workflow_performance_stats AS
SELECT
    workflow_name,
    DATE(started_at) AS date,
    COUNT(*) AS execution_count,
    COUNT(CASE WHEN status = 'success' THEN 1 END) AS success_count,
    COUNT(CASE WHEN status = 'error' THEN 1 END) AS error_count,
    AVG(duration_seconds) AS avg_duration_seconds,
    AVG(mentions_processed) AS avg_mentions_processed,
    AVG(detections_generated) AS avg_detections_generated
FROM execution_logs
WHERE started_at >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY workflow_name, DATE(started_at);

CREATE INDEX ON workflow_performance_stats (workflow_name, date DESC);

CREATE OR REPLACE FUNCTION refresh_all_materialized_views()
RETURNS void AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY daily_mention_stats;
    REFRESH MATERIALIZED VIEW CONCURRENTLY top_keywords_stats;
    REFRESH MATERIALIZED VIEW CONCURRENTLY workflow_performance_stats;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- PROCEDIMIENTOS DE MANTENIMIENTO
-- ============================================

CREATE OR REPLACE PROCEDURE purge_old_data(retention_days INTEGER DEFAULT 365)
LANGUAGE plpgsql AS $$
DECLARE
    cutoff_date TIMESTAMPTZ;
    deleted_mentions INTEGER;
    deleted_logs INTEGER;
BEGIN
    cutoff_date := NOW() - (retention_days || ' days')::INTERVAL;

    DELETE FROM social_mentions
    WHERE created_at < cutoff_date
      AND mention_id NOT IN (
          SELECT mention_id
          FROM threat_detections
          WHERE review_status = 'confirmed'
      );

    GET DIAGNOSTICS deleted_mentions = ROW_COUNT;

    DELETE FROM execution_logs
    WHERE started_at < cutoff_date;

    GET DIAGNOSTICS deleted_logs = ROW_COUNT;

    RAISE NOTICE 'Purge completed: % mentions, % logs deleted (cutoff: %)',
                  deleted_mentions, deleted_logs, cutoff_date;

    VACUUM ANALYZE social_mentions;
    VACUUM ANALYZE execution_logs;
END;
$$;

CREATE OR REPLACE PROCEDURE optimize_database()
LANGUAGE plpgsql AS $$
BEGIN
    ANALYZE social_mentions;
    ANALYZE sentiment_analysis;
    ANALYZE threat_detections;
    ANALYZE alerts;
    ANALYZE keywords_monitor;
    ANALYZE execution_logs;

    REINDEX TABLE CONCURRENTLY social_mentions;
    REINDEX TABLE CONCURRENTLY threat_detections;

    PERFORM refresh_all_materialized_views();

    RAISE NOTICE 'Database optimization completed successfully';
END;
$$;

-- ============================================
-- VISTAS DE REPORTING
-- ============================================

CREATE OR REPLACE VIEW daily_activity_summary AS
SELECT
    CURRENT_DATE AS report_date,
    COUNT(DISTINCT sm.mention_id) AS total_mentions,
    COUNT(DISTINCT CASE WHEN sm.created_at >= CURRENT_DATE THEN sm.mention_id END) AS mentions_today,
    COUNT(DISTINCT td.detection_id) AS total_detections,
    COUNT(DISTINCT CASE WHEN td.detected_at >= CURRENT_DATE THEN td.detection_id END) AS detections_today,
    COUNT(DISTINCT CASE WHEN td.criticality_level = 'critical' AND td.detected_at >= CURRENT_DATE THEN td.detection_id END) AS critical_today,
    COUNT(DISTINCT CASE WHEN a.created_at >= CURRENT_DATE THEN a.alert_id END) AS alerts_today,
    COUNT(DISTINCT CASE WHEN a.acknowledged = FALSE AND a.created_at >= CURRENT_DATE THEN a.alert_id END) AS unacknowledged_alerts
FROM social_mentions sm
LEFT JOIN threat_detections td ON sm.mention_id = td.mention_id
LEFT JOIN alerts a ON td.detection_id = a.detection_id
WHERE sm.created_at >= CURRENT_DATE - INTERVAL '7 days';

CREATE OR REPLACE VIEW unresolved_threats AS
SELECT
    td.detection_id,
    td.threat_type,
    td.criticality_level,
    td.detected_at,
    sm.text_content,
    sm.author_username,
    sm.platform,
    td.review_status,
    EXTRACT(EPOCH FROM (NOW() - td.detected_at))/3600 AS hours_since_detection
FROM threat_detections td
JOIN social_mentions sm ON td.mention_id = sm.mention_id
WHERE td.review_status IN ('pending', 'reviewing', 'investigating')
  AND td.criticality_level IN ('high', 'critical')
ORDER BY td.criticality_level DESC, td.detected_at ASC;

-- ============================================
-- SEGURIDAD
-- ============================================

CREATE ROLE osint_admin;
CREATE ROLE osint_analyst;
CREATE ROLE osint_readonly;

GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO osint_admin;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO osint_admin;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO osint_admin;

GRANT SELECT ON ALL TABLES IN SCHEMA public TO osint_analyst;
GRANT INSERT, UPDATE ON threat_detections TO osint_analyst;
GRANT INSERT, UPDATE ON alerts TO osint_analyst;
GRANT INSERT ON user_activity TO osint_analyst;

GRANT SELECT ON ALL TABLES IN SCHEMA public TO osint_readonly;

ALTER TABLE social_mentions ENABLE ROW LEVEL SECURITY;
ALTER TABLE threat_detections ENABLE ROW LEVEL SECURITY;

CREATE POLICY user_isolation_policy ON threat_detections
    FOR ALL TO osint_analyst
    USING (reviewed_by = current_user OR reviewed_by IS NULL);

-- ============================================
-- DATOS INICIALES
-- ============================================

INSERT INTO keywords_monitor (keyword_text, keyword_type, keyword_category, keyword_weight, trigger_immediate_alert, description)
VALUES
    ('ransomware', 'threat_term', 'critical', 30, TRUE, 'Menciones de ransomware'),
    ('data breach', 'threat_term', 'critical', 30, TRUE, 'Filtraciones de datos'),
    ('zero-day', 'threat_term', 'critical', 25, TRUE, 'Vulnerabilidades zero-day'),
    ('phishing', 'threat_term', 'high', 20, FALSE, 'Campañas de phishing'),
    ('malware', 'threat_term', 'high', 20, FALSE, 'Malware general'),
    ('exploit', 'threat_term', 'high', 15, FALSE, 'Exploits y vulnerabilidades'),
    ('vulnerability', 'threat_term', 'medium', 10, FALSE, 'Vulnerabilidades en general'),
    ('ciberataque', 'threat_term', 'high', 20, FALSE, 'Ataques cibernéticos (español)'),
    ('filtración', 'threat_term', 'high', 20, FALSE, 'Filtraciones (español)'),
    ('hackeado', 'threat_term', 'medium', 15, FALSE, 'Compromisos (español)')
ON CONFLICT (keyword_text) DO NOTHING;

-- ============================================
-- COMENTARIOS
-- ============================================

COMMENT ON TABLE social_mentions IS 'Menciones recopiladas de redes sociales y fuentes OSINT';
COMMENT ON TABLE sentiment_analysis IS 'Resultados de análisis de sentimiento (VADER + TextBlob)';
COMMENT ON TABLE threat_detections IS 'Detecciones de amenazas potenciales';
COMMENT ON TABLE alerts IS 'Alertas generadas y enviadas';
COMMENT ON TABLE keywords_monitor IS 'Keywords monitoreados activamente';
COMMENT ON TABLE execution_logs IS 'Auditoría de ejecuciones de workflows';
COMMENT ON TABLE user_activity IS 'Actividad de usuarios del sistema';
