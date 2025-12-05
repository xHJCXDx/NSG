-- ============================================
-- OSINT MONITORING SYSTEM - DATABASE SCHEMA
-- Version: 1.0
-- PostgreSQL 14+
-- ============================================

-- Crear extensiones necesarias
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";  -- Para búsquedas de similitud
CREATE EXTENSION IF NOT EXISTS "btree_gin"; -- Para índices GIN en tipos múltiples

-- ============================================
-- TABLA: social_mentions
-- Almacena menciones recopiladas de redes sociales
-- ============================================

CREATE TABLE IF NOT EXISTS social_mentions (
    -- Identificación
    mention_id BIGSERIAL PRIMARY KEY,
    platform VARCHAR(50) NOT NULL CHECK (platform IN ('twitter', 'reddit', 'telegram', 'discord', 'other')),
    external_id VARCHAR(255) NOT NULL,
    
    -- Contenido
    text_content TEXT NOT NULL,
    language VARCHAR(10),
    
    -- Temporal
    created_at TIMESTAMPTZ NOT NULL,
    collected_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- Autor
    author_username VARCHAR(255),
    author_id VARCHAR(255),
    author_verified BOOLEAN DEFAULT FALSE,
    author_followers_count INTEGER DEFAULT 0 CHECK (author_followers_count >= 0),
    author_description TEXT,
    
    -- Métricas de engagement
    likes_count INTEGER DEFAULT 0 CHECK (likes_count >= 0),
    shares_count INTEGER DEFAULT 0 CHECK (shares_count >= 0),
    replies_count INTEGER DEFAULT 0 CHECK (replies_count >= 0),
    views_count INTEGER DEFAULT 0 CHECK (views_count >= 0),
    
    -- Contenido adicional
    urls TEXT[],
    hashtags VARCHAR(100)[],
    mentions VARCHAR(100)[],
    has_media BOOLEAN DEFAULT FALSE,
    media_types VARCHAR(20)[],  -- ['image', 'video', 'gif']
    
    -- Geolocalización (si disponible)
    geo_location JSONB,
    
    -- Contexto adicional
    is_reply BOOLEAN DEFAULT FALSE,
    is_quote BOOLEAN DEFAULT FALSE,
    reply_to_id VARCHAR(255),
    conversation_id VARCHAR(255),
    
    -- Datos raw completos para referencia
    raw_data JSONB,
    
    -- Metadatos del sistema
    processing_status VARCHAR(20) DEFAULT 'pending' CHECK (processing_status IN ('pending', 'processed', 'failed')),
    processing_error TEXT,
    last_updated TIMESTAMPTZ DEFAULT NOW(),
    
    -- Constraint de unicidad
    CONSTRAINT unique_mention_per_platform UNIQUE (platform, external_id)
);

-- Índices para social_mentions
CREATE INDEX idx_mentions_created_at ON social_mentions(created_at DESC);
CREATE INDEX idx_mentions_collected_at ON social_mentions(collected_at DESC);
CREATE INDEX idx_mentions_platform ON social_mentions(platform);
CREATE INDEX idx_mentions_author_username ON social_mentions(author_username);
CREATE INDEX idx_mentions_author_id ON social_mentions(author_id);
CREATE INDEX idx_mentions_processing_status ON social_mentions(processing_status);
CREATE INDEX idx_mentions_conversation_id ON social_mentions(conversation_id) WHERE conversation_id IS NOT NULL;

-- Índice GIN para búsqueda full-text (español)
CREATE INDEX idx_mentions_text_content_gin ON social_mentions USING gin(to_tsvector('spanish', text_content));

-- Índice GIN para arrays
CREATE INDEX idx_mentions_urls_gin ON social_mentions USING gin(urls);
CREATE INDEX idx_mentions_hashtags_gin ON social_mentions USING gin(hashtags);

-- Índice para búsqueda de similitud en usernames
CREATE INDEX idx_mentions_author_username_trgm ON social_mentions USING gin(author_username gin_trgm_ops);

