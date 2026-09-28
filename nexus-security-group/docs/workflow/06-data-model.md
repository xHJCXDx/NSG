# 06 — Modelo de datos

## Tablas principales

```text
social_mentions 1 ── 1 sentiment_analysis
social_mentions 1 ── 1 threat_detections
threat_detections 1 ── 1 alerts
user_activity ── opcionalmente referencia mentions/detections/alerts
execution_logs ── métricas de corridas del workflow
keywords_monitor ── catálogo y contadores de keywords
```

## `social_mentions`

Almacena cada item recolectado. Clave funcional: `(platform, external_id)`.

Campos clave: texto, plataforma, autor, fechas, métricas de engagement, URLs, hashtags, `raw_data`, `processing_status`.

## `sentiment_analysis`

Una fila por mención. Guarda scores VADER/TextBlob, score final, etiqueta y método de análisis.

## `threat_detections`

Una fila por mención detectada como amenaza. Guarda tipo, categoría, severidad, confianza, risk score, keywords, reglas disparadas, notas y estado de revisión.

## `alerts`

Una fila por detección alertada. Guarda contenido, severidad, canales, estado de entrega y reconocimiento.

Datos disponibles para UI de amenazas cuando existe alerta asociada:

- `alert_id` real.
- `acknowledged`.
- `acknowledged_by`.
- `acknowledged_at`.
- `delivery_status`.

No hay contrato para múltiples alertas por amenaza: el índice único `idx_alerts_detection_id` establece una alerta por detección.

## `execution_logs`

Registra cada corrida del workflow, incluyendo corridas sin items nuevos.

## Vistas materializadas

- `daily_mention_stats`: menciones, amenazas, alertas y sentimiento por día/plataforma.
- `top_keywords_stats`: keywords con detecciones, días activos, confianza promedio, conteo high/critical y última detección.
- `workflow_performance_stats`: conteos y promedios de ejecución por día.
