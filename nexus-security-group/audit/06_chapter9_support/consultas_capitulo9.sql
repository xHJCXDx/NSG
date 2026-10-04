-- ============================================================
-- CONSULTAS SQL — Cifras del Capítulo 9
-- Fuente: base de datos osint_db (PostgreSQL 17)
-- Generado: Septiembre 2026
-- Cada consulta produce una cifra o tabla citada en la tesis
-- ============================================================

-- ============================================================
-- §9.1.4 — Cobertura: Total de menciones únicas procesadas
-- Resultado esperado: 1.339
-- ============================================================
SELECT COUNT(*) AS total_menciones_unicas
FROM social_mentions;

-- ============================================================
-- §9.1.4 — Distribución por fuente
-- Resultado esperado: github ~1280+, hackernews ~40+, exploit-db ~20+
-- ============================================================
SELECT platform AS fuente,
       COUNT(*) AS cantidad
FROM social_mentions
GROUP BY platform
ORDER BY cantidad DESC;

-- ============================================================
-- §9.3 Escenario 1 — Distribución por criticidad (población completa)
-- Tesis §9.6.4: critical/high/medium/low
-- ============================================================
SELECT td.criticality_level,
       COUNT(*) AS cantidad,
       ROUND(100.0 * COUNT(*) / SUM(COUNT(*)) OVER (), 1) AS porcentaje
FROM threat_detections td
GROUP BY td.criticality_level
ORDER BY CASE td.criticality_level
    WHEN 'critical' THEN 1
    WHEN 'high' THEN 2
    WHEN 'medium' THEN 3
    WHEN 'low' THEN 4
END;

-- ============================================================
-- §9.3 Escenario 1 — Distribución por threat_type (tipología)
-- Tesis §9.6.5: critical_security_incident, general, security_threat
-- ============================================================
SELECT td.threat_type,
       COUNT(*) AS cantidad,
       ROUND(100.0 * COUNT(*) / SUM(COUNT(*)) OVER (), 1) AS porcentaje
FROM threat_detections td
GROUP BY td.threat_type
ORDER BY cantidad DESC;

-- ============================================================
-- §9.3 Escenario 2 — Total de alertas registradas
-- Resultado esperado: 843
-- ============================================================
SELECT COUNT(*) AS total_alertas
FROM alerts;

-- ============================================================
-- §9.3 Escenario 2 — Alertas por severidad
-- Solo critical y high generan alertas (regla del workflow)
-- ============================================================
SELECT a.alert_severity,
       COUNT(*) AS cantidad
FROM alerts a
GROUP BY a.alert_severity
ORDER BY CASE a.alert_severity
    WHEN 'critical' THEN 1
    WHEN 'high' THEN 2
    WHEN 'warning' THEN 3
    WHEN 'info' THEN 4
END;

-- ============================================================
-- §9.1.4 — Ejecuciones del período operacional
-- Resultado esperado: 29 ejecuciones, todas success
-- ============================================================
SELECT COUNT(*) AS total_ejecuciones,
       COUNT(*) FILTER (WHERE status = 'success') AS exitosas,
       MIN(started_at) AS primera_ejecucion,
       MAX(started_at) AS ultima_ejecucion,
       SUM(mentions_collected) AS total_collected,
       SUM(mentions_processed) AS total_processed,
       SUM(detections_generated) AS total_detections,
       SUM(alerts_generated) AS total_alerts_intentadas
FROM execution_logs;

-- ============================================================
-- §9.1.4 — Ejecuciones por día
-- Resultado esperado: 25/09(3), 26/09(0), 27/09(13), 28/09(2), 29/09(11)
-- ============================================================
SELECT DATE(started_at) AS dia,
       COUNT(*) AS ejecuciones,
       SUM(mentions_processed) AS menciones_procesadas
FROM execution_logs
GROUP BY DATE(started_at)
ORDER BY dia;

-- ============================================================
-- §9.6.9 Tabla 5 — Distribución de la muestra auditada por estrato
-- Resultado esperado: critical=58, high=71, medium=51, low=20 (n=200)
-- Nota: la muestra auditada está en el CSV, no en la DB.
-- Esta consulta muestra la distribución de la POBLACIÓN para
-- verificar la proporcionalidad del muestreo.
-- ============================================================
SELECT td.criticality_level AS estrato,
       COUNT(*) AS poblacion,
       ROUND(100.0 * COUNT(*) / SUM(COUNT(*)) OVER (), 1) AS pct_poblacion
FROM threat_detections td
GROUP BY td.criticality_level
ORDER BY CASE td.criticality_level
    WHEN 'critical' THEN 1
    WHEN 'high' THEN 2
    WHEN 'medium' THEN 3
    WHEN 'low' THEN 4
END;

-- ============================================================
-- §9.1.4 — Keywords activos en la tabla keywords_monitor
-- Resultado esperado: verificar contra las 39 hardcodeadas en workflow
-- ============================================================
SELECT COUNT(*) AS total_keywords,
       COUNT(*) FILTER (WHERE is_active) AS activas
FROM keywords_monitor;

-- ============================================================
-- §9.2 — Registros con "rce" en matched_keywords
-- Para verificar el análisis de sensibilidad de includes()
-- ============================================================
SELECT COUNT(*) AS total_con_rce
FROM threat_detections
WHERE 'rce' = ANY(matched_keywords);

-- ============================================================
-- §9.6.5 — Verificación de que threat_type proviene del clasificador
-- El clasificador solo puede asignar: critical_security_incident,
-- security_threat, potential_phishing, general
-- ============================================================
SELECT DISTINCT threat_type
FROM threat_detections
ORDER BY threat_type;

-- ============================================================
-- §9.2 — Registros Renovate Dependency Dashboard
-- Resultado esperado: ~73 de los 200 auditados (36.5%)
-- Esta consulta cuenta en la población total
-- ============================================================
SELECT COUNT(*) AS renovate_dashboards
FROM social_mentions sm
WHERE sm.text_content ILIKE '%Dependency Dashboard%'
  AND sm.text_content ILIKE '%Renovate%';

-- ============================================================
-- §9.4 — Verificación de costos (no es query, sino constante)
-- USD 3.752/año documentado en la tesis
-- ============================================================
-- El cálculo de costos no proviene de la base de datos sino de
-- una estimación documentada en §9.4 de la tesis.

-- ============================================================
-- RECONCILIACIÓN: diferencia entre execution_logs.alerts_generated
-- y COUNT(*) FROM alerts
-- Resultado esperado: 866 intentadas vs 843 persistidas (Δ=23)
-- Causa: UNIQUE constraint en alerts(detection_id)
-- ============================================================
SELECT
    (SELECT SUM(alerts_generated) FROM execution_logs) AS alerts_intentadas,
    (SELECT COUNT(*) FROM alerts) AS alerts_persistidas,
    (SELECT SUM(alerts_generated) FROM execution_logs) -
    (SELECT COUNT(*) FROM alerts) AS diferencia_por_unique_constraint;

-- ============================================================
-- RECONCILIACIÓN: diferencia entre mentions_processed y menciones únicas
-- Resultado esperado: 1.374 procesadas vs 1.339 únicas (Δ=35)
-- Causa: UNIQUE constraint en social_mentions(platform, external_id)
-- ============================================================
SELECT
    (SELECT SUM(mentions_processed) FROM execution_logs) AS procesadas_por_workflow,
    (SELECT COUNT(*) FROM social_mentions) AS unicas_en_db,
    (SELECT SUM(mentions_processed) FROM execution_logs) -
    (SELECT COUNT(*) FROM social_mentions) AS duplicados_filtrados;