-- ============================================
-- TABLA: sentiment_analysis
-- Resultados de análisis de sentimiento
-- ============================================

CREATE TABLE IF NOT EXISTS sentiment_analysis (
    -- Identificación
    sentiment_id BIGSERIAL PRIMARY KEY,
    mention_id BIGINT NOT NULL REFERENCES social_mentions(mention_id) ON DELETE CASCADE,
    
    -- Scores de VADER
    vader_compound NUMERIC(5,4) CHECK (vader_compound BETWEEN -1 AND 1),
    vader_pos NUMERIC(4,3) CHECK (vader_pos BETWEEN 0 AND 1),
    vader_neu NUMERIC(4,3) CHECK (vader_neu BETWEEN 0 AND 1),
    vader_neg NUMERIC(4,3) CHECK (vader_neg BETWEEN 0 AND 1),
    
    -- Scores de TextBlob
    textblob_polarity NUMERIC(5,4) CHECK (textblob_polarity BETWEEN -1 AND 1),
    textblob_subjectivity NUMERIC(4,3) CHECK (textblob_subjectivity BETWEEN 0 AND 1),
    
    -- Scores de otros analizadores (futuro)
    bert_score NUMERIC(5,4) CHECK (bert_score BETWEEN -1 AND 1),
    custom_score NUMERIC(5,4) CHECK (custom_score BETWEEN -1 AND 1),
    
    -- Score final (ensemble)
    final_sentiment_score NUMERIC(5,4) CHECK (final_sentiment_score BETWEEN -1 AND 1) NOT NULL,
    sentiment_label VARCHAR(20) CHECK (sentiment_label IN ('positive', 'neutral', 'negative', 'mixed')) NOT NULL,
    confidence_score NUMERIC(4,3) CHECK (confidence_score BETWEEN 0 AND 1),
    
    -- Metadatos del análisis
    analysis_method VARCHAR(50) NOT NULL,  -- 'vader', 'textblob', 'ensemble', 'bert'
    analysis_version VARCHAR(20),
    analyzed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- Detección de características especiales
    contains_negation BOOLEAN DEFAULT FALSE,
    contains_intensifiers BOOLEAN DEFAULT FALSE,
    contains_emoticons BOOLEAN DEFAULT FALSE,
    emoticon_sentiment VARCHAR(20),
    
    -- Notas adicionales
    analysis_notes TEXT,
    
    -- Constraint de unicidad
    CONSTRAINT unique_sentiment_per_mention UNIQUE (mention_id)
);

-- Índices para sentiment_analysis
CREATE INDEX idx_sentiment_mention_id ON sentiment_analysis(mention_id);
CREATE INDEX idx_sentiment_label ON sentiment_analysis(sentiment_label);
CREATE INDEX idx_sentiment_final_score ON sentiment_analysis(final_sentiment_score);
CREATE INDEX idx_sentiment_analyzed_at ON sentiment_analysis(analyzed_at DESC);
CREATE INDEX idx_sentiment_method ON sentiment_analysis(analysis_method);

-- Índice compuesto para queries comunes
CREATE INDEX idx_sentiment_label_score ON sentiment_analysis(sentiment_label, final_sentiment_score);

-- ============================================
-- TABLA: threat_detections
-- Menciones clasificadas como amenazas potenciales
-- ============================================

CREATE TABLE IF NOT EXISTS threat_detections (
    -- Identificación
    detection_id BIGSERIAL PRIMARY KEY,
    mention_id BIGINT NOT NULL REFERENCES social_mentions(mention_id) ON DELETE CASCADE,
    sentiment_id BIGINT REFERENCES sentiment_analysis(sentiment_id) ON DELETE SET NULL,
    
    -- Clasificación de amenaza
    threat_type VARCHAR(100) NOT NULL,
    threat_category VARCHAR(50),  -- 'malware', 'phishing', 'data_breach', 'vulnerability', 'ddos', 'reputational', 'insider_threat', 'other'
    criticality_level VARCHAR(20) CHECK (criticality_level IN ('low', 'medium', 'high', 'critical')) NOT NULL,
    confidence_score NUMERIC(4,3) CHECK (confidence_score BETWEEN 0 AND 1) NOT NULL,
    risk_score INTEGER CHECK (risk_score BETWEEN 0 AND 100),
    
    -- Detalles de detección
    matched_keywords TEXT[],
    detection_rules_triggered TEXT[],
    detection_method VARCHAR(50),  -- 'heuristic', 'ml_model', 'manual', 'hybrid'
    
    -- Análisis contextual
    contextual_notes TEXT,
    related_iocs TEXT[],  -- Indicators of Compromise
    affected_assets VARCHAR(255)[],
    potential_impact TEXT,
    
    -- Temporal
    detected_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- Estado de revisión
    review_status VARCHAR(20) CHECK (review_status IN ('pending', 'reviewing', 'confirmed', 'false_positive', 'investigating', 'resolved')) DEFAULT 'pending',
    reviewed_by VARCHAR(100),
    reviewed_at TIMESTAMPTZ,
    review_notes TEXT,
    
    -- Acciones tomadas
    actions_taken TEXT[],
    remediation_status VARCHAR(20) CHECK (remediation_status IN ('none', 'in_progress', 'completed', 'not_required')),
    resolution_time TIMESTAMPTZ,
    
    -- Escalación
    escalated BOOLEAN DEFAULT FALSE,
    escalated_to VARCHAR(100),
    escalation_time TIMESTAMPTZ,
    
    -- Metadatos
    last_updated TIMESTAMPTZ DEFAULT NOW(),
    
    -- Constraint de unicidad
    CONSTRAINT unique_detection_per_mention UNIQUE (mention_id)
);

-- Índices para threat_detections
CREATE INDEX idx_detections_mention_id ON threat_detections(mention_id);
CREATE INDEX idx_detections_sentiment_id ON threat_detections(sentiment_id);
CREATE INDEX idx_detections_criticality ON threat_detections(criticality_level);
CREATE INDEX idx_detections_detected_at ON threat_detections(detected_at DESC);
CREATE INDEX idx_detections_review_status ON threat_detections(review_status);
CREATE INDEX idx_detections_threat_type ON threat_detections(threat_type);
CREATE INDEX idx_detections_threat_category ON threat_detections(threat_category);

-- Índice compuesto para dashboard queries
CREATE INDEX idx_detections_status_criticality ON threat_detections(review_status, criticality_level);
CREATE INDEX idx_detections_date_criticality ON threat_detections(detected_at DESC, criticality_level);

-- Índice GIN para arrays
CREATE INDEX idx_detections_keywords_gin ON threat_detections USING gin(matched_keywords);
CREATE INDEX idx_detections_rules_gin ON threat_detections USING gin(detection_rules_triggered);

-- ============================================
-- TABLA: alerts
-- Alertas generadas y enviadas
-- ============================================

CREATE TABLE IF NOT EXISTS alerts (
    -- Identificación
    alert_id BIGSERIAL PRIMARY KEY,
    detection_id BIGINT NOT NULL REFERENCES threat_detections(detection_id) ON DELETE CASCADE,
    alert_uuid UUID DEFAULT uuid_generate_v4() UNIQUE,
    
    -- Contenido de la alerta
    alert_title VARCHAR(255) NOT NULL,
    alert_message TEXT NOT NULL,
    alert_severity VARCHAR(20) CHECK (alert_severity IN ('info', 'warning', 'high', 'critical')) NOT NULL,
    alert_priority INTEGER CHECK (alert_priority BETWEEN 1 AND 5) DEFAULT 3,
    
    -- Destinatarios
    recipients TEXT[],  -- Lista de emails o usernames
    teams_notified VARCHAR(50)[],  -- ['security', 'it', 'management']
    
    -- Canales de entrega
    channels_sent VARCHAR(50)[],  -- ['slack', 'email', 'sms', 'webhook']
    
    -- IDs externos para tracking
    slack_channel VARCHAR(100),
    slack_message_ts VARCHAR(100),
    slack_thread_ts VARCHAR(100),
    email_message_id VARCHAR(255),
    sms_message_id VARCHAR(255),
    webhook_response JSONB,
    
    -- Temporal
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    sent_at TIMESTAMPTZ,
    delivery_attempts INTEGER DEFAULT 0,
    last_delivery_attempt TIMESTAMPTZ,
    delivery_status VARCHAR(20) CHECK (delivery_status IN ('pending', 'sent', 'delivered', 'failed')) DEFAULT 'pending',
    delivery_error TEXT,
    
    -- Acknowledgment
    acknowledged BOOLEAN DEFAULT FALSE,
    acknowledged_by VARCHAR(100),
    acknowledged_at TIMESTAMPTZ,
    acknowledgment_method VARCHAR(20),  -- 'slack_button', 'email_link', 'web_dashboard'
    
    -- Follow-up
    follow_up_required BOOLEAN DEFAULT FALSE,
    follow_up_notes TEXT,
    follow_up_due_date TIMESTAMPTZ,
    
    -- Supresión de alertas duplicadas
    suppressed BOOLEAN DEFAULT FALSE,
    suppressed_reason TEXT,
    
    -- Metadatos
    alert_version INTEGER DEFAULT 1,
    last_updated TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para alerts
CREATE INDEX idx_alerts_detection_id ON alerts(detection_id);
CREATE INDEX idx_alerts_severity ON alerts(alert_severity);
CREATE INDEX idx_alerts_created_at ON alerts(created_at DESC);
CREATE INDEX idx_alerts_acknowledged ON alerts(acknowledged);
CREATE INDEX idx_alerts_delivery_status ON alerts(delivery_status);
CREATE INDEX idx_alerts_follow_up ON alerts(follow_up_required, follow_up_due_date) WHERE follow_up_required = TRUE;

-- Índice compuesto
CREATE INDEX idx_alerts_status_severity ON alerts(delivery_status, alert_severity);

-- ============================================
-- TABLA: keywords_monitor
-- Keywords monitoreados activamente
-- ============================================

CREATE TABLE IF NOT EXISTS keywords_monitor (
    keyword_id SERIAL PRIMARY KEY,
    keyword_text VARCHAR(255) NOT NULL UNIQUE,
    keyword_type VARCHAR(50),  -- 'brand', 'threat_term', 'technical', 'person_name', 'product'
    keyword_category VARCHAR(50),  -- 'critical', 'high', 'medium', 'low'
    keyword_weight INTEGER DEFAULT 10 CHECK (keyword_weight BETWEEN 1 AND 100),
    
    -- Estado
    is_active BOOLEAN DEFAULT TRUE,
    is_regex BOOLEAN DEFAULT FALSE,
    case_sensitive BOOLEAN DEFAULT FALSE,
    
    -- Metadatos
    added_by VARCHAR(100),
    added_at TIMESTAMPTZ DEFAULT NOW(),
    last_modified_by VARCHAR(100),
    last_modified_at TIMESTAMPTZ,
    
    -- Estadísticas de uso
    last_match_at TIMESTAMPTZ,
    match_count INTEGER DEFAULT 0,
    false_positive_count INTEGER DEFAULT 0,
    true_positive_count INTEGER DEFAULT 0,
    
    -- Configuración de alertas
    trigger_immediate_alert BOOLEAN DEFAULT FALSE,
    min_matches_for_alert INTEGER DEFAULT 1,
    
    -- Notas
    description TEXT,
    notes TEXT
);

-- Índices para keywords_monitor
CREATE INDEX idx_keywords_active ON keywords_monitor(is_active);
CREATE INDEX idx_keywords_type ON keywords_monitor(keyword_type);
CREATE INDEX idx_keywords_category ON keywords_monitor(keyword_category);
CREATE INDEX idx_keywords_last_match ON keywords_monitor(last_match_at DESC) WHERE last_match_at IS NOT NULL;

-- Índice para búsqueda de texto
CREATE INDEX idx_keywords_text_trgm ON keywords_monitor USING gin(keyword_text gin_trgm_ops);

-- ============================================
-- TABLA: execution_logs
-- Auditoría de ejecuciones de workflows
-- ============================================

CREATE TABLE IF NOT EXISTS execution_logs (
    log_id BIGSERIAL PRIMARY KEY,
    execution_uuid UUID DEFAULT uuid_generate_v4() UNIQUE,
    
    -- Identificación del workflow
    workflow_name VARCHAR(100) NOT NULL,
    workflow_version VARCHAR(20),
    execution_id VARCHAR(255),  -- n8n execution ID
    
    -- Estado
    status VARCHAR(20) CHECK (status IN ('success', 'partial_success', 'error', 'warning', 'timeout')) NOT NULL,
    
    -- Métricas
    mentions_collected INTEGER DEFAULT 0,
    mentions_processed INTEGER DEFAULT 0,
    mentions_failed INTEGER DEFAULT 0,
    detections_generated INTEGER DEFAULT 0,
    alerts_generated INTEGER DEFAULT 0,
    
    -- API usage
    api_calls_made INTEGER DEFAULT 0,
    api_calls_failed INTEGER DEFAULT 0,
    api_quota_remaining INTEGER,
    
    -- Errores
    error_count INTEGER DEFAULT 0,
    error_message TEXT,
    error_stack TEXT,
    warnings TEXT[],
    
    -- Temporal
    started_at TIMESTAMPTZ NOT NULL,
    completed_at TIMESTAMPTZ,
    duration_seconds INTEGER,
    
    -- Performance
    avg_processing_time_ms NUMERIC(10,2),
    peak_memory_mb NUMERIC(10,2),
    
    -- Contexto adicional
    trigger_source VARCHAR(50),  -- 'schedule', 'webhook', 'manual', 'event'
    configuration_snapshot JSONB,
    
    -- Usuario (si aplica)
    executed_by VARCHAR(100),
    
    -- Metadatos
    last_updated TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para execution_logs
CREATE INDEX idx_logs_workflow_name ON execution_logs(workflow_name);
CREATE INDEX idx_logs_started_at ON execution_logs(started_at DESC);
CREATE INDEX idx_logs_status ON execution_logs(status);
CREATE INDEX idx_logs_execution_id ON execution_logs(execution_id);

-- Índice compuesto
CREATE INDEX idx_logs_workflow_date_status ON execution_logs(workflow_name, started_at DESC, status);

-- ============================================
-- TABLA: user_activity
-- Actividad de usuarios del sistema
-- ============================================

CREATE TABLE IF NOT EXISTS user_activity (
    activity_id BIGSERIAL PRIMARY KEY,
    
    -- Usuario
    username VARCHAR(100) NOT NULL,
    user_role VARCHAR(50),
    
    -- Actividad
    activity_type VARCHAR(50) NOT NULL,  -- 'login', 'view_alert', 'acknowledge_alert', 'mark_false_positive', 'export_data', 'modify_config'
    activity_description TEXT,
    
    -- Contexto
    related_mention_id BIGINT REFERENCES social_mentions(mention_id) ON DELETE SET NULL,
    related_detection_id BIGINT REFERENCES threat_detections(detection_id) ON DELETE SET NULL,
    related_alert_id BIGINT REFERENCES alerts(alert_id) ON DELETE SET NULL,
    
    -- Metadatos técnicos
    ip_address INET,
    user_agent TEXT,
    session_id VARCHAR(255),
    
    -- Temporal
    activity_timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- Datos adicionales
    activity_data JSONB
);

-- Índices para user_activity
CREATE INDEX idx_activity_username ON user_activity(username);
CREATE INDEX idx_activity_type ON user_activity(activity_type);
CREATE INDEX idx_activity_timestamp ON user_activity(activity_timestamp DESC);
CREATE INDEX idx_activity_related_detection ON user_activity(related_detection_id) WHERE related_detection_id IS NOT NULL;

-- ============================================
-- FUNCIONES Y TRIGGERS
-- ============================================

-- Función: Actualizar timestamp de last_updated
CREATE OR REPLACE FUNCTION update_last_updated_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.last_updated = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Aplicar trigger a tablas relevantes
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

-- Función: Actualizar estadísticas de keywords cuando hay match
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

-- Función: Calcular duración automática en execution_logs
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

-- =========================================
-- VISTAS MATERIALIZADAS PARA REPORTING -- ============================================

-- Vista: Estadísticas diarias de menciones 
CREATE MATERIALIZED VIEW daily_mention_stats AS SELECT DATE(sm.created_at) as date, sm.platform, sa.sentiment_label, td.criticality_level, COUNT(DISTINCT sm.mention_id) as mention_count, COUNT(DISTINCT CASE WHEN td.detection_id IS NOT NULL THEN sm.mention_id END) as threat_count, COUNT(DISTINCT CASE WHEN a.alert_id IS NOT NULL THEN sm.mention_id END) as alert_count, AVG(sa.final_sentiment_score) as avg_sentiment_score, AVG(sm.likes_count + sm.shares_count + sm.replies_count) as avg_engagement, MAX(sm.likes_count + sm.shares_count + sm.replies_count) as max_engagement FROM social_mentions sm LEFT JOIN sentiment_analysis sa ON sm.mention_id = sa.mention_id LEFT JOIN threat_detections td ON sm.mention_id = td.mention_id LEFT JOIN alerts a ON td.detection_id = a.detection_id WHERE sm.created_at >= CURRENT_DATE - INTERVAL '90 days' GROUP BY DATE(sm.created_at), sm.platform, sa.sentiment_label, td.criticality_level;

CREATE UNIQUE INDEX ON daily_mention_stats (date, platform, COALESCE(sentiment_label, 'unknown'), COALESCE(criticality_level, 'none'));

-- Vista: Top keywords por detecciones 
CREATE MATERIALIZED VIEW top_keywords_stats AS SELECT keyword, COUNT(*) as detection_count, COUNT(DISTINCT DATE(td.detected_at)) as days_active, AVG(td.confidence_score) as avg_confidence, COUNT(CASE WHEN td.criticality_level IN ('high', 'critical') THEN 1 END) as high_severity_count, MAX(td.detected_at) as last_detection FROM threat_detections td, UNNEST(td.matched_keywords) as keyword WHERE td.detected_at >= CURRENT_DATE - INTERVAL '30 days' GROUP BY keyword ORDER BY detection_count DESC;

CREATE INDEX ON top_keywords_stats (detection_count DESC);

-- Vista: Performance de workflows 
CREATE MATERIALIZED VIEW workflow_performance_stats AS SELECT workflow_name, DATE(started_at) as date, COUNT(*) as execution_count, COUNT(CASE WHEN status = 'success' THEN 1 END) as success_count, COUNT(CASE WHEN status = 'error' THEN 1 END) as error_count, AVG(duration_seconds) as avg_duration_seconds, AVG(mentions_processed) as avg_mentions_processed, AVG(detections_generated) as avg_detections_generated, SUM(api_calls_made) as total_api_calls FROM execution_logs WHERE started_at >= CURRENT_DATE - INTERVAL '30 days' GROUP BY workflow_name, DATE(started_at);

CREATE INDEX ON workflow_performance_stats (workflow_name, date DESC);

-- Función para refrescar todas las vistas materializadas 
CREATE OR REPLACE FUNCTION refresh_all_materialized_views() RETURNS void AS $$ BEGIN REFRESH MATERIALIZED VIEW CONCURRENTLY daily_mention_stats; REFRESH MATERIALIZED VIEW CONCURRENTLY top_keywords_stats; REFRESH MATERIALIZED VIEW CONCURRENTLY workflow_performance_stats; END; $$ LANGUAGE plpgsql;

-- =========================================
-- PROCEDIMIENTOS DE MANTENIMIENTO -- ============================================

-- Procedimiento: Purgar datos antiguos 
CREATE OR REPLACE PROCEDURE purge_old_data(retention_days INTEGER DEFAULT 365) LANGUAGE plpgsql AS $$ DECLARE cutoff_date TIMESTAMPTZ; deleted_mentions INTEGER; deleted_logs INTEGER; BEGIN cutoff_date := NOW() - (retention_days || ' days')::INTERVAL;


-- Purgar menciones antiguas (CASCADE eliminará registros relacionados)
DELETE FROM social_mentions
WHERE created_at < cutoff_date
  AND mention_id NOT IN (
      SELECT mention_id 
      FROM threat_detections 
      WHERE review_status = 'confirmed'
  );

GET DIAGNOSTICS deleted_mentions = ROW_COUNT;

-- Purgar logs de ejecución antiguos
DELETE FROM execution_logs
WHERE started_at < cutoff_date;

GET DIAGNOSTICS deleted_logs = ROW_COUNT;

-- Registrar operación
RAISE NOTICE 'Purge completed: % mentions, % logs deleted (cutoff: %)', 
              deleted_mentions, deleted_logs, cutoff_date;

-- Vacuum para recuperar espacio
VACUUM ANALYZE social_mentions;
VACUUM ANALYZE execution_logs;

END; $$;

-- Procedimiento: Optimizar base de datos 
CREATE OR REPLACE PROCEDURE optimize_database() LANGUAGE plpgsql AS $$ BEGIN -- Actualizar estadísticas 
ANALYZE social_mentions; ANALYZE sentiment_analysis; ANALYZE threat_detections; ANALYZE alerts; ANALYZE keywords_monitor; ANALYZE execution_logs;

-- Reindexar si hay fragmentación
REINDEX TABLE CONCURRENTLY social_mentions;
REINDEX TABLE CONCURRENTLY threat_detections;

-- Refrescar vistas materializadas
PERFORM refresh_all_materialized_views();

RAISE NOTICE 'Database optimization completed successfully';

END; $$;

-- ============================================
-- QUERIES ÚTILES PARA REPORTING 
-- ============================================

-- Query: Resumen diario de actividad 
CREATE OR REPLACE VIEW daily_activity_summary AS SELECT CURRENT_DATE as report_date, COUNT(DISTINCT sm.mention_id) as total_mentions, COUNT(DISTINCT CASE WHEN sm.created_at >= CURRENT_DATE THEN sm.mention_id END) as mentions_today, COUNT(DISTINCT td.detection_id) as total_detections, COUNT(DISTINCT CASE WHEN td.detected_at >= CURRENT_DATE THEN td.detection_id END) as detections_today, COUNT(DISTINCT CASE WHEN td.criticality_level = 'critical' AND td.detected_at >= CURRENT_DATE THEN td.detection_id END) as critical_today, COUNT(DISTINCT CASE WHEN a.created_at >= CURRENT_DATE THEN a.alert_id END) as alerts_today, COUNT(DISTINCT CASE WHEN a.acknowledged = FALSE AND a.created_at >= CURRENT_DATE THEN a.alert_id END) as unacknowledged_alerts FROM social_mentions sm LEFT JOIN threat_detections td ON sm.mention_id = td.mention_id LEFT JOIN alerts a ON td.detection_id = a.detection_id WHERE sm.created_at >= CURRENT_DATE - INTERVAL '7 days';

-- Query: Top amenazas sin resolver 
CREATE OR REPLACE VIEW unresolved_threats AS SELECT td.detection_id, td.threat_type, td.criticality_level, td.detected_at, sm.text_content, sm.author_username, sm.platform, td.review_status, EXTRACT(EPOCH FROM (NOW() - td.detected_at))/3600 as hours_since_detection FROM threat_detections td JOIN social_mentions sm ON td.mention_id = sm.mention_id WHERE td.review_status IN ('pending', 'reviewing', 'investigating') AND td.criticality_level IN ('high', 'critical') ORDER BY td.criticality_level DESC, td.detected_at ASC;

-- ============================================ 
-- CONFIGURACIÓN DE SEGURIDAD 
-- ============================================

-- Crear roles 
CREATE ROLE osint_admin; CREATE ROLE osint_analyst; CREATE ROLE osint_readonly;

-- Permisos para admin (todos) 
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO osint_admin; GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO osint_admin; GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO osint_admin;

-- Permisos para analyst (lectura + escritura en algunas tablas) 
GRANT SELECT ON ALL TABLES IN SCHEMA public TO osint_analyst; GRANT INSERT, UPDATE ON threat_detections TO osint_analyst; GRANT INSERT, UPDATE ON alerts TO osint_analyst; GRANT INSERT ON user_activity TO osint_analyst;

-- Permisos para readonly (solo lectura) 
GRANT SELECT ON ALL TABLES IN SCHEMA public TO osint_readonly;

-- Row Level Security (ejemplo para multi-tenancy futuro) 
ALTER TABLE social_mentions ENABLE ROW LEVEL SECURITY; ALTER TABLE threat_detections ENABLE ROW LEVEL SECURITY;

-- Política: Los usuarios solo ven sus propias detecciones (Deshabilitado por defecto; habilitar cuando se implemente multi-tenancy) 
CREATE POLICY user_isolation_policy ON threat_detections FOR ALL TO osint_analyst USING (reviewed_by = current_user OR reviewed_by IS NULL);

-- ============================================ 
-- DATOS INICIALES 
-- ============================================

-- Keywords iniciales de ejemplo 
INSERT INTO keywords_monitor (keyword_text, keyword_type, keyword_category, keyword_weight, trigger_immediate_alert, description) VALUES ('ransomware', 'threat_term', 'critical', 30, TRUE, 'Menciones de ransomware'), ('data breach', 'threat_term', 'critical', 30, TRUE, 'Filtraciones de datos'), ('zero-day', 'threat_term', 'critical', 25, TRUE, 'Vulnerabilidades zero-day'), ('phishing', 'threat_term', 'high', 20, FALSE, 'Campañas de phishing'), ('malware', 'threat_term', 'high', 20, FALSE, 'Malware general'), ('exploit', 'threat_term', 'high', 15, FALSE, 'Exploits y vulnerabilidades'), ('vulnerability', 'threat_term', 'medium', 10, FALSE, 'Vulnerabilidades en general'), ('ciberataque', 'threat_term', 'high', 20, FALSE, 'Ataques cibernéticos (español)'), ('filtración', 'threat_term', 'high', 20, FALSE, 'Filtraciones (español)'), ('hackeado', 'threat_term', 'medium', 15, FALSE, 'Compromisos (español)') ON CONFLICT (keyword_text) DO NOTHING;

-- ============================================ 
-- COMENTARIOS EN TABLAS 
-- ============================================

COMMENT ON TABLE social_mentions IS 'Menciones recopiladas de redes sociales'; COMMENT ON TABLE sentiment_analysis IS 'Resultados de análisis de sentimiento'; COMMENT ON TABLE threat_detections IS 'Detecciones de amenazas potenciales'; COMMENT ON TABLE alerts IS 'Alertas generadas y enviadas'; COMMENT ON TABLE keywords_monitor IS 'Keywords monitoreados activamente'; COMMENT ON TABLE execution_logs IS 'Auditoría de ejecuciones de workflows'; COMMENT ON TABLE user_activity IS 'Actividad de usuarios del sistema';

-- ============================================ 
-- FINALIZACIÓN 
-- ============================================

-- Mensaje de confirmación 
DO $$ 
BEGIN RAISE NOTICE'============================================'; 
RAISE NOTICE 'OSINT Monitoring System Schema Created Successfully'; 
RAISE NOTICE 'Version: 1.0'; 
RAISE NOTICE 'Timestamp: %', 
NOW(); 
RAISE NOTICE '============================================'; 
END $$;
